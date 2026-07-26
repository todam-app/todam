import { createHash, randomBytes } from "node:crypto";

import type { AccountExport } from "@todam/contracts";
import {
  accountDeletionRequests,
  diaryEntries,
  ratings,
  user,
  watchlistEntries,
  type TodamDatabase,
} from "@todam/database";
import type { EmailSender } from "@todam/domain";
import { and, eq, gt } from "drizzle-orm";

import { HttpProblem } from "./errors.js";
import { publicWebUrl } from "./legal.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeCsv(value: string | number | boolean | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function accountExportToCsv(data: AccountExport): string {
  const rows: (string | number | boolean | null)[][] = [
    ["type", "identifiant", "champ", "valeur", "date"],
    [
      "compte",
      data.account.id,
      "pseudonyme",
      data.account.pseudonym,
      data.account.createdAt,
    ],
    ["compte", data.account.id, "email", data.account.email, data.account.createdAt],
    [
      "juridique",
      data.account.id,
      "version_cgu",
      data.legal.termsVersion,
      data.legal.termsAcceptedAt,
    ],
    [
      "juridique",
      data.account.id,
      "version_confidentialite",
      data.legal.privacyNoticeVersion,
      data.legal.termsAcceptedAt,
    ],
    ...data.diary.map((entry) => [
      "journal",
      entry.id,
      entry.productionId,
      entry.performanceId ?? entry.attendedOn,
      entry.createdAt,
    ]),
    ...data.ratings.map((rating) => [
      "note",
      rating.productionId,
      "valeur",
      rating.value,
      rating.updatedAt,
    ]),
    ...data.watchlist.map((entry) => [
      "a_voir",
      entry.productionId,
      "ajout",
      true,
      entry.addedAt,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

export function createAccountService(
  database: TodamDatabase,
  emailSender: EmailSender,
) {
  return {
    async exportAccount(userId: string): Promise<AccountExport> {
      const [accountRows, diary, ratingRows, watchlist] = await Promise.all([
        database
          .select({
            id: user.id,
            pseudonym: user.pseudonym,
            email: user.email,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            age15OrOlder: user.age15OrOlder,
            ageConfirmedAt: user.ageConfirmedAt,
            termsVersion: user.termsVersion,
            termsAcceptedAt: user.termsAcceptedAt,
            privacyNoticeVersion: user.privacyNoticeVersion,
            channel: user.registrationChannel,
          })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1),
        database
          .select({
            id: diaryEntries.id,
            productionId: diaryEntries.productionId,
            performanceId: diaryEntries.performanceId,
            attendedOn: diaryEntries.attendedOn,
            createdAt: diaryEntries.createdAt,
          })
          .from(diaryEntries)
          .where(eq(diaryEntries.userId, userId)),
        database
          .select({
            productionId: ratings.productionId,
            value: ratings.value,
            createdAt: ratings.createdAt,
            updatedAt: ratings.updatedAt,
          })
          .from(ratings)
          .where(eq(ratings.userId, userId)),
        database
          .select({
            productionId: watchlistEntries.productionId,
            addedAt: watchlistEntries.addedAt,
          })
          .from(watchlistEntries)
          .where(eq(watchlistEntries.userId, userId)),
      ]);
      const profile = accountRows[0];
      if (!profile) {
        throw new HttpProblem(
          404,
          "PROFILE_NOT_FOUND",
          "Le profil associé à cette session est introuvable.",
        );
      }

      return {
        exportedAt: new Date().toISOString(),
        account: {
          id: profile.id,
          pseudonym: profile.pseudonym,
          email: profile.email,
          emailVerified: profile.emailVerified,
          createdAt: profile.createdAt.toISOString(),
        },
        legal: {
          age15OrOlder: profile.age15OrOlder,
          ageConfirmedAt: profile.ageConfirmedAt.toISOString(),
          termsVersion: profile.termsVersion,
          termsAcceptedAt: profile.termsAcceptedAt.toISOString(),
          privacyNoticeVersion: profile.privacyNoticeVersion,
          channel: profile.channel,
        },
        diary: diary.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
        })),
        ratings: ratingRows.map((rating) => ({
          ...rating,
          createdAt: rating.createdAt.toISOString(),
          updatedAt: rating.updatedAt.toISOString(),
        })),
        watchlist: watchlist.map((entry) => ({
          ...entry,
          addedAt: entry.addedAt.toISOString(),
        })),
      };
    },

    async requestDeletion(email: string): Promise<void> {
      const rows = await database
        .select({ id: user.id, email: user.email })
        .from(user)
        .where(eq(user.email, email.trim()))
        .limit(1);
      const profile = rows[0];
      if (!profile) return;

      const token = randomBytes(32).toString("base64url");
      await database.transaction(async (transaction) => {
        await transaction
          .delete(accountDeletionRequests)
          .where(eq(accountDeletionRequests.userId, profile.id));
        await transaction.insert(accountDeletionRequests).values({
          userId: profile.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
        });
      });
      const url = `${publicWebUrl()}/suppression-compte?token=${encodeURIComponent(token)}`;
      await emailSender.send({
        to: profile.email,
        subject: "Confirmez la suppression de votre compte Todam",
        text:
          "Vous avez demandé la suppression de votre compte Todam. " +
          `Confirmez-la dans les 24 heures : ${url}\n\n` +
          "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
      });
    },

    async confirmDeletion(token: string): Promise<void> {
      const tokenHash = hashToken(token);
      const rows = await database
        .select({
          id: accountDeletionRequests.id,
          userId: accountDeletionRequests.userId,
        })
        .from(accountDeletionRequests)
        .where(
          and(
            eq(accountDeletionRequests.tokenHash, tokenHash),
            gt(accountDeletionRequests.expiresAt, new Date()),
          ),
        )
        .limit(1);
      const request = rows[0];
      if (!request) {
        throw new HttpProblem(
          400,
          "INVALID_DELETION_TOKEN",
          "Ce lien de suppression est invalide ou expiré.",
        );
      }

      await database.transaction(async (transaction) => {
        await transaction
          .delete(accountDeletionRequests)
          .where(eq(accountDeletionRequests.id, request.id));
        await transaction.delete(user).where(eq(user.id, request.userId));
      });
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;

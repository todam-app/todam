import { createHash, randomBytes } from "node:crypto";

import type { AccountExport } from "@todam/contracts";
import {
  accountDeletionRequests,
  catalogRevisionChanges,
  catalogRevisions,
  companyClaims,
  companyMemberships,
  communitySubmissions,
  contentReports,
  diaryEntries,
  listItems,
  lists,
  ratings,
  reviews,
  user,
  watchlistEntries,
  type TodamDatabase,
} from "@todam/database";
import type { EmailSender } from "@todam/domain";
import { and, eq, gt, ne } from "drizzle-orm";

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
      "compte",
      data.account.id,
      "ville_accueil",
      data.account.homeCity
        ? `${data.account.homeCity.locality} (${data.account.homeCity.countryCode})`
        : null,
      data.account.createdAt,
    ],
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
    ...data.reviews.flatMap((review) => [
      ["avis", review.id, "texte", review.body, review.updatedAt],
      ["avis", review.id, "visibilite", review.visibility, review.updatedAt],
    ]),
    ...data.lists.flatMap((list) => [
      ["liste", list.id, "nom", list.name, list.updatedAt],
      ...list.items.map((item) => [
        "element_liste",
        list.id,
        item.productionId,
        item.position,
        item.addedAt,
      ]),
    ]),
    ...data.contentReports.map((report) => [
      "signalement",
      report.id,
      `${report.targetType}:${report.targetId}`,
      report.reason,
      report.submittedAt,
    ]),
    ...data.communitySubmissions.map((submission) => [
      "contribution_catalogue",
      submission.id,
      submission.productionId,
      submission.status,
      submission.createdAt,
    ]),
    ...data.companyClaims.map((claim) => [
      "revendication_compagnie",
      claim.id,
      claim.companyId,
      claim.status,
      claim.submittedAt,
    ]),
    ...data.companyMemberships.map((membership) => [
      "rattachement_compagnie",
      membership.companyId,
      "role",
      membership.role,
      membership.createdAt,
    ]),
    ...data.catalogRevisions.flatMap((revision) => [
      [
        "revision_catalogue",
        revision.id,
        revision.targetType,
        revision.status,
        revision.updatedAt,
      ],
      ...revision.changes.map((change) => [
        "changement_revision",
        revision.id,
        change.field,
        JSON.stringify(change.newValue) ?? null,
        change.createdAt,
      ]),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

export function createAccountService(
  database: TodamDatabase,
  emailSender: EmailSender,
) {
  return {
    async getIdentity(userId: string) {
      const rows = await database
        .select({
          email: user.email,
          pseudonym: user.pseudonym,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      const identity = rows[0];
      if (!identity) {
        throw new HttpProblem(
          404,
          "PROFILE_NOT_FOUND",
          "Le profil associé à cette session est introuvable.",
        );
      }
      return identity;
    },

    async assertEmailAvailable(email: string, exceptUserId?: string): Promise<void> {
      const normalizedEmail = email.trim().toLowerCase();
      const rows = await database
        .select({ id: user.id })
        .from(user)
        .where(
          exceptUserId
            ? and(eq(user.email, normalizedEmail), ne(user.id, exceptUserId))
            : eq(user.email, normalizedEmail),
        )
        .limit(1);
      if (rows.length > 0) {
        throw new HttpProblem(
          409,
          "EMAIL_ALREADY_REGISTERED",
          "Un compte existe déjà avec cette adresse e-mail.",
        );
      }
    },

    async assertUsernameAvailable(
      username: string,
      exceptUserId?: string,
    ): Promise<void> {
      const normalizedUsername = username.trim();
      const rows = await database
        .select({ id: user.id })
        .from(user)
        .where(
          exceptUserId
            ? and(eq(user.pseudonym, normalizedUsername), ne(user.id, exceptUserId))
            : eq(user.pseudonym, normalizedUsername),
        )
        .limit(1);
      if (rows.length > 0) {
        throw new HttpProblem(
          409,
          "USERNAME_ALREADY_TAKEN",
          "Ce nom d'utilisateur est déjà utilisé.",
        );
      }
    },

    async notifyEmailChangeRequested(userId: string, newEmail: string): Promise<void> {
      const identity = await this.getIdentity(userId);
      await emailSender.send({
        to: identity.email,
        subject: "Demande de changement d’adresse e-mail — Todam",
        text:
          `Une demande a été faite pour remplacer l’adresse e-mail de ton compte Todam par ${newEmail}.\n\n` +
          "Ton adresse actuelle reste active tant que la nouvelle n’a pas été confirmée.\n\n" +
          "Si tu n’es pas à l’origine de cette demande, change immédiatement ton mot de passe.",
      });
    },

    async exportAccount(userId: string): Promise<AccountExport> {
      const [
        accountRows,
        diary,
        ratingRows,
        watchlist,
        reviewRows,
        listRows,
        listItemRows,
        reportRows,
        submissionRows,
        claimRows,
        membershipRows,
        revisionRows,
        revisionChangeRows,
      ] = await Promise.all([
        database
          .select({
            id: user.id,
            pseudonym: user.pseudonym,
            email: user.email,
            emailVerified: user.emailVerified,
            profileVisibility: user.profileVisibility,
            bio: user.bio,
            homeLocality: user.homeLocality,
            homeCountryCode: user.homeCountryCode,
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
        database
          .select({
            id: reviews.id,
            productionId: reviews.productionId,
            body: reviews.body,
            containsSpoiler: reviews.containsSpoiler,
            visibility: reviews.visibility,
            status: reviews.status,
            createdAt: reviews.createdAt,
            updatedAt: reviews.updatedAt,
          })
          .from(reviews)
          .where(eq(reviews.userId, userId)),
        database
          .select({
            id: lists.id,
            slug: lists.slug,
            name: lists.name,
            description: lists.description,
            visibility: lists.visibility,
            createdAt: lists.createdAt,
            updatedAt: lists.updatedAt,
          })
          .from(lists)
          .where(eq(lists.userId, userId)),
        database
          .select({
            listId: listItems.listId,
            productionId: listItems.productionId,
            position: listItems.position,
            addedAt: listItems.addedAt,
          })
          .from(listItems)
          .innerJoin(lists, eq(lists.id, listItems.listId))
          .where(eq(lists.userId, userId)),
        database
          .select({
            id: contentReports.id,
            targetType: contentReports.targetType,
            targetId: contentReports.targetId,
            category: contentReports.category,
            mediaId: contentReports.mediaId,
            reason: contentReports.reason,
            status: contentReports.status,
            decision: contentReports.decision,
            submittedAt: contentReports.createdAt,
            reviewedAt: contentReports.reviewedAt,
          })
          .from(contentReports)
          .where(eq(contentReports.reporterUserId, userId)),
        database
          .select({
            id: communitySubmissions.id,
            productionId: communitySubmissions.productionId,
            sourceUrl: communitySubmissions.sourceUrl,
            submittedData: communitySubmissions.submittedData,
            status: communitySubmissions.status,
            createdAt: communitySubmissions.createdAt,
            updatedAt: communitySubmissions.updatedAt,
          })
          .from(communitySubmissions)
          .where(eq(communitySubmissions.authorUserId, userId)),
        database
          .select({
            id: companyClaims.id,
            companyId: companyClaims.companyId,
            representativeName: companyClaims.representativeName,
            roleTitle: companyClaims.roleTitle,
            professionalEmail: companyClaims.professionalEmail,
            officialWebsiteUrl: companyClaims.officialWebsiteUrl,
            evidence: companyClaims.evidence,
            authorityConfirmed: companyClaims.authorityConfirmed,
            status: companyClaims.status,
            decisionReason: companyClaims.decisionReason,
            submittedAt: companyClaims.createdAt,
            reviewedAt: companyClaims.reviewedAt,
          })
          .from(companyClaims)
          .where(eq(companyClaims.userId, userId)),
        database
          .select({
            companyId: companyMemberships.companyId,
            role: companyMemberships.role,
            roleTitle: companyMemberships.roleTitle,
            createdAt: companyMemberships.createdAt,
          })
          .from(companyMemberships)
          .where(eq(companyMemberships.userId, userId)),
        database
          .select({
            id: catalogRevisions.id,
            companyId: catalogRevisions.companyId,
            targetType: catalogRevisions.targetType,
            targetId: catalogRevisions.targetId,
            status: catalogRevisions.status,
            justification: catalogRevisions.justification,
            decisionReason: catalogRevisions.decisionReason,
            createdAt: catalogRevisions.createdAt,
            updatedAt: catalogRevisions.updatedAt,
            submittedAt: catalogRevisions.submittedAt,
            reviewedAt: catalogRevisions.reviewedAt,
          })
          .from(catalogRevisions)
          .where(eq(catalogRevisions.authorUserId, userId)),
        database
          .select({
            id: catalogRevisionChanges.id,
            revisionId: catalogRevisionChanges.revisionId,
            field: catalogRevisionChanges.field,
            oldValue: catalogRevisionChanges.oldValue,
            newValue: catalogRevisionChanges.newValue,
            provenanceUrl: catalogRevisionChanges.provenanceUrl,
            rightsStatus: catalogRevisionChanges.rightsStatus,
            createdAt: catalogRevisionChanges.createdAt,
          })
          .from(catalogRevisionChanges)
          .innerJoin(
            catalogRevisions,
            eq(catalogRevisions.id, catalogRevisionChanges.revisionId),
          )
          .where(eq(catalogRevisions.authorUserId, userId)),
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
          profileVisibility: profile.profileVisibility,
          bio: profile.bio,
          homeCity:
            profile.homeLocality && profile.homeCountryCode
              ? {
                  locality: profile.homeLocality,
                  countryCode: profile.homeCountryCode,
                }
              : null,
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
        reviews: reviewRows.map((review) => ({
          ...review,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        })),
        lists: listRows.map((list) => ({
          ...list,
          createdAt: list.createdAt.toISOString(),
          updatedAt: list.updatedAt.toISOString(),
          items: listItemRows
            .filter((item) => item.listId === list.id)
            .sort((left, right) => left.position - right.position)
            .map((item) => ({
              productionId: item.productionId,
              position: item.position,
              addedAt: item.addedAt.toISOString(),
            })),
        })),
        contentReports: reportRows.map((report) => ({
          ...report,
          submittedAt: report.submittedAt.toISOString(),
          reviewedAt: report.reviewedAt?.toISOString() ?? null,
        })),
        communitySubmissions: submissionRows.map((submission) => ({
          ...submission,
          createdAt: submission.createdAt.toISOString(),
          updatedAt: submission.updatedAt.toISOString(),
        })),
        companyClaims: claimRows.map((claim) => ({
          ...claim,
          submittedAt: claim.submittedAt.toISOString(),
          reviewedAt: claim.reviewedAt?.toISOString() ?? null,
        })),
        companyMemberships: membershipRows.map((membership) => ({
          ...membership,
          createdAt: membership.createdAt.toISOString(),
        })),
        catalogRevisions: revisionRows.map((revision) => ({
          ...revision,
          createdAt: revision.createdAt.toISOString(),
          updatedAt: revision.updatedAt.toISOString(),
          submittedAt: revision.submittedAt?.toISOString() ?? null,
          reviewedAt: revision.reviewedAt?.toISOString() ?? null,
          changes: revisionChangeRows
            .filter((change) => change.revisionId === revision.id)
            .map((change) => ({
              id: change.id,
              field: change.field,
              oldValue: change.oldValue,
              newValue: change.newValue,
              provenanceUrl: change.provenanceUrl,
              rightsStatus: change.rightsStatus,
              createdAt: change.createdAt.toISOString(),
            })),
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

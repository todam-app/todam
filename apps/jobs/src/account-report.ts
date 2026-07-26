import "dotenv/config";

import { pathToFileURL } from "node:url";

import { createDatabase, user, type TodamDatabase } from "@todam/database";
import {
  createEmailSenderFromEnvironment,
  type EmailSender,
  type TransactionalEmail,
} from "@todam/domain";
import { count, eq, gte } from "drizzle-orm";

export const ACCOUNT_REVIEW_THRESHOLD = 900;
export const ACCOUNT_PROFESSIONAL_LIMIT = 1_000;

export interface AccountReportCounts {
  total: number;
  verified: number;
  newLastSevenDays: number;
}

export function accountReportPeriodStart(now = new Date()): Date {
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
}

export async function collectAccountReportCounts(
  database: TodamDatabase,
  now = new Date(),
): Promise<AccountReportCounts> {
  const [totalRows, verifiedRows, newRows] = await Promise.all([
    database.select({ total: count() }).from(user),
    database.select({ total: count() }).from(user).where(eq(user.emailVerified, true)),
    database
      .select({ total: count() })
      .from(user)
      .where(gte(user.createdAt, accountReportPeriodStart(now))),
  ]);

  return {
    total: totalRows[0]?.total ?? 0,
    verified: verifiedRows[0]?.total ?? 0,
    newLastSevenDays: newRows[0]?.total ?? 0,
  };
}

export function requireOperationsEmail(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const recipient = environment.TODAM_OPERATIONS_EMAIL?.trim();
  if (!recipient) {
    throw new Error(
      "TODAM_OPERATIONS_EMAIL est obligatoire pour envoyer le rapport des comptes.",
    );
  }
  return recipient;
}

function distanceTo(threshold: number, total: number): number {
  return Math.max(threshold - total, 0);
}

export function buildAccountReportEmail(
  counts: AccountReportCounts,
  recipient: string,
  now = new Date(),
): TransactionalEmail {
  const destination = recipient.trim();
  if (!destination) {
    throw new Error(
      "TODAM_OPERATIONS_EMAIL est obligatoire pour envoyer le rapport des comptes.",
    );
  }

  const lines = [
    "Rapport hebdomadaire des comptes Todam",
    `Généré le : ${now.toISOString()}`,
    "",
    `Comptes totaux : ${counts.total}`,
    `Comptes vérifiés : ${counts.verified}`,
    `Nouveaux comptes sur 7 jours : ${counts.newLastSevenDays}`,
    `Distance jusqu'à 900 comptes : ${distanceTo(ACCOUNT_REVIEW_THRESHOLD, counts.total)}`,
    `Distance jusqu'à 1 000 comptes : ${distanceTo(ACCOUNT_PROFESSIONAL_LIMIT, counts.total)}`,
  ];

  if (counts.total >= ACCOUNT_REVIEW_THRESHOLD) {
    lines.push(
      "",
      "ALERTE : préparer dès maintenant le passage professionnel de Todam.",
      "Préparer les nouveaux textes, les secrets de l'entreprise individuelle et les informations Play Console.",
      "Le passage doit être terminé avant toute publicité, paiement, commission, billetterie ou partenariat commercial, et au plus tard avant de dépasser 1 000 comptes.",
    );
  }

  if (counts.total >= ACCOUNT_PROFESSIONAL_LIMIT) {
    lines.push(
      "",
      "SEUIL ATTEINT : ne pas ouvrir de nouveau compte avant le passage professionnel.",
    );
  }

  return {
    to: destination,
    subject: `Todam — rapport des comptes (${counts.total})`,
    text: `${lines.join("\n")}\n`,
  };
}

export async function sendAccountReport(
  emailSender: EmailSender,
  counts: AccountReportCounts,
  recipient: string,
  now = new Date(),
): Promise<void> {
  await emailSender.send(buildAccountReportEmail(counts, recipient, now));
}

async function main() {
  const recipient = requireOperationsEmail();
  const emailSender = createEmailSenderFromEnvironment();
  const { db, pool } = createDatabase();
  try {
    const counts = await collectAccountReportCounts(db);
    await sendAccountReport(emailSender, counts, recipient);
    console.log(`Rapport des comptes envoyé : ${counts.total} comptes.`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

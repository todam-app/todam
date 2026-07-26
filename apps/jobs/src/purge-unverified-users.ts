import "dotenv/config";

import { pathToFileURL } from "node:url";

import { createDatabase, user, type TodamDatabase } from "@todam/database";
import { and, eq, lt } from "drizzle-orm";

export function unverifiedAccountCutoff(now = new Date()): Date {
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
}

export async function purgeUnverifiedUsers(
  database: TodamDatabase,
  now = new Date(),
): Promise<number> {
  const deleted = await database
    .delete(user)
    .where(
      and(
        eq(user.emailVerified, false),
        lt(user.createdAt, unverifiedAccountCutoff(now)),
      ),
    )
    .returning({ id: user.id });
  return deleted.length;
}

async function main() {
  const { db, pool } = createDatabase();
  try {
    const deleted = await purgeUnverifiedUsers(db);
    console.log(`Comptes non vérifiés supprimés : ${deleted}`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

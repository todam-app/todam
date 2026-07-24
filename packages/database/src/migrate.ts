import "dotenv/config";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDatabase } from "./index.js";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)), "..");
const migrationsFolder = resolve(packageRoot, "drizzle");
const { db, pool } = createDatabase();

try {
  await migrate(db, { migrationsFolder });
  console.info(`Migrations appliquées depuis ${migrationsFolder}.`);
} finally {
  await pool.end();
}

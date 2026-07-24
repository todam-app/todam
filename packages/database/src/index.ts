import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { schema } from "./schema.js";

export type TodamDatabase = ReturnType<typeof createDatabase>["db"];

export function createDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL est obligatoire.");
  }

  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === "test" ? 4 : 10,
  });
  const db = drizzle({ client: pool, schema });
  return { db, pool };
}

export * from "./schema.js";

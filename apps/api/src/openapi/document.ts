import { createDatabase } from "@todam/database";

import { buildServer } from "../server.js";

export async function createOpenApiDocument() {
  const { db, pool } = createDatabase(
    process.env.DATABASE_URL ?? "postgresql://todam:todam@127.0.0.1:5432/todam",
  );
  const app = await buildServer({ database: db, logger: false });

  try {
    await app.ready();
    return app.swagger();
  } finally {
    await app.close();
    await pool.end();
  }
}

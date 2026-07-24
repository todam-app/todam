import { fileURLToPath } from "node:url";

import { createDatabase } from "@todam/database";
import { config } from "dotenv";

import { buildServer } from "./server.js";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

const { db, pool } = createDatabase();
const app = await buildServer({ database: db });
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

async function shutdown() {
  await app.close();
  await pool.end();
}

process.once("SIGINT", () => {
  void shutdown();
});
process.once("SIGTERM", () => {
  void shutdown();
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  await shutdown();
  process.exitCode = 1;
}

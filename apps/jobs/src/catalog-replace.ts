import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CatalogImportSchema, type CatalogImport } from "@todam/contracts";
import { createDatabase } from "@todam/database";
import { config } from "dotenv";

import {
  createReplacementDryRunReport,
  replaceCatalogs,
  stageCatalogs,
} from "./catalog-replacement.js";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

function readArguments(name: string): string[] {
  return process.argv.flatMap((argument, index) =>
    argument === name && process.argv[index + 1] ? [process.argv[index + 1]!] : [],
  );
}

const files = readArguments("--file");
const apply = process.argv.includes("--apply");
const stage = process.argv.includes("--stage");
const dryRun = process.argv.includes("--dry-run");

if (files.length === 0) {
  console.error(
    "Usage : pnpm catalog:replace -- --file <catalogue.json> [--file <catalogue.json> ...] [--stage|--apply]",
  );
  process.exit(1);
}

if ([apply, stage, dryRun].filter(Boolean).length > 1) {
  console.error("--stage, --apply et --dry-run sont mutuellement exclusifs.");
  process.exit(1);
}

let pool: ReturnType<typeof createDatabase>["pool"] | undefined;

try {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const catalogs = await Promise.all(
    files.map(async (file): Promise<CatalogImport> => {
      const absolutePath = resolve(invocationDirectory, file);
      const raw = await readFile(absolutePath, "utf8");
      return CatalogImportSchema.parse(JSON.parse(raw) as unknown);
    }),
  );

  if (!apply && !stage) {
    console.info(JSON.stringify(createReplacementDryRunReport(catalogs), null, 2));
  } else {
    const database = createDatabase();
    pool = database.pool;
    const report = stage
      ? await stageCatalogs(database.db, catalogs)
      : await replaceCatalogs(database.db, catalogs);
    console.info(JSON.stringify(report, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool?.end();
}

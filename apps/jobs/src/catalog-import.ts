import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CatalogImportSchema } from "@todam/contracts";

import { applyCatalogFromEnvironment, createDryRunReport } from "./importer.js";

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const file = readArgument("--file");
const apply = process.argv.includes("--apply");
const coverage = process.argv.includes("--coverage");

if (!file) {
  console.error(
    "Usage : pnpm catalog:import -- --file <catalogue.json> [--apply|--coverage]",
  );
  process.exit(1);
}

if (apply && coverage) {
  console.error("--apply et --coverage sont mutuellement exclusifs.");
  process.exit(1);
}

try {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const absolutePath = resolve(invocationDirectory, file);
  const raw = await readFile(absolutePath, "utf8");
  const catalog = CatalogImportSchema.parse(JSON.parse(raw) as unknown);
  const report = apply
    ? await applyCatalogFromEnvironment(catalog)
    : createDryRunReport(catalog, coverage ? "coverage" : "dry-run");
  console.info(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CatalogImportSchema } from "@todam/contracts";
import { describe, expect, it } from "vitest";

import { createDryRunReport, getCatalogHash } from "../src/index.js";

const fixturePath = resolve(
  process.cwd(),
  "../../data/fixtures/theatre-des-muses.sample.json",
);

describe("catalogue normalisé", () => {
  it("valide la fixture synthétique et calcule sa couverture", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const catalog = CatalogImportSchema.parse(JSON.parse(raw) as unknown);
    const report = createDryRunReport(catalog);

    expect(report.counts.productions).toBe(2);
    expect(report.counts.performances).toBe(3);
    expect(getCatalogHash(catalog)).toHaveLength(64);
  });

  it("refuse une représentation liée à une production inconnue", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const value = JSON.parse(raw) as {
      performances: { productionExternalKey: string }[];
    };
    value.performances[0]!.productionExternalKey = "production.inconnue";

    expect(() => CatalogImportSchema.parse(value)).toThrow("Production inconnue");
  });
});

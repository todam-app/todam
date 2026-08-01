import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CatalogImportSchema, type CatalogImport } from "@todam/contracts";
import { describe, expect, it } from "vitest";

import { createReplacementDryRunReport } from "../src/catalog-replacement.js";

const fixturePath = resolve(
  process.cwd(),
  "../../data/fixtures/theatre-des-muses.sample.json",
);

async function loadFixture(): Promise<CatalogImport> {
  const raw = await readFile(fixturePath, "utf8");
  return CatalogImportSchema.parse(JSON.parse(raw) as unknown);
}

describe("remplacement de catalogue", () => {
  it("agrège tous les fichiers sans modifier la base en mode simulation", async () => {
    const first = await loadFixture();
    const second = structuredClone(first);
    second.source.externalKey = "fixture.theatre-des-muses.seconde-source";
    second.source.name = "Seconde source synthétique";

    const report = createReplacementDryRunReport([first, second]);

    expect(report.mode).toBe("dry-run");
    expect(report.sourceKeys).toEqual([
      "fixture.theatre-des-muses",
      "fixture.theatre-des-muses.seconde-source",
    ]);
    expect(report.totals.productions).toBe(4);
    expect(report.totals.performances).toBe(6);
    expect(report.deactivatedProductions).toBeNull();
  });

  it("refuse deux fichiers portant la même source", async () => {
    const catalog = await loadFixture();

    expect(() =>
      createReplacementDryRunReport([catalog, structuredClone(catalog)]),
    ).toThrow("source distincte");
  });

  it("refuse un remplacement vide", async () => {
    const catalog = await loadFixture();
    catalog.productions = [];

    expect(() => createReplacementDryRunReport([catalog])).toThrow(
      "sans aucune nouvelle production",
    );
  });
});

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
    expect(report.counts.media).toBe(1);
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

  it("refuse de copier une affiche sans droit de stockage", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const value = JSON.parse(raw) as {
      media: { rightsStatus: string; storagePolicy: string }[];
    };
    value.media[0]!.rightsStatus = "hotlink_only";
    value.media[0]!.storagePolicy = "mirror";

    expect(() => CatalogImportSchema.parse(value)).toThrow(
      "La copie d'une affiche exige",
    );
  });
});

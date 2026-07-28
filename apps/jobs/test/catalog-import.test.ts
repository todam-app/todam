import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CatalogImportSchema } from "@todam/contracts";
import { describe, expect, it } from "vitest";

import { classifyDiscipline } from "../src/connectors/common.js";
import { createDryRunReport, getCatalogHash } from "../src/index.js";

const fixturePath = resolve(
  process.cwd(),
  "../../data/fixtures/theatre-des-muses.sample.json",
);

describe("catalogue normalisé", () => {
  it("n’invente pas une discipline pour une catégorie ambiguë", () => {
    expect(classifyDiscipline("Spectacle vivant")).toBeNull();
    expect(classifyDiscipline("Création chorégraphique contemporaine")).toBeNull();
    expect(classifyDiscipline("Concert avec mise en espace")).toBeNull();
    expect(classifyDiscipline("Pièce de théâtre")).toBe("theatre");
    expect(classifyDiscipline("Ballet classique")).toBe("ballet");
    expect(classifyDiscipline("Art lyrique")).toBe("opera");
  });

  it("valide la fixture synthétique et calcule sa couverture", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const catalog = CatalogImportSchema.parse(JSON.parse(raw) as unknown);
    const report = createDryRunReport(catalog);

    expect(report.counts.productions).toBe(2);
    expect(report.counts.descriptions).toBe(4);
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

  it("refuse une compagnie de production absente du lot", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const value = JSON.parse(raw) as {
      productions: {
        companies?: { companyExternalKey: string; isPrimary?: boolean }[];
      }[];
    };
    value.productions[0]!.companies = [
      {
        companyExternalKey: "company.absente",
        isPrimary: true,
      },
    ];

    expect(() => CatalogImportSchema.parse(value)).toThrow("Compagnie inconnue");
  });

  it("refuse un slug impropre à une URL publique", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const value = JSON.parse(raw) as {
      productions: { slug: string }[];
    };
    value.productions[0]!.slug = "Titre / Compagnie";

    expect(() => CatalogImportSchema.parse(value)).toThrow();
  });

  it("refuse plusieurs compagnies principales pour une même production", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const value = JSON.parse(raw) as {
      companies: unknown[];
      productions: {
        companies?: { companyExternalKey: string; isPrimary?: boolean }[];
      }[];
    };
    value.companies.push({
      externalKey: "company.seconde",
      sourceDocumentKey: "fixture.document",
      name: "Seconde compagnie",
      slug: "seconde-compagnie",
    });
    value.productions[0]!.companies = [
      {
        companyExternalKey: "company.compagnie-des-lumieres",
        isPrimary: true,
      },
      {
        companyExternalKey: "company.seconde",
        isPrimary: true,
      },
    ];

    expect(() => CatalogImportSchema.parse(value)).toThrow(
      "Une production ne peut avoir qu’une compagnie principale",
    );
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

  it("refuse une couverture dont la fin précède le début", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const value = JSON.parse(raw) as {
      coverage: { startsOn: string; endsOn: string };
    };
    value.coverage.startsOn = "2027-01-01";
    value.coverage.endsOn = "2026-12-31";

    expect(() => CatalogImportSchema.parse(value)).toThrow(
      "La fin de la couverture doit suivre son début",
    );
  });

  it("refuse une représentation dont la fin ne suit pas le début", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const value = JSON.parse(raw) as {
      performances: { startsAt: string; endsAt: string | null }[];
    };
    value.performances[0]!.endsAt = value.performances[0]!.startsAt;

    expect(() => CatalogImportSchema.parse(value)).toThrow(
      "La fin d’une représentation doit suivre strictement son début",
    );
  });

  it("refuse des droits visuels qui expirent avant leur début", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const value = JSON.parse(raw) as {
      media: { validFrom: string | null; validUntil: string | null }[];
    };
    value.media[0]!.validFrom = "2027-01-02T00:00:00+01:00";
    value.media[0]!.validUntil = "2027-01-01T00:00:00+01:00";

    expect(() => CatalogImportSchema.parse(value)).toThrow(
      "La date de fin des droits doit suivre strictement leur date de début",
    );
  });
});

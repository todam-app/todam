import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CatalogImportSchema, type CatalogImport } from "@todam/contracts";
import {
  catalogSources,
  companies,
  createDatabase,
  mediaAssets,
  productionCompanies,
  productionDescriptions,
  productionSources,
  productions,
  sourceDocuments,
} from "@todam/database";
import { and, asc, count, eq, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { applyCatalog } from "../../src/importer.js";
import { replaceCatalogs, stageCatalogs } from "../../src/catalog-replacement.js";

const fixturePath = resolve(
  process.cwd(),
  "../../data/fixtures/theatre-des-muses.sample.json",
);
const { db, pool } = createDatabase();

async function assertIsolatedDatabase() {
  const result = await pool.query<{ database: string }>(
    "select current_database() as database",
  );
  const database = result.rows[0]?.database ?? "";
  if (!/(test|integration)/iu.test(database)) {
    throw new Error(
      `La base d'intégration doit contenir test ou integration dans son nom : ${database}`,
    );
  }
}

async function cleanDatabase() {
  const tables = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables " +
      "where schemaname = 'public' " +
      "and tablename not in ('__drizzle_migrations', 'spatial_ref_sys')",
  );
  if (tables.rows.length === 0) return;
  const names = tables.rows
    .map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
    .join(", ");
  await pool.query(`truncate table ${names} restart identity cascade`);
}

async function loadFixture(): Promise<CatalogImport> {
  const raw = await readFile(fixturePath, "utf8");
  return CatalogImportSchema.parse(JSON.parse(raw) as unknown);
}

function asSeparateSource(catalog: CatalogImport, suffix: string): CatalogImport {
  const result = structuredClone(catalog);
  result.source.externalKey = `fixture.${suffix}`;
  result.source.name = `Fixture ${suffix}`;
  for (const item of [
    ...result.works,
    ...result.venues,
    ...result.companies,
    ...result.artists,
    ...result.productions,
  ]) {
    item.slug = `${item.slug}-${suffix}`;
  }
  return result;
}

describe("import PostgreSQL réel", () => {
  beforeAll(assertIsolatedDatabase);
  beforeEach(cleanDatabase);
  afterAll(async () => {
    await cleanDatabase();
    await pool.end();
  });

  it("ne crée aucun doublon lors d'une réexécution", async () => {
    const catalog = await loadFixture();
    const first = await applyCatalog(db, catalog);
    const second = await applyCatalog(db, catalog);
    const productionRows = await db.select({ total: count() }).from(productions);

    expect(first.inserted).toBe(16);
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(16);
    expect(Number(productionRows[0]?.total)).toBe(2);
    expect(second.counts.companies).toBe(1);
    expect(second.counts.exclusions).toBe(1);
  });

  it("importe les compagnies et leurs liens sans donnée codée en dur", async () => {
    const catalog = await loadFixture();
    await applyCatalog(db, catalog);

    const rows = await db
      .select({
        companyName: companies.name,
        isPrimary: productionCompanies.isPrimary,
        productionTitle: productions.title,
      })
      .from(productionCompanies)
      .innerJoin(companies, eq(companies.id, productionCompanies.companyId))
      .innerJoin(productions, eq(productions.id, productionCompanies.productionId))
      .where(eq(companies.slug, "compagnie-des-lumieres"))
      .orderBy(asc(productions.title));

    expect(rows).toEqual([
      {
        companyName: "Compagnie des Lumières",
        isPrimary: true,
        productionTitle: "Le Petit Nuage",
      },
      {
        companyName: "Compagnie des Lumières",
        isPrimary: true,
        productionTitle: "Les Lumières",
      },
    ]);
  });

  it("conserve la validation lorsque la source ne change pas", async () => {
    const catalog = await loadFixture();
    await applyCatalog(db, catalog);
    const target = catalog.productions[0]!;
    await db
      .update(productions)
      .set({ publicationStatus: "published", reviewedAt: new Date() })
      .where(eq(productions.slug, target.slug));

    const report = await applyCatalog(db, catalog);
    const rows = await db
      .select({
        publicationStatus: productions.publicationStatus,
        reviewedAt: productions.reviewedAt,
      })
      .from(productions)
      .where(eq(productions.slug, target.slug));

    expect(report.quarantined).toBe(0);
    expect(rows[0]?.publicationStatus).toBe("published");
    expect(rows[0]?.reviewedAt).not.toBeNull();
  });

  it("remet en brouillon une production publiée dont la source change", async () => {
    const catalog = await loadFixture();
    await applyCatalog(db, catalog);
    const target = catalog.productions[0]!;
    await db
      .update(productions)
      .set({ publicationStatus: "published", reviewedAt: new Date() })
      .where(eq(productions.slug, target.slug));

    const changedCatalog = structuredClone(catalog);
    changedCatalog.productions[0]!.title = `${target.title} — version corrigée`;
    const report = await applyCatalog(db, changedCatalog);
    const rows = await db
      .select({
        publicationStatus: productions.publicationStatus,
        reviewedAt: productions.reviewedAt,
      })
      .from(productions)
      .where(eq(productions.slug, target.slug));

    expect(report.quarantined).toBe(1);
    expect(rows).toEqual([
      {
        publicationStatus: "draft",
        reviewedAt: null,
      },
    ]);
  });

  it("importe les descriptions avec leurs droits et revalide les corrections", async () => {
    const catalog = await loadFixture();
    await applyCatalog(db, catalog);
    const target = catalog.productions[0]!;
    const original = catalog.descriptions.find(
      (description) =>
        description.productionExternalKey === target.externalKey &&
        description.kind === "short",
    )!;
    const rows = await db
      .select({
        body: productionDescriptions.body,
        rightsStatus: productionDescriptions.rightsStatus,
        license: productionDescriptions.license,
      })
      .from(productionDescriptions)
      .innerJoin(productions, eq(productions.id, productionDescriptions.productionId))
      .where(
        and(
          eq(productions.slug, target.slug),
          eq(productionDescriptions.kind, "short"),
        ),
      );
    expect(rows).toEqual([
      {
        body: original.body,
        rightsStatus: "open_license",
        license: "CC0-1.0",
      },
    ]);

    await db
      .update(productions)
      .set({ publicationStatus: "published", reviewedAt: new Date() })
      .where(eq(productions.slug, target.slug));
    const changedCatalog = structuredClone(catalog);
    changedCatalog.descriptions.find(
      (description) => description.externalKey === original.externalKey,
    )!.body = `${original.body} Version corrigée.`;
    const report = await applyCatalog(db, changedCatalog);
    const statusRows = await db
      .select({
        publicationStatus: productions.publicationStatus,
        reviewedAt: productions.reviewedAt,
      })
      .from(productions)
      .where(eq(productions.slug, target.slug));

    expect(report.quarantined).toBe(1);
    expect(statusRows).toEqual([{ publicationStatus: "draft", reviewedAt: null }]);
  });

  it("remet en brouillon une compagnie modifiée et ses productions publiées", async () => {
    const catalog = await loadFixture();
    await applyCatalog(db, catalog);
    await db
      .update(companies)
      .set({ publicationStatus: "published", reviewedAt: new Date() })
      .where(eq(companies.slug, "compagnie-des-lumieres"));
    await db
      .update(productions)
      .set({ publicationStatus: "published", reviewedAt: new Date() })
      .where(eq(productions.isActive, true));

    const changedCatalog = structuredClone(catalog);
    changedCatalog.companies[0]!.shortDescription =
      "Présentation synthétique corrigée par la source.";
    const report = await applyCatalog(db, changedCatalog);
    const companyRows = await db
      .select({
        publicationStatus: companies.publicationStatus,
        reviewedAt: companies.reviewedAt,
      })
      .from(companies)
      .where(eq(companies.slug, "compagnie-des-lumieres"));
    const productionRows = await db
      .select({
        publicationStatus: productions.publicationStatus,
        reviewedAt: productions.reviewedAt,
      })
      .from(productions)
      .innerJoin(
        productionCompanies,
        and(
          eq(productionCompanies.productionId, productions.id),
          eq(productionCompanies.isPrimary, true),
        ),
      );

    expect(report.quarantined).toBe(3);
    expect(companyRows).toEqual([{ publicationStatus: "draft", reviewedAt: null }]);
    expect(productionRows).toEqual([
      { publicationStatus: "draft", reviewedAt: null },
      { publicationStatus: "draft", reviewedAt: null },
    ]);
  });

  it("annule tout le lot lorsqu'une référence casse la transaction", async () => {
    const catalog = structuredClone(await loadFixture());
    catalog.productions[0]!.sourceDocumentKey = "document.manquant";

    await expect(applyCatalog(db, catalog)).rejects.toThrow(
      "Document de production introuvable",
    );
    const sourceRows = await db.select({ total: count() }).from(catalogSources);
    expect(Number(sourceRows[0]?.total)).toBe(0);
  });

  it("désactive l'affiche retirée d'une production observée", async () => {
    const catalog = await loadFixture();
    await applyCatalog(db, catalog);
    const withoutPoster = structuredClone(catalog);
    withoutPoster.media = [];

    const report = await applyCatalog(db, withoutPoster);
    const rows = await db.select({ isActive: mediaAssets.isActive }).from(mediaAssets);

    expect(report.deactivated).toBe(1);
    expect(rows).toEqual([{ isActive: false }]);
  });

  it("retire une production signalée supprimée par sa source", async () => {
    const catalog = await loadFixture();
    catalog.performances[0]!.status = "scheduled";
    await applyCatalog(db, catalog);

    const withdrawal = structuredClone(catalog);
    withdrawal.works = [];
    withdrawal.venues = [];
    withdrawal.companies = [];
    withdrawal.artists = [];
    withdrawal.productions = [];
    withdrawal.descriptions = [];
    withdrawal.performances = [];
    withdrawal.media = [];
    withdrawal.withdrawnProductionExternalKeys = ["production.les-lumieres"];
    const report = await applyCatalog(db, withdrawal);

    const productionRows = await db
      .select({ isActive: productions.isActive })
      .from(productions)
      .where(eq(productions.slug, "les-lumieres-jeanne-exemple-2025"));

    expect(productionRows).toEqual([{ isActive: false }]);
    expect(report.deactivated).toBeGreaterThanOrEqual(2);
  });

  it("importe les nouvelles sources puis masque automatiquement les anciennes", async () => {
    const previous = await loadFixture();
    await applyCatalog(db, previous);
    const replacement = asSeparateSource(previous, "replacement");

    const staged = await stageCatalogs(db, [replacement]);
    await db
      .update(productions)
      .set({ publicationStatus: "published", reviewedAt: new Date() })
      .where(like(productions.slug, "%-replacement"));
    const first = await replaceCatalogs(db, [replacement]);
    const second = await replaceCatalogs(db, [replacement]);
    const rows = await db
      .select({
        isActive: productions.isActive,
        sourceKey: catalogSources.externalKey,
      })
      .from(productions)
      .innerJoin(productionSources, eq(productionSources.entityId, productions.id))
      .innerJoin(sourceDocuments, eq(sourceDocuments.id, productionSources.documentId))
      .innerJoin(catalogSources, eq(catalogSources.id, sourceDocuments.sourceId))
      .orderBy(asc(catalogSources.externalKey), asc(productions.slug));

    expect(staged.deactivatedProductions).toBe(0);
    expect(first.deactivatedProductions).toBe(2);
    expect(second.deactivatedProductions).toBe(0);
    expect(rows).toEqual([
      { isActive: true, sourceKey: "fixture.replacement" },
      { isActive: true, sourceKey: "fixture.replacement" },
      { isActive: false, sourceKey: "fixture.theatre-des-muses" },
      { isActive: false, sourceKey: "fixture.theatre-des-muses" },
    ]);
  });

  it("annule tous les imports si un fichier du remplacement échoue", async () => {
    const previous = await loadFixture();
    await applyCatalog(db, previous);
    const valid = asSeparateSource(previous, "replacement-valid");
    const invalid = asSeparateSource(previous, "replacement-invalid");
    invalid.productions[0]!.sourceDocumentKey = "document.manquant";

    await expect(stageCatalogs(db, [valid, invalid])).rejects.toThrow(
      "Document de production introuvable",
    );
    const sources = await db
      .select({ key: catalogSources.externalKey })
      .from(catalogSources)
      .orderBy(asc(catalogSources.externalKey));
    const productionRows = await db
      .select({ isActive: productions.isActive })
      .from(productions);

    expect(sources).toEqual([{ key: "fixture.theatre-des-muses" }]);
    expect(productionRows).toEqual([{ isActive: true }, { isActive: true }]);
  });
});

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CatalogImportSchema, type CatalogImport } from "@todam/contracts";
import {
  catalogSources,
  createDatabase,
  mediaAssets,
  productions,
} from "@todam/database";
import { count, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { applyCatalog } from "../../src/importer.js";

const fixturePath = resolve(
  process.cwd(),
  "../../data/fixtures/theatre-des-muses.sample.json",
);
const { db, pool } = createDatabase();

async function cleanDatabase() {
  const tables = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables " +
      "where schemaname = 'public' and tablename <> '__drizzle_migrations'",
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

describe("import PostgreSQL réel", () => {
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

    expect(first.inserted).toBe(11);
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(11);
    expect(Number(productionRows[0]?.total)).toBe(2);
    expect(second.counts.exclusions).toBe(1);
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
    withdrawal.artists = [];
    withdrawal.productions = [];
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
});

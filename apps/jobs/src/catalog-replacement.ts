import type { CatalogImport, ImportReport } from "@todam/contracts";
import {
  catalogSources,
  productionSources,
  productions,
  sourceDocuments,
  type TodamDatabase,
} from "@todam/database";
import { and, eq, inArray, notInArray } from "drizzle-orm";

import { applyCatalog, createDryRunReport } from "./importer.js";

type ReplacementTotals = ImportReport["counts"];

export type CatalogReplacementReport = {
  mode: "dry-run" | "stage" | "apply";
  sourceKeys: string[];
  totals: ReplacementTotals;
  imports: ImportReport[];
  deactivatedProductions: number | null;
};

function validateReplacement(catalogs: CatalogImport[]): void {
  if (catalogs.length === 0) {
    throw new Error("Au moins un fichier catalogue est obligatoire.");
  }

  const sourceKeys = catalogs.map((catalog) => catalog.source.externalKey);
  if (new Set(sourceKeys).size !== sourceKeys.length) {
    throw new Error(
      "Chaque fichier de remplacement doit utiliser une source distincte.",
    );
  }

  if (catalogs.every((catalog) => catalog.productions.length === 0)) {
    throw new Error(
      "Le remplacement refuse de masquer tout le catalogue sans aucune nouvelle production.",
    );
  }
}

function sumCounts(reports: ImportReport[]): ReplacementTotals {
  return reports.reduce<ReplacementTotals>(
    (totals, report) => ({
      documents: totals.documents + report.counts.documents,
      works: totals.works + report.counts.works,
      venues: totals.venues + report.counts.venues,
      companies: totals.companies + report.counts.companies,
      artists: totals.artists + report.counts.artists,
      productions: totals.productions + report.counts.productions,
      descriptions: totals.descriptions + report.counts.descriptions,
      performances: totals.performances + report.counts.performances,
      media: totals.media + report.counts.media,
      withdrawnProductions:
        totals.withdrawnProductions + report.counts.withdrawnProductions,
      exclusions: totals.exclusions + report.counts.exclusions,
    }),
    {
      documents: 0,
      works: 0,
      venues: 0,
      companies: 0,
      artists: 0,
      productions: 0,
      descriptions: 0,
      performances: 0,
      media: 0,
      withdrawnProductions: 0,
      exclusions: 0,
    },
  );
}

function createReport(
  catalogs: CatalogImport[],
  imports: ImportReport[],
  mode: CatalogReplacementReport["mode"],
  deactivatedProductions: number | null = null,
): CatalogReplacementReport {
  return {
    mode,
    sourceKeys: catalogs.map((catalog) => catalog.source.externalKey),
    totals: sumCounts(imports),
    imports,
    deactivatedProductions,
  };
}

export function createReplacementDryRunReport(
  catalogs: CatalogImport[],
): CatalogReplacementReport {
  validateReplacement(catalogs);
  return createReport(
    catalogs,
    catalogs.map((catalog) => createDryRunReport(catalog)),
    "dry-run",
  );
}

export async function replaceCatalogs(
  database: TodamDatabase,
  catalogs: CatalogImport[],
): Promise<CatalogReplacementReport> {
  validateReplacement(catalogs);
  const sourceKeys = catalogs.map((catalog) => catalog.source.externalKey);

  return database.transaction(async (transaction) => {
    const imports: ImportReport[] = [];
    for (const catalog of catalogs) {
      imports.push(
        await applyCatalog(transaction as unknown as TodamDatabase, catalog),
      );
    }

    const retainedProductionIds = transaction
      .selectDistinct({ id: productionSources.entityId })
      .from(productionSources)
      .innerJoin(sourceDocuments, eq(sourceDocuments.id, productionSources.documentId))
      .innerJoin(catalogSources, eq(catalogSources.id, sourceDocuments.sourceId))
      .where(inArray(catalogSources.externalKey, sourceKeys));
    const retainedProductions = await transaction
      .select({
        id: productions.id,
        publicationStatus: productions.publicationStatus,
      })
      .from(productions)
      .where(inArray(productions.id, retainedProductionIds));
    const unpublished = retainedProductions.filter(
      (production) => production.publicationStatus !== "published",
    );
    if (unpublished.length > 0) {
      throw new Error(
        `Le remplacement refuse de masquer l'ancien catalogue : ${unpublished.length} nouvelle(s) production(s) ne sont pas publiées. Utilisez d'abord --stage puis terminez leur modération.`,
      );
    }
    const deactivated = await transaction
      .update(productions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(productions.isActive, true),
          notInArray(productions.id, retainedProductionIds),
        ),
      )
      .returning({ id: productions.id });

    return createReport(catalogs, imports, "apply", deactivated.length);
  });
}

export async function stageCatalogs(
  database: TodamDatabase,
  catalogs: CatalogImport[],
): Promise<CatalogReplacementReport> {
  validateReplacement(catalogs);

  return database.transaction(async (transaction) => {
    const imports: ImportReport[] = [];
    for (const catalog of catalogs) {
      imports.push(
        await applyCatalog(transaction as unknown as TodamDatabase, catalog),
      );
    }
    return createReport(catalogs, imports, "stage", 0);
  });
}

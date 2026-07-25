import { createHash } from "node:crypto";

import type { CatalogImport, ImportReport } from "@todam/contracts";
import {
  artistSources,
  artists,
  catalogSources,
  createDatabase,
  importBatches,
  mediaAssets,
  performanceSources,
  performanceMedia,
  performances,
  productionCredits,
  productionMedia,
  productionSources,
  productions,
  sourceDocuments,
  venueSources,
  venues,
  workSources,
  works,
  type TodamDatabase,
} from "@todam/database";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

type ReportCounts = ImportReport["counts"];

function getCounts(catalog: CatalogImport): ReportCounts {
  return {
    documents: catalog.documents.length,
    works: catalog.works.length,
    venues: catalog.venues.length,
    artists: catalog.artists.length,
    productions: catalog.productions.length,
    performances: catalog.performances.length,
    media: catalog.media.length,
    withdrawnProductions: catalog.withdrawnProductionExternalKeys.length,
    exclusions: catalog.exclusions.length,
  };
}

export function getCatalogHash(catalog: CatalogImport): string {
  return createHash("sha256").update(JSON.stringify(catalog)).digest("hex");
}

export function createDryRunReport(
  catalog: CatalogImport,
  mode: "dry-run" | "coverage" = "dry-run",
): ImportReport {
  return {
    source: catalog.source.name,
    coverage: catalog.coverage.label,
    mode,
    counts: getCounts(catalog),
    inserted: 0,
    updated: 0,
    unchanged: 0,
    deactivated: 0,
    quarantined: 0,
  };
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  if (
    left !== null &&
    right !== null &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return left === right;
}

function hasChanges(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  return Object.entries(next).some(([key, value]) => !valuesEqual(current[key], value));
}

export async function applyCatalog(
  database: TodamDatabase,
  catalog: CatalogImport,
): Promise<ImportReport> {
  const report: ImportReport = {
    ...createDryRunReport(catalog),
    mode: "apply",
  };
  const counts = getCounts(catalog);
  const contentHash = getCatalogHash(catalog);

  await database.transaction(async (transaction) => {
    const existingSources = await transaction
      .select()
      .from(catalogSources)
      .where(eq(catalogSources.externalKey, catalog.source.externalKey))
      .limit(1);
    const sourceValues = {
      externalKey: catalog.source.externalKey,
      name: catalog.source.name,
      homepageUrl: catalog.source.homepageUrl,
      connectorKind: catalog.source.connectorKind,
      metadataLicense: catalog.source.metadataLicense,
      defaultMediaPolicy: catalog.source.defaultMediaPolicy,
    };
    let sourceId: string;
    const existingSource = existingSources[0];
    if (existingSource) {
      sourceId = existingSource.id;
      if (hasChanges(existingSource, sourceValues)) {
        await transaction
          .update(catalogSources)
          .set({ ...sourceValues, updatedAt: new Date() })
          .where(eq(catalogSources.id, sourceId));
        report.updated += 1;
      } else {
        report.unchanged += 1;
      }
    } else {
      const [created] = await transaction
        .insert(catalogSources)
        .values(sourceValues)
        .returning({ id: catalogSources.id });
      if (!created) throw new Error("Impossible de créer la source.");
      sourceId = created.id;
      report.inserted += 1;
    }

    const [batch] = await transaction
      .insert(importBatches)
      .values({
        sourceId,
        coverageLabel: catalog.coverage.label,
        contentHash,
        status: "running",
        counts,
      })
      .returning({ id: importBatches.id });
    if (!batch) throw new Error("Impossible de créer le lot d'import.");

    const documentIds = new Map<string, string>();
    for (const document of catalog.documents) {
      const currentRows = await transaction
        .select()
        .from(sourceDocuments)
        .where(
          and(
            eq(sourceDocuments.sourceId, sourceId),
            eq(sourceDocuments.externalKey, document.externalKey),
          ),
        )
        .limit(1);
      const next = {
        title: document.title,
        url: document.url,
        retrievedAt: new Date(document.retrievedAt),
        rightsStatus: document.rightsStatus,
        license: document.license,
      };
      const current = currentRows[0];
      if (current) {
        documentIds.set(document.externalKey, current.id);
        if (hasChanges(current, next)) {
          await transaction
            .update(sourceDocuments)
            .set({ ...next, updatedAt: new Date() })
            .where(eq(sourceDocuments.id, current.id));
          report.updated += 1;
        } else {
          report.unchanged += 1;
        }
      } else {
        const [created] = await transaction
          .insert(sourceDocuments)
          .values({
            sourceId,
            externalKey: document.externalKey,
            ...next,
          })
          .returning({ id: sourceDocuments.id });
        if (!created) throw new Error("Impossible de créer un document source.");
        documentIds.set(document.externalKey, created.id);
        report.inserted += 1;
      }
    }

    const workIds = new Map<string, string>();
    for (const item of catalog.works) {
      const currentRows = await transaction
        .select()
        .from(works)
        .where(
          sql<boolean>`exists (
          select 1
          from ${workSources}
          join ${sourceDocuments}
            on ${sourceDocuments.id} = ${workSources.documentId}
          where ${workSources.entityId} = ${works.id}
            and ${sourceDocuments.sourceId} = ${sourceId}
            and ${workSources.externalKey} = ${item.externalKey}
        )`,
        )
        .limit(1);
      const next = {
        title: item.title,
        discipline: item.discipline,
      };
      const current = currentRows[0];
      let id: string;
      if (current) {
        id = current.id;
        if (hasChanges(current, next)) {
          await transaction
            .update(works)
            .set({ ...next, updatedAt: new Date() })
            .where(eq(works.id, id));
          report.updated += 1;
        } else {
          report.unchanged += 1;
        }
      } else {
        const [created] = await transaction
          .insert(works)
          .values({ slug: item.slug, ...next })
          .returning({ id: works.id });
        if (!created) throw new Error(`Impossible de créer l'œuvre ${item.title}.`);
        id = created.id;
        report.inserted += 1;
      }
      workIds.set(item.externalKey, id);
      const documentId = documentIds.get(item.sourceDocumentKey);
      if (!documentId) throw new Error("Document d'œuvre introuvable.");
      await transaction
        .insert(workSources)
        .values({ entityId: id, documentId, externalKey: item.externalKey })
        .onConflictDoUpdate({
          target: [workSources.entityId, workSources.documentId],
          set: { externalKey: item.externalKey, observedAt: new Date() },
        });
    }

    const venueIds = new Map<string, string>();
    for (const item of catalog.venues) {
      const currentRows = await transaction
        .select()
        .from(venues)
        .where(
          sql<boolean>`exists (
          select 1
          from ${venueSources}
          join ${sourceDocuments}
            on ${sourceDocuments.id} = ${venueSources.documentId}
          where ${venueSources.entityId} = ${venues.id}
            and ${sourceDocuments.sourceId} = ${sourceId}
            and ${venueSources.externalKey} = ${item.externalKey}
        )`,
        )
        .limit(1);
      const next = {
        name: item.name,
        addressLine1: item.addressLine1,
        postalCode: item.postalCode,
        locality: item.locality,
        countryCode: item.countryCode,
        timezone: item.timezone,
        coordinates:
          item.latitude === null || item.longitude === null
            ? null
            : { x: item.longitude, y: item.latitude },
      };
      const current = currentRows[0];
      let id: string;
      if (current) {
        id = current.id;
        if (hasChanges(current, next)) {
          await transaction
            .update(venues)
            .set({ ...next, updatedAt: new Date() })
            .where(eq(venues.id, id));
          report.updated += 1;
        } else {
          report.unchanged += 1;
        }
      } else {
        const [created] = await transaction
          .insert(venues)
          .values({ slug: item.slug, ...next })
          .returning({ id: venues.id });
        if (!created) throw new Error(`Impossible de créer le lieu ${item.name}.`);
        id = created.id;
        report.inserted += 1;
      }
      venueIds.set(item.externalKey, id);
      const documentId = documentIds.get(item.sourceDocumentKey);
      if (!documentId) throw new Error("Document de lieu introuvable.");
      await transaction
        .insert(venueSources)
        .values({ entityId: id, documentId, externalKey: item.externalKey })
        .onConflictDoUpdate({
          target: [venueSources.entityId, venueSources.documentId],
          set: { externalKey: item.externalKey, observedAt: new Date() },
        });
    }

    const artistIds = new Map<string, string>();
    for (const item of catalog.artists) {
      const currentRows = await transaction
        .select()
        .from(artists)
        .where(
          sql<boolean>`exists (
          select 1
          from ${artistSources}
          join ${sourceDocuments}
            on ${sourceDocuments.id} = ${artistSources.documentId}
          where ${artistSources.entityId} = ${artists.id}
            and ${sourceDocuments.sourceId} = ${sourceId}
            and ${artistSources.externalKey} = ${item.externalKey}
        )`,
        )
        .limit(1);
      const next = { name: item.name };
      const current = currentRows[0];
      let id: string;
      if (current) {
        id = current.id;
        if (hasChanges(current, next)) {
          await transaction
            .update(artists)
            .set({ ...next, updatedAt: new Date() })
            .where(eq(artists.id, id));
          report.updated += 1;
        } else {
          report.unchanged += 1;
        }
      } else {
        const [created] = await transaction
          .insert(artists)
          .values({ slug: item.slug, ...next })
          .returning({ id: artists.id });
        if (!created) throw new Error(`Impossible de créer ${item.name}.`);
        id = created.id;
        report.inserted += 1;
      }
      artistIds.set(item.externalKey, id);
      const documentId = documentIds.get(item.sourceDocumentKey);
      if (!documentId) throw new Error("Document d'artiste introuvable.");
      await transaction
        .insert(artistSources)
        .values({ entityId: id, documentId, externalKey: item.externalKey })
        .onConflictDoUpdate({
          target: [artistSources.entityId, artistSources.documentId],
          set: { externalKey: item.externalKey, observedAt: new Date() },
        });
    }

    const productionIds = new Map<string, string>();
    for (const item of catalog.productions) {
      const currentRows = await transaction
        .select()
        .from(productions)
        .where(
          sql<boolean>`exists (
          select 1
          from ${productionSources}
          join ${sourceDocuments}
            on ${sourceDocuments.id} = ${productionSources.documentId}
          where ${productionSources.entityId} = ${productions.id}
            and ${sourceDocuments.sourceId} = ${sourceId}
            and ${productionSources.externalKey} = ${item.externalKey}
        )`,
        )
        .limit(1);
      const workId =
        item.workExternalKey === null
          ? null
          : (workIds.get(item.workExternalKey) ?? null);
      const next = {
        workId,
        title: item.title,
        discipline: item.discipline,
        audience: item.audience,
        durationMinutes: item.durationMinutes,
        language: item.language,
        officialUrl: item.officialUrl,
        isActive: true,
      };
      const current = currentRows[0];
      let id: string;
      if (current) {
        id = current.id;
        if (hasChanges(current, next)) {
          await transaction
            .update(productions)
            .set({ ...next, updatedAt: new Date() })
            .where(eq(productions.id, id));
          report.updated += 1;
        } else {
          report.unchanged += 1;
        }
      } else {
        const [created] = await transaction
          .insert(productions)
          .values({ slug: item.slug, ...next })
          .returning({ id: productions.id });
        if (!created) throw new Error(`Impossible de créer ${item.title}.`);
        id = created.id;
        report.inserted += 1;
      }
      productionIds.set(item.externalKey, id);
      const documentId = documentIds.get(item.sourceDocumentKey);
      if (!documentId) throw new Error("Document de production introuvable.");
      await transaction
        .insert(productionSources)
        .values({ entityId: id, documentId, externalKey: item.externalKey })
        .onConflictDoUpdate({
          target: [productionSources.entityId, productionSources.documentId],
          set: { externalKey: item.externalKey, observedAt: new Date() },
        });

      await transaction
        .delete(productionCredits)
        .where(eq(productionCredits.productionId, id));
      if (item.credits.length > 0) {
        await transaction.insert(productionCredits).values(
          item.credits.map((credit) => {
            const artistId = artistIds.get(credit.artistExternalKey);
            if (!artistId) {
              throw new Error(
                `Artiste de crédit introuvable : ${credit.artistExternalKey}`,
              );
            }
            return {
              productionId: id,
              artistId,
              role: credit.role,
              label: credit.label,
              position: credit.position,
            };
          }),
        );
      }
    }

    const performanceIds = new Map<string, string>();
    for (const item of catalog.performances) {
      const productionId = productionIds.get(item.productionExternalKey);
      const venueId = venueIds.get(item.venueExternalKey);
      if (!productionId || !venueId) {
        throw new Error(`Références de représentation invalides : ${item.externalKey}`);
      }
      const startsAt = new Date(item.startsAt);
      const currentRows = await transaction
        .select()
        .from(performances)
        .where(
          sql<boolean>`exists (
          select 1
          from ${performanceSources}
          join ${sourceDocuments}
            on ${sourceDocuments.id} = ${performanceSources.documentId}
          where ${performanceSources.entityId} = ${performances.id}
            and ${sourceDocuments.sourceId} = ${sourceId}
            and ${performanceSources.externalKey} = ${item.externalKey}
        )`,
        )
        .limit(1);
      const next = {
        productionId,
        venueId,
        startsAt,
        endsAt: item.endsAt === null ? null : new Date(item.endsAt),
        status: item.status,
        officialUrl: item.officialUrl,
      };
      const current = currentRows[0];
      let id: string;
      if (current) {
        id = current.id;
        if (hasChanges(current, next)) {
          await transaction
            .update(performances)
            .set({ ...next, updatedAt: new Date() })
            .where(eq(performances.id, id));
          report.updated += 1;
        } else {
          report.unchanged += 1;
        }
      } else {
        const [created] = await transaction
          .insert(performances)
          .values(next)
          .returning({ id: performances.id });
        if (!created) {
          throw new Error(`Impossible de créer la séance ${item.externalKey}.`);
        }
        id = created.id;
        report.inserted += 1;
      }
      const documentId = documentIds.get(item.sourceDocumentKey);
      if (!documentId) throw new Error("Document de représentation introuvable.");
      performanceIds.set(item.externalKey, id);
      await transaction
        .insert(performanceSources)
        .values({ entityId: id, documentId, externalKey: item.externalKey })
        .onConflictDoUpdate({
          target: [performanceSources.entityId, performanceSources.documentId],
          set: { externalKey: item.externalKey, observedAt: new Date() },
        });
    }

    const importedMediaKeys: string[] = [];
    for (const item of catalog.media) {
      const productionId = productionIds.get(item.productionExternalKey);
      const performanceId =
        item.performanceExternalKey === null
          ? null
          : performanceIds.get(item.performanceExternalKey);
      const documentId = documentIds.get(item.sourceDocumentKey);
      if (!productionId || !documentId) {
        throw new Error(`Références d'affiche invalides : ${item.externalKey}`);
      }
      if (item.performanceExternalKey !== null && !performanceId) {
        throw new Error(
          `Représentation d'affiche introuvable : ${item.performanceExternalKey}`,
        );
      }

      importedMediaKeys.push(item.externalKey);
      const next = {
        documentId,
        kind: item.kind,
        remoteUrl: item.url,
        storagePolicy: item.storagePolicy,
        alt: item.alt,
        credit: item.credit,
        copyrightHolder: item.copyrightHolder,
        rightsStatus: item.rightsStatus,
        license: item.license,
        termsUrl: item.termsUrl,
        width: item.width,
        height: item.height,
        mimeType: item.mimeType,
        validFrom: item.validFrom === null ? null : new Date(item.validFrom),
        validUntil: item.validUntil === null ? null : new Date(item.validUntil),
        isActive: true,
      };
      const currentRows = await transaction
        .select()
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.sourceId, sourceId),
            eq(mediaAssets.externalKey, item.externalKey),
          ),
        )
        .limit(1);
      const current = currentRows[0];
      let mediaId: string;
      if (current) {
        mediaId = current.id;
        if (hasChanges(current, next)) {
          const invalidateMirror =
            current.remoteUrl !== item.url || item.storagePolicy !== "mirror";
          await transaction
            .update(mediaAssets)
            .set({
              ...next,
              ...(invalidateMirror
                ? { mirroredAt: null, sha256: null, storageKey: null }
                : {}),
              updatedAt: new Date(),
            })
            .where(eq(mediaAssets.id, mediaId));
          report.updated += 1;
        } else {
          report.unchanged += 1;
        }
      } else {
        const [created] = await transaction
          .insert(mediaAssets)
          .values({
            sourceId,
            externalKey: item.externalKey,
            ...next,
          })
          .returning({ id: mediaAssets.id });
        if (!created) {
          throw new Error(`Impossible de créer l'affiche ${item.externalKey}.`);
        }
        mediaId = created.id;
        report.inserted += 1;
      }

      await transaction
        .insert(productionMedia)
        .values({
          productionId,
          mediaId,
          isPrimary: item.isPrimary,
          position: item.position,
        })
        .onConflictDoUpdate({
          target: [productionMedia.productionId, productionMedia.mediaId],
          set: { isPrimary: item.isPrimary, position: item.position },
        });

      if (performanceId) {
        await transaction
          .insert(performanceMedia)
          .values({ performanceId, mediaId })
          .onConflictDoNothing();
      }
    }

    for (const production of catalog.productions) {
      const productionId = productionIds.get(production.externalKey);
      if (!productionId) continue;
      const currentKeys = catalog.media
        .filter((media) => media.productionExternalKey === production.externalKey)
        .map((media) => media.externalKey);
      const linkedToProduction = sql<boolean>`exists (
        select 1
        from ${productionMedia}
        where ${productionMedia.mediaId} = ${mediaAssets.id}
          and ${productionMedia.productionId} = ${productionId}
      )`;
      const deactivated =
        currentKeys.length === 0
          ? await transaction
              .update(mediaAssets)
              .set({ isActive: false, updatedAt: new Date() })
              .where(
                and(
                  eq(mediaAssets.sourceId, sourceId),
                  eq(mediaAssets.isActive, true),
                  linkedToProduction,
                ),
              )
              .returning({ id: mediaAssets.id })
          : await transaction
              .update(mediaAssets)
              .set({ isActive: false, updatedAt: new Date() })
              .where(
                and(
                  eq(mediaAssets.sourceId, sourceId),
                  eq(mediaAssets.isActive, true),
                  linkedToProduction,
                  notInArray(mediaAssets.externalKey, currentKeys),
                ),
              )
              .returning({ id: mediaAssets.id });
      report.deactivated += deactivated.length;
    }

    for (const externalKey of catalog.withdrawnProductionExternalKeys) {
      const rows = await transaction
        .select({ id: productions.id })
        .from(productions)
        .where(
          sql<boolean>`exists (
          select 1
          from ${productionSources}
          join ${sourceDocuments}
            on ${sourceDocuments.id} = ${productionSources.documentId}
          where ${productionSources.entityId} = ${productions.id}
            and ${sourceDocuments.sourceId} = ${sourceId}
            and ${productionSources.externalKey} = ${externalKey}
        )`,
        )
        .limit(1);
      const production = rows[0];
      if (!production) {
        report.quarantined += 1;
        continue;
      }
      const deactivatedProduction = await transaction
        .update(productions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(productions.id, production.id), eq(productions.isActive, true)))
        .returning({ id: productions.id });
      const cancelledPerformances = await transaction
        .update(performances)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(performances.productionId, production.id),
            inArray(performances.status, ["scheduled", "postponed"]),
          ),
        )
        .returning({ id: performances.id });
      const deactivatedMedia = await transaction
        .update(mediaAssets)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(mediaAssets.sourceId, sourceId),
            eq(mediaAssets.isActive, true),
            sql<boolean>`exists (
              select 1
              from ${productionMedia}
              where ${productionMedia.mediaId} = ${mediaAssets.id}
                and ${productionMedia.productionId} = ${production.id}
            )`,
          ),
        )
        .returning({ id: mediaAssets.id });
      report.deactivated +=
        deactivatedProduction.length +
        cancelledPerformances.length +
        deactivatedMedia.length;
    }

    if (catalog.coverage.expectedCompleteness === "complete") {
      const deactivated =
        importedMediaKeys.length === 0
          ? await transaction
              .update(mediaAssets)
              .set({ isActive: false, updatedAt: new Date() })
              .where(
                and(eq(mediaAssets.sourceId, sourceId), eq(mediaAssets.isActive, true)),
              )
              .returning({ id: mediaAssets.id })
          : await transaction
              .update(mediaAssets)
              .set({ isActive: false, updatedAt: new Date() })
              .where(
                and(
                  eq(mediaAssets.sourceId, sourceId),
                  eq(mediaAssets.isActive, true),
                  notInArray(mediaAssets.externalKey, importedMediaKeys),
                ),
              )
              .returning({ id: mediaAssets.id });
      report.deactivated += deactivated.length;
    }

    await transaction
      .update(importBatches)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(importBatches.id, batch.id));
  });

  return report;
}

export async function applyCatalogFromEnvironment(
  catalog: CatalogImport,
): Promise<ImportReport> {
  const { db, pool } = createDatabase();
  try {
    return await applyCatalog(db, catalog);
  } finally {
    await pool.end();
  }
}

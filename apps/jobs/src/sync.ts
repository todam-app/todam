import type { ImportReport } from "@todam/contracts";
import {
  catalogSources,
  createDatabase,
  sourceSyncRuns,
  sourceSyncStates,
  type TodamDatabase,
} from "@todam/database";
import { eq, sql } from "drizzle-orm";

import { pullBaseLieux } from "./connectors/base-lieux.js";
import { type ConnectorContext, type ConnectorResult } from "./connectors/common.js";
import { pullDatatourisme } from "./connectors/datatourisme.js";
import { pullOpenAgenda } from "./connectors/openagenda.js";
import { applyCatalog, createDryRunReport } from "./importer.js";

export type ConnectorName = "base-lieux" | "datatourisme" | "openagenda";

const sourceKeys: Record<ConnectorName, string> = {
  "base-lieux": "ministere-culture.base-lieux",
  datatourisme: "datatourisme.fr",
  openagenda: "openagenda.fr",
};

const refreshIntervals: Record<ConnectorName, number> = {
  "base-lieux": 7 * 24 * 60 * 60 * 1_000,
  datatourisme: 24 * 60 * 60 * 1_000,
  openagenda: 6 * 60 * 60 * 1_000,
};

async function pull(
  connector: ConnectorName,
  context: ConnectorContext,
): Promise<ConnectorResult> {
  switch (connector) {
    case "base-lieux":
      return pullBaseLieux(context);
    case "datatourisme":
      return pullDatatourisme(context);
    case "openagenda":
      return pullOpenAgenda(context);
  }
}

async function currentCursor(
  database: TodamDatabase,
  connector: ConnectorName,
): Promise<string | null> {
  const rows = await database
    .select({ cursor: sourceSyncStates.cursor })
    .from(sourceSyncStates)
    .innerJoin(catalogSources, eq(catalogSources.id, sourceSyncStates.sourceId))
    .where(eq(catalogSources.externalKey, sourceKeys[connector]))
    .limit(1);
  return rows[0]?.cursor ?? null;
}

export interface CatalogSyncResult {
  connector: ConnectorName;
  cursor: string | null;
  report: ImportReport;
  stats: ConnectorResult["stats"];
}

async function executeCatalogSync(
  database: TodamDatabase,
  connector: ConnectorName,
  apply: boolean,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
  now = new Date(),
): Promise<CatalogSyncResult> {
  const cursor = apply ? await currentCursor(database, connector) : null;
  const result = await pull(connector, {
    cursor,
    fetch: fetchImplementation,
    now,
  });
  const report = apply
    ? await applyCatalog(database, result.catalog)
    : createDryRunReport(result.catalog);
  report.quarantined = result.stats.excluded;

  if (apply) {
    const sourceRows = await database
      .select({ id: catalogSources.id })
      .from(catalogSources)
      .where(eq(catalogSources.externalKey, sourceKeys[connector]))
      .limit(1);
    const source = sourceRows[0];
    if (!source) throw new Error("La source synchronisée n'a pas été créée.");
    const completedAt = new Date();
    const nextRunAt = new Date(completedAt.getTime() + refreshIntervals[connector]);
    await database.transaction(async (transaction) => {
      await transaction.insert(sourceSyncRuns).values({
        sourceId: source.id,
        status: "completed",
        cursorBefore: cursor,
        cursorAfter: result.cursor,
        counts: {
          ...report.counts,
          fetched: result.stats.fetched,
          accepted: result.stats.accepted,
          excluded: result.stats.excluded,
        },
        completedAt,
      });
      await transaction
        .insert(sourceSyncStates)
        .values({
          sourceId: source.id,
          cursor: result.cursor,
          lastSuccessfulAt: completedAt,
          nextRunAt,
          consecutiveFailures: 0,
        })
        .onConflictDoUpdate({
          target: sourceSyncStates.sourceId,
          set: {
            cursor: result.cursor,
            lastSuccessfulAt: completedAt,
            nextRunAt,
            consecutiveFailures: 0,
            updatedAt: completedAt,
          },
        });
    });
  }

  return {
    connector,
    cursor: result.cursor,
    report,
    stats: result.stats,
  };
}

export async function runCatalogSync(
  database: TodamDatabase,
  connector: ConnectorName,
  apply: boolean,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
  now = new Date(),
): Promise<CatalogSyncResult> {
  try {
    return await executeCatalogSync(
      database,
      connector,
      apply,
      fetchImplementation,
      now,
    );
  } catch (error) {
    if (apply) {
      const sourceRows = await database
        .select({ id: catalogSources.id })
        .from(catalogSources)
        .where(eq(catalogSources.externalKey, sourceKeys[connector]))
        .limit(1);
      const source = sourceRows[0];
      if (source) {
        const failedAt = new Date();
        const message = error instanceof Error ? error.message : String(error);
        await database.transaction(async (transaction) => {
          await transaction.insert(sourceSyncRuns).values({
            sourceId: source.id,
            status: "failed",
            counts: {},
            error: message.slice(0, 4_000),
            completedAt: failedAt,
          });
          await transaction
            .insert(sourceSyncStates)
            .values({
              sourceId: source.id,
              consecutiveFailures: 1,
              nextRunAt: new Date(failedAt.getTime() + 60 * 60 * 1_000),
            })
            .onConflictDoUpdate({
              target: sourceSyncStates.sourceId,
              set: {
                consecutiveFailures: sql`${sourceSyncStates.consecutiveFailures} + 1`,
                nextRunAt: new Date(failedAt.getTime() + 60 * 60 * 1_000),
                updatedAt: failedAt,
              },
            });
        });
      }
    }
    throw error;
  }
}

export async function runCatalogSyncFromEnvironment(
  connector: ConnectorName,
  apply: boolean,
): Promise<CatalogSyncResult> {
  const { db, pool } = createDatabase();
  try {
    return await runCatalogSync(db, connector, apply);
  } finally {
    await pool.end();
  }
}

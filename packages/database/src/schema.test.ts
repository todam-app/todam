import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  diaryEntries,
  legalAcceptances,
  mediaAssets,
  productionMedia,
  performances,
  productions,
  ratings,
  user,
  watchlistEntries,
} from "./schema.js";

describe("schéma Todam", () => {
  it("sépare le catalogue des données personnelles", () => {
    expect([
      getTableName(productions),
      getTableName(performances),
      getTableName(user),
      getTableName(diaryEntries),
      getTableName(ratings),
      getTableName(watchlistEntries),
      getTableName(legalAcceptances),
      getTableName(mediaAssets),
      getTableName(productionMedia),
    ]).toEqual([
      "productions",
      "performances",
      "users",
      "diary_entries",
      "ratings",
      "watchlist_entries",
      "legal_acceptances",
      "media_assets",
      "production_media",
    ]);
  });
});

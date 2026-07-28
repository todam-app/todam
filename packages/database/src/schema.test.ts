import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  catalogRevisionChanges,
  catalogRevisions,
  companies,
  companyClaims,
  companyMemberships,
  contentReports,
  diaryEntries,
  legalAcceptances,
  listItems,
  lists,
  mediaAssets,
  performances,
  productionCompanies,
  productionDescriptions,
  productionMedia,
  productions,
  ratings,
  reviews,
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

  it("conserve la ville d'accueil comme préférence facultative du compte", () => {
    const columns = getTableColumns(user);

    expect(columns.homeLocality.notNull).toBe(false);
    expect(columns.homeCountryCode.notNull).toBe(false);
    expect(columns.homeOnboardingCompleted.notNull).toBe(true);
  });

  it("porte le statut éditorial et la provenance des contenus publics", () => {
    const productionColumns = getTableColumns(productions);
    const descriptionColumns = getTableColumns(productionDescriptions);

    expect(productionColumns.publicationStatus.notNull).toBe(true);
    expect(productionColumns.reviewedAt.notNull).toBe(false);
    expect(productionColumns.minimumAge.notNull).toBe(false);
    expect(descriptionColumns.rightsStatus.notNull).toBe(true);
    expect(descriptionColumns.lastVerifiedAt.notNull).toBe(true);
  });

  it("sépare les espaces membres et les workflows professionnels", () => {
    expect([
      getTableName(companies),
      getTableName(productionCompanies),
      getTableName(reviews),
      getTableName(lists),
      getTableName(listItems),
      getTableName(contentReports),
      getTableName(companyClaims),
      getTableName(companyMemberships),
      getTableName(catalogRevisions),
      getTableName(catalogRevisionChanges),
    ]).toEqual([
      "companies",
      "production_companies",
      "reviews",
      "lists",
      "list_items",
      "content_reports",
      "company_claims",
      "company_memberships",
      "catalog_revisions",
      "catalog_revision_changes",
    ]);

    expect(getTableColumns(companyClaims).representativeName.notNull).toBe(true);
    expect(getTableColumns(catalogRevisions).authorUserId.notNull).toBe(false);
  });

  it("rend le profil public configurable sans exposer de données privées", () => {
    const columns = getTableColumns(user);

    expect(columns.profileVisibility.notNull).toBe(true);
    expect(columns.bio.notNull).toBe(false);
  });
});

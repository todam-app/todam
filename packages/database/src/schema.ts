import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  geometry,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const roleEnum = pgEnum("user_role", ["member", "trusted_contributor", "admin"]);
export const disciplineEnum = pgEnum("discipline", ["theatre", "opera", "ballet"]);
export const audienceEnum = pgEnum("audience", ["general", "family", "children"]);
export const profileVisibilityEnum = pgEnum("profile_visibility", [
  "public",
  "private",
]);
export const publicationStatusEnum = pgEnum("publication_status", [
  "draft",
  "published",
  "hidden",
]);
export const contentVisibilityEnum = pgEnum("content_visibility", [
  "public",
  "private",
]);
export const descriptionKindEnum = pgEnum("description_kind", ["short", "full"]);
export const reviewStatusEnum = pgEnum("review_status", [
  "published",
  "hidden",
  "rejected",
]);
export const claimStatusEnum = pgEnum("claim_status", [
  "pending",
  "approved",
  "rejected",
  "revoked",
]);
export const companyMembershipRoleEnum = pgEnum("company_membership_role", [
  "representative",
  "editor",
  "manager",
]);
export const catalogRevisionStatusEnum = pgEnum("catalog_revision_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "superseded",
]);
export const catalogRevisionTargetEnum = pgEnum("catalog_revision_target", [
  "company",
  "production",
]);
export const contentReportTargetEnum = pgEnum("content_report_target", [
  "production",
  "venue",
  "company",
  "member",
  "list",
  "review",
]);
export const contentReportStatusEnum = pgEnum("content_report_status", [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);
export const contentReportCategoryEnum = pgEnum("content_report_category", [
  "visual_rights",
  "information",
  "schedule",
  "other",
]);
export const communitySubmissionStatusEnum = pgEnum("community_submission_status", [
  "published",
  "hidden",
]);
export const performanceStatusEnum = pgEnum("performance_status", [
  "scheduled",
  "completed",
  "cancelled",
  "postponed",
]);
export const creditRoleEnum = pgEnum("credit_role", [
  "author",
  "director",
  "performer",
  "choreographer",
  "composer",
  "musical_director",
  "designer",
  "other",
]);
export const rightsStatusEnum = pgEnum("rights_status", [
  "review_required",
  "factual_metadata_only",
  "permission_granted",
  "open_license",
  "contractual_display",
  "hotlink_only",
  "todam_original",
  "community_submission",
]);
export const sourceConnectorKindEnum = pgEnum("source_connector_kind", [
  "file",
  "base_lieux",
  "datatourisme",
  "openagenda",
  "ticketmaster",
  "partner",
  "community",
]);
export const mediaKindEnum = pgEnum("media_kind", [
  "poster",
  "key_visual",
  "photo",
  "logo",
]);
export const mediaStoragePolicyEnum = pgEnum("media_storage_policy", [
  "mirror",
  "hotlink",
  "temporary_cache",
  "metadata_only",
  "forbidden",
]);
export const importStatusEnum = pgEnum("import_status", [
  "running",
  "completed",
  "failed",
]);
export const registrationChannelEnum = pgEnum("registration_channel", [
  "web",
  "android",
]);

export const user = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: citext("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    pseudonym: citext("pseudonym").notNull(),
    ageConfirmedAt: timestamp("age_confirmed_at", {
      withTimezone: true,
    }).notNull(),
    age15OrOlder: boolean("age_15_or_older").notNull(),
    termsVersion: text("terms_version").notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at", {
      withTimezone: true,
    }).notNull(),
    privacyNoticeVersion: text("privacy_notice_version").notNull(),
    registrationChannel: registrationChannelEnum("registration_channel").notNull(),
    role: roleEnum("role").default("member").notNull(),
    homeLocality: text("home_locality"),
    homeCountryCode: text("home_country_code"),
    homeOnboardingCompleted: boolean("home_onboarding_completed")
      .default(false)
      .notNull(),
    profileVisibility: profileVisibilityEnum("profile_visibility")
      .default("public")
      .notNull(),
    bio: text("bio"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_pseudonym_unique").on(table.pseudonym),
    check("users_age_15_or_older_true", sql`${table.age15OrOlder} = true`),
    check(
      "users_home_city_complete",
      sql`(
        (${table.homeLocality} is null and ${table.homeCountryCode} is null)
        or (
          ${table.homeLocality} is not null
          and ${table.homeCountryCode} ~ '^[A-Z]{2}$'
        )
      )`,
    ),
  ],
);

export const legalAcceptances = pgTable(
  "legal_acceptances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    age15OrOlder: boolean("age_15_or_older").notNull(),
    termsVersion: text("terms_version").notNull(),
    privacyNoticeVersion: text("privacy_notice_version").notNull(),
    registrationChannel: registrationChannelEnum("registration_channel").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("legal_acceptances_user_idx").on(table.userId, table.acceptedAt),
    uniqueIndex("legal_acceptances_version_unique").on(
      table.userId,
      table.termsVersion,
      table.privacyNoticeVersion,
    ),
    check("legal_acceptances_age_true", sql`${table.age15OrOlder} = true`),
  ],
);

export const accountDeletionRequests = pgTable(
  "account_deletion_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("account_deletion_requests_token_unique").on(table.tokenHash),
    index("account_deletion_requests_user_idx").on(table.userId),
  ],
);

export const session = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_unique").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const catalogSources = pgTable("catalog_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalKey: text("external_key").notNull().unique(),
  name: text("name").notNull(),
  homepageUrl: text("homepage_url").notNull(),
  connectorKind: sourceConnectorKindEnum("connector_kind").default("file").notNull(),
  metadataLicense: text("metadata_license"),
  defaultMediaPolicy: mediaStoragePolicyEnum("default_media_policy")
    .default("metadata_only")
    .notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  ...timestamps,
});

export const sourceSyncStates = pgTable("source_sync_states", {
  sourceId: uuid("source_id")
    .primaryKey()
    .references(() => catalogSources.id, { onDelete: "cascade" }),
  cursor: text("cursor"),
  etag: text("etag"),
  lastModified: text("last_modified"),
  lastSuccessfulAt: timestamp("last_successful_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  consecutiveFailures: integer("consecutive_failures").default(0).notNull(),
  ...timestamps,
});

export const sourceSyncRuns = pgTable(
  "source_sync_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => catalogSources.id, { onDelete: "cascade" }),
    status: importStatusEnum("status").default("running").notNull(),
    cursorBefore: text("cursor_before"),
    cursorAfter: text("cursor_after"),
    counts: jsonb("counts").$type<Record<string, number>>().notNull(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("source_sync_runs_source_started_idx").on(table.sourceId, table.startedAt),
  ],
);

export const sourceDocuments = pgTable(
  "source_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => catalogSources.id, { onDelete: "cascade" }),
    externalKey: text("external_key").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    rightsStatus: rightsStatusEnum("rights_status").notNull(),
    license: text("license"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("source_documents_external_unique").on(
      table.sourceId,
      table.externalKey,
    ),
  ],
);

export const importBatches = pgTable("import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => catalogSources.id, { onDelete: "cascade" }),
  coverageLabel: text("coverage_label").notNull(),
  contentHash: text("content_hash").notNull(),
  status: importStatusEnum("status").default("running").notNull(),
  counts: jsonb("counts").$type<Record<string, number>>().notNull(),
  error: text("error"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const works = pgTable(
  "works",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    discipline: disciplineEnum("discipline").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("works_slug_unique").on(table.slug),
    index("works_title_trgm_idx").using("gin", sql`${table.title} gin_trgm_ops`),
  ],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    addressLine1: text("address_line_1").notNull(),
    postalCode: text("postal_code").notNull(),
    locality: text("locality").notNull(),
    countryCode: text("country_code").notNull(),
    timezone: text("timezone").notNull(),
    officialUrl: text("official_url"),
    isActive: boolean("is_active").default(true).notNull(),
    coordinates: geometry("coordinates", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("venues_slug_unique").on(table.slug),
    index("venues_name_trgm_idx").using("gin", sql`${table.name} gin_trgm_ops`),
    index("venues_locality_country_idx").on(table.locality, table.countryCode),
  ],
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    officialUrl: text("official_url"),
    locality: text("locality"),
    countryCode: text("country_code"),
    publicationStatus: publicationStatusEnum("publication_status")
      .default("draft")
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("companies_slug_unique").on(table.slug),
    index("companies_name_trgm_idx").using("gin", sql`${table.name} gin_trgm_ops`),
    index("companies_publication_idx").on(table.publicationStatus, table.name),
    check(
      "companies_country_code_format",
      sql`${table.countryCode} is null or ${table.countryCode} ~ '^[A-Z]{2}$'`,
    ),
  ],
);

export const artists = pgTable(
  "artists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("artists_slug_unique").on(table.slug),
    index("artists_name_trgm_idx").using("gin", sql`${table.name} gin_trgm_ops`),
  ],
);

export const productions = pgTable(
  "productions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workId: uuid("work_id").references(() => works.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    discipline: disciplineEnum("discipline").notNull(),
    audience: audienceEnum("audience").default("general").notNull(),
    minimumAge: integer("minimum_age"),
    durationMinutes: integer("duration_minutes"),
    language: text("language"),
    officialUrl: text("official_url"),
    isActive: boolean("is_active").default(true).notNull(),
    publicationStatus: publicationStatusEnum("publication_status")
      .default("draft")
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("productions_slug_unique").on(table.slug),
    index("productions_title_trgm_idx").using("gin", sql`${table.title} gin_trgm_ops`),
    index("productions_publication_idx").on(table.publicationStatus, table.discipline),
    check(
      "productions_duration_positive",
      sql`${table.durationMinutes} is null or ${table.durationMinutes} > 0`,
    ),
    check(
      "productions_minimum_age_range",
      sql`${table.minimumAge} is null or (${table.minimumAge} >= 0 and ${table.minimumAge} <= 99)`,
    ),
  ],
);

export const productionCompanies = pgTable(
  "production_companies",
  {
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    position: integer("position").default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productionId, table.companyId] }),
    index("production_companies_company_idx").on(table.companyId),
    uniqueIndex("production_companies_primary_unique")
      .on(table.productionId)
      .where(sql`${table.isPrimary} = true`),
    index("production_companies_order_idx").on(
      table.productionId,
      table.isPrimary,
      table.position,
    ),
  ],
);

export const productionDescriptions = pgTable(
  "production_descriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    locale: text("locale").default("fr").notNull(),
    kind: descriptionKindEnum("kind").notNull(),
    body: text("body").notNull(),
    sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, {
      onDelete: "set null",
    }),
    sourceUrl: text("source_url"),
    rightsStatus: rightsStatusEnum("rights_status").notNull(),
    license: text("license"),
    lastVerifiedAt: timestamp("last_verified_at", {
      withTimezone: true,
    }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("production_descriptions_locale_kind_unique").on(
      table.productionId,
      table.locale,
      table.kind,
    ),
    index("production_descriptions_source_idx").on(table.sourceDocumentId),
    check(
      "production_descriptions_source_present",
      sql`${table.sourceDocumentId} is not null or ${table.sourceUrl} is not null or ${table.rightsStatus} = 'todam_original'`,
    ),
    check(
      "production_descriptions_open_license_named",
      sql`${table.rightsStatus} <> 'open_license' or ${table.license} is not null`,
    ),
  ],
);

export const productionCredits = pgTable(
  "production_credits",
  {
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    role: creditRoleEnum("role").notNull(),
    label: text("label"),
    position: integer("position").default(0).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.productionId, table.artistId, table.role, table.position],
    }),
    index("production_credits_artist_idx").on(table.artistId),
  ],
);

export const performances = pgTable(
  "performances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: performanceStatusEnum("status").default("scheduled").notNull(),
    officialUrl: text("official_url"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("performances_slot_unique").on(
      table.productionId,
      table.venueId,
      table.startsAt,
    ),
    index("performances_starts_at_idx").on(table.startsAt),
    index("performances_venue_idx").on(table.venueId),
    check(
      "performances_end_after_start",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => catalogSources.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    externalKey: text("external_key").notNull(),
    kind: mediaKindEnum("kind").notNull(),
    remoteUrl: text("remote_url").notNull(),
    storageKey: text("storage_key"),
    sha256: text("sha256"),
    mirroredAt: timestamp("mirrored_at", { withTimezone: true }),
    storagePolicy: mediaStoragePolicyEnum("storage_policy").notNull(),
    alt: text("alt"),
    credit: text("credit"),
    copyrightHolder: text("copyright_holder"),
    rightsStatus: rightsStatusEnum("rights_status").notNull(),
    license: text("license"),
    termsUrl: text("terms_url"),
    width: integer("width"),
    height: integer("height"),
    mimeType: text("mime_type"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("media_assets_external_unique").on(table.sourceId, table.externalKey),
    index("media_assets_document_idx").on(table.documentId),
    check(
      "media_assets_width_positive",
      sql`${table.width} is null or ${table.width} > 0`,
    ),
    check(
      "media_assets_height_positive",
      sql`${table.height} is null or ${table.height} > 0`,
    ),
    check(
      "media_assets_storage_rights",
      sql`${table.storagePolicy} <> 'mirror' or ${table.rightsStatus}::text in ('open_license', 'permission_granted', 'todam_original', 'community_submission')`,
    ),
    check(
      "media_assets_open_license_named",
      sql`${table.rightsStatus} <> 'open_license' or ${table.license} is not null`,
    ),
    check(
      "media_assets_sha256_format",
      sql`${table.sha256} is null or ${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "media_assets_validity_window",
      sql`${table.validFrom} is null or ${table.validUntil} is null or ${table.validUntil} > ${table.validFrom}`,
    ),
  ],
);

export const productionMedia = pgTable(
  "production_media",
  {
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    position: integer("position").default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productionId, table.mediaId] }),
    uniqueIndex("production_media_primary_unique")
      .on(table.productionId)
      .where(sql`${table.isPrimary} = true`),
    index("production_media_order_idx").on(
      table.productionId,
      table.isPrimary,
      table.position,
    ),
  ],
);

export const performanceMedia = pgTable(
  "performance_media",
  {
    performanceId: uuid("performance_id")
      .notNull()
      .references(() => performances.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.performanceId, table.mediaId] }),
    index("performance_media_media_idx").on(table.mediaId),
  ],
);

function provenanceTable<
  TName extends string,
  TColumn extends string,
  TReference extends () => any,
>(name: TName, columnName: TColumn, reference: TReference) {
  return pgTable(
    name,
    {
      entityId: uuid(columnName)
        .notNull()
        .references(reference, { onDelete: "cascade" }),
      documentId: uuid("document_id")
        .notNull()
        .references(() => sourceDocuments.id, { onDelete: "cascade" }),
      externalKey: text("external_key").notNull(),
      observedAt: timestamp("observed_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      primaryKey({ columns: [table.entityId, table.documentId] }),
      uniqueIndex(`${name}_external_unique`).on(table.documentId, table.externalKey),
    ],
  );
}

export const workSources = provenanceTable("work_sources", "work_id", () => works.id);
export const venueSources = provenanceTable(
  "venue_sources",
  "venue_id",
  () => venues.id,
);
export const artistSources = provenanceTable(
  "artist_sources",
  "artist_id",
  () => artists.id,
);
export const companySources = provenanceTable(
  "company_sources",
  "company_id",
  () => companies.id,
);
export const productionSources = provenanceTable(
  "production_sources",
  "production_id",
  () => productions.id,
);
export const performanceSources = provenanceTable(
  "performance_sources",
  "performance_id",
  () => performances.id,
);

export const diaryEntries = pgTable(
  "diary_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    performanceId: uuid("performance_id").references(() => performances.id, {
      onDelete: "set null",
    }),
    attendedOn: date("attended_on"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("diary_entries_user_recent_idx").on(table.userId, table.createdAt),
    uniqueIndex("diary_entries_user_performance_unique")
      .on(table.userId, table.performanceId)
      .where(sql`${table.performanceId} is not null`),
    uniqueIndex("diary_entries_user_production_date_unique")
      .on(table.userId, table.productionId, table.attendedOn)
      .where(sql`${table.performanceId} is null and ${table.attendedOn} is not null`),
    uniqueIndex("diary_entries_user_production_undated_unique")
      .on(table.userId, table.productionId)
      .where(sql`${table.performanceId} is null and ${table.attendedOn} is null`),
  ],
);

export const ratings = pgTable(
  "ratings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.productionId] }),
    check("ratings_value_range", sql`${table.value} between 1 and 10`),
  ],
);

export const watchlistEntries = pgTable(
  "watchlist_entries",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.productionId] }),
    index("watchlist_entries_user_recent_idx").on(table.userId, table.addedAt),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    containsSpoiler: boolean("contains_spoiler").default(false).notNull(),
    visibility: contentVisibilityEnum("visibility").default("private").notNull(),
    status: reviewStatusEnum("status").default("published").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("reviews_user_production_unique").on(table.userId, table.productionId),
    index("reviews_production_public_idx").on(
      table.productionId,
      table.status,
      table.createdAt,
    ),
    check(
      "reviews_body_not_blank",
      sql`length(btrim(${table.body})) between 20 and 5000`,
    ),
  ],
);

export const lists = pgTable(
  "lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    visibility: contentVisibilityEnum("visibility").default("private").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("lists_user_slug_unique").on(table.userId, table.slug),
    index("lists_user_updated_idx").on(table.userId, table.updatedAt),
    check("lists_name_not_blank", sql`length(btrim(${table.name})) between 1 and 80`),
  ],
);

export const listItems = pgTable(
  "list_items",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    position: integer("position").default(0).notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.listId, table.productionId] }),
    index("list_items_order_idx").on(table.listId, table.position, table.addedAt),
    check("list_items_position_non_negative", sql`${table.position} >= 0`),
  ],
);

export const contentReports = pgTable(
  "content_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterUserId: text("reporter_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetType: contentReportTargetEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    category: contentReportCategoryEnum("category").default("other").notNull(),
    mediaId: uuid("media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    status: contentReportStatusEnum("status").default("open").notNull(),
    decision: text("decision"),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("content_reports_queue_idx").on(table.status, table.createdAt),
    index("content_reports_target_idx").on(table.targetType, table.targetId),
    check(
      "content_reports_reason_not_blank",
      sql`length(btrim(${table.reason})) between 10 and 2000`,
    ),
  ],
);

export const communitySubmissions = pgTable(
  "community_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorUserId: text("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    productionId: uuid("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    sourceUrl: text("source_url").notNull(),
    submittedData: jsonb("submitted_data").$type<Record<string, unknown>>().notNull(),
    status: communitySubmissionStatusEnum("status").default("published").notNull(),
    moderationHistory: jsonb("moderation_history")
      .$type<
        {
          at: string;
          by: string | null;
          action: string;
          reason: string | null;
        }[]
      >()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("community_submissions_author_idx").on(table.authorUserId, table.createdAt),
    index("community_submissions_production_idx").on(table.productionId),
    index("community_submissions_status_idx").on(table.status, table.createdAt),
  ],
);

export const companyClaims = pgTable(
  "company_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    representativeName: text("representative_name").notNull(),
    roleTitle: text("role_title").notNull(),
    professionalEmail: citext("professional_email").notNull(),
    officialWebsiteUrl: text("official_website_url").notNull(),
    evidence: text("evidence").notNull(),
    authorityConfirmed: boolean("authority_confirmed").notNull(),
    status: claimStatusEnum("status").default("pending").notNull(),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decisionReason: text("decision_reason"),
    ...timestamps,
  },
  (table) => [
    index("company_claims_queue_idx").on(table.status, table.createdAt),
    index("company_claims_company_user_idx").on(table.companyId, table.userId),
    uniqueIndex("company_claims_user_active_unique")
      .on(table.userId)
      .where(sql`${table.status} in ('pending', 'approved')`),
    check(
      "company_claims_authority_confirmed",
      sql`${table.authorityConfirmed} = true`,
    ),
  ],
);

export const companyMemberships = pgTable(
  "company_memberships",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: companyMembershipRoleEnum("role").default("representative").notNull(),
    roleTitle: text("role_title").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.companyId, table.userId] }),
    uniqueIndex("company_memberships_user_unique").on(table.userId),
  ],
);

export const catalogRevisions = pgTable(
  "catalog_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetType: catalogRevisionTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    status: catalogRevisionStatusEnum("status").default("draft").notNull(),
    justification: text("justification"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decisionReason: text("decision_reason"),
    ...timestamps,
  },
  (table) => [
    index("catalog_revisions_company_idx").on(
      table.companyId,
      table.status,
      table.updatedAt,
    ),
    index("catalog_revisions_target_idx").on(table.targetType, table.targetId),
  ],
);

export const catalogRevisionChanges = pgTable(
  "catalog_revision_changes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => catalogRevisions.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    oldValue: jsonb("old_value").$type<unknown>(),
    newValue: jsonb("new_value").$type<unknown>(),
    provenanceUrl: text("provenance_url"),
    rightsStatus: rightsStatusEnum("rights_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("catalog_revision_changes_field_unique").on(
      table.revisionId,
      table.field,
    ),
    index("catalog_revision_changes_revision_idx").on(table.revisionId),
  ],
);

export const schema = {
  account,
  accountDeletionRequests,
  artistSources,
  artists,
  catalogRevisionChanges,
  catalogRevisions,
  catalogSources,
  communitySubmissions,
  companies,
  companyClaims,
  companyMemberships,
  companySources,
  contentReports,
  diaryEntries,
  importBatches,
  legalAcceptances,
  listItems,
  lists,
  mediaAssets,
  performanceSources,
  performanceMedia,
  performances,
  productionCompanies,
  productionCredits,
  productionDescriptions,
  productionMedia,
  productionSources,
  productions,
  ratings,
  reviews,
  session,
  sourceDocuments,
  sourceSyncRuns,
  sourceSyncStates,
  user,
  venueSources,
  venues,
  verification,
  watchlistEntries,
  workSources,
  works,
};

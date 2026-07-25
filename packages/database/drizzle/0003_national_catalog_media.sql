ALTER TYPE "rights_status" ADD VALUE IF NOT EXISTS 'contractual_display';
ALTER TYPE "rights_status" ADD VALUE IF NOT EXISTS 'hotlink_only';

CREATE TYPE "source_connector_kind" AS ENUM (
  'file',
  'base_lieux',
  'datatourisme',
  'openagenda',
  'ticketmaster',
  'partner'
);
CREATE TYPE "media_kind" AS ENUM ('poster', 'key_visual', 'photo', 'logo');
CREATE TYPE "media_storage_policy" AS ENUM (
  'mirror',
  'hotlink',
  'temporary_cache',
  'metadata_only',
  'forbidden'
);

ALTER TABLE "catalog_sources"
  ADD COLUMN "connector_kind" "source_connector_kind" DEFAULT 'file' NOT NULL,
  ADD COLUMN "metadata_license" text,
  ADD COLUMN "default_media_policy" "media_storage_policy" DEFAULT 'metadata_only' NOT NULL,
  ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;

ALTER TABLE "productions"
  ADD COLUMN "official_url" text,
  ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;

ALTER TABLE "performances"
  ADD COLUMN "ends_at" timestamp with time zone,
  ADD COLUMN "official_url" text;

CREATE TABLE "source_sync_states" (
  "source_id" uuid PRIMARY KEY NOT NULL,
  "cursor" text,
  "etag" text,
  "last_modified" text,
  "last_successful_at" timestamp with time zone,
  "next_run_at" timestamp with time zone,
  "consecutive_failures" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "source_sync_states_source_id_catalog_sources_id_fk"
    FOREIGN KEY ("source_id") REFERENCES "catalog_sources"("id")
    ON DELETE cascade
);

CREATE TABLE "source_sync_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL,
  "status" "import_status" DEFAULT 'running' NOT NULL,
  "cursor_before" text,
  "cursor_after" text,
  "counts" jsonb NOT NULL,
  "error" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "source_sync_runs_source_id_catalog_sources_id_fk"
    FOREIGN KEY ("source_id") REFERENCES "catalog_sources"("id")
    ON DELETE cascade
);
CREATE INDEX "source_sync_runs_source_started_idx"
  ON "source_sync_runs" ("source_id", "started_at");

CREATE TABLE "media_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL,
  "document_id" uuid NOT NULL,
  "external_key" text NOT NULL,
  "kind" "media_kind" NOT NULL,
  "remote_url" text NOT NULL,
  "storage_key" text,
  "sha256" text,
  "mirrored_at" timestamp with time zone,
  "storage_policy" "media_storage_policy" NOT NULL,
  "alt" text,
  "credit" text NOT NULL,
  "copyright_holder" text,
  "rights_status" "rights_status" NOT NULL,
  "license" text,
  "terms_url" text,
  "width" integer,
  "height" integer,
  "mime_type" text,
  "valid_from" timestamp with time zone,
  "valid_until" timestamp with time zone,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "media_assets_source_id_catalog_sources_id_fk"
    FOREIGN KEY ("source_id") REFERENCES "catalog_sources"("id")
    ON DELETE cascade,
  CONSTRAINT "media_assets_document_id_source_documents_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "source_documents"("id")
    ON DELETE cascade,
  CONSTRAINT "media_assets_width_positive"
    CHECK ("width" is null or "width" > 0),
  CONSTRAINT "media_assets_height_positive"
    CHECK ("height" is null or "height" > 0),
  CONSTRAINT "media_assets_storage_rights"
    CHECK ("storage_policy" <> 'mirror' or "rights_status" in ('open_license', 'permission_granted')),
  CONSTRAINT "media_assets_open_license_named"
    CHECK ("rights_status" <> 'open_license' or "license" is not null),
  CONSTRAINT "media_assets_sha256_format"
    CHECK ("sha256" is null or "sha256" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "media_assets_external_unique"
  ON "media_assets" ("source_id", "external_key");
CREATE INDEX "media_assets_document_idx" ON "media_assets" ("document_id");

CREATE TABLE "production_media" (
  "production_id" uuid NOT NULL,
  "media_id" uuid NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "production_media_production_id_media_id_pk"
    PRIMARY KEY ("production_id", "media_id"),
  CONSTRAINT "production_media_production_id_productions_id_fk"
    FOREIGN KEY ("production_id") REFERENCES "productions"("id")
    ON DELETE cascade,
  CONSTRAINT "production_media_media_id_media_assets_id_fk"
    FOREIGN KEY ("media_id") REFERENCES "media_assets"("id")
    ON DELETE cascade
);
CREATE INDEX "production_media_order_idx"
  ON "production_media" ("production_id", "is_primary", "position");

CREATE TABLE "performance_media" (
  "performance_id" uuid NOT NULL,
  "media_id" uuid NOT NULL,
  CONSTRAINT "performance_media_performance_id_media_id_pk"
    PRIMARY KEY ("performance_id", "media_id"),
  CONSTRAINT "performance_media_performance_id_performances_id_fk"
    FOREIGN KEY ("performance_id") REFERENCES "performances"("id")
    ON DELETE cascade,
  CONSTRAINT "performance_media_media_id_media_assets_id_fk"
    FOREIGN KEY ("media_id") REFERENCES "media_assets"("id")
    ON DELETE cascade
);
CREATE INDEX "performance_media_media_idx" ON "performance_media" ("media_id");

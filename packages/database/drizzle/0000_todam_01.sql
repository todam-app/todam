CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM ('member', 'trusted_contributor', 'admin');
--> statement-breakpoint
CREATE TYPE "discipline" AS ENUM ('theatre', 'opera', 'ballet');
--> statement-breakpoint
CREATE TYPE "audience" AS ENUM ('general', 'family', 'children');
--> statement-breakpoint
CREATE TYPE "performance_status" AS ENUM ('scheduled', 'completed', 'cancelled', 'postponed');
--> statement-breakpoint
CREATE TYPE "credit_role" AS ENUM ('author', 'director', 'performer', 'choreographer', 'composer', 'musical_director', 'designer', 'other');
--> statement-breakpoint
CREATE TYPE "rights_status" AS ENUM ('review_required', 'factual_metadata_only', 'permission_granted', 'open_license');
--> statement-breakpoint
CREATE TYPE "import_status" AS ENUM ('running', 'completed', 'failed');
--> statement-breakpoint
CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" citext NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "pseudonym" citext NOT NULL,
  "age_confirmed_at" timestamp with time zone NOT NULL,
  "role" "user_role" DEFAULT 'member' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "users_pseudonym_unique" ON "users" ("pseudonym");
--> statement-breakpoint
CREATE TABLE "sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "token" text NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" ("token");
--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
--> statement-breakpoint
CREATE TABLE "accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_token_expires_at" timestamp with time zone,
  "scope" text,
  "password" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_unique" ON "accounts" ("provider_id", "account_id");
--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");
--> statement-breakpoint
CREATE TABLE "verifications" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");
--> statement-breakpoint
CREATE TABLE "catalog_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "external_key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "homepage_url" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "catalog_sources"("id") ON DELETE cascade,
  "external_key" text NOT NULL,
  "title" text NOT NULL,
  "url" text NOT NULL,
  "retrieved_at" timestamp with time zone NOT NULL,
  "rights_status" "rights_status" NOT NULL,
  "license" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "source_documents_external_unique" ON "source_documents" ("source_id", "external_key");
--> statement-breakpoint
CREATE TABLE "import_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "catalog_sources"("id") ON DELETE cascade,
  "coverage_label" text NOT NULL,
  "content_hash" text NOT NULL,
  "status" "import_status" DEFAULT 'running' NOT NULL,
  "counts" jsonb NOT NULL,
  "error" text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "works" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "discipline" "discipline" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "works_slug_unique" ON "works" ("slug");
--> statement-breakpoint
CREATE INDEX "works_title_trgm_idx" ON "works" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE TABLE "venues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "address_line_1" text NOT NULL,
  "postal_code" text NOT NULL,
  "locality" text NOT NULL,
  "country_code" text NOT NULL,
  "timezone" text NOT NULL,
  "coordinates" geometry(point, 4326),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "venues_slug_unique" ON "venues" ("slug");
--> statement-breakpoint
CREATE INDEX "venues_name_trgm_idx" ON "venues" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE TABLE "artists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "artists_slug_unique" ON "artists" ("slug");
--> statement-breakpoint
CREATE INDEX "artists_name_trgm_idx" ON "artists" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE TABLE "productions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "work_id" uuid REFERENCES "works"("id") ON DELETE set null,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "discipline" "discipline" NOT NULL,
  "audience" "audience" DEFAULT 'general' NOT NULL,
  "duration_minutes" integer,
  "language" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "productions_duration_positive" CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "productions_slug_unique" ON "productions" ("slug");
--> statement-breakpoint
CREATE INDEX "productions_title_trgm_idx" ON "productions" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE TABLE "production_credits" (
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE cascade,
  "artist_id" uuid NOT NULL REFERENCES "artists"("id") ON DELETE cascade,
  "role" "credit_role" NOT NULL,
  "label" text,
  "position" integer DEFAULT 0 NOT NULL,
  PRIMARY KEY ("production_id", "artist_id", "role", "position")
);
--> statement-breakpoint
CREATE INDEX "production_credits_artist_idx" ON "production_credits" ("artist_id");
--> statement-breakpoint
CREATE TABLE "performances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE cascade,
  "venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE restrict,
  "starts_at" timestamp with time zone NOT NULL,
  "status" "performance_status" DEFAULT 'scheduled' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "performances_slot_unique" ON "performances" ("production_id", "venue_id", "starts_at");
--> statement-breakpoint
CREATE INDEX "performances_starts_at_idx" ON "performances" ("starts_at");
--> statement-breakpoint
CREATE INDEX "performances_venue_idx" ON "performances" ("venue_id");
--> statement-breakpoint
CREATE TABLE "work_sources" (
  "work_id" uuid NOT NULL REFERENCES "works"("id") ON DELETE cascade,
  "document_id" uuid NOT NULL REFERENCES "source_documents"("id") ON DELETE cascade,
  "external_key" text NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("work_id", "document_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "work_sources_external_unique" ON "work_sources" ("document_id", "external_key");
--> statement-breakpoint
CREATE TABLE "venue_sources" (
  "venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE cascade,
  "document_id" uuid NOT NULL REFERENCES "source_documents"("id") ON DELETE cascade,
  "external_key" text NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("venue_id", "document_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "venue_sources_external_unique" ON "venue_sources" ("document_id", "external_key");
--> statement-breakpoint
CREATE TABLE "artist_sources" (
  "artist_id" uuid NOT NULL REFERENCES "artists"("id") ON DELETE cascade,
  "document_id" uuid NOT NULL REFERENCES "source_documents"("id") ON DELETE cascade,
  "external_key" text NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("artist_id", "document_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "artist_sources_external_unique" ON "artist_sources" ("document_id", "external_key");
--> statement-breakpoint
CREATE TABLE "production_sources" (
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE cascade,
  "document_id" uuid NOT NULL REFERENCES "source_documents"("id") ON DELETE cascade,
  "external_key" text NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("production_id", "document_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "production_sources_external_unique" ON "production_sources" ("document_id", "external_key");
--> statement-breakpoint
CREATE TABLE "performance_sources" (
  "performance_id" uuid NOT NULL REFERENCES "performances"("id") ON DELETE cascade,
  "document_id" uuid NOT NULL REFERENCES "source_documents"("id") ON DELETE cascade,
  "external_key" text NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("performance_id", "document_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "performance_sources_external_unique" ON "performance_sources" ("document_id", "external_key");
--> statement-breakpoint
CREATE TABLE "diary_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE cascade,
  "performance_id" uuid REFERENCES "performances"("id") ON DELETE set null,
  "attended_on" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "diary_entries_user_recent_idx" ON "diary_entries" ("user_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "diary_entries_user_performance_unique" ON "diary_entries" ("user_id", "performance_id") WHERE "performance_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE "ratings" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE cascade,
  "value" smallint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "production_id"),
  CONSTRAINT "ratings_value_range" CHECK ("value" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "watchlist_entries" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE cascade,
  "added_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "production_id")
);
--> statement-breakpoint
CREATE INDEX "watchlist_entries_user_recent_idx" ON "watchlist_entries" ("user_id", "added_at");

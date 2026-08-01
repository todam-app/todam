ALTER TYPE "rights_status" ADD VALUE IF NOT EXISTS 'todam_original';
--> statement-breakpoint
CREATE TYPE "profile_visibility" AS ENUM ('public', 'private');
--> statement-breakpoint
CREATE TYPE "publication_status" AS ENUM ('draft', 'published', 'hidden');
--> statement-breakpoint
CREATE TYPE "content_visibility" AS ENUM ('public', 'private');
--> statement-breakpoint
CREATE TYPE "description_kind" AS ENUM ('short', 'full');
--> statement-breakpoint
CREATE TYPE "review_status" AS ENUM ('published', 'hidden', 'rejected');
--> statement-breakpoint
CREATE TYPE "claim_status" AS ENUM ('pending', 'approved', 'rejected', 'revoked');
--> statement-breakpoint
CREATE TYPE "company_membership_role" AS ENUM ('representative', 'editor', 'manager');
--> statement-breakpoint
CREATE TYPE "catalog_revision_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'superseded');
--> statement-breakpoint
CREATE TYPE "catalog_revision_target" AS ENUM ('company', 'production');
--> statement-breakpoint
CREATE TYPE "content_report_target" AS ENUM ('production', 'venue', 'company', 'member', 'list', 'review');
--> statement-breakpoint
CREATE TYPE "content_report_status" AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
--> statement-breakpoint

ALTER TABLE "users"
  ADD COLUMN "profile_visibility" "profile_visibility" DEFAULT 'public' NOT NULL,
  ADD COLUMN "bio" text;
--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "official_url" text;
--> statement-breakpoint
ALTER TABLE "productions"
  ADD COLUMN "publication_status" "publication_status" DEFAULT 'draft' NOT NULL,
  ADD COLUMN "reviewed_at" timestamp with time zone,
  ADD COLUMN "reviewed_by" text REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "productions_publication_idx"
  ON "productions" ("publication_status", "discipline");
--> statement-breakpoint

CREATE TABLE "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "short_description" text,
  "description" text,
  "official_url" text,
  "locality" text,
  "country_code" text,
  "publication_status" "publication_status" DEFAULT 'draft' NOT NULL,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "companies_country_code_format"
    CHECK ("country_code" is null or "country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_unique" ON "companies" ("slug");
--> statement-breakpoint
CREATE INDEX "companies_name_trgm_idx"
  ON "companies" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "companies_publication_idx"
  ON "companies" ("publication_status", "name");
--> statement-breakpoint

CREATE TABLE "company_sources" (
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "document_id" uuid NOT NULL REFERENCES "source_documents"("id") ON DELETE CASCADE,
  "external_key" text NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "company_sources_company_id_document_id_pk"
    PRIMARY KEY ("company_id", "document_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "company_sources_external_unique"
  ON "company_sources" ("document_id", "external_key");
--> statement-breakpoint

CREATE TABLE "production_companies" (
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "is_primary" boolean DEFAULT false NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "production_companies_production_id_company_id_pk"
    PRIMARY KEY ("production_id", "company_id")
);
--> statement-breakpoint
CREATE INDEX "production_companies_company_idx"
  ON "production_companies" ("company_id");
--> statement-breakpoint
CREATE INDEX "production_companies_order_idx"
  ON "production_companies" ("production_id", "is_primary", "position");
--> statement-breakpoint

CREATE TABLE "production_descriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "locale" text DEFAULT 'fr' NOT NULL,
  "kind" "description_kind" NOT NULL,
  "body" text NOT NULL,
  "source_document_id" uuid REFERENCES "source_documents"("id") ON DELETE SET NULL,
  "source_url" text,
  "rights_status" "rights_status" NOT NULL,
  "license" text,
  "last_verified_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "production_descriptions_source_present"
    CHECK (
      "source_document_id" is not null
      or "source_url" is not null
      or "rights_status"::text = 'todam_original'
    ),
  CONSTRAINT "production_descriptions_open_license_named"
    CHECK ("rights_status"::text <> 'open_license' or "license" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "production_descriptions_locale_kind_unique"
  ON "production_descriptions" ("production_id", "locale", "kind");
--> statement-breakpoint
CREATE INDEX "production_descriptions_source_idx"
  ON "production_descriptions" ("source_document_id");
--> statement-breakpoint

CREATE TABLE "reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "contains_spoiler" boolean DEFAULT false NOT NULL,
  "visibility" "content_visibility" DEFAULT 'public' NOT NULL,
  "status" "review_status" DEFAULT 'published' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reviews_body_not_blank"
    CHECK (length(btrim("body")) between 20 and 5000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_production_unique"
  ON "reviews" ("user_id", "production_id");
--> statement-breakpoint
CREATE INDEX "reviews_production_public_idx"
  ON "reviews" ("production_id", "status", "created_at");
--> statement-breakpoint

CREATE TABLE "lists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "visibility" "content_visibility" DEFAULT 'public' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "lists_name_not_blank"
    CHECK (length(btrim("name")) between 1 and 80)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "lists_user_slug_unique" ON "lists" ("user_id", "slug");
--> statement-breakpoint
CREATE INDEX "lists_user_updated_idx" ON "lists" ("user_id", "updated_at");
--> statement-breakpoint

CREATE TABLE "list_items" (
  "list_id" uuid NOT NULL REFERENCES "lists"("id") ON DELETE CASCADE,
  "production_id" uuid NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "position" integer DEFAULT 0 NOT NULL,
  "added_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "list_items_list_id_production_id_pk"
    PRIMARY KEY ("list_id", "production_id"),
  CONSTRAINT "list_items_position_non_negative" CHECK ("position" >= 0)
);
--> statement-breakpoint
CREATE INDEX "list_items_order_idx"
  ON "list_items" ("list_id", "position", "added_at");
--> statement-breakpoint

CREATE TABLE "content_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reporter_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "target_type" "content_report_target" NOT NULL,
  "target_id" text NOT NULL,
  "reason" text NOT NULL,
  "status" "content_report_status" DEFAULT 'open' NOT NULL,
  "decision" text,
  "reviewed_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "content_reports_reason_not_blank"
    CHECK (length(btrim("reason")) between 10 and 2000)
);
--> statement-breakpoint
CREATE INDEX "content_reports_queue_idx"
  ON "content_reports" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "content_reports_target_idx"
  ON "content_reports" ("target_type", "target_id");
--> statement-breakpoint

CREATE TABLE "company_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role_title" text NOT NULL,
  "professional_email" citext NOT NULL,
  "official_website_url" text NOT NULL,
  "evidence" text NOT NULL,
  "authority_confirmed" boolean NOT NULL,
  "status" "claim_status" DEFAULT 'pending' NOT NULL,
  "reviewed_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp with time zone,
  "decision_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "company_claims_authority_confirmed"
    CHECK ("authority_confirmed" = true)
);
--> statement-breakpoint
CREATE INDEX "company_claims_queue_idx"
  ON "company_claims" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "company_claims_company_user_idx"
  ON "company_claims" ("company_id", "user_id");
--> statement-breakpoint

CREATE TABLE "company_memberships" (
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "company_membership_role" DEFAULT 'representative' NOT NULL,
  "role_title" text NOT NULL,
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "company_memberships_company_id_user_id_pk"
    PRIMARY KEY ("company_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX "company_memberships_user_idx"
  ON "company_memberships" ("user_id");
--> statement-breakpoint

CREATE TABLE "catalog_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "author_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "target_type" "catalog_revision_target" NOT NULL,
  "target_id" uuid NOT NULL,
  "status" "catalog_revision_status" DEFAULT 'draft' NOT NULL,
  "justification" text,
  "submitted_at" timestamp with time zone,
  "reviewed_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp with time zone,
  "decision_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "catalog_revisions_company_idx"
  ON "catalog_revisions" ("company_id", "status", "updated_at");
--> statement-breakpoint
CREATE INDEX "catalog_revisions_target_idx"
  ON "catalog_revisions" ("target_type", "target_id");
--> statement-breakpoint

CREATE TABLE "catalog_revision_changes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "revision_id" uuid NOT NULL REFERENCES "catalog_revisions"("id") ON DELETE CASCADE,
  "field" text NOT NULL,
  "old_value" jsonb,
  "new_value" jsonb,
  "provenance_url" text,
  "rights_status" "rights_status",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_revision_changes_field_unique"
  ON "catalog_revision_changes" ("revision_id", "field");
--> statement-breakpoint
CREATE INDEX "catalog_revision_changes_revision_idx"
  ON "catalog_revision_changes" ("revision_id");

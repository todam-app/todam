CREATE TYPE "public"."community_submission_status" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."content_report_category" AS ENUM('visual_rights', 'information', 'schedule', 'other');--> statement-breakpoint
ALTER TYPE "public"."rights_status" ADD VALUE 'community_submission';--> statement-breakpoint
ALTER TYPE "public"."source_connector_kind" ADD VALUE 'community';--> statement-breakpoint
CREATE TABLE "community_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_user_id" text,
	"production_id" uuid NOT NULL,
	"media_id" uuid,
	"source_url" text NOT NULL,
	"submitted_data" jsonb NOT NULL,
	"status" "community_submission_status" DEFAULT 'published' NOT NULL,
	"moderation_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" DROP CONSTRAINT "media_assets_storage_rights";--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "credit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "category" "content_report_category" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "media_id" uuid;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "community_submissions" ADD CONSTRAINT "community_submissions_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_submissions" ADD CONSTRAINT "community_submissions_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_submissions" ADD CONSTRAINT "community_submissions_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_submissions" ADD CONSTRAINT "community_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_submissions_author_idx" ON "community_submissions" USING btree ("author_user_id","created_at");--> statement-breakpoint
CREATE INDEX "community_submissions_production_idx" ON "community_submissions" USING btree ("production_id");--> statement-breakpoint
CREATE INDEX "community_submissions_status_idx" ON "community_submissions" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_storage_rights" CHECK ("media_assets"."storage_policy" <> 'mirror' or "media_assets"."rights_status"::text in ('open_license', 'permission_granted', 'todam_original', 'community_submission'));

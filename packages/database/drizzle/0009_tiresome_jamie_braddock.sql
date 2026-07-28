DROP INDEX "company_memberships_user_idx";--> statement-breakpoint
ALTER TABLE "productions" ADD COLUMN "minimum_age" integer;--> statement-breakpoint
WITH "ranked_memberships" AS (
	SELECT
		"company_id",
		"user_id",
		row_number() OVER (
			PARTITION BY "user_id"
			ORDER BY "created_at" ASC, "company_id" ASC
		) AS "membership_rank"
	FROM "company_memberships"
)
DELETE FROM "company_memberships"
USING "ranked_memberships"
WHERE "company_memberships"."company_id" = "ranked_memberships"."company_id"
	AND "company_memberships"."user_id" = "ranked_memberships"."user_id"
	AND "ranked_memberships"."membership_rank" > 1;--> statement-breakpoint
WITH "ranked_primary_companies" AS (
	SELECT
		"production_id",
		"company_id",
		row_number() OVER (
			PARTITION BY "production_id"
			ORDER BY "position" ASC, "company_id" ASC
		) AS "primary_rank"
	FROM "production_companies"
	WHERE "is_primary" = true
)
UPDATE "production_companies"
SET "is_primary" = false
FROM "ranked_primary_companies"
WHERE "production_companies"."production_id" = "ranked_primary_companies"."production_id"
	AND "production_companies"."company_id" = "ranked_primary_companies"."company_id"
	AND "ranked_primary_companies"."primary_rank" > 1;--> statement-breakpoint
WITH "ranked_primary_media" AS (
	SELECT
		"production_id",
		"media_id",
		row_number() OVER (
			PARTITION BY "production_id"
			ORDER BY "position" ASC, "media_id" ASC
		) AS "primary_rank"
	FROM "production_media"
	WHERE "is_primary" = true
)
UPDATE "production_media"
SET "is_primary" = false
FROM "ranked_primary_media"
WHERE "production_media"."production_id" = "ranked_primary_media"."production_id"
	AND "production_media"."media_id" = "ranked_primary_media"."media_id"
	AND "ranked_primary_media"."primary_rank" > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "company_memberships_user_unique" ON "company_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "production_companies_primary_unique" ON "production_companies" USING btree ("production_id") WHERE "production_companies"."is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "production_media_primary_unique" ON "production_media" USING btree ("production_id") WHERE "production_media"."is_primary" = true;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_minimum_age_range" CHECK ("productions"."minimum_age" is null or ("productions"."minimum_age" >= 0 and "productions"."minimum_age" <= 99));

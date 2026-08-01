WITH "ranked_diary_entries" AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "user_id", "production_id", "attended_on"
			ORDER BY "created_at" ASC, "id" ASC
		) AS "duplicate_rank"
	FROM "diary_entries"
	WHERE "performance_id" IS NULL
		AND "attended_on" IS NOT NULL
)
DELETE FROM "diary_entries"
USING "ranked_diary_entries"
WHERE "diary_entries"."id" = "ranked_diary_entries"."id"
	AND "ranked_diary_entries"."duplicate_rank" > 1;--> statement-breakpoint
WITH "ranked_diary_entries" AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "user_id", "production_id"
			ORDER BY "created_at" ASC, "id" ASC
		) AS "duplicate_rank"
	FROM "diary_entries"
	WHERE "performance_id" IS NULL
		AND "attended_on" IS NULL
)
DELETE FROM "diary_entries"
USING "ranked_diary_entries"
WHERE "diary_entries"."id" = "ranked_diary_entries"."id"
	AND "ranked_diary_entries"."duplicate_rank" > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "diary_entries_user_production_date_unique" ON "diary_entries" USING btree ("user_id","production_id","attended_on") WHERE "diary_entries"."performance_id" is null and "diary_entries"."attended_on" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "diary_entries_user_production_undated_unique" ON "diary_entries" USING btree ("user_id","production_id") WHERE "diary_entries"."performance_id" is null and "diary_entries"."attended_on" is null;--> statement-breakpoint
UPDATE "media_assets"
SET "valid_from" = NULL
WHERE "valid_from" IS NOT NULL
	AND "valid_until" IS NOT NULL
	AND "valid_until" <= "valid_from";--> statement-breakpoint
UPDATE "performances"
SET "ends_at" = NULL
WHERE "ends_at" IS NOT NULL
	AND "ends_at" <= "starts_at";--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_validity_window" CHECK ("media_assets"."valid_from" is null or "media_assets"."valid_until" is null or "media_assets"."valid_until" > "media_assets"."valid_from");--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_end_after_start" CHECK ("performances"."ends_at" is null or "performances"."ends_at" > "performances"."starts_at");

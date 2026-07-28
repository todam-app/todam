ALTER TABLE "company_claims" ADD COLUMN "representative_name" text;
--> statement-breakpoint
UPDATE "company_claims"
SET "representative_name" = coalesce(
  nullif(btrim("users"."name"), ''),
  'Identité à vérifier'
)
FROM "users"
WHERE "users"."id" = "company_claims"."user_id";
--> statement-breakpoint
UPDATE "company_claims"
SET "representative_name" = 'Identité à vérifier'
WHERE "representative_name" IS NULL;
--> statement-breakpoint
ALTER TABLE "company_claims"
ALTER COLUMN "representative_name" SET NOT NULL;

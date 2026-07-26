CREATE TYPE "public"."registration_channel" AS ENUM('web', 'android');

ALTER TABLE "users" ADD COLUMN "age_15_or_older" boolean;
ALTER TABLE "users" ADD COLUMN "terms_version" text;
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "privacy_notice_version" text;
ALTER TABLE "users" ADD COLUMN "registration_channel" "registration_channel";

UPDATE "users"
SET
  "age_15_or_older" = true,
  "terms_version" = 'prelaunch-legacy',
  "terms_accepted_at" = "age_confirmed_at",
  "privacy_notice_version" = 'prelaunch-legacy',
  "registration_channel" = 'web'
WHERE "terms_version" IS NULL;

ALTER TABLE "users" ALTER COLUMN "age_15_or_older" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "terms_version" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "terms_accepted_at" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "privacy_notice_version" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "registration_channel" SET NOT NULL;
ALTER TABLE "users"
  ADD CONSTRAINT "users_age_15_or_older_true"
  CHECK ("users"."age_15_or_older" = true);

CREATE TABLE "legal_acceptances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "age_15_or_older" boolean NOT NULL,
  "terms_version" text NOT NULL,
  "privacy_notice_version" text NOT NULL,
  "registration_channel" "registration_channel" NOT NULL,
  "accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "legal_acceptances_age_true" CHECK ("legal_acceptances"."age_15_or_older" = true)
);

CREATE TABLE "account_deletion_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "legal_acceptances"
  ADD CONSTRAINT "legal_acceptances_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "account_deletion_requests"
  ADD CONSTRAINT "account_deletion_requests_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX "legal_acceptances_user_idx"
  ON "legal_acceptances" USING btree ("user_id", "accepted_at");
CREATE UNIQUE INDEX "legal_acceptances_version_unique"
  ON "legal_acceptances" USING btree ("user_id", "terms_version", "privacy_notice_version");
CREATE UNIQUE INDEX "account_deletion_requests_token_unique"
  ON "account_deletion_requests" USING btree ("token_hash");
CREATE INDEX "account_deletion_requests_user_idx"
  ON "account_deletion_requests" USING btree ("user_id");

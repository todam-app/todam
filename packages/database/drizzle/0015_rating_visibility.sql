CREATE TYPE "public"."rating_visibility" AS ENUM('review_only', 'public');
--> statement-breakpoint
ALTER TABLE "users"
  ADD COLUMN "rating_visibility" "rating_visibility" DEFAULT 'review_only' NOT NULL;

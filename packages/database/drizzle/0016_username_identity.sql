ALTER TABLE "users" RENAME COLUMN "pseudonym" TO "username";--> statement-breakpoint
ALTER INDEX "users_pseudonym_unique" RENAME TO "users_username_unique";

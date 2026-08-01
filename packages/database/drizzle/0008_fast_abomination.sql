ALTER TABLE "catalog_revisions" DROP CONSTRAINT "catalog_revisions_author_user_id_fkey";
--> statement-breakpoint
ALTER TABLE "catalog_revisions" ALTER COLUMN "author_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_revisions" ADD CONSTRAINT "catalog_revisions_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

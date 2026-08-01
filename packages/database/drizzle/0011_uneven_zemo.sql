WITH "ranked_active_claims" AS (
  SELECT
    "claim"."id",
    row_number() OVER (
      PARTITION BY "claim"."user_id"
      ORDER BY
        CASE
          WHEN "membership"."user_id" IS NOT NULL THEN 0
          WHEN "claim"."status" = 'approved' THEN 1
          ELSE 2
        END,
        "claim"."reviewed_at" ASC NULLS LAST,
        "claim"."created_at" ASC,
        "claim"."id" ASC
    ) AS "claim_rank"
  FROM "company_claims" AS "claim"
  LEFT JOIN "company_memberships" AS "membership"
    ON "membership"."user_id" = "claim"."user_id"
   AND "membership"."company_id" = "claim"."company_id"
  WHERE "claim"."status" IN ('pending', 'approved')
)
UPDATE "company_claims" AS "claim"
SET
  "status" = CASE
    WHEN "claim"."status" = 'approved' THEN 'revoked'::"claim_status"
    ELSE 'rejected'::"claim_status"
  END,
  "decision_reason" = COALESCE(
    "claim"."decision_reason",
    'Clôturée automatiquement lors de l’activation de la règle limitant chaque compte à une seule revendication active.'
  ),
  "reviewed_at" = COALESCE("claim"."reviewed_at", now()),
  "updated_at" = now()
FROM "ranked_active_claims" AS "ranked"
WHERE
  "ranked"."id" = "claim"."id"
  AND "ranked"."claim_rank" > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "company_claims_user_active_unique" ON "company_claims" USING btree ("user_id") WHERE "company_claims"."status" in ('pending', 'approved');

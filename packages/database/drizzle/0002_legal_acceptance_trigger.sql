CREATE OR REPLACE FUNCTION "record_initial_legal_acceptance"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO "legal_acceptances" (
    "user_id",
    "age_15_or_older",
    "terms_version",
    "privacy_notice_version",
    "registration_channel",
    "accepted_at"
  )
  VALUES (
    NEW."id",
    NEW."age_15_or_older",
    NEW."terms_version",
    NEW."privacy_notice_version",
    NEW."registration_channel",
    NEW."terms_accepted_at"
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "users_record_initial_legal_acceptance" ON "users";

CREATE TRIGGER "users_record_initial_legal_acceptance"
AFTER INSERT ON "users"
FOR EACH ROW
EXECUTE FUNCTION "record_initial_legal_acceptance"();

ALTER TABLE "users"
  ADD COLUMN "home_locality" text,
  ADD COLUMN "home_country_code" text,
  ADD CONSTRAINT "users_home_city_complete"
    CHECK (
      ("home_locality" is null and "home_country_code" is null)
      or (
        "home_locality" is not null
        and "home_country_code" ~ '^[A-Z]{2}$'
      )
    );

CREATE INDEX "venues_locality_country_idx"
  ON "venues" ("locality", "country_code");

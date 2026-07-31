import { fileURLToPath } from "node:url";

import { createDatabase } from "@todam/database";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

type DuplicateGroup = {
  normalized_title: string;
  normalized_company: string;
  venue_slug: string;
  season: string;
  source_key: string;
  production_ids: string[];
  production_titles: string[];
};

type QualityIssue = {
  rule: string;
  entity_type:
    "production" | "performance" | "company" | "venue" | "description" | "media";
  entity_id: string;
  label: string;
};

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

const { db, pool } = createDatabase();

try {
  const [duplicateResult, issueResult] = await Promise.all([
    db.execute<DuplicateGroup>(sql`
    with published_occurrences as (
      select distinct
        ${sql.raw(
          "regexp_replace(lower(unaccent(productions.title)), '[^a-z0-9]+', '', 'g')",
        )} as normalized_title,
        ${sql.raw(
          "regexp_replace(lower(unaccent(companies.name)), '[^a-z0-9]+', '', 'g')",
        )} as normalized_company,
        venues.slug as venue_slug,
        case
          when extract(month from performances.starts_at) >= 7
            then extract(year from performances.starts_at)::integer::text
                 || '-' ||
                 (extract(year from performances.starts_at)::integer + 1)::text
          else (extract(year from performances.starts_at)::integer - 1)::text
               || '-' ||
               extract(year from performances.starts_at)::integer::text
        end as season,
        catalog_sources.external_key as source_key,
        productions.id as production_id,
        productions.title as production_title
      from productions
      join production_companies
        on production_companies.production_id = productions.id
       and production_companies.is_primary = true
      join companies on companies.id = production_companies.company_id
      join performances on performances.production_id = productions.id
      join venues on venues.id = performances.venue_id
      join production_sources on production_sources.production_id = productions.id
      join source_documents on source_documents.id = production_sources.document_id
      join catalog_sources on catalog_sources.id = source_documents.source_id
      where productions.is_active = true
        and productions.publication_status = 'published'
    )
    select
      normalized_title,
      normalized_company,
      venue_slug,
      season,
      source_key,
      array_agg(distinct production_id::text order by production_id::text)
        as production_ids,
      array_agg(distinct production_title order by production_title)
        as production_titles
    from published_occurrences
    group by
      normalized_title,
      normalized_company,
      venue_slug,
      season,
      source_key
    having count(distinct production_id) > 1
    order by venue_slug, season, normalized_title
  `),
    db.execute<QualityIssue>(sql`
      select
        'published_without_review' as rule,
        'production' as entity_type,
        productions.id::text as entity_id,
        productions.title as label
      from productions
      where productions.is_active = true
        and productions.publication_status = 'published'
        and productions.reviewed_at is null

      union all

      select
        'published_suspicious_title',
        'production',
        productions.id::text,
        productions.title
      from productions
      where productions.is_active = true
        and productions.publication_status = 'published'
        and (
          productions.title <> btrim(productions.title)
          or productions.title ~ E'[\\n\\r\\t]'
          or productions.title ~ '[[:space:]]{2,}'
          or productions.title ~* '[-–—|:][[:space:]]*(compagnie|cie\\.?|classe|durée|mise en scène|[0-9]+[[:space:]]*(min|mn))'
        )

      union all

      select
        'published_invalid_slug',
        'production',
        productions.id::text,
        productions.slug
      from productions
      where productions.is_active = true
        and productions.publication_status = 'published'
        and productions.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'

      union all

      select
        'published_without_source',
        'production',
        productions.id::text,
        productions.title
      from productions
      where productions.is_active = true
        and productions.publication_status = 'published'
        and not exists (
          select 1
          from production_sources
          where production_sources.production_id = productions.id
        )

      union all

      select
        'published_without_performance',
        'production',
        productions.id::text,
        productions.title
      from productions
      where productions.is_active = true
        and productions.publication_status = 'published'
        and not exists (
          select 1
          from performances
          where performances.production_id = productions.id
            and performances.status <> 'cancelled'
        )

      union all

      select
        'published_performance_without_source',
        'performance',
        performances.id::text,
        productions.title || ' — ' || performances.starts_at::text
      from performances
      join productions on productions.id = performances.production_id
      where productions.is_active = true
        and productions.publication_status = 'published'
        and not exists (
          select 1
          from performance_sources
          where performance_sources.performance_id = performances.id
        )

      union all

      select
        'future_performance_marked_completed',
        'performance',
        performances.id::text,
        productions.title || ' — ' || performances.starts_at::text
      from performances
      join productions on productions.id = performances.production_id
      where productions.is_active = true
        and productions.publication_status = 'published'
        and performances.starts_at > now()
        and performances.status = 'completed'

      union all

      select
        'published_without_short_description',
        'production',
        productions.id::text,
        productions.title
      from productions
      where productions.is_active = true
        and productions.publication_status = 'published'
        and not exists (
          select 1
          from production_descriptions
          where production_descriptions.production_id = productions.id
            and production_descriptions.locale = 'fr'
            and production_descriptions.kind = 'short'
            and nullif(btrim(production_descriptions.body), '') is not null
        )

      union all

      select
        'published_without_full_description',
        'production',
        productions.id::text,
        productions.title
      from productions
      where productions.is_active = true
        and productions.publication_status = 'published'
        and not exists (
          select 1
          from production_descriptions
          where production_descriptions.production_id = productions.id
            and production_descriptions.locale = 'fr'
            and production_descriptions.kind = 'full'
            and nullif(btrim(production_descriptions.body), '') is not null
        )

      union all

      select
        'description_without_provenance',
        'description',
        production_descriptions.id::text,
        productions.title || ' — ' || production_descriptions.kind::text
      from production_descriptions
      join productions on productions.id = production_descriptions.production_id
      where productions.is_active = true
        and productions.publication_status = 'published'
        and production_descriptions.source_document_id is null
        and nullif(btrim(production_descriptions.source_url), '') is null
        and production_descriptions.rights_status <> 'todam_original'

      union all

      select
        'published_description_without_publishable_rights',
        'description',
        production_descriptions.id::text,
        productions.title || ' — ' || production_descriptions.kind::text
      from production_descriptions
      join productions on productions.id = production_descriptions.production_id
      where productions.is_active = true
        and productions.publication_status = 'published'
        and (
          production_descriptions.rights_status not in (
            'permission_granted',
            'open_license',
            'contractual_display',
            'todam_original'
          )
          or (
            production_descriptions.rights_status = 'open_license'
            and nullif(btrim(production_descriptions.license), '') is null
          )
        )

      union all

      select distinct
        'published_media_without_complete_rights',
        'media',
        media_assets.id::text,
        productions.title || ' — ' || media_assets.external_key
      from production_media
      join productions on productions.id = production_media.production_id
      join media_assets on media_assets.id = production_media.media_id
      left join source_documents on source_documents.id = media_assets.document_id
      where productions.is_active = true
        and productions.publication_status = 'published'
        and media_assets.is_active = true
        and media_assets.storage_policy not in ('metadata_only', 'forbidden')
        and (
          nullif(btrim(media_assets.credit), '') is null
          or nullif(btrim(media_assets.copyright_holder), '') is null
          or source_documents.id is null
          or nullif(btrim(coalesce(media_assets.terms_url, source_documents.url)), '') is null
          or media_assets.rights_status not in (
            'permission_granted',
            'open_license',
            'contractual_display',
            'hotlink_only',
            'todam_original'
          )
          or (
            media_assets.storage_policy = 'mirror'
            and media_assets.rights_status not in (
              'permission_granted',
              'open_license',
              'todam_original'
            )
          )
          or (
            media_assets.rights_status = 'open_license'
            and nullif(btrim(media_assets.license), '') is null
          )
          or (
            media_assets.valid_until is not null
            and media_assets.valid_until <= now()
          )
        )

      union all

      select distinct
        'published_company_without_source',
        'company',
        companies.id::text,
        companies.name
      from companies
      where companies.publication_status = 'published'
        and not exists (
          select 1
          from company_sources
          where company_sources.company_id = companies.id
        )

      union all

      select distinct
        'published_company_invalid_slug',
        'company',
        companies.id::text,
        companies.slug
      from companies
      where companies.publication_status = 'published'
        and companies.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'

      union all

      select distinct
        'published_venue_without_source',
        'venue',
        venues.id::text,
        venues.name
      from venues
      join performances on performances.venue_id = venues.id
      join productions on productions.id = performances.production_id
      where productions.is_active = true
        and productions.publication_status = 'published'
        and not exists (
          select 1
          from venue_sources
          where venue_sources.venue_id = venues.id
        )

      union all

      select distinct
        'published_venue_without_official_url',
        'venue',
        venues.id::text,
        venues.name
      from venues
      join performances on performances.venue_id = venues.id
      join productions on productions.id = performances.production_id
      where productions.is_active = true
        and productions.publication_status = 'published'
        and nullif(btrim(venues.official_url), '') is null

      union all

      select distinct
        'published_venue_invalid_slug',
        'venue',
        venues.id::text,
        venues.slug
      from venues
      join performances on performances.venue_id = venues.id
      join productions on productions.id = performances.production_id
      where productions.is_active = true
        and productions.publication_status = 'published'
        and venues.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'

      order by entity_type, label, rule
    `),
  ]);

  const duplicates = duplicateResult.rows;
  const issues = issueResult.rows;
  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        duplicateGroups: duplicates.length,
        duplicates,
        issueCount: issues.length,
        issues,
      },
      null,
      2,
    ),
  );
  if (duplicates.length > 0 || issues.length > 0) process.exitCode = 1;
} finally {
  await pool.end();
}

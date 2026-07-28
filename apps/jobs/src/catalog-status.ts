import { fileURLToPath } from "node:url";

import { createDatabase } from "@todam/database";
import { config } from "dotenv";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

const { pool } = createDatabase();

try {
  const [coverage, sources] = await Promise.all([
    pool.query<{
      future_performances: string;
      poster_coverage_percent: string;
      productions: string;
      productions_with_poster: string;
      publishable_posters: string;
    }>(`
      select
        count(distinct p.id)::text as productions,
        count(distinct case when visible_media.media_id is not null then p.id end)::text
          as productions_with_poster,
        count(distinct visible_media.media_id)::text as publishable_posters,
        count(distinct case
          when perf.status = 'scheduled' and perf.starts_at >= now() then perf.id
        end)::text as future_performances,
        case
          when count(distinct p.id) = 0 then '0.00'
          else round(
            100.0 *
            count(distinct case when visible_media.media_id is not null then p.id end) /
            count(distinct p.id),
            2
          )::text
        end as poster_coverage_percent
      from productions p
      left join performances perf on perf.production_id = p.id
      left join (
        select pm.production_id, ma.id as media_id
        from production_media pm
        join media_assets ma on ma.id = pm.media_id
        where ma.is_active = true
          and ma.storage_policy not in ('metadata_only', 'forbidden')
          and ma.rights_status in (
            'permission_granted',
            'open_license',
            'contractual_display',
            'hotlink_only',
            'todam_original'
          )
          and (ma.valid_from is null or ma.valid_from <= now())
          and (ma.valid_until is null or ma.valid_until > now())
      ) visible_media on visible_media.production_id = p.id
      where p.is_active = true
    `),
    pool.query<{
      connector_kind: string;
      consecutive_failures: number | null;
      enabled: boolean;
      last_successful_at: Date | null;
      name: string;
      next_run_at: Date | null;
    }>(`
      select
        s.name,
        s.connector_kind,
        s.enabled,
        st.last_successful_at,
        st.next_run_at,
        st.consecutive_failures
      from catalog_sources s
      left join source_sync_states st on st.source_id = s.id
      order by s.name
    `),
  ]);

  console.info(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        coverage: coverage.rows[0] ?? null,
        sources: sources.rows,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}

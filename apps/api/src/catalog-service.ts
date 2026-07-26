import type {
  CityOption,
  CitySelection,
  Dashboard,
  DiarySession,
  HomeDiscoveryItem,
  HomeResponse,
  Poster,
  ProductionCard,
  ProductionDetail,
  SearchResponse,
  ViewerProductionState,
} from "@todam/contracts";
import {
  artists,
  diaryEntries,
  mediaAssets,
  productionMedia,
  performances,
  productionCredits,
  productionSources,
  productions,
  ratings,
  sourceDocuments,
  user,
  venues,
  watchlistEntries,
  works,
  type TodamDatabase,
} from "@todam/database";
import { planRating, planSeen } from "@todam/domain";
import { and, asc, count, desc, eq, inArray, notInArray, sql } from "drizzle-orm";

import { HttpProblem } from "./errors.js";

type PosterWithStorage = Poster & { storageKey: string | null };

const objectPublicBaseUrl = process.env.TODAM_OBJECT_PUBLIC_BASE_URL?.replace(
  /\/+$/,
  "",
);

function mapPoster(poster: PosterWithStorage): Poster {
  const { storageKey, ...publicPoster } = poster;
  return {
    ...publicPoster,
    url:
      storageKey && objectPublicBaseUrl
        ? `${objectPublicBaseUrl}/${storageKey}`
        : poster.url,
  };
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const value = Number.parseInt(Buffer.from(cursor, "base64url").toString("utf8"), 10);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HttpProblem(
      400,
      "INVALID_CURSOR",
      "Le curseur de pagination est invalide.",
    );
  }
  return value;
}

const cardFields = {
  id: productions.id,
  slug: productions.slug,
  title: productions.title,
  discipline: productions.discipline,
  audience: productions.audience,
  workTitle: works.title,
  primaryCredit: sql<string | null>`(
    select ${artists.name}
    from ${productionCredits}
    join ${artists} on ${artists.id} = ${productionCredits.artistId}
    where ${productionCredits.productionId} = ${productions.id}
    order by
      case ${productionCredits.role}
        when 'director' then 0
        when 'choreographer' then 1
        else 2
      end,
      ${productionCredits.position}
    limit 1
  )`,
  venueNames: sql<string[]>`coalesce(array(
    select distinct ${venues.name}
    from ${performances}
    join ${venues} on ${venues.id} = ${performances.venueId}
    where ${performances.productionId} = ${productions.id}
    order by ${venues.name}
  ), array[]::text[])`,
  nextPerformance: sql<Date | null>`(
    select min(${performances.startsAt})
    from ${performances}
    where ${performances.productionId} = ${productions.id}
      and ${performances.status} = 'scheduled'
      and ${performances.startsAt} >= now()
  )`,
  poster: sql<PosterWithStorage | null>`(
    select json_build_object(
      'id', ${mediaAssets.id},
      'url', ${mediaAssets.remoteUrl},
      'kind', ${mediaAssets.kind},
      'alt', ${mediaAssets.alt},
      'credit', ${mediaAssets.credit},
      'copyrightHolder', ${mediaAssets.copyrightHolder},
      'license', ${mediaAssets.license},
      'rightsStatus', ${mediaAssets.rightsStatus},
      'sourceUrl', ${sourceDocuments.url},
      'width', ${mediaAssets.width},
      'height', ${mediaAssets.height},
      'storageKey', ${mediaAssets.storageKey}
    )
    from ${productionMedia}
    join ${mediaAssets} on ${mediaAssets.id} = ${productionMedia.mediaId}
    join ${sourceDocuments} on ${sourceDocuments.id} = ${mediaAssets.documentId}
    where ${productionMedia.productionId} = ${productions.id}
      and ${mediaAssets.isActive} = true
      and ${mediaAssets.storagePolicy} not in ('metadata_only', 'forbidden')
      and ${mediaAssets.rightsStatus} in (
        'permission_granted',
        'open_license',
        'contractual_display',
        'hotlink_only'
      )
      and (${mediaAssets.validFrom} is null or ${mediaAssets.validFrom} <= now())
      and (${mediaAssets.validUntil} is null or ${mediaAssets.validUntil} > now())
    order by
      ${productionMedia.isPrimary} desc,
      case ${mediaAssets.kind}
        when 'poster' then 0
        when 'key_visual' then 1
        else 2
      end,
      ${productionMedia.position},
      ${mediaAssets.id}
    limit 1
  )`,
};

interface CardRow {
  id: string;
  slug: string;
  title: string;
  discipline: "theatre" | "opera" | "ballet";
  audience: "general" | "family" | "children";
  workTitle: string | null;
  primaryCredit: string | null;
  venueNames: string[];
  nextPerformance: Date | string | null;
  poster: PosterWithStorage | null;
}

interface HomeHighlightRow extends Record<string, unknown> {
  production_id: string;
  starts_at: Date | string;
  venue_name: string;
  locality: string;
  distance_km: number | string | null;
}

function mapCard(row: CardRow): ProductionCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    discipline: row.discipline,
    audience: row.audience,
    workTitle: row.workTitle,
    primaryCredit: row.primaryCredit,
    venueNames: row.venueNames,
    nextPerformance:
      row.nextPerformance instanceof Date
        ? row.nextPerformance.toISOString()
        : row.nextPerformance
          ? new Date(row.nextPerformance).toISOString()
          : null,
    poster: row.poster ? mapPoster(row.poster) : null,
  };
}

export interface SearchInput {
  q: string;
  cursor?: string | null | undefined;
  limit: number;
}

export interface CitySearchInput {
  q?: string | undefined;
  limit: number;
}

export interface SeenInput {
  productionId: string;
  performanceId: string | null;
  attendedOn: string | null;
}

const HOME_DISCOVERY_LIMIT = 8;
const HOME_DISCOVERY_RADIUS_KM = 50;

function cityOption(city: CitySelection): CityOption {
  return {
    ...city,
    label: city.locality,
  };
}

export function createCatalogService(database: TodamDatabase) {
  async function assertProduction(productionId: string) {
    const rows = await database
      .select({ id: productions.id })
      .from(productions)
      .where(eq(productions.id, productionId))
      .limit(1);
    if (!rows[0]) {
      throw new HttpProblem(
        404,
        "PRODUCTION_NOT_FOUND",
        "Ce spectacle n'existe pas dans Todam.",
      );
    }
  }

  async function getCardsByIds(productionIds: string[]): Promise<ProductionCard[]> {
    if (productionIds.length === 0) return [];
    const rows = await database
      .select(cardFields)
      .from(productions)
      .leftJoin(works, eq(works.id, productions.workId))
      .where(
        and(eq(productions.isActive, true), inArray(productions.id, productionIds)),
      );
    const cardsById = new Map(rows.map((row) => [row.id, mapCard(row as CardRow)]));
    return productionIds.flatMap((id) => {
      const card = cardsById.get(id);
      return card ? [card] : [];
    });
  }

  async function mapHighlights(rows: HomeHighlightRow[]): Promise<HomeDiscoveryItem[]> {
    const cards = await getCardsByIds(rows.map((row) => row.production_id));
    const cardsById = new Map(cards.map((card) => [card.id, card]));
    return rows.flatMap((row) => {
      const production = cardsById.get(row.production_id);
      if (!production) return [];
      const distance = row.distance_km === null ? null : Number(row.distance_km);
      return [
        {
          production,
          performance: {
            startsAt: new Date(row.starts_at).toISOString(),
            venueName: row.venue_name,
            locality: row.locality,
            distanceKm:
              distance === null || !Number.isFinite(distance)
                ? null
                : Math.round(distance * 10) / 10,
          },
        },
      ];
    });
  }

  async function getNationalHighlights(limit: number) {
    const result = await database.execute<HomeHighlightRow>(sql`
      with ranked_performances as (
        select
          ${performances.productionId} as production_id,
          ${performances.startsAt} as starts_at,
          ${venues.name} as venue_name,
          ${venues.locality} as locality,
          null::double precision as distance_km,
          row_number() over (
            partition by ${performances.productionId}
            order by ${performances.startsAt}, ${performances.id}
          ) as position
        from ${performances}
        join ${venues} on ${venues.id} = ${performances.venueId}
        join ${productions} on ${productions.id} = ${performances.productionId}
        where ${productions.isActive} = true
          and ${performances.status} = 'scheduled'
          and ${performances.startsAt} >= now()
      )
      select production_id, starts_at, venue_name, locality, distance_km
      from ranked_performances
      where position = 1
      order by starts_at, production_id
      limit ${limit}
    `);
    return result.rows;
  }

  async function getNearbyHighlights(city: CitySelection) {
    const result = await database.execute<HomeHighlightRow>(sql`
      with city_center as (
        select st_centroid(st_collect(${venues.coordinates})) as coordinates
        from ${venues}
        where lower(unaccent(${venues.locality})) =
              lower(unaccent(${city.locality}))
          and ${venues.countryCode} = ${city.countryCode}
          and ${venues.coordinates} is not null
      ),
      ranked_performances as (
        select
          ${performances.productionId} as production_id,
          ${performances.startsAt} as starts_at,
          ${venues.name} as venue_name,
          ${venues.locality} as locality,
          case
            when city_center.coordinates is null
              or ${venues.coordinates} is null
            then null
            else (
              st_distance(
                ${venues.coordinates}::geography,
                city_center.coordinates::geography
              ) / 1000.0
            )::double precision
          end as distance_km,
          row_number() over (
            partition by ${performances.productionId}
            order by
              ${performances.startsAt},
              case
                when city_center.coordinates is null
                  or ${venues.coordinates} is null
                then null
                else st_distance(
                  ${venues.coordinates}::geography,
                  city_center.coordinates::geography
                )
              end nulls last,
              ${performances.id}
          ) as position
        from ${performances}
        join ${venues} on ${venues.id} = ${performances.venueId}
        join ${productions} on ${productions.id} = ${performances.productionId}
        cross join city_center
        where ${productions.isActive} = true
          and ${performances.status} = 'scheduled'
          and ${performances.startsAt} >= now()
          and (
            (
              city_center.coordinates is not null
              and ${venues.coordinates} is not null
              and st_dwithin(
                ${venues.coordinates}::geography,
                city_center.coordinates::geography,
                ${HOME_DISCOVERY_RADIUS_KM * 1000}
              )
            )
            or (
              lower(unaccent(${venues.locality})) =
                lower(unaccent(${city.locality}))
              and ${venues.countryCode} = ${city.countryCode}
            )
          )
      )
      select production_id, starts_at, venue_name, locality, distance_km
      from ranked_performances
      where position = 1
      order by starts_at, distance_km nulls last, production_id
      limit ${HOME_DISCOVERY_LIMIT}
    `);
    return result.rows;
  }

  async function getProductionState(
    userId: string,
    productionId: string,
  ): Promise<ViewerProductionState> {
    await assertProduction(productionId);
    const [diary, rating, watchlist] = await Promise.all([
      database
        .select({ total: count() })
        .from(diaryEntries)
        .where(
          and(
            eq(diaryEntries.userId, userId),
            eq(diaryEntries.productionId, productionId),
          ),
        ),
      database
        .select({ value: ratings.value })
        .from(ratings)
        .where(and(eq(ratings.userId, userId), eq(ratings.productionId, productionId)))
        .limit(1),
      database
        .select({ total: count() })
        .from(watchlistEntries)
        .where(
          and(
            eq(watchlistEntries.userId, userId),
            eq(watchlistEntries.productionId, productionId),
          ),
        ),
    ]);

    return {
      productionId,
      seen: Number(diary[0]?.total ?? 0) > 0,
      rating: rating[0]?.value ?? null,
      watchlisted: Number(watchlist[0]?.total ?? 0) > 0,
    };
  }

  return {
    async ping(): Promise<void> {
      await database.execute(sql`select 1`);
    },

    async searchCities(input: CitySearchInput): Promise<CityOption[]> {
      const pattern = input.q ? `%${input.q}%` : null;
      const rows = await database
        .selectDistinct({
          locality: venues.locality,
          countryCode: venues.countryCode,
        })
        .from(venues)
        .where(
          pattern
            ? sql<boolean>`unaccent(${venues.locality}) ilike unaccent(${pattern})`
            : undefined,
        )
        .orderBy(asc(venues.locality), asc(venues.countryCode))
        .limit(input.limit);
      return rows.map(cityOption);
    },

    async setHomeCity(
      userId: string,
      requestedCity: CitySelection | null,
    ): Promise<CityOption | null> {
      if (requestedCity === null) {
        const updated = await database
          .update(user)
          .set({
            homeLocality: null,
            homeCountryCode: null,
            updatedAt: new Date(),
          })
          .where(eq(user.id, userId))
          .returning({ id: user.id });
        if (!updated[0]) {
          throw new HttpProblem(
            404,
            "PROFILE_NOT_FOUND",
            "Le profil associé à cette session est introuvable.",
          );
        }
        return null;
      }

      const canonicalRows = await database
        .selectDistinct({
          locality: venues.locality,
          countryCode: venues.countryCode,
        })
        .from(venues)
        .where(
          and(
            eq(venues.countryCode, requestedCity.countryCode),
            sql<boolean>`lower(unaccent(${venues.locality})) =
              lower(unaccent(${requestedCity.locality}))`,
          ),
        )
        .limit(1);
      const canonical = canonicalRows[0];
      if (!canonical) {
        throw new HttpProblem(
          404,
          "CITY_NOT_FOUND",
          "Cette ville n'existe pas dans le catalogue Todam.",
        );
      }

      const updated = await database
        .update(user)
        .set({
          homeLocality: canonical.locality,
          homeCountryCode: canonical.countryCode,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
        .returning({ id: user.id });
      if (!updated[0]) {
        throw new HttpProblem(
          404,
          "PROFILE_NOT_FOUND",
          "Le profil associé à cette session est introuvable.",
        );
      }
      return cityOption(canonical);
    },

    async getHome(userId: string): Promise<HomeResponse> {
      const [profileRows, progressResult] = await Promise.all([
        database
          .select({
            pseudonym: user.pseudonym,
            homeLocality: user.homeLocality,
            homeCountryCode: user.homeCountryCode,
          })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1),
        database.execute<{ total: number | string }>(sql`
          select count(*)::integer as total
          from (
            select ${diaryEntries.productionId} as production_id
            from ${diaryEntries}
            where ${diaryEntries.userId} = ${userId}
            union
            select ${ratings.productionId} as production_id
            from ${ratings}
            where ${ratings.userId} = ${userId}
            union
            select ${watchlistEntries.productionId} as production_id
            from ${watchlistEntries}
            where ${watchlistEntries.userId} = ${userId}
          ) personal_productions
        `),
      ]);
      const profile = profileRows[0];
      if (!profile) {
        throw new HttpProblem(
          404,
          "PROFILE_NOT_FOUND",
          "Le profil associé à cette session est introuvable.",
        );
      }

      const homeCity =
        profile.homeLocality && profile.homeCountryCode
          ? cityOption({
              locality: profile.homeLocality,
              countryCode: profile.homeCountryCode,
            })
          : null;
      const nearbyRows = homeCity ? await getNearbyHighlights(homeCity) : [];
      const nearby = await mapHighlights(nearbyRows);
      const nearbyIds = new Set(nearby.map((item) => item.production.id));
      const nationalRows = (await getNationalHighlights(HOME_DISCOVERY_LIMIT * 2))
        .filter((row) => !nearbyIds.has(row.production_id))
        .slice(0, HOME_DISCOVERY_LIMIT);
      const nationalUpcoming = await mapHighlights(nationalRows);
      const excludedIds = [
        ...nearbyIds,
        ...nationalUpcoming.map((item) => item.production.id),
      ];
      const recentRows = await database
        .select(cardFields)
        .from(productions)
        .leftJoin(works, eq(works.id, productions.workId))
        .where(
          and(
            eq(productions.isActive, true),
            excludedIds.length > 0
              ? notInArray(productions.id, excludedIds)
              : undefined,
          ),
        )
        .orderBy(desc(productions.createdAt), asc(productions.id))
        .limit(HOME_DISCOVERY_LIMIT);
      const progress = Number(progressResult.rows[0]?.total ?? 0);

      return {
        profile: { pseudonym: profile.pseudonym },
        homeCity,
        progress: {
          current: progress,
          target: 5,
          completed: progress >= 5,
        },
        radiusKm: HOME_DISCOVERY_RADIUS_KM,
        nearby,
        nationalUpcoming,
        recentlyAdded: recentRows.map((row) => ({
          production: mapCard(row as CardRow),
          performance: null,
        })),
      };
    },

    async search(input: SearchInput): Promise<SearchResponse> {
      const offset = decodeCursor(input.cursor);
      const pattern = `%${input.q}%`;
      const normalized = input.q.toLocaleLowerCase("fr");
      const rows = await database
        .select(cardFields)
        .from(productions)
        .leftJoin(works, eq(works.id, productions.workId))
        .where(
          and(
            eq(productions.isActive, true),
            sql<boolean>`
              unaccent(${productions.title}) ilike unaccent(${pattern})
              or unaccent(coalesce(${works.title}, '')) ilike unaccent(${pattern})
              or exists (
                select 1
                from ${productionCredits}
                join ${artists} on ${artists.id} = ${productionCredits.artistId}
                where ${productionCredits.productionId} = ${productions.id}
                  and unaccent(${artists.name}) ilike unaccent(${pattern})
              )
              or exists (
                select 1
                from ${performances}
                join ${venues} on ${venues.id} = ${performances.venueId}
                where ${performances.productionId} = ${productions.id}
                  and unaccent(${venues.name}) ilike unaccent(${pattern})
              )
            `,
          ),
        )
        .orderBy(
          sql`
            case
              when lower(unaccent(${productions.title})) = unaccent(${normalized}) then 0
              when lower(unaccent(${productions.title})) like unaccent(${`${normalized}%`}) then 1
              else 2
            end
          `,
          asc(productions.title),
          asc(productions.id),
        )
        .limit(input.limit + 1)
        .offset(offset);

      const hasMore = rows.length > input.limit;
      return {
        items: rows.slice(0, input.limit).map((row) => mapCard(row as CardRow)),
        nextCursor: hasMore ? encodeCursor(offset + input.limit) : null,
      };
    },

    async getProduction(slug: string): Promise<ProductionDetail> {
      const baseRows = await database
        .select({
          id: productions.id,
          slug: productions.slug,
          title: productions.title,
          discipline: productions.discipline,
          audience: productions.audience,
          durationMinutes: productions.durationMinutes,
          language: productions.language,
          officialUrl: productions.officialUrl,
          workId: works.id,
          workSlug: works.slug,
          workTitle: works.title,
        })
        .from(productions)
        .leftJoin(works, eq(works.id, productions.workId))
        .where(eq(productions.slug, slug))
        .limit(1);
      const base = baseRows[0];
      if (!base) {
        throw new HttpProblem(
          404,
          "PRODUCTION_NOT_FOUND",
          "Ce spectacle n'existe pas dans Todam.",
        );
      }

      const [creditRows, performanceRows, sourceRows, posterRows] = await Promise.all([
        database
          .select({
            artistId: artists.id,
            artistName: artists.name,
            role: productionCredits.role,
            label: productionCredits.label,
            position: productionCredits.position,
          })
          .from(productionCredits)
          .innerJoin(artists, eq(artists.id, productionCredits.artistId))
          .where(eq(productionCredits.productionId, base.id))
          .orderBy(asc(productionCredits.position), asc(artists.name)),
        database
          .select({
            id: performances.id,
            startsAt: performances.startsAt,
            endsAt: performances.endsAt,
            status: performances.status,
            officialUrl: performances.officialUrl,
            venueId: venues.id,
            venueSlug: venues.slug,
            venueName: venues.name,
            locality: venues.locality,
            timezone: venues.timezone,
          })
          .from(performances)
          .innerJoin(venues, eq(venues.id, performances.venueId))
          .where(eq(performances.productionId, base.id))
          .orderBy(asc(performances.startsAt)),
        database
          .selectDistinct({ url: sourceDocuments.url })
          .from(productionSources)
          .innerJoin(
            sourceDocuments,
            eq(sourceDocuments.id, productionSources.documentId),
          )
          .where(eq(productionSources.entityId, base.id)),
        database
          .select({
            id: mediaAssets.id,
            url: mediaAssets.remoteUrl,
            kind: mediaAssets.kind,
            alt: mediaAssets.alt,
            credit: mediaAssets.credit,
            copyrightHolder: mediaAssets.copyrightHolder,
            license: mediaAssets.license,
            rightsStatus: mediaAssets.rightsStatus,
            sourceUrl: sourceDocuments.url,
            width: mediaAssets.width,
            height: mediaAssets.height,
            storageKey: mediaAssets.storageKey,
          })
          .from(productionMedia)
          .innerJoin(mediaAssets, eq(mediaAssets.id, productionMedia.mediaId))
          .innerJoin(sourceDocuments, eq(sourceDocuments.id, mediaAssets.documentId))
          .where(
            and(
              eq(productionMedia.productionId, base.id),
              eq(mediaAssets.isActive, true),
              sql<boolean>`${mediaAssets.storagePolicy} not in ('metadata_only', 'forbidden')`,
              sql<boolean>`${mediaAssets.rightsStatus} in (
                'permission_granted',
                'open_license',
                'contractual_display',
                'hotlink_only'
              )`,
              sql<boolean>`(${mediaAssets.validFrom} is null or ${mediaAssets.validFrom} <= now())`,
              sql<boolean>`(${mediaAssets.validUntil} is null or ${mediaAssets.validUntil} > now())`,
            ),
          )
          .orderBy(
            desc(productionMedia.isPrimary),
            sql`case ${mediaAssets.kind}
              when 'poster' then 0
              when 'key_visual' then 1
              else 2
            end`,
            asc(productionMedia.position),
            asc(mediaAssets.id),
          ),
      ]);

      return {
        id: base.id,
        slug: base.slug,
        title: base.title,
        discipline: base.discipline,
        audience: base.audience,
        durationMinutes: base.durationMinutes,
        language: base.language,
        officialUrl: base.officialUrl,
        posters: posterRows.map((poster) => mapPoster(poster as PosterWithStorage)),
        work:
          base.workId && base.workSlug && base.workTitle
            ? {
                id: base.workId,
                slug: base.workSlug,
                title: base.workTitle,
              }
            : null,
        credits: creditRows,
        performances: performanceRows.map((performance) => ({
          id: performance.id,
          startsAt: performance.startsAt.toISOString(),
          endsAt: performance.endsAt?.toISOString() ?? null,
          status: performance.status,
          officialUrl: performance.officialUrl,
          venue: {
            id: performance.venueId,
            slug: performance.venueSlug,
            name: performance.venueName,
            locality: performance.locality,
            timezone: performance.timezone,
          },
        })),
        sourceUrls: sourceRows.map((source) => source.url),
      };
    },

    getProductionState,

    async getProductionDiary(
      userId: string,
      productionId: string,
    ): Promise<DiarySession[]> {
      await assertProduction(productionId);
      const rows = await database
        .select({
          id: diaryEntries.id,
          attendedOn: diaryEntries.attendedOn,
          createdAt: diaryEntries.createdAt,
          performanceId: performances.id,
          performanceStartsAt: performances.startsAt,
          performanceEndsAt: performances.endsAt,
          performanceStatus: performances.status,
          performanceOfficialUrl: performances.officialUrl,
          venueId: venues.id,
          venueSlug: venues.slug,
          venueName: venues.name,
          venueLocality: venues.locality,
          venueTimezone: venues.timezone,
        })
        .from(diaryEntries)
        .leftJoin(performances, eq(performances.id, diaryEntries.performanceId))
        .leftJoin(venues, eq(venues.id, performances.venueId))
        .where(
          and(
            eq(diaryEntries.userId, userId),
            eq(diaryEntries.productionId, productionId),
          ),
        )
        .orderBy(desc(diaryEntries.createdAt), desc(diaryEntries.id));

      return rows.map((row) => ({
        id: row.id,
        attendedOn: row.attendedOn,
        createdAt: row.createdAt.toISOString(),
        performance:
          row.performanceId &&
          row.performanceStartsAt &&
          row.performanceStatus &&
          row.venueId &&
          row.venueSlug &&
          row.venueName &&
          row.venueLocality &&
          row.venueTimezone
            ? {
                id: row.performanceId,
                startsAt: row.performanceStartsAt.toISOString(),
                endsAt: row.performanceEndsAt?.toISOString() ?? null,
                status: row.performanceStatus,
                officialUrl: row.performanceOfficialUrl,
                venue: {
                  id: row.venueId,
                  slug: row.venueSlug,
                  name: row.venueName,
                  locality: row.venueLocality,
                  timezone: row.venueTimezone,
                },
              }
            : null,
      }));
    },

    async markSeen(userId: string, input: SeenInput): Promise<ViewerProductionState> {
      await assertProduction(input.productionId);
      await database.transaction(async (transaction) => {
        if (input.performanceId) {
          const performanceRows = await transaction
            .select({ id: performances.id })
            .from(performances)
            .where(
              and(
                eq(performances.id, input.performanceId),
                eq(performances.productionId, input.productionId),
              ),
            )
            .limit(1);
          if (!performanceRows[0]) {
            throw new HttpProblem(
              400,
              "PERFORMANCE_MISMATCH",
              "Cette représentation n'appartient pas au spectacle choisi.",
            );
          }
        }

        const [diary, rating, watchlist] = await Promise.all([
          transaction
            .select({ total: count() })
            .from(diaryEntries)
            .where(
              and(
                eq(diaryEntries.userId, userId),
                eq(diaryEntries.productionId, input.productionId),
              ),
            ),
          transaction
            .select({ value: ratings.value })
            .from(ratings)
            .where(
              and(
                eq(ratings.userId, userId),
                eq(ratings.productionId, input.productionId),
              ),
            )
            .limit(1),
          transaction
            .select({ total: count() })
            .from(watchlistEntries)
            .where(
              and(
                eq(watchlistEntries.userId, userId),
                eq(watchlistEntries.productionId, input.productionId),
              ),
            ),
        ]);
        const plan = planSeen({
          hasDiaryEntry: Number(diary[0]?.total ?? 0) > 0,
          rating: rating[0]?.value ?? null,
          watchlisted: Number(watchlist[0]?.total ?? 0) > 0,
        });

        await transaction
          .insert(diaryEntries)
          .values({
            userId,
            productionId: input.productionId,
            performanceId: input.performanceId,
            attendedOn: input.attendedOn,
          })
          .onConflictDoNothing();
        if (plan.removeFromWatchlist) {
          await transaction
            .delete(watchlistEntries)
            .where(
              and(
                eq(watchlistEntries.userId, userId),
                eq(watchlistEntries.productionId, input.productionId),
              ),
            );
        }
      });
      return getProductionState(userId, input.productionId);
    },

    async deleteDiaryEntry(
      userId: string,
      entryId: string,
    ): Promise<ViewerProductionState> {
      let productionId: string | undefined;
      await database.transaction(async (transaction) => {
        const targetRows = await transaction
          .select({ productionId: diaryEntries.productionId })
          .from(diaryEntries)
          .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
          .limit(1);
        const target = targetRows[0];
        if (!target) {
          throw new HttpProblem(
            404,
            "DIARY_ENTRY_NOT_FOUND",
            "Cette séance est introuvable dans votre journal.",
          );
        }
        productionId = target.productionId;

        const ratingRows = await transaction
          .select({ value: ratings.value })
          .from(ratings)
          .where(
            and(
              eq(ratings.userId, userId),
              eq(ratings.productionId, target.productionId),
            ),
          )
          .for("update")
          .limit(1);
        const lockedEntries = await transaction
          .select({ id: diaryEntries.id })
          .from(diaryEntries)
          .where(
            and(
              eq(diaryEntries.userId, userId),
              eq(diaryEntries.productionId, target.productionId),
            ),
          )
          .orderBy(asc(diaryEntries.id))
          .for("update");

        if (!lockedEntries.some((entry) => entry.id === entryId)) {
          throw new HttpProblem(
            404,
            "DIARY_ENTRY_NOT_FOUND",
            "Cette séance est introuvable dans votre journal.",
          );
        }
        if (lockedEntries.length === 1 && ratingRows[0]) {
          throw new HttpProblem(
            409,
            "RATING_REQUIRES_DIARY_ENTRY",
            "Supprimez d'abord votre note avant de retirer la dernière séance.",
          );
        }

        await transaction
          .delete(diaryEntries)
          .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)));
      });

      return getProductionState(userId, productionId!);
    },

    async setRating(
      userId: string,
      productionId: string,
      value: number,
    ): Promise<ViewerProductionState> {
      await assertProduction(productionId);
      await database.transaction(async (transaction) => {
        const [diary, rating, watchlist] = await Promise.all([
          transaction
            .select({ total: count() })
            .from(diaryEntries)
            .where(
              and(
                eq(diaryEntries.userId, userId),
                eq(diaryEntries.productionId, productionId),
              ),
            ),
          transaction
            .select({ value: ratings.value })
            .from(ratings)
            .where(
              and(eq(ratings.userId, userId), eq(ratings.productionId, productionId)),
            )
            .limit(1),
          transaction
            .select({ total: count() })
            .from(watchlistEntries)
            .where(
              and(
                eq(watchlistEntries.userId, userId),
                eq(watchlistEntries.productionId, productionId),
              ),
            ),
        ]);
        const plan = planRating(
          {
            hasDiaryEntry: Number(diary[0]?.total ?? 0) > 0,
            rating: rating[0]?.value ?? null,
            watchlisted: Number(watchlist[0]?.total ?? 0) > 0,
          },
          value,
        );

        await transaction
          .insert(ratings)
          .values({ userId, productionId, value: plan.value })
          .onConflictDoUpdate({
            target: [ratings.userId, ratings.productionId],
            set: { value: plan.value, updatedAt: new Date() },
          });
        if (plan.createUndatedDiary) {
          await transaction.insert(diaryEntries).values({
            userId,
            productionId,
            performanceId: null,
            attendedOn: null,
          });
        }
        if (plan.removeFromWatchlist) {
          await transaction
            .delete(watchlistEntries)
            .where(
              and(
                eq(watchlistEntries.userId, userId),
                eq(watchlistEntries.productionId, productionId),
              ),
            );
        }
      });
      return getProductionState(userId, productionId);
    },

    async deleteRating(
      userId: string,
      productionId: string,
    ): Promise<ViewerProductionState> {
      await assertProduction(productionId);
      await database
        .delete(ratings)
        .where(and(eq(ratings.userId, userId), eq(ratings.productionId, productionId)));
      return getProductionState(userId, productionId);
    },

    async setWatchlist(
      userId: string,
      productionId: string,
      enabled: boolean,
    ): Promise<ViewerProductionState> {
      await assertProduction(productionId);
      if (enabled) {
        await database
          .insert(watchlistEntries)
          .values({ userId, productionId })
          .onConflictDoNothing();
      } else {
        await database
          .delete(watchlistEntries)
          .where(
            and(
              eq(watchlistEntries.userId, userId),
              eq(watchlistEntries.productionId, productionId),
            ),
          );
      }
      return getProductionState(userId, productionId);
    },

    async getDashboard(userId: string): Promise<Dashboard> {
      const [
        profileRows,
        seenRows,
        ratingCountRows,
        watchlistCountRows,
        distributionRows,
        recentRows,
        watchlistRows,
      ] = await Promise.all([
        database
          .select({ pseudonym: user.pseudonym })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1),
        database
          .select({
            total: sql<number>`count(distinct ${diaryEntries.productionId})`,
          })
          .from(diaryEntries)
          .where(eq(diaryEntries.userId, userId)),
        database
          .select({ total: count() })
          .from(ratings)
          .where(eq(ratings.userId, userId)),
        database
          .select({ total: count() })
          .from(watchlistEntries)
          .where(eq(watchlistEntries.userId, userId)),
        database
          .select({ value: ratings.value, total: count() })
          .from(ratings)
          .where(eq(ratings.userId, userId))
          .groupBy(ratings.value),
        database
          .select({
            diaryId: diaryEntries.id,
            attendedOn: diaryEntries.attendedOn,
            diaryCreatedAt: diaryEntries.createdAt,
            performanceId: diaryEntries.performanceId,
            ...cardFields,
          })
          .from(diaryEntries)
          .innerJoin(productions, eq(productions.id, diaryEntries.productionId))
          .leftJoin(works, eq(works.id, productions.workId))
          .where(eq(diaryEntries.userId, userId))
          .orderBy(desc(diaryEntries.createdAt))
          .limit(10),
        database
          .select(cardFields)
          .from(watchlistEntries)
          .innerJoin(productions, eq(productions.id, watchlistEntries.productionId))
          .leftJoin(works, eq(works.id, productions.workId))
          .where(eq(watchlistEntries.userId, userId))
          .orderBy(desc(watchlistEntries.addedAt))
          .limit(6),
      ]);
      const profile = profileRows[0];
      if (!profile) {
        throw new HttpProblem(
          404,
          "PROFILE_NOT_FOUND",
          "Le profil associé à cette session est introuvable.",
        );
      }
      const distribution = new Map(
        distributionRows.map((row) => [row.value, Number(row.total)]),
      );

      return {
        profile,
        counts: {
          seen: Number(seenRows[0]?.total ?? 0),
          ratings: Number(ratingCountRows[0]?.total ?? 0),
          watchlist: Number(watchlistCountRows[0]?.total ?? 0),
          lists: 0,
        },
        recentDiary: recentRows.map((row) => ({
          id: row.diaryId,
          performanceId: row.performanceId,
          attendedOn: row.attendedOn,
          createdAt: row.diaryCreatedAt.toISOString(),
          production: mapCard(row as CardRow),
        })),
        ratingDistribution: Array.from({ length: 10 }, (_, index) => ({
          value: index + 1,
          count: distribution.get(index + 1) ?? 0,
        })),
        watchlist: watchlistRows.map((row) => mapCard(row as CardRow)),
      };
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;

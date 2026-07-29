import type {
  CityOption,
  CitySelection,
  CompanyDetail,
  CompanySummary,
  Dashboard,
  DiarySession,
  HomeDiscoveryItem,
  HomeResponse,
  Poster,
  ProductionCard,
  ProductionDetail,
  SearchResponse,
  VenueDetail,
  VenueSummary,
  ViewerProductionState,
} from "@todam/contracts";
import {
  artists,
  companies,
  companySources,
  diaryEntries,
  lists,
  mediaAssets,
  productionMedia,
  performances,
  productionCompanies,
  productionCredits,
  productionDescriptions,
  productionSources,
  productions,
  ratings,
  reviews,
  sourceDocuments,
  user,
  venues,
  venueSources,
  watchlistEntries,
  works,
  type TodamDatabase,
} from "@todam/database";
import { planRating, planSeen } from "@todam/domain";
import { and, asc, count, desc, eq, inArray, notInArray, sql } from "drizzle-orm";

import { currentFrenchCalendarDate } from "./calendar.js";
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

export const cardFields = {
  id: productions.id,
  slug: productions.slug,
  title: productions.title,
  discipline: productions.discipline,
  audience: productions.audience,
  minimumAge: productions.minimumAge,
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
  company: sql<CompanySummary | null>`(
    select json_build_object(
      'id', ${companies.id},
      'slug', ${companies.slug},
      'name', ${companies.name},
      'officialUrl', ${companies.officialUrl}
    )
    from ${productionCompanies}
    join ${companies} on ${companies.id} = ${productionCompanies.companyId}
    where ${productionCompanies.productionId} = ${productions.id}
      and ${companies.publicationStatus} = 'published'
    order by
      ${productionCompanies.isPrimary} desc,
      ${productionCompanies.position},
      ${companies.name}
    limit 1
  )`,
  venueNames: sql<string[]>`coalesce(array(
    select distinct ${venues.name}
    from ${performances}
    join ${venues} on ${venues.id} = ${performances.venueId}
    where ${performances.productionId} = ${productions.id}
      and ${venues.isActive} = true
    order by ${venues.name}
  ), array[]::text[])`,
  nextPerformance: sql<Date | null>`(
    select min(${performances.startsAt})
    from ${performances}
    join ${venues} on ${venues.id} = ${performances.venueId}
    where ${performances.productionId} = ${productions.id}
      and ${venues.isActive} = true
      and ${performances.status} = 'scheduled'
      and ${performances.startsAt} >= now()
  )`,
  nextVenue: sql<VenueSummary | null>`(
    select json_build_object(
      'id', ${venues.id},
      'slug', ${venues.slug},
      'name', ${venues.name},
      'locality', ${venues.locality},
      'countryCode', ${venues.countryCode},
      'timezone', ${venues.timezone},
      'officialUrl', ${venues.officialUrl}
    )
    from ${performances}
    join ${venues} on ${venues.id} = ${performances.venueId}
    where ${performances.productionId} = ${productions.id}
      and ${venues.isActive} = true
      and ${performances.status} = 'scheduled'
      and ${performances.startsAt} >= now()
    order by ${performances.startsAt}, ${performances.id}
    limit 1
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
        'hotlink_only',
        'todam_original',
        'community_submission'
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

export interface CardRow {
  id: string;
  slug: string;
  title: string;
  discipline: "theatre" | "opera" | "ballet";
  audience: "general" | "family" | "children";
  minimumAge: number | null;
  workTitle: string | null;
  primaryCredit: string | null;
  company: CompanySummary | null;
  venueNames: string[];
  nextPerformance: Date | string | null;
  nextVenue: VenueSummary | null;
  poster: PosterWithStorage | null;
}

interface HomeHighlightRow extends Record<string, unknown> {
  production_id: string;
  starts_at: Date | string;
  venue_name: string;
  locality: string;
  distance_km: number | string | null;
}

export function mapCard(row: CardRow): ProductionCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    discipline: row.discipline,
    audience: row.audience,
    minimumAge: row.minimumAge,
    workTitle: row.workTitle,
    primaryCredit: row.primaryCredit,
    company: row.company,
    venueNames: row.venueNames,
    nextPerformance:
      row.nextPerformance instanceof Date
        ? row.nextPerformance.toISOString()
        : row.nextPerformance
          ? new Date(row.nextPerformance).toISOString()
          : null,
    nextVenue: row.nextVenue,
    poster: row.poster ? mapPoster(row.poster) : null,
  };
}

export interface SearchInput {
  q: string;
  type: "productions" | "venues" | "companies" | "members";
  discipline?: "theatre" | "opera" | "ballet" | undefined;
  locality?: string | undefined;
  radiusKm?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
  temporal: "upcoming" | "past" | "all";
  sort: "relevance" | "date" | "proximity" | "popularity";
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
      .where(
        and(
          eq(productions.id, productionId),
          eq(productions.isActive, true),
          eq(productions.publicationStatus, "published"),
        ),
      )
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
        and(
          eq(productions.isActive, true),
          eq(productions.publicationStatus, "published"),
          inArray(productions.id, productionIds),
        ),
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
          and ${productions.publicationStatus} = 'published'
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
          and ${productions.publicationStatus} = 'published'
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
    const [diary, rating, watchlist, review] = await Promise.all([
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
      database
        .select({
          id: reviews.id,
          body: reviews.body,
          containsSpoiler: reviews.containsSpoiler,
          visibility: reviews.visibility,
          status: reviews.status,
        })
        .from(reviews)
        .where(and(eq(reviews.userId, userId), eq(reviews.productionId, productionId)))
        .limit(1),
    ]);

    return {
      productionId,
      seen: Number(diary[0]?.total ?? 0) > 0,
      rating: rating[0]?.value ?? null,
      watchlisted: Number(watchlist[0]?.total ?? 0) > 0,
      review: review[0] ?? null,
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
          and(
            eq(venues.isActive, true),
            pattern
              ? sql<boolean>`unaccent(${venues.locality}) ilike unaccent(${pattern})`
              : undefined,
          ),
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
            eq(venues.isActive, true),
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
            username: user.username,
            homeLocality: user.homeLocality,
            homeCountryCode: user.homeCountryCode,
            homeOnboardingCompleted: user.homeOnboardingCompleted,
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
            eq(productions.publicationStatus, "published"),
            excludedIds.length > 0
              ? notInArray(productions.id, excludedIds)
              : undefined,
          ),
        )
        .orderBy(desc(productions.createdAt), asc(productions.id))
        .limit(HOME_DISCOVERY_LIMIT);
      const progress = Number(progressResult.rows[0]?.total ?? 0);
      const onboardingCompleted = profile.homeOnboardingCompleted || progress >= 5;
      if (onboardingCompleted && !profile.homeOnboardingCompleted) {
        await database
          .update(user)
          .set({ homeOnboardingCompleted: true, updatedAt: new Date() })
          .where(eq(user.id, userId));
      }

      return {
        profile: { username: profile.username },
        homeCity,
        progress: {
          current: progress,
          target: 5,
          completed: onboardingCompleted,
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
      const trimmedQuery = input.q.trim();
      const pattern = `%${trimmedQuery}%`;
      const normalized = trimmedQuery.toLocaleLowerCase("fr");

      if (input.type === "venues") {
        const condition = and(
          eq(venues.isActive, true),
          trimmedQuery
            ? sql<boolean>`(
                unaccent(${venues.name}) ilike unaccent(${pattern})
                or unaccent(${venues.locality}) ilike unaccent(${pattern})
              )`
            : undefined,
          input.locality
            ? sql<boolean>`unaccent(${venues.locality}) ilike unaccent(${`%${input.locality}%`})`
            : undefined,
          sql<boolean>`exists (
            select 1
            from ${performances}
            join ${productions} on ${productions.id} = ${performances.productionId}
            where ${performances.venueId} = ${venues.id}
              and ${productions.isActive} = true
              and ${productions.publicationStatus} = 'published'
          )`,
        );
        const [rows, totalRows] = await Promise.all([
          database
            .select({
              id: venues.id,
              slug: venues.slug,
              name: venues.name,
              locality: venues.locality,
              countryCode: venues.countryCode,
              timezone: venues.timezone,
              officialUrl: venues.officialUrl,
            })
            .from(venues)
            .where(condition)
            .orderBy(asc(venues.name), asc(venues.id))
            .limit(input.limit + 1)
            .offset(offset),
          database.select({ total: count() }).from(venues).where(condition),
        ]);
        const hasMore = rows.length > input.limit;
        const suggestion =
          trimmedQuery && Number(totalRows[0]?.total ?? 0) === 0
            ? ((
                await database
                  .select({ value: venues.name })
                  .from(venues)
                  .where(
                    and(
                      eq(venues.isActive, true),
                      sql<boolean>`similarity(unaccent(${venues.name}), unaccent(${trimmedQuery})) > 0.15`,
                      sql<boolean>`exists (
                        select 1
                        from ${performances}
                        join ${productions} on ${productions.id} = ${performances.productionId}
                        where ${performances.venueId} = ${venues.id}
                          and ${productions.isActive} = true
                          and ${productions.publicationStatus} = 'published'
                      )`,
                    ),
                  )
                  .orderBy(
                    sql`similarity(unaccent(${venues.name}), unaccent(${trimmedQuery})) desc`,
                  )
                  .limit(1)
              )[0]?.value ?? null)
            : null;
        return {
          type: input.type,
          total: Number(totalRows[0]?.total ?? 0),
          productions: [],
          venues: rows.slice(0, input.limit),
          companies: [],
          members: [],
          nextCursor: hasMore ? encodeCursor(offset + input.limit) : null,
          suggestion,
        };
      }

      if (input.type === "companies") {
        const condition = and(
          eq(companies.publicationStatus, "published"),
          trimmedQuery
            ? sql<boolean>`(
                unaccent(${companies.name}) ilike unaccent(${pattern})
                or unaccent(coalesce(${companies.description}, '')) ilike unaccent(${pattern})
              )`
            : undefined,
          input.locality
            ? sql<boolean>`unaccent(coalesce(${companies.locality}, '')) ilike unaccent(${`%${input.locality}%`})`
            : undefined,
        );
        const [rows, totalRows] = await Promise.all([
          database
            .select({
              id: companies.id,
              slug: companies.slug,
              name: companies.name,
              officialUrl: companies.officialUrl,
            })
            .from(companies)
            .where(condition)
            .orderBy(asc(companies.name), asc(companies.id))
            .limit(input.limit + 1)
            .offset(offset),
          database.select({ total: count() }).from(companies).where(condition),
        ]);
        const hasMore = rows.length > input.limit;
        const suggestion =
          trimmedQuery && Number(totalRows[0]?.total ?? 0) === 0
            ? ((
                await database
                  .select({ value: companies.name })
                  .from(companies)
                  .where(
                    and(
                      eq(companies.publicationStatus, "published"),
                      sql<boolean>`similarity(unaccent(${companies.name}), unaccent(${trimmedQuery})) > 0.15`,
                    ),
                  )
                  .orderBy(
                    sql`similarity(unaccent(${companies.name}), unaccent(${trimmedQuery})) desc`,
                  )
                  .limit(1)
              )[0]?.value ?? null)
            : null;
        return {
          type: input.type,
          total: Number(totalRows[0]?.total ?? 0),
          productions: [],
          venues: [],
          companies: rows.slice(0, input.limit),
          members: [],
          nextCursor: hasMore ? encodeCursor(offset + input.limit) : null,
          suggestion,
        };
      }

      if (input.type === "members") {
        const condition = and(
          eq(user.profileVisibility, "public"),
          trimmedQuery
            ? sql<boolean>`(
                unaccent(${user.username}::text) ilike unaccent(${pattern})
                or unaccent(coalesce(${user.bio}, '')) ilike unaccent(${pattern})
              )`
            : undefined,
        );
        const [rows, totalRows] = await Promise.all([
          database
            .select({ username: user.username, bio: user.bio })
            .from(user)
            .where(condition)
            .orderBy(asc(user.username), asc(user.id))
            .limit(input.limit + 1)
            .offset(offset),
          database.select({ total: count() }).from(user).where(condition),
        ]);
        const hasMore = rows.length > input.limit;
        const suggestion =
          trimmedQuery && Number(totalRows[0]?.total ?? 0) === 0
            ? ((
                await database
                  .select({ value: user.username })
                  .from(user)
                  .where(
                    and(
                      eq(user.profileVisibility, "public"),
                      sql<boolean>`similarity(unaccent(${user.username}::text), unaccent(${trimmedQuery})) > 0.15`,
                    ),
                  )
                  .orderBy(
                    sql`similarity(unaccent(${user.username}::text), unaccent(${trimmedQuery})) desc`,
                  )
                  .limit(1)
              )[0]?.value ?? null)
            : null;
        return {
          type: input.type,
          total: Number(totalRows[0]?.total ?? 0),
          productions: [],
          venues: [],
          companies: [],
          members: rows.slice(0, input.limit),
          nextCursor: hasMore ? encodeCursor(offset + input.limit) : null,
          suggestion,
        };
      }

      const performanceFilter = sql<boolean>`exists (
        select 1
        from ${performances}
        join ${venues} on ${venues.id} = ${performances.venueId}
        where ${performances.productionId} = ${productions.id}
          and (
            (
              ${input.temporal} = 'all'
              and ${performances.status} <> 'cancelled'
            )
            or (
              ${input.temporal} = 'upcoming'
              and ${performances.startsAt} >= now()
              and ${performances.status} = 'scheduled'
            )
            or (
              ${input.temporal} = 'past'
              and ${performances.startsAt} < now()
              and ${performances.status} <> 'cancelled'
            )
          )
          and (${input.from ?? null}::date is null or ${performances.startsAt} >= ${input.from ?? null}::date)
          and (${input.to ?? null}::date is null or ${performances.startsAt} < (${input.to ?? null}::date + interval '1 day'))
          and (
            ${input.locality ?? null}::text is null
            or (
              ${input.radiusKm ?? null}::integer is null
              and unaccent(${venues.locality}) ilike unaccent(${input.locality ? `%${input.locality}%` : ""})
            )
            or (
              ${input.radiusKm ?? null}::integer is not null
              and (
                unaccent(${venues.locality}) ilike unaccent(${input.locality ? `%${input.locality}%` : ""})
                or (
                  ${venues.coordinates} is not null
                  and st_dwithin(
                    ${venues.coordinates}::geography,
                    (
                      select st_centroid(st_collect(center_venue.coordinates))::geography
                      from ${venues} center_venue
                      where unaccent(center_venue.locality) ilike unaccent(${input.locality ? `%${input.locality}%` : ""})
                        and center_venue.coordinates is not null
                    ),
                    (${input.radiusKm ?? 0} * 1000)
                  )
                )
              )
            )
          )
      )`;
      const condition = and(
        eq(productions.isActive, true),
        eq(productions.publicationStatus, "published"),
        input.discipline ? eq(productions.discipline, input.discipline) : undefined,
        input.temporal !== "all" ||
          input.from ||
          input.to ||
          input.locality ||
          input.radiusKm
          ? performanceFilter
          : undefined,
        trimmedQuery
          ? sql<boolean>`(
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
                from ${productionCompanies}
                join ${companies} on ${companies.id} = ${productionCompanies.companyId}
                where ${productionCompanies.productionId} = ${productions.id}
                  and unaccent(${companies.name}) ilike unaccent(${pattern})
              )
              or exists (
                select 1
                from ${performances}
                join ${venues} on ${venues.id} = ${performances.venueId}
                where ${performances.productionId} = ${productions.id}
                  and unaccent(${venues.name}) ilike unaccent(${pattern})
              )
            )`
          : undefined,
      );
      const relevanceOrder = sql`
        case
          when lower(unaccent(${productions.title})) = unaccent(${normalized}) then 0
          when lower(unaccent(${productions.title})) like unaccent(${`${normalized}%`}) then 1
          else 2
        end
      `;
      const nextScheduledDateOrder = sql`(
        select min(search_performance.starts_at)
        from performances search_performance
        where search_performance.production_id = ${productions.id}
          and search_performance.starts_at >= now()
          and search_performance.status = 'scheduled'
      ) asc nulls last`;
      const latestPastDateOrder = sql`(
        select max(search_performance.starts_at)
        from performances search_performance
        where search_performance.production_id = ${productions.id}
          and search_performance.starts_at < now()
          and search_performance.status <> 'cancelled'
      ) desc nulls last`;
      const dateOrders =
        input.temporal === "past"
          ? [latestPastDateOrder]
          : input.temporal === "upcoming"
            ? [nextScheduledDateOrder]
            : [
                sql`case when exists (
                  select 1
                  from performances search_performance
                  where search_performance.production_id = ${productions.id}
                    and search_performance.starts_at >= now()
                    and search_performance.status = 'scheduled'
                ) then 0 else 1 end asc`,
                nextScheduledDateOrder,
                latestPastDateOrder,
              ];
      const proximityOrder = sql`(
        select min(
          st_distance(
            search_venue.coordinates::geography,
            city_center.coordinates::geography
          )
        )
        from performances search_performance
        join venues search_venue
          on search_venue.id = search_performance.venue_id
        cross join lateral (
          select st_centroid(st_collect(center_venue.coordinates)) as coordinates
          from venues center_venue
          where unaccent(center_venue.locality) ilike
            unaccent(${input.locality ? `%${input.locality}%` : ""})
            and center_venue.coordinates is not null
        ) city_center
        where search_performance.production_id = ${productions.id}
          and (
            (
              ${input.temporal} = 'all'
              and search_performance.status <> 'cancelled'
            )
            or (
              ${input.temporal} = 'upcoming'
              and search_performance.starts_at >= now()
              and search_performance.status = 'scheduled'
            )
            or (
              ${input.temporal} = 'past'
              and search_performance.starts_at < now()
              and search_performance.status <> 'cancelled'
            )
          )
          and (${input.from ?? null}::date is null or search_performance.starts_at >= ${input.from ?? null}::date)
          and (${input.to ?? null}::date is null or search_performance.starts_at < (${input.to ?? null}::date + interval '1 day'))
          and search_venue.coordinates is not null
          and city_center.coordinates is not null
      ) asc nulls last`;
      const popularityOrder = sql`(
        select count(*) from ${ratings}
        where ${ratings.productionId} = ${productions.id}
      ) desc`;
      const firstOrders =
        input.sort === "proximity" && input.locality
          ? [proximityOrder, ...dateOrders]
          : input.sort === "date" || input.sort === "proximity"
            ? dateOrders
            : input.sort === "popularity"
              ? [popularityOrder]
              : [relevanceOrder];
      const [rows, totalRows] = await Promise.all([
        database
          .select(cardFields)
          .from(productions)
          .leftJoin(works, eq(works.id, productions.workId))
          .where(condition)
          .orderBy(...firstOrders, asc(productions.title), asc(productions.id))
          .limit(input.limit + 1)
          .offset(offset),
        database
          .select({ total: count() })
          .from(productions)
          .leftJoin(works, eq(works.id, productions.workId))
          .where(condition),
      ]);

      const hasMore = rows.length > input.limit;
      let suggestion: string | null = null;
      if (trimmedQuery && Number(totalRows[0]?.total ?? 0) === 0) {
        const suggestionRows = await database
          .select({ title: productions.title })
          .from(productions)
          .where(
            and(
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
              sql<boolean>`similarity(unaccent(${productions.title}), unaccent(${trimmedQuery})) > 0.15`,
            ),
          )
          .orderBy(
            sql`similarity(unaccent(${productions.title}), unaccent(${trimmedQuery})) desc`,
          )
          .limit(1);
        suggestion = suggestionRows[0]?.title ?? null;
      }
      return {
        type: input.type,
        total: Number(totalRows[0]?.total ?? 0),
        productions: rows.slice(0, input.limit).map((row) => mapCard(row as CardRow)),
        venues: [],
        companies: [],
        members: [],
        nextCursor: hasMore ? encodeCursor(offset + input.limit) : null,
        suggestion,
      };
    },

    async getVenue(slug: string): Promise<VenueDetail> {
      const venueRows = await database
        .select({
          id: venues.id,
          slug: venues.slug,
          name: venues.name,
          addressLine1: venues.addressLine1,
          postalCode: venues.postalCode,
          locality: venues.locality,
          countryCode: venues.countryCode,
          timezone: venues.timezone,
          officialUrl: venues.officialUrl,
          coordinates: venues.coordinates,
        })
        .from(venues)
        .where(
          and(
            eq(venues.slug, slug),
            eq(venues.isActive, true),
            sql<boolean>`exists (
              select 1
              from ${performances}
              join ${productions}
                on ${productions.id} = ${performances.productionId}
              where ${performances.venueId} = ${venues.id}
                and ${productions.isActive} = true
                and ${productions.publicationStatus} = 'published'
            )`,
          ),
        )
        .limit(1);
      const venue = venueRows[0];
      if (!venue) {
        throw new HttpProblem(
          404,
          "VENUE_NOT_FOUND",
          "Ce lieu n’existe pas dans Todam.",
        );
      }

      const publishedAtVenue = and(
        eq(productions.isActive, true),
        eq(productions.publicationStatus, "published"),
        sql<boolean>`exists (
          select 1 from ${performances}
          where ${performances.productionId} = ${productions.id}
            and ${performances.venueId} = ${venue.id}
        )`,
      );
      const [upcomingRows, archiveRows, venuePerformanceRows, sourceRows] =
        await Promise.all([
          database
            .select(cardFields)
            .from(productions)
            .leftJoin(works, eq(works.id, productions.workId))
            .where(
              and(
                publishedAtVenue,
                sql<boolean>`exists (
                select 1 from ${performances}
                where ${performances.productionId} = ${productions.id}
                  and ${performances.venueId} = ${venue.id}
                  and ${performances.status} = 'scheduled'
                  and ${performances.startsAt} >= now()
              )`,
              ),
            )
            .orderBy(
              sql`(
              select min(venue_performance.starts_at)
              from performances venue_performance
              where venue_performance.production_id = ${productions.id}
                and venue_performance.venue_id = ${venue.id}
                and venue_performance.starts_at >= now()
                and venue_performance.status = 'scheduled'
            )`,
              asc(productions.title),
            ),
          database
            .select(cardFields)
            .from(productions)
            .leftJoin(works, eq(works.id, productions.workId))
            .where(
              and(
                publishedAtVenue,
                sql<boolean>`exists (
                select 1 from ${performances}
                where ${performances.productionId} = ${productions.id}
                  and ${performances.venueId} = ${venue.id}
                  and ${performances.startsAt} < now()
              )`,
              ),
            )
            .orderBy(desc(productions.updatedAt), asc(productions.title)),
          database
            .select({
              productionId: performances.productionId,
              id: performances.id,
              startsAt: performances.startsAt,
              endsAt: performances.endsAt,
              status: performances.status,
              officialUrl: performances.officialUrl,
            })
            .from(performances)
            .innerJoin(productions, eq(productions.id, performances.productionId))
            .where(
              and(
                eq(performances.venueId, venue.id),
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
              ),
            )
            .orderBy(asc(performances.startsAt), asc(performances.id)),
          database
            .selectDistinct({
              title: sourceDocuments.title,
              url: sourceDocuments.url,
              retrievedAt: sourceDocuments.retrievedAt,
              rightsStatus: sourceDocuments.rightsStatus,
              license: sourceDocuments.license,
            })
            .from(venueSources)
            .innerJoin(sourceDocuments, eq(sourceDocuments.id, venueSources.documentId))
            .where(eq(venueSources.entityId, venue.id)),
        ]);
      const now = Date.now();
      const programPerformances = new Map<
        string,
        VenueDetail["upcoming"][number]["venuePerformances"]
      >();
      for (const performance of venuePerformanceRows) {
        const mapped = {
          id: performance.id,
          startsAt: performance.startsAt.toISOString(),
          endsAt: performance.endsAt?.toISOString() ?? null,
          status: performance.status,
          officialUrl: performance.officialUrl,
          venue: {
            id: venue.id,
            slug: venue.slug,
            name: venue.name,
            locality: venue.locality,
            countryCode: venue.countryCode,
            timezone: venue.timezone,
            officialUrl: venue.officialUrl,
          },
        };
        programPerformances.set(performance.productionId, [
          ...(programPerformances.get(performance.productionId) ?? []),
          mapped,
        ]);
      }
      const upcoming = upcomingRows.map((row) => {
        const card = mapCard(row as CardRow);
        return {
          ...card,
          venuePerformances: (programPerformances.get(card.id) ?? []).filter(
            (performance) =>
              performance.status === "scheduled" &&
              new Date(performance.startsAt).getTime() >= now,
          ),
        };
      });
      const archives = archiveRows.map((row) => {
        const card = mapCard(row as CardRow);
        return {
          ...card,
          venuePerformances: (programPerformances.get(card.id) ?? []).filter(
            (performance) => new Date(performance.startsAt).getTime() < now,
          ),
        };
      });
      const disciplines = Array.from(
        new Set([...upcoming, ...archives].map((production) => production.discipline)),
      );

      return {
        id: venue.id,
        slug: venue.slug,
        name: venue.name,
        addressLine1: venue.addressLine1,
        postalCode: venue.postalCode,
        locality: venue.locality,
        countryCode: venue.countryCode,
        timezone: venue.timezone,
        officialUrl: venue.officialUrl,
        coordinates: venue.coordinates
          ? {
              longitude: venue.coordinates.x,
              latitude: venue.coordinates.y,
            }
          : null,
        upcoming,
        archives,
        disciplines,
        sources: sourceRows.map((source) => ({
          ...source,
          retrievedAt: source.retrievedAt.toISOString(),
        })),
        lastVerifiedAt:
          sourceRows.length > 0
            ? new Date(
                Math.max(...sourceRows.map((source) => source.retrievedAt.getTime())),
              ).toISOString()
            : null,
      };
    },

    async getCompany(slug: string): Promise<CompanyDetail> {
      const companyRows = await database
        .select()
        .from(companies)
        .where(
          and(eq(companies.slug, slug), eq(companies.publicationStatus, "published")),
        )
        .limit(1);
      const company = companyRows[0];
      if (!company) {
        throw new HttpProblem(
          404,
          "COMPANY_NOT_FOUND",
          "Cette compagnie n’existe pas dans Todam.",
        );
      }

      const belongsToCompany = sql<boolean>`exists (
        select 1 from ${productionCompanies}
        where ${productionCompanies.productionId} = ${productions.id}
          and ${productionCompanies.companyId} = ${company.id}
      )`;
      const [currentRows, archiveRows, touringRows, artistRows, sourceRows] =
        await Promise.all([
          database
            .select(cardFields)
            .from(productions)
            .leftJoin(works, eq(works.id, productions.workId))
            .where(
              and(
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
                belongsToCompany,
                sql<boolean>`exists (
                  select 1 from ${performances}
                  where ${performances.productionId} = ${productions.id}
                    and ${performances.status} = 'scheduled'
                    and ${performances.startsAt} >= now()
                )`,
              ),
            )
            .orderBy(asc(productions.title)),
          database
            .select(cardFields)
            .from(productions)
            .leftJoin(works, eq(works.id, productions.workId))
            .where(
              and(
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
                belongsToCompany,
                sql<boolean>`not exists (
                  select 1 from ${performances}
                  where ${performances.productionId} = ${productions.id}
                    and ${performances.status} = 'scheduled'
                    and ${performances.startsAt} >= now()
                )`,
                sql<boolean>`exists (
                  select 1 from ${performances}
                  where ${performances.productionId} = ${productions.id}
                    and ${performances.status} <> 'cancelled'
                    and ${performances.startsAt} < now()
                )`,
              ),
            )
            .orderBy(desc(productions.updatedAt), asc(productions.title)),
          database
            .select({
              id: performances.id,
              startsAt: performances.startsAt,
              endsAt: performances.endsAt,
              status: performances.status,
              officialUrl: performances.officialUrl,
              productionId: productions.id,
              productionSlug: productions.slug,
              productionTitle: productions.title,
              productionDiscipline: productions.discipline,
              venueId: venues.id,
              venueSlug: venues.slug,
              venueName: venues.name,
              locality: venues.locality,
              countryCode: venues.countryCode,
              timezone: venues.timezone,
              venueOfficialUrl: venues.officialUrl,
            })
            .from(performances)
            .innerJoin(productions, eq(productions.id, performances.productionId))
            .innerJoin(
              productionCompanies,
              eq(productionCompanies.productionId, productions.id),
            )
            .innerJoin(venues, eq(venues.id, performances.venueId))
            .where(
              and(
                eq(productionCompanies.companyId, company.id),
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
                eq(venues.isActive, true),
                eq(performances.status, "scheduled"),
                sql<boolean>`${performances.startsAt} >= now()`,
              ),
            )
            .orderBy(asc(performances.startsAt), asc(performances.id)),
          database
            .select({
              id: artists.id,
              slug: artists.slug,
              name: artists.name,
              roles: sql<
                (
                  | "author"
                  | "director"
                  | "performer"
                  | "choreographer"
                  | "composer"
                  | "musical_director"
                  | "designer"
                  | "other"
                )[]
              >`array_agg(distinct ${productionCredits.role})`,
            })
            .from(productionCredits)
            .innerJoin(artists, eq(artists.id, productionCredits.artistId))
            .innerJoin(
              productionCompanies,
              eq(productionCompanies.productionId, productionCredits.productionId),
            )
            .innerJoin(productions, eq(productions.id, productionCredits.productionId))
            .where(
              and(
                eq(productionCompanies.companyId, company.id),
                eq(productions.publicationStatus, "published"),
              ),
            )
            .groupBy(artists.id, artists.slug, artists.name)
            .orderBy(asc(artists.name)),
          database
            .selectDistinct({
              title: sourceDocuments.title,
              url: sourceDocuments.url,
              retrievedAt: sourceDocuments.retrievedAt,
              rightsStatus: sourceDocuments.rightsStatus,
              license: sourceDocuments.license,
            })
            .from(companySources)
            .innerJoin(
              sourceDocuments,
              eq(sourceDocuments.id, companySources.documentId),
            )
            .where(eq(companySources.entityId, company.id)),
        ]);

      return {
        id: company.id,
        slug: company.slug,
        name: company.name,
        officialUrl: company.officialUrl,
        shortDescription: company.shortDescription,
        description: company.description,
        locality: company.locality,
        countryCode: company.countryCode,
        currentProductions: currentRows.map((row) => mapCard(row as CardRow)),
        touringDates: touringRows.map((performance) => ({
          id: performance.id,
          startsAt: performance.startsAt.toISOString(),
          endsAt: performance.endsAt?.toISOString() ?? null,
          status: performance.status,
          officialUrl: performance.officialUrl,
          production: {
            id: performance.productionId,
            slug: performance.productionSlug,
            title: performance.productionTitle,
            discipline: performance.productionDiscipline,
          },
          venue: {
            id: performance.venueId,
            slug: performance.venueSlug,
            name: performance.venueName,
            locality: performance.locality,
            countryCode: performance.countryCode,
            timezone: performance.timezone,
            officialUrl: performance.venueOfficialUrl,
          },
        })),
        archives: archiveRows.map((row) => mapCard(row as CardRow)),
        principalArtists: artistRows,
        sources: sourceRows.map((source) => ({
          ...source,
          retrievedAt: source.retrievedAt.toISOString(),
        })),
        lastVerifiedAt:
          sourceRows.length > 0
            ? new Date(
                Math.max(...sourceRows.map((source) => source.retrievedAt.getTime())),
              ).toISOString()
            : null,
      };
    },

    async getProduction(
      slug: string,
      options: { includeUnpublished?: boolean } = {},
    ): Promise<ProductionDetail> {
      const baseRows = await database
        .select({
          id: productions.id,
          slug: productions.slug,
          title: productions.title,
          discipline: productions.discipline,
          audience: productions.audience,
          minimumAge: productions.minimumAge,
          durationMinutes: productions.durationMinutes,
          language: productions.language,
          officialUrl: productions.officialUrl,
          workId: works.id,
          workSlug: works.slug,
          workTitle: works.title,
        })
        .from(productions)
        .leftJoin(works, eq(works.id, productions.workId))
        .where(
          and(
            eq(productions.slug, slug),
            eq(productions.isActive, true),
            options.includeUnpublished
              ? undefined
              : eq(productions.publicationStatus, "published"),
          ),
        )
        .limit(1);
      const base = baseRows[0];
      if (!base) {
        throw new HttpProblem(
          404,
          "PRODUCTION_NOT_FOUND",
          "Ce spectacle n'existe pas dans Todam.",
        );
      }

      const [
        companyRows,
        descriptionRows,
        creditRows,
        performanceRows,
        sourceRows,
        posterRows,
        ratingRows,
        reviewRows,
        relatedRows,
      ] = await Promise.all([
        database
          .select({
            id: companies.id,
            slug: companies.slug,
            name: companies.name,
            officialUrl: companies.officialUrl,
          })
          .from(productionCompanies)
          .innerJoin(companies, eq(companies.id, productionCompanies.companyId))
          .where(
            and(
              eq(productionCompanies.productionId, base.id),
              eq(companies.publicationStatus, "published"),
            ),
          )
          .orderBy(
            desc(productionCompanies.isPrimary),
            asc(productionCompanies.position),
            asc(companies.name),
          )
          .limit(1),
        database
          .select({
            id: productionDescriptions.id,
            locale: productionDescriptions.locale,
            kind: productionDescriptions.kind,
            body: productionDescriptions.body,
            rightsStatus: productionDescriptions.rightsStatus,
            license: productionDescriptions.license,
            sourceUrl: sql<string | null>`coalesce(
              ${sourceDocuments.url},
              ${productionDescriptions.sourceUrl}
            )`,
            sourceTitle: sourceDocuments.title,
            retrievedAt: sourceDocuments.retrievedAt,
            lastVerifiedAt: productionDescriptions.lastVerifiedAt,
          })
          .from(productionDescriptions)
          .leftJoin(
            sourceDocuments,
            eq(sourceDocuments.id, productionDescriptions.sourceDocumentId),
          )
          .where(
            and(
              eq(productionDescriptions.productionId, base.id),
              sql<boolean>`${productionDescriptions.rightsStatus} in (
                'permission_granted',
                'open_license',
                'contractual_display',
                'todam_original',
                'community_submission'
              )`,
            ),
          )
          .orderBy(
            asc(productionDescriptions.kind),
            asc(productionDescriptions.locale),
          ),
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
            countryCode: venues.countryCode,
            timezone: venues.timezone,
            venueOfficialUrl: venues.officialUrl,
          })
          .from(performances)
          .innerJoin(venues, eq(venues.id, performances.venueId))
          .where(and(eq(performances.productionId, base.id), eq(venues.isActive, true)))
          .orderBy(asc(performances.startsAt)),
        database
          .selectDistinct({
            title: sourceDocuments.title,
            url: sourceDocuments.url,
            retrievedAt: sourceDocuments.retrievedAt,
            rightsStatus: sourceDocuments.rightsStatus,
            license: sourceDocuments.license,
          })
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
                'hotlink_only',
                'todam_original',
                'community_submission'
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
        database
          .select({
            average: sql<string | null>`avg(${ratings.value})`,
            count: count(),
          })
          .from(ratings)
          .where(eq(ratings.productionId, base.id)),
        database
          .select({
            id: reviews.id,
            username: user.username,
            rating: ratings.value,
            body: reviews.body,
            containsSpoiler: reviews.containsSpoiler,
            createdAt: reviews.createdAt,
            updatedAt: reviews.updatedAt,
          })
          .from(reviews)
          .innerJoin(user, eq(user.id, reviews.userId))
          .leftJoin(
            ratings,
            and(
              eq(ratings.userId, reviews.userId),
              eq(ratings.productionId, reviews.productionId),
            ),
          )
          .where(
            and(
              eq(reviews.productionId, base.id),
              eq(reviews.visibility, "public"),
              eq(reviews.status, "published"),
              eq(user.profileVisibility, "public"),
            ),
          )
          .orderBy(desc(reviews.createdAt), desc(reviews.id))
          .limit(20),
        database
          .select(cardFields)
          .from(productions)
          .leftJoin(works, eq(works.id, productions.workId))
          .where(
            and(
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
              eq(productions.discipline, base.discipline),
              sql<boolean>`${productions.id} <> ${base.id}`,
            ),
          )
          .orderBy(desc(productions.reviewedAt), asc(productions.title))
          .limit(4),
      ]);
      const allVerificationDates = [
        ...descriptionRows.map((description) => description.lastVerifiedAt),
        ...sourceRows.map((source) => source.retrievedAt),
      ];
      const lastVerifiedAt =
        allVerificationDates.length > 0
          ? new Date(
              Math.max(...allVerificationDates.map((value) => value.getTime())),
            ).toISOString()
          : null;

      return {
        id: base.id,
        slug: base.slug,
        title: base.title,
        discipline: base.discipline,
        audience: base.audience,
        minimumAge: base.minimumAge,
        company: companyRows[0] ?? null,
        durationMinutes: base.durationMinutes,
        language: base.language,
        officialUrl: base.officialUrl,
        posters: posterRows.map((poster) => mapPoster(poster as PosterWithStorage)),
        imagePolicyMessage:
          "Todam ne publie que les visuels dont les droits d’affichage sont confirmés.",
        descriptions: descriptionRows.map((description) => ({
          ...description,
          retrievedAt: description.retrievedAt?.toISOString() ?? null,
          lastVerifiedAt: description.lastVerifiedAt.toISOString(),
        })),
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
            countryCode: performance.countryCode,
            timezone: performance.timezone,
            officialUrl: performance.venueOfficialUrl,
          },
        })),
        ratingSummary: {
          average:
            ratingRows[0]?.average === null || ratingRows[0]?.average === undefined
              ? null
              : Math.round(Number(ratingRows[0].average) * 10) / 10,
          count: Number(ratingRows[0]?.count ?? 0),
        },
        reviews: reviewRows.map((review) => ({
          ...review,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        })),
        relatedProductions: relatedRows.map((row) => mapCard(row as CardRow)),
        sources: sourceRows.map((source) => ({
          ...source,
          retrievedAt: source.retrievedAt.toISOString(),
        })),
        lastVerifiedAt,
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
          venueCountryCode: venues.countryCode,
          venueTimezone: venues.timezone,
          venueOfficialUrl: venues.officialUrl,
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
          row.venueCountryCode &&
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
                  countryCode: row.venueCountryCode,
                  timezone: row.venueTimezone,
                  officialUrl: row.venueOfficialUrl,
                },
              }
            : null,
      }));
    },

    async markSeen(userId: string, input: SeenInput): Promise<ViewerProductionState> {
      await assertProduction(input.productionId);
      if (input.attendedOn !== null && input.attendedOn > currentFrenchCalendarDate()) {
        throw new HttpProblem(
          400,
          "FUTURE_ATTENDED_DATE",
          "La date vue ne peut pas être dans le futur.",
        );
      }
      await database.transaction(async (transaction) => {
        if (input.performanceId) {
          const performanceRows = await transaction
            .select({
              id: performances.id,
              startsAt: performances.startsAt,
              status: performances.status,
            })
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
          if (
            performanceRows[0].startsAt.getTime() > Date.now() ||
            ["cancelled", "postponed"].includes(performanceRows[0].status)
          ) {
            throw new HttpProblem(
              400,
              "PERFORMANCE_NOT_ATTENDABLE",
              "Seule une représentation passée et non annulée peut être ajoutée au journal.",
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
        listCountRows,
        reviewCountRows,
        distributionRows,
        recentRows,
        recentRatingRows,
        watchlistRows,
      ] = await Promise.all([
        database
          .select({ username: user.username })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1),
        database
          .select({
            total: sql<number>`count(distinct ${diaryEntries.productionId})`,
          })
          .from(diaryEntries)
          .innerJoin(productions, eq(productions.id, diaryEntries.productionId))
          .where(
            and(
              eq(diaryEntries.userId, userId),
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
            ),
          ),
        database
          .select({ total: count() })
          .from(ratings)
          .innerJoin(productions, eq(productions.id, ratings.productionId))
          .where(
            and(
              eq(ratings.userId, userId),
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
            ),
          ),
        database
          .select({ total: count() })
          .from(watchlistEntries)
          .innerJoin(productions, eq(productions.id, watchlistEntries.productionId))
          .where(
            and(
              eq(watchlistEntries.userId, userId),
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
            ),
          ),
        database.select({ total: count() }).from(lists).where(eq(lists.userId, userId)),
        database
          .select({ total: count() })
          .from(reviews)
          .innerJoin(productions, eq(productions.id, reviews.productionId))
          .where(
            and(
              eq(reviews.userId, userId),
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
            ),
          ),
        database
          .select({ value: ratings.value, total: count() })
          .from(ratings)
          .innerJoin(productions, eq(productions.id, ratings.productionId))
          .where(
            and(
              eq(ratings.userId, userId),
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
            ),
          )
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
          .where(
            and(
              eq(diaryEntries.userId, userId),
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
            ),
          )
          .orderBy(desc(diaryEntries.createdAt))
          .limit(10),
        database
          .select({
            value: ratings.value,
            ratedAt: ratings.updatedAt,
            hasReview: sql<boolean>`exists (
              select 1
              from ${reviews}
              where ${reviews.userId} = ${userId}
                and ${reviews.productionId} = ${productions.id}
            )`,
            ...cardFields,
          })
          .from(ratings)
          .innerJoin(productions, eq(productions.id, ratings.productionId))
          .leftJoin(works, eq(works.id, productions.workId))
          .where(
            and(
              eq(ratings.userId, userId),
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
            ),
          )
          .orderBy(desc(ratings.updatedAt))
          .limit(6),
        database
          .select(cardFields)
          .from(watchlistEntries)
          .innerJoin(productions, eq(productions.id, watchlistEntries.productionId))
          .leftJoin(works, eq(works.id, productions.workId))
          .where(
            and(
              eq(watchlistEntries.userId, userId),
              eq(productions.isActive, true),
              eq(productions.publicationStatus, "published"),
            ),
          )
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
          lists: Number(listCountRows[0]?.total ?? 0),
          reviews: Number(reviewCountRows[0]?.total ?? 0),
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
        recentRatings: recentRatingRows.map((row) => ({
          production: mapCard(row as CardRow),
          value: row.value,
          ratedAt: row.ratedAt.toISOString(),
          hasReview: row.hasReview,
        })),
        watchlist: watchlistRows.map((row) => mapCard(row as CardRow)),
      };
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;

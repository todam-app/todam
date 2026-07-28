import type {
  AddListItemBody,
  ContentReportBody,
  CreateListBody,
  MemberJournalQuery,
  MemberJournalResponse,
  OwnReview,
  ProfileSettings,
  PublicMember,
  ReorderListBody,
  UpdateDiaryEntryBody,
  UpdateListBody,
  UpdateProfileBody,
  UpsertReviewBody,
  UserListDetail,
  UserListSummary,
  WatchlistItem,
} from "@todam/contracts";
import {
  companies,
  diaryEntries,
  contentReports,
  listItems,
  lists,
  performances,
  productions,
  ratings,
  reviews,
  user,
  venues,
  watchlistEntries,
  works,
  type TodamDatabase,
} from "@todam/database";
import { and, asc, count, desc, eq, ne, or, sql } from "drizzle-orm";

import { cardFields, mapCard, type CardRow } from "./catalog-service.js";
import { currentFrenchCalendarDate } from "./calendar.js";
import { HttpProblem } from "./errors.js";

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

function toSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function createMemberService(database: TodamDatabase) {
  async function getUserByUsername(username: string, requirePublic: boolean) {
    const rows = await database
      .select({
        id: user.id,
        username: user.pseudonym,
        bio: user.bio,
        profileVisibility: user.profileVisibility,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(
        and(
          sql<boolean>`lower(${user.pseudonym}::text) = lower(${username})`,
          requirePublic ? eq(user.profileVisibility, "public") : undefined,
        ),
      )
      .limit(1);
    const member = rows[0];
    if (!member) {
      throw new HttpProblem(
        404,
        "MEMBER_NOT_FOUND",
        "Ce profil n’existe pas ou n’est pas public.",
      );
    }
    return member;
  }

  async function getOwnedList(userId: string, listId: string) {
    const rows = await database
      .select()
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
      .limit(1);
    const list = rows[0];
    if (!list) {
      throw new HttpProblem(
        404,
        "LIST_NOT_FOUND",
        "Cette liste n’existe pas dans votre profil.",
      );
    }
    return list;
  }

  async function getListDetail(
    ownerId: string,
    username: string,
    listId: string,
  ): Promise<UserListDetail> {
    const listRows = await database
      .select({
        id: lists.id,
        slug: lists.slug,
        name: lists.name,
        description: lists.description,
        visibility: lists.visibility,
        updatedAt: lists.updatedAt,
      })
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, ownerId)))
      .limit(1);
    const list = listRows[0];
    if (!list) {
      throw new HttpProblem(404, "LIST_NOT_FOUND", "Cette liste est introuvable.");
    }
    const rows = await database
      .select({
        position: listItems.position,
        addedAt: listItems.addedAt,
        ...cardFields,
      })
      .from(listItems)
      .innerJoin(productions, eq(productions.id, listItems.productionId))
      .leftJoin(works, eq(works.id, productions.workId))
      .where(
        and(
          eq(listItems.listId, list.id),
          eq(productions.isActive, true),
          eq(productions.publicationStatus, "published"),
        ),
      )
      .orderBy(asc(listItems.position), asc(listItems.addedAt));

    return {
      ...list,
      username,
      itemCount: rows.length,
      updatedAt: list.updatedAt.toISOString(),
      items: rows.map((row) => ({
        production: mapCard(row as CardRow),
        position: row.position,
        addedAt: row.addedAt.toISOString(),
      })),
    };
  }

  async function listSummaries(
    userId: string,
    publicOnly: boolean,
  ): Promise<UserListSummary[]> {
    const rows = await database
      .select({
        id: lists.id,
        slug: lists.slug,
        name: lists.name,
        description: lists.description,
        visibility: lists.visibility,
        updatedAt: lists.updatedAt,
        itemCount: sql<number>`count(${productions.id})`,
      })
      .from(lists)
      .leftJoin(listItems, eq(listItems.listId, lists.id))
      .leftJoin(
        productions,
        and(
          eq(productions.id, listItems.productionId),
          eq(productions.isActive, true),
          eq(productions.publicationStatus, "published"),
        ),
      )
      .where(
        and(
          eq(lists.userId, userId),
          publicOnly ? eq(lists.visibility, "public") : undefined,
        ),
      )
      .groupBy(lists.id)
      .orderBy(desc(lists.updatedAt), asc(lists.name));
    return rows.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async function getJournal(
    memberId: string,
    input: MemberJournalQuery,
    publicOnly: boolean,
  ): Promise<MemberJournalResponse> {
    const offset = decodeCursor(input.cursor);
    const reviewJoinCondition = and(
      eq(reviews.userId, memberId),
      eq(reviews.productionId, productions.id),
      publicOnly ? eq(reviews.visibility, "public") : undefined,
      publicOnly ? eq(reviews.status, "published") : undefined,
    );
    const knownAttendedDate = sql<string | null>`coalesce(
      ${diaryEntries.attendedOn},
      (
        select (${performances.startsAt} at time zone ${venues.timezone})::date
        from ${performances}
        join ${venues} on ${venues.id} = ${performances.venueId}
        where ${performances.id} = ${diaryEntries.performanceId}
      )
    )`;
    const effectiveDate = sql`coalesce(
      ${knownAttendedDate},
      ${diaryEntries.createdAt}::date
    )`;
    const condition = and(
      eq(diaryEntries.userId, memberId),
      eq(productions.isActive, true),
      eq(productions.publicationStatus, "published"),
      input.discipline ? eq(productions.discipline, input.discipline) : undefined,
      input.year
        ? sql<boolean>`extract(year from ${effectiveDate}) = ${input.year}`
        : undefined,
      input.venue
        ? sql<boolean>`exists (
            select 1
            from ${performances}
            join ${venues} on ${venues.id} = ${performances.venueId}
            where (
              ${performances.id} = ${diaryEntries.performanceId}
              or (
                ${diaryEntries.performanceId} is null
                and ${performances.productionId} = ${productions.id}
              )
            )
            and (
              ${venues.slug} = ${input.venue}
              or unaccent(${venues.name}) ilike unaccent(${`%${input.venue}%`})
            )
          )`
        : undefined,
      input.rating ? eq(ratings.value, input.rating) : undefined,
      input.hasReview === true
        ? sql<boolean>`${reviews.id} is not null`
        : input.hasReview === false
          ? sql<boolean>`${reviews.id} is null`
          : undefined,
    );
    const direction = input.order === "asc" ? asc : desc;
    const sortExpression =
      input.sort === "added"
        ? diaryEntries.createdAt
        : input.sort === "rated"
          ? ratings.updatedAt
          : input.sort === "rating"
            ? ratings.value
            : input.sort === "title"
              ? productions.title
              : effectiveDate;
    const rows = await database
      .select({
        diaryId: diaryEntries.id,
        performanceId: diaryEntries.performanceId,
        attendedOn: knownAttendedDate,
        addedAt: diaryEntries.createdAt,
        ratedAt: ratings.updatedAt,
        rating: ratings.value,
        reviewId: reviews.id,
        ...cardFields,
      })
      .from(diaryEntries)
      .innerJoin(productions, eq(productions.id, diaryEntries.productionId))
      .leftJoin(works, eq(works.id, productions.workId))
      .leftJoin(
        ratings,
        and(eq(ratings.userId, memberId), eq(ratings.productionId, productions.id)),
      )
      .leftJoin(reviews, reviewJoinCondition)
      .where(condition)
      .orderBy(direction(sortExpression), desc(diaryEntries.id))
      .limit(input.limit + 1)
      .offset(offset);
    const hasMore = rows.length > input.limit;

    return {
      items: rows.slice(0, input.limit).map((row) => ({
        id: row.diaryId,
        production: mapCard(row as CardRow),
        performanceId: row.performanceId,
        attendedOn: row.attendedOn,
        addedAt: row.addedAt.toISOString(),
        ratedAt: row.ratedAt?.toISOString() ?? null,
        rating: row.rating,
        hasReview: row.reviewId !== null,
      })),
      nextCursor: hasMore ? encodeCursor(offset + input.limit) : null,
    };
  }

  return {
    async createContentReport(
      input: ContentReportBody,
      reporterUserId: string | null = null,
    ) {
      const targetRows =
        input.targetType === "production"
          ? await database
              .select({ id: productions.id })
              .from(productions)
              .where(
                and(
                  eq(productions.id, input.targetId),
                  eq(productions.isActive, true),
                  eq(productions.publicationStatus, "published"),
                ),
              )
              .limit(1)
          : input.targetType === "venue"
            ? await database
                .select({ id: venues.id })
                .from(venues)
                .where(
                  and(
                    eq(venues.id, input.targetId),
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
                .limit(1)
            : input.targetType === "company"
              ? await database
                  .select({ id: companies.id })
                  .from(companies)
                  .where(
                    and(
                      eq(companies.id, input.targetId),
                      eq(companies.publicationStatus, "published"),
                    ),
                  )
                  .limit(1)
              : input.targetType === "member"
                ? await database
                    .select({ id: user.id })
                    .from(user)
                    .where(
                      and(
                        sql<boolean>`lower(${user.pseudonym}::text) = lower(${input.targetId})`,
                        or(
                          eq(user.profileVisibility, "public"),
                          reporterUserId ? eq(user.id, reporterUserId) : undefined,
                        ),
                      ),
                    )
                    .limit(1)
                : input.targetType === "list"
                  ? await database
                      .select({ id: lists.id })
                      .from(lists)
                      .innerJoin(user, eq(user.id, lists.userId))
                      .where(
                        and(
                          eq(lists.id, input.targetId),
                          or(
                            and(
                              eq(lists.visibility, "public"),
                              eq(user.profileVisibility, "public"),
                            ),
                            reporterUserId
                              ? eq(lists.userId, reporterUserId)
                              : undefined,
                          ),
                        ),
                      )
                      .limit(1)
                  : await database
                      .select({ id: reviews.id })
                      .from(reviews)
                      .innerJoin(user, eq(user.id, reviews.userId))
                      .innerJoin(productions, eq(productions.id, reviews.productionId))
                      .where(
                        and(
                          eq(reviews.id, input.targetId),
                          or(
                            and(
                              eq(reviews.visibility, "public"),
                              eq(reviews.status, "published"),
                              eq(user.profileVisibility, "public"),
                              eq(productions.isActive, true),
                              eq(productions.publicationStatus, "published"),
                            ),
                            reporterUserId
                              ? eq(reviews.userId, reporterUserId)
                              : undefined,
                          ),
                        ),
                      )
                      .limit(1);
      if (!targetRows[0]) {
        throw new HttpProblem(
          404,
          "CONTENT_REPORT_TARGET_NOT_FOUND",
          "Le contenu à signaler est introuvable.",
        );
      }
      const inserted = await database
        .insert(contentReports)
        .values({
          reporterUserId,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason.trim(),
        })
        .returning({ id: contentReports.id, status: contentReports.status });
      const report = inserted[0];
      if (!report) {
        throw new HttpProblem(
          500,
          "CONTENT_REPORT_NOT_CREATED",
          "Le signalement n’a pas pu être enregistré.",
        );
      }
      return { id: report.id, status: "open" as const };
    },

    async getPublicMember(username: string): Promise<PublicMember> {
      const member = await getUserByUsername(username, true);
      const [seenRows, reviewRows, publicLists, recentJournal, recentReviews] =
        await Promise.all([
          database
            .select({
              total: sql<number>`count(distinct ${diaryEntries.productionId})`,
            })
            .from(diaryEntries)
            .innerJoin(productions, eq(productions.id, diaryEntries.productionId))
            .where(
              and(
                eq(diaryEntries.userId, member.id),
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
              ),
            ),
          database
            .select({ total: count() })
            .from(reviews)
            .innerJoin(productions, eq(productions.id, reviews.productionId))
            .where(
              and(
                eq(reviews.userId, member.id),
                eq(reviews.visibility, "public"),
                eq(reviews.status, "published"),
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
              ),
            ),
          listSummaries(member.id, true),
          getJournal(
            member.id,
            {
              limit: 6,
              sort: "attended",
              order: "desc",
            },
            true,
          ),
          database
            .select({
              reviewId: reviews.id,
              body: reviews.body,
              containsSpoiler: reviews.containsSpoiler,
              createdAt: reviews.createdAt,
              updatedAt: reviews.updatedAt,
              rating: ratings.value,
              ...cardFields,
            })
            .from(reviews)
            .innerJoin(productions, eq(productions.id, reviews.productionId))
            .leftJoin(works, eq(works.id, productions.workId))
            .leftJoin(
              ratings,
              and(
                eq(ratings.userId, reviews.userId),
                eq(ratings.productionId, reviews.productionId),
              ),
            )
            .where(
              and(
                eq(reviews.userId, member.id),
                eq(reviews.visibility, "public"),
                eq(reviews.status, "published"),
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
              ),
            )
            .orderBy(desc(reviews.createdAt))
            .limit(6),
        ]);
      return {
        username: member.username,
        bio: member.bio,
        memberSince: member.createdAt.toISOString(),
        counts: {
          seen: Number(seenRows[0]?.total ?? 0),
          lists: publicLists.length,
          reviews: Number(reviewRows[0]?.total ?? 0),
        },
        recentJournal: recentJournal.items,
        publicLists,
        recentReviews: recentReviews.map((review) => ({
          id: review.reviewId,
          production: mapCard(review as CardRow),
          body: review.body,
          containsSpoiler: review.containsSpoiler,
          rating: review.rating,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        })),
      };
    },

    async getPublicJournal(
      username: string,
      input: MemberJournalQuery,
    ): Promise<MemberJournalResponse> {
      const member = await getUserByUsername(username, true);
      return getJournal(member.id, input, true);
    },

    async getMyJournal(
      userId: string,
      input: MemberJournalQuery,
    ): Promise<MemberJournalResponse> {
      return getJournal(userId, input, false);
    },

    async getProfileSettings(userId: string): Promise<ProfileSettings> {
      const rows = await database
        .select({
          username: user.pseudonym,
          bio: user.bio,
          profileVisibility: user.profileVisibility,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      const profile = rows[0];
      if (!profile) {
        throw new HttpProblem(
          404,
          "PROFILE_NOT_FOUND",
          "Votre profil est introuvable.",
        );
      }
      return profile;
    },

    async updateProfile(
      userId: string,
      input: UpdateProfileBody,
    ): Promise<ProfileSettings> {
      const rows = await database
        .update(user)
        .set({
          ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
          ...(input.profileVisibility !== undefined
            ? { profileVisibility: input.profileVisibility }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
        .returning({
          username: user.pseudonym,
          bio: user.bio,
          profileVisibility: user.profileVisibility,
        });
      const profile = rows[0];
      if (!profile) {
        throw new HttpProblem(
          404,
          "PROFILE_NOT_FOUND",
          "Votre profil est introuvable.",
        );
      }
      return profile;
    },

    listMyLists(userId: string): Promise<UserListSummary[]> {
      return listSummaries(userId, false);
    },

    async getMyList(userId: string, listId: string): Promise<UserListDetail> {
      await getOwnedList(userId, listId);
      const profileRows = await database
        .select({ username: user.pseudonym })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (!profileRows[0]) {
        throw new HttpProblem(
          404,
          "PROFILE_NOT_FOUND",
          "Votre profil est introuvable.",
        );
      }
      return getListDetail(userId, profileRows[0].username, listId);
    },

    async getWatchlist(userId: string): Promise<WatchlistItem[]> {
      const rows = await database
        .select({
          addedAt: watchlistEntries.addedAt,
          ...cardFields,
        })
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
        .orderBy(desc(watchlistEntries.addedAt));
      return rows.map((row) => ({
        production: mapCard(row as CardRow),
        addedAt: row.addedAt.toISOString(),
      }));
    },

    async getOwnReviews(userId: string): Promise<OwnReview[]> {
      const rows = await database
        .select({
          reviewId: reviews.id,
          body: reviews.body,
          containsSpoiler: reviews.containsSpoiler,
          visibility: reviews.visibility,
          status: reviews.status,
          reviewCreatedAt: reviews.createdAt,
          reviewUpdatedAt: reviews.updatedAt,
          ...cardFields,
        })
        .from(reviews)
        .innerJoin(productions, eq(productions.id, reviews.productionId))
        .leftJoin(works, eq(works.id, productions.workId))
        .where(
          and(
            eq(reviews.userId, userId),
            eq(productions.isActive, true),
            eq(productions.publicationStatus, "published"),
          ),
        )
        .orderBy(desc(reviews.updatedAt));
      return rows.map((row) => ({
        id: row.reviewId,
        production: mapCard(row as CardRow),
        body: row.body,
        containsSpoiler: row.containsSpoiler,
        visibility: row.visibility,
        status: row.status,
        createdAt: row.reviewCreatedAt.toISOString(),
        updatedAt: row.reviewUpdatedAt.toISOString(),
      }));
    },

    async createList(userId: string, input: CreateListBody): Promise<UserListDetail> {
      const profileRows = await database
        .select({ username: user.pseudonym })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      const profile = profileRows[0];
      if (!profile) {
        throw new HttpProblem(
          404,
          "PROFILE_NOT_FOUND",
          "Votre profil est introuvable.",
        );
      }
      const listId = await database.transaction(async (transaction) => {
        if (input.productionId) {
          const productionRows = await transaction
            .select({ id: productions.id })
            .from(productions)
            .where(
              and(
                eq(productions.id, input.productionId),
                eq(productions.isActive, true),
                eq(productions.publicationStatus, "published"),
              ),
            )
            .limit(1);
          if (!productionRows[0]) {
            throw new HttpProblem(
              404,
              "PRODUCTION_NOT_FOUND",
              "Ce spectacle n’est pas publié.",
            );
          }
        }

        const baseSlug = toSlug(input.name) || "liste";
        let slug = baseSlug;
        let available = false;
        for (let suffix = 1; suffix <= 9_999; suffix += 1) {
          slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
          if (slug === "journal" || slug === "a-voir") continue;
          const existing = await transaction
            .select({ id: lists.id })
            .from(lists)
            .where(and(eq(lists.userId, userId), eq(lists.slug, slug)))
            .limit(1);
          if (!existing[0]) {
            available = true;
            break;
          }
        }
        if (!available) {
          throw new HttpProblem(
            409,
            "LIST_SLUG_EXHAUSTED",
            "Impossible de créer une nouvelle URL pour cette liste. Choisissez un nom plus distinctif.",
          );
        }
        const created = await transaction
          .insert(lists)
          .values({
            userId,
            slug,
            name: input.name,
            description: input.description,
            visibility: input.visibility,
          })
          .returning({ id: lists.id });
        const createdId = created[0]!.id;
        if (input.productionId) {
          await transaction.insert(listItems).values({
            listId: createdId,
            productionId: input.productionId,
            position: 0,
          });
        }
        return createdId;
      });
      return getListDetail(userId, profile.username, listId);
    },

    async updateList(
      userId: string,
      listId: string,
      input: UpdateListBody,
    ): Promise<UserListDetail> {
      await getOwnedList(userId, listId);
      const [updated, profileRows] = await Promise.all([
        database
          .update(lists)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined
              ? { description: input.description || null }
              : {}),
            ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
            updatedAt: new Date(),
          })
          .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
          .returning({ id: lists.id }),
        database
          .select({ username: user.pseudonym })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1),
      ]);
      if (!updated[0] || !profileRows[0]) {
        throw new HttpProblem(404, "LIST_NOT_FOUND", "Cette liste est introuvable.");
      }
      return getListDetail(userId, profileRows[0].username, listId);
    },

    async deleteList(userId: string, listId: string): Promise<void> {
      const deleted = await database
        .delete(lists)
        .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
        .returning({ id: lists.id });
      if (!deleted[0]) {
        throw new HttpProblem(404, "LIST_NOT_FOUND", "Cette liste est introuvable.");
      }
    },

    async addListItem(
      userId: string,
      listId: string,
      input: AddListItemBody,
    ): Promise<void> {
      await getOwnedList(userId, listId);
      const productionRows = await database
        .select({ id: productions.id })
        .from(productions)
        .where(
          and(
            eq(productions.id, input.productionId),
            eq(productions.isActive, true),
            eq(productions.publicationStatus, "published"),
          ),
        )
        .limit(1);
      if (!productionRows[0]) {
        throw new HttpProblem(
          404,
          "PRODUCTION_NOT_FOUND",
          "Ce spectacle n’est pas publié.",
        );
      }
      await database.transaction(async (transaction) => {
        const current = await transaction
          .select({ productionId: listItems.productionId })
          .from(listItems)
          .where(eq(listItems.listId, listId))
          .orderBy(asc(listItems.position), asc(listItems.addedAt));
        const order = current
          .map((item) => item.productionId)
          .filter((productionId) => productionId !== input.productionId);
        const requestedPosition = input.position ?? order.length;
        const position = Math.min(requestedPosition, order.length);
        order.splice(position, 0, input.productionId);

        await transaction
          .insert(listItems)
          .values({
            listId,
            productionId: input.productionId,
            position,
          })
          .onConflictDoNothing();
        for (const [nextPosition, productionId] of order.entries()) {
          await transaction
            .update(listItems)
            .set({ position: nextPosition })
            .where(
              and(
                eq(listItems.listId, listId),
                eq(listItems.productionId, productionId),
              ),
            );
        }
        await transaction
          .update(lists)
          .set({ updatedAt: new Date() })
          .where(eq(lists.id, listId));
      });
    },

    async removeListItem(
      userId: string,
      listId: string,
      productionId: string,
    ): Promise<void> {
      await getOwnedList(userId, listId);
      await database.transaction(async (transaction) => {
        const deleted = await transaction
          .delete(listItems)
          .where(
            and(eq(listItems.listId, listId), eq(listItems.productionId, productionId)),
          )
          .returning({ productionId: listItems.productionId });
        if (!deleted[0]) {
          throw new HttpProblem(
            404,
            "LIST_ITEM_NOT_FOUND",
            "Ce spectacle n’est pas dans cette liste.",
          );
        }
        const remaining = await transaction
          .select({ productionId: listItems.productionId })
          .from(listItems)
          .where(eq(listItems.listId, listId))
          .orderBy(asc(listItems.position), asc(listItems.addedAt));
        for (const [position, item] of remaining.entries()) {
          await transaction
            .update(listItems)
            .set({ position })
            .where(
              and(
                eq(listItems.listId, listId),
                eq(listItems.productionId, item.productionId),
              ),
            );
        }
        await transaction
          .update(lists)
          .set({ updatedAt: new Date() })
          .where(eq(lists.id, listId));
      });
    },

    async reorderList(
      userId: string,
      listId: string,
      input: ReorderListBody,
    ): Promise<void> {
      await getOwnedList(userId, listId);
      const existing = await database
        .select({ productionId: listItems.productionId })
        .from(listItems)
        .innerJoin(productions, eq(productions.id, listItems.productionId))
        .where(
          and(
            eq(listItems.listId, listId),
            eq(productions.isActive, true),
            eq(productions.publicationStatus, "published"),
          ),
        );
      const existingIds = new Set(existing.map((item) => item.productionId));
      if (
        existingIds.size !== input.productionIds.length ||
        new Set(input.productionIds).size !== input.productionIds.length ||
        input.productionIds.some((id) => !existingIds.has(id))
      ) {
        throw new HttpProblem(
          400,
          "INVALID_LIST_ORDER",
          "Le nouvel ordre doit contenir exactement les spectacles de la liste.",
        );
      }
      await database.transaction(async (transaction) => {
        for (const [position, productionId] of input.productionIds.entries()) {
          await transaction
            .update(listItems)
            .set({ position })
            .where(
              and(
                eq(listItems.listId, listId),
                eq(listItems.productionId, productionId),
              ),
            );
        }
        await transaction
          .update(lists)
          .set({ updatedAt: new Date() })
          .where(eq(lists.id, listId));
      });
    },

    async getPublicList(username: string, slug: string): Promise<UserListDetail> {
      const member = await getUserByUsername(username, false);
      const rows = await database
        .select({ id: lists.id })
        .from(lists)
        .where(
          and(
            eq(lists.userId, member.id),
            eq(lists.slug, slug),
            eq(lists.visibility, "public"),
          ),
        )
        .limit(1);
      if (!rows[0]) {
        throw new HttpProblem(
          404,
          "LIST_NOT_FOUND",
          "Cette liste n’existe pas ou n’est pas publique.",
        );
      }
      return getListDetail(member.id, member.username, rows[0].id);
    },

    async upsertReview(
      userId: string,
      productionId: string,
      input: UpsertReviewBody,
    ): Promise<void> {
      const diaryRows = await database
        .select({ id: diaryEntries.id })
        .from(diaryEntries)
        .where(
          and(
            eq(diaryEntries.userId, userId),
            eq(diaryEntries.productionId, productionId),
          ),
        )
        .limit(1);
      if (!diaryRows[0]) {
        throw new HttpProblem(
          409,
          "REVIEW_REQUIRES_DIARY_ENTRY",
          "Ajoutez d’abord ce spectacle à votre journal.",
        );
      }
      await database
        .insert(reviews)
        .values({
          userId,
          productionId,
          body: input.body,
          containsSpoiler: input.containsSpoiler,
          visibility: input.visibility,
        })
        .onConflictDoUpdate({
          target: [reviews.userId, reviews.productionId],
          set: {
            body: input.body,
            containsSpoiler: input.containsSpoiler,
            visibility: input.visibility,
            updatedAt: new Date(),
          },
        });
    },

    async deleteReview(userId: string, productionId: string): Promise<void> {
      const deleted = await database
        .delete(reviews)
        .where(and(eq(reviews.userId, userId), eq(reviews.productionId, productionId)))
        .returning({ id: reviews.id });
      if (!deleted[0]) {
        throw new HttpProblem(404, "REVIEW_NOT_FOUND", "Cet avis est introuvable.");
      }
    },

    async updateDiaryEntry(
      userId: string,
      entryId: string,
      input: UpdateDiaryEntryBody,
    ): Promise<void> {
      if (input.attendedOn !== null && input.attendedOn > currentFrenchCalendarDate()) {
        throw new HttpProblem(
          400,
          "FUTURE_ATTENDED_DATE",
          "La date vue ne peut pas être dans le futur.",
        );
      }
      const entryRows = await database
        .select({ productionId: diaryEntries.productionId })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
        .limit(1);
      const entry = entryRows[0];
      if (!entry) {
        throw new HttpProblem(
          404,
          "DIARY_ENTRY_NOT_FOUND",
          "Cette entrée est introuvable dans votre journal.",
        );
      }
      if (input.performanceId) {
        const performanceRows = await database
          .select({
            id: performances.id,
            startsAt: performances.startsAt,
            status: performances.status,
          })
          .from(performances)
          .where(
            and(
              eq(performances.id, input.performanceId),
              eq(performances.productionId, entry.productionId),
            ),
          )
          .limit(1);
        if (!performanceRows[0]) {
          throw new HttpProblem(
            400,
            "PERFORMANCE_MISMATCH",
            "Cette représentation n’appartient pas au spectacle.",
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
      const duplicateRows = await database
        .select({ id: diaryEntries.id })
        .from(diaryEntries)
        .where(
          and(
            eq(diaryEntries.userId, userId),
            eq(diaryEntries.productionId, entry.productionId),
            ne(diaryEntries.id, entryId),
            input.performanceId
              ? eq(diaryEntries.performanceId, input.performanceId)
              : and(
                  sql<boolean>`${diaryEntries.performanceId} is null`,
                  input.attendedOn
                    ? eq(diaryEntries.attendedOn, input.attendedOn)
                    : sql<boolean>`${diaryEntries.attendedOn} is null`,
                ),
          ),
        )
        .limit(1);
      if (duplicateRows[0]) {
        throw new HttpProblem(
          409,
          "DIARY_ENTRY_DUPLICATE",
          "Cette séance existe déjà dans votre journal.",
        );
      }
      await database
        .update(diaryEntries)
        .set({
          performanceId: input.performanceId,
          attendedOn: input.attendedOn,
        })
        .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)));
    },
  };
}

export type MemberService = ReturnType<typeof createMemberService>;

import { z } from "zod";

import {
  ContentVisibilitySchema,
  DisciplineSchema,
  ProductionCardSchema,
  UuidSchema,
} from "./catalog.js";

export const ProfileVisibilitySchema = z.enum(["public", "private"]);
export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;

const QueryBooleanSchema = z.preprocess(
  (value) => (value === "true" ? true : value === "false" ? false : value),
  z.boolean(),
);

export const MemberJournalEntrySchema = z.object({
  id: UuidSchema,
  production: ProductionCardSchema,
  performanceId: UuidSchema.nullable(),
  attendedOn: z.string().date().nullable(),
  addedAt: z.string().datetime({ offset: true }),
  ratedAt: z.string().datetime({ offset: true }).nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
  hasReview: z.boolean(),
});
export type MemberJournalEntry = z.infer<typeof MemberJournalEntrySchema>;

export const MemberJournalQuerySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  discipline: DisciplineSchema.optional(),
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  venue: z.string().trim().min(1).max(240).optional(),
  rating: z.coerce.number().int().min(1).max(10).optional(),
  hasReview: QueryBooleanSchema.optional(),
  sort: z.enum(["attended", "added", "rated", "rating", "title"]).default("attended"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type MemberJournalQuery = z.infer<typeof MemberJournalQuerySchema>;

export const MemberJournalResponseSchema = z.object({
  items: z.array(MemberJournalEntrySchema),
  nextCursor: z.string().nullable(),
});
export type MemberJournalResponse = z.infer<typeof MemberJournalResponseSchema>;

export const UserListSummarySchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: ContentVisibilitySchema,
  itemCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime({ offset: true }),
});
export type UserListSummary = z.infer<typeof UserListSummarySchema>;

export const UserListItemSchema = z.object({
  production: ProductionCardSchema,
  position: z.number().int().nonnegative(),
  addedAt: z.string().datetime({ offset: true }),
});
export type UserListItem = z.infer<typeof UserListItemSchema>;

export const UserListDetailSchema = UserListSummarySchema.extend({
  username: z.string(),
  items: z.array(UserListItemSchema),
});
export type UserListDetail = z.infer<typeof UserListDetailSchema>;

export const WatchlistItemSchema = z.object({
  production: ProductionCardSchema,
  addedAt: z.string().datetime({ offset: true }),
});
export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;

export const WatchlistResponseSchema = z.object({
  items: z.array(WatchlistItemSchema),
});

export const OwnReviewSchema = z.object({
  id: UuidSchema,
  production: ProductionCardSchema,
  body: z.string(),
  containsSpoiler: z.boolean(),
  visibility: ContentVisibilitySchema,
  status: z.enum(["published", "hidden", "rejected"]),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type OwnReview = z.infer<typeof OwnReviewSchema>;

export const OwnReviewsResponseSchema = z.object({
  items: z.array(OwnReviewSchema),
});

export const PublicMemberReviewSchema = OwnReviewSchema.omit({
  visibility: true,
  status: true,
}).extend({
  rating: z.number().int().min(1).max(10).nullable(),
});
export type PublicMemberReview = z.infer<typeof PublicMemberReviewSchema>;

export const PublicMemberSchema = z.object({
  username: z.string(),
  bio: z.string().nullable(),
  memberSince: z.string().datetime({ offset: true }),
  counts: z.object({
    seen: z.number().int().nonnegative(),
    lists: z.number().int().nonnegative(),
    reviews: z.number().int().nonnegative(),
  }),
  recentJournal: z.array(MemberJournalEntrySchema),
  publicLists: z.array(UserListSummarySchema),
  recentReviews: z.array(PublicMemberReviewSchema),
});
export type PublicMember = z.infer<typeof PublicMemberSchema>;

export const UpdateProfileBodySchema = z.object({
  bio: z.string().trim().max(500).nullable().optional(),
  profileVisibility: ProfileVisibilitySchema.optional(),
});
export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;

export const ProfileSettingsSchema = z.object({
  username: z.string(),
  bio: z.string().nullable(),
  profileVisibility: ProfileVisibilitySchema,
  memberSince: z.string().datetime({ offset: true }),
});
export type ProfileSettings = z.infer<typeof ProfileSettingsSchema>;

export const MyShowsSectionSchema = z.enum(["watchlist", "seen", "rated"]);
export type MyShowsSection = z.infer<typeof MyShowsSectionSchema>;

export const MyShowsSortSchema = z.enum([
  "recent",
  "title",
  "community-rating",
  "my-rating",
  "next-performance",
]);
export type MyShowsSort = z.infer<typeof MyShowsSortSchema>;

export const MyShowsUpcomingSchema = z.enum(["7d", "30d", "90d", "none"]);
export type MyShowsUpcoming = z.infer<typeof MyShowsUpcomingSchema>;

export const MyShowsQuerySchema = z.object({
  section: MyShowsSectionSchema,
  q: z.string().trim().max(100).default(""),
  discipline: DisciplineSchema.optional(),
  venue: z.string().trim().min(1).max(240).optional(),
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  communityRating: z.coerce.number().int().min(1).max(10).optional(),
  myRating: z.coerce.number().int().min(1).max(10).optional(),
  hasReview: QueryBooleanSchema.optional(),
  upcoming: MyShowsUpcomingSchema.optional(),
  sort: MyShowsSortSchema.default("recent"),
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type MyShowsQuery = z.infer<typeof MyShowsQuerySchema>;

export const MyShowReviewSchema = OwnReviewSchema.omit({ production: true });
export type MyShowReview = z.infer<typeof MyShowReviewSchema>;

export const MyShowCommunityRatingSchema = z.object({
  average: z.number().min(1).max(10).nullable(),
  count: z.number().int().nonnegative(),
});
export type MyShowCommunityRating = z.infer<typeof MyShowCommunityRatingSchema>;

export const MyShowItemSchema = z.object({
  production: ProductionCardSchema,
  section: MyShowsSectionSchema,
  diaryEntryId: UuidSchema.nullable(),
  seenCount: z.number().int().nonnegative(),
  addedAt: z.string().datetime({ offset: true }).nullable(),
  attendedOn: z.string().date().nullable(),
  ratedAt: z.string().datetime({ offset: true }).nullable(),
  myRating: z.number().int().min(1).max(10).nullable(),
  communityRating: MyShowCommunityRatingSchema,
  review: MyShowReviewSchema.nullable(),
});
export type MyShowItem = z.infer<typeof MyShowItemSchema>;

export const MyShowsCountFacetSchema = z.object({
  value: z.string(),
  count: z.number().int().nonnegative(),
});
export type MyShowsCountFacet = z.infer<typeof MyShowsCountFacetSchema>;

export const MyShowsRatingFacetSchema = z.object({
  value: z.number().int().min(1).max(10),
  count: z.number().int().nonnegative(),
});
export type MyShowsRatingFacet = z.infer<typeof MyShowsRatingFacetSchema>;

export const MyShowsFacetsSchema = z.object({
  disciplines: z.array(
    z.object({
      value: DisciplineSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
  venues: z.array(MyShowsCountFacetSchema),
  years: z.array(
    z.object({
      value: z.number().int().min(1900).max(2200),
      count: z.number().int().nonnegative(),
    }),
  ),
  communityRatings: z.array(MyShowsRatingFacetSchema),
  myRatings: z.array(MyShowsRatingFacetSchema),
  reviews: z.array(
    z.object({
      value: z.enum(["with", "without"]),
      count: z.number().int().nonnegative(),
    }),
  ),
  upcoming: z.array(
    z.object({
      value: MyShowsUpcomingSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
});
export type MyShowsFacets = z.infer<typeof MyShowsFacetsSchema>;

export const MyShowsResponseSchema = z.object({
  items: z.array(MyShowItemSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
  facets: MyShowsFacetsSchema,
});
export type MyShowsResponse = z.infer<typeof MyShowsResponseSchema>;

const ListEditableFieldsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable().default(null),
  visibility: ContentVisibilitySchema.default("private"),
});
export const CreateListBodySchema = ListEditableFieldsSchema.extend({
  productionId: UuidSchema.optional(),
});
export type CreateListBody = z.infer<typeof CreateListBodySchema>;

export const UpdateListBodySchema = ListEditableFieldsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Au moins un champ doit être modifié.",
);
export type UpdateListBody = z.infer<typeof UpdateListBodySchema>;

export const AddListItemBodySchema = z.object({
  productionId: UuidSchema,
  position: z.number().int().nonnegative().optional(),
});
export type AddListItemBody = z.infer<typeof AddListItemBodySchema>;

export const ReorderListBodySchema = z.object({
  productionIds: z.array(UuidSchema).min(1).max(500),
});
export type ReorderListBody = z.infer<typeof ReorderListBodySchema>;

export const UpsertReviewBodySchema = z.object({
  body: z.string().trim().min(20).max(5000),
  containsSpoiler: z.boolean().default(false),
  visibility: ContentVisibilitySchema.default("private"),
});
export type UpsertReviewBody = z.infer<typeof UpsertReviewBodySchema>;

export const UpdateDiaryEntryBodySchema = z
  .object({
    performanceId: UuidSchema.nullable().default(null),
    attendedOn: z.string().date().nullable().default(null),
  })
  .refine(
    (value) => value.performanceId === null || value.attendedOn === null,
    "La date est déduite de la représentation lorsqu'elle est fournie.",
  );
export type UpdateDiaryEntryBody = z.infer<typeof UpdateDiaryEntryBodySchema>;

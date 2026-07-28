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
});
export type ProfileSettings = z.infer<typeof ProfileSettingsSchema>;

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

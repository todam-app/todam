import { z } from "zod";

import {
  PerformanceSchema,
  ProductionCardSchema,
  ProductionDetailSchema,
  UuidSchema,
} from "./catalog.js";

export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string().optional(),
  code: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

export const EmailSignInBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});

export const UsernameSignInBodySchema = z.object({
  username: z.string().trim().min(3).max(30),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const SearchResponseSchema = z.object({
  items: z.array(ProductionCardSchema),
  nextCursor: z.string().nullable(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const ProductionParamsSchema = z.object({
  slug: z.string().min(1).max(240),
});

export const ProductionIdParamsSchema = z.object({
  id: UuidSchema,
});

export const DiaryEntryIdParamsSchema = z.object({
  entryId: UuidSchema,
});

export const ProductionResponseSchema = ProductionDetailSchema;

export const ViewerProductionStateSchema = z.object({
  productionId: UuidSchema,
  seen: z.boolean(),
  rating: z.number().int().min(1).max(10).nullable(),
  watchlisted: z.boolean(),
});
export type ViewerProductionState = z.infer<typeof ViewerProductionStateSchema>;

export const DiaryEntrySchema = z.object({
  id: UuidSchema,
  production: ProductionCardSchema,
  performanceId: UuidSchema.nullable(),
  attendedOn: z.string().date().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});
export type DiaryEntry = z.infer<typeof DiaryEntrySchema>;

export const DiarySessionSchema = z.object({
  id: UuidSchema,
  attendedOn: z.string().date().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  performance: PerformanceSchema.nullable(),
});
export type DiarySession = z.infer<typeof DiarySessionSchema>;

export const ProductionDiaryResponseSchema = z.object({
  items: z.array(DiarySessionSchema),
});
export type ProductionDiaryResponse = z.infer<typeof ProductionDiaryResponseSchema>;

export const MarkSeenBodySchema = z
  .object({
    productionId: UuidSchema,
    performanceId: UuidSchema.nullable().default(null),
    attendedOn: z.string().date().nullable().default(null),
  })
  .refine(
    (value) => value.performanceId === null || value.attendedOn === null,
    "La date est déduite de la représentation lorsqu'elle est fournie.",
  );

export const RatingBodySchema = z.object({
  value: z.number().int().min(1).max(10),
});

export const RatingDistributionSchema = z.array(
  z.object({
    value: z.number().int().min(1).max(10),
    count: z.number().int().nonnegative(),
  }),
);

export const DashboardSchema = z.object({
  profile: z.object({
    pseudonym: z.string(),
  }),
  counts: z.object({
    seen: z.number().int().nonnegative(),
    ratings: z.number().int().nonnegative(),
    watchlist: z.number().int().nonnegative(),
    lists: z.literal(0),
  }),
  recentDiary: z.array(DiaryEntrySchema),
  ratingDistribution: RatingDistributionSchema,
  watchlist: z.array(ProductionCardSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const MutationResponseSchema = z.object({
  state: ViewerProductionStateSchema,
});

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "unavailable"]),
});

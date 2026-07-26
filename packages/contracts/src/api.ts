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

export const UpdateUsernameBodySchema = z.object({
  username: z.string().trim().min(3).max(30),
});

export const UpdateUsernameResponseSchema = z.object({
  username: z.string().min(3).max(30),
});

export const EmailChangeBodySchema = z.object({
  currentPassword: z.string().min(8),
  newEmail: z.string().trim().email(),
  callbackURL: z.string().url(),
});

export const EmailChangeResponseSchema = z.object({
  verificationSent: z.literal(true),
});

export const PasswordChangeBodySchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const PasswordChangeResponseSchema = z.object({
  changed: z.literal(true),
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

export const CitySelectionSchema = z.object({
  locality: z.string().trim().min(1).max(120),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
});
export type CitySelection = z.infer<typeof CitySelectionSchema>;

export const CityOptionSchema = CitySelectionSchema.extend({
  label: z.string().min(1),
});
export type CityOption = z.infer<typeof CityOptionSchema>;

export const CitySearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const CitySearchResponseSchema = z.object({
  items: z.array(CityOptionSchema),
});

export const HomeCityBodySchema = z.object({
  city: CitySelectionSchema.nullable(),
});

export const HomeCityResponseSchema = z.object({
  city: CityOptionSchema.nullable(),
});

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

export const HomeDiscoveryItemSchema = z.object({
  production: ProductionCardSchema,
  performance: z
    .object({
      startsAt: z.string().datetime({ offset: true }),
      venueName: z.string(),
      locality: z.string(),
      distanceKm: z.number().nonnegative().nullable(),
    })
    .nullable(),
});
export type HomeDiscoveryItem = z.infer<typeof HomeDiscoveryItemSchema>;

export const HomeResponseSchema = z.object({
  profile: z.object({
    pseudonym: z.string(),
  }),
  homeCity: CityOptionSchema.nullable(),
  progress: z.object({
    current: z.number().int().nonnegative(),
    target: z.literal(5),
    completed: z.boolean(),
  }),
  radiusKm: z.literal(50),
  nearby: z.array(HomeDiscoveryItemSchema).max(8),
  nationalUpcoming: z.array(HomeDiscoveryItemSchema).max(8),
  recentlyAdded: z.array(HomeDiscoveryItemSchema).max(8),
});
export type HomeResponse = z.infer<typeof HomeResponseSchema>;

export const MutationResponseSchema = z.object({
  state: ViewerProductionStateSchema,
});

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "unavailable"]),
});

export const PublicStatsSchema = z.object({
  verifiedUsers: z.number().int().nonnegative(),
  activeProductions: z.number().int().nonnegative(),
  upcomingPerformances: z.number().int().nonnegative(),
  generatedAt: z.string().datetime({ offset: true }),
});
export type PublicStats = z.infer<typeof PublicStatsSchema>;

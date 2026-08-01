import { z } from "zod";

import {
  CompanyDetailSchema,
  CompanySummarySchema,
  ContentVisibilitySchema,
  DisciplineSchema,
  PerformanceSchema,
  ProductionCardSchema,
  ProductionDetailSchema,
  UuidSchema,
  VenueDetailSchema,
  VenueSummarySchema,
} from "./catalog.js";
import {
  MemberJournalResponseSchema,
  OwnReviewsResponseSchema,
  ProfileSettingsSchema,
  PublicMemberSchema,
  UserListDetailSchema,
  UserListSummarySchema,
  WatchlistResponseSchema,
} from "./member.js";
import {
  CatalogRevisionSchema,
  CompanyClaimSchema,
  CompanyMembershipSchema,
  EditableProductionDetailSchema,
  EditableProductionSummarySchema,
} from "./professional.js";
import { UsernameSchema } from "./identity.js";

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
  username: UsernameSchema,
});

export const UpdateUsernameResponseSchema = z.object({
  username: UsernameSchema,
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

export const SearchQuerySchema = z
  .object({
    q: z.string().trim().max(100).default(""),
    type: z
      .enum(["productions", "venues", "companies", "members"])
      .default("productions"),
    discipline: DisciplineSchema.optional(),
    locality: z.string().trim().min(1).max(120).optional(),
    radiusKm: z.coerce.number().int().min(1).max(300).optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    temporal: z.enum(["upcoming", "past", "all"]).default("all"),
    sort: z.enum(["relevance", "date", "proximity", "popularity"]).default("relevance"),
    cursor: z.string().nullable().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "La date de début doit précéder la date de fin.",
    path: ["to"],
  })
  .refine((value) => value.radiusKm === undefined || Boolean(value.locality), {
    message: "Une ville est obligatoire pour appliquer un rayon.",
    path: ["locality"],
  })
  .refine((value) => value.sort !== "proximity" || Boolean(value.locality), {
    message: "Une ville est obligatoire pour trier par proximité.",
    path: ["locality"],
  });

export const SearchResponseSchema = z.object({
  type: z.enum(["productions", "venues", "companies", "members"]),
  total: z.number().int().nonnegative(),
  productions: z.array(ProductionCardSchema),
  venues: z.array(VenueSummarySchema),
  companies: z.array(CompanySummarySchema),
  members: z.array(
    z.object({
      username: z.string(),
      bio: z.string().nullable(),
    }),
  ),
  nextCursor: z.string().nullable(),
  suggestion: z.string().nullable(),
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

export const VenueParamsSchema = z.object({
  slug: z.string().min(1).max(240),
});

export const CompanyParamsSchema = z.object({
  slug: z.string().min(1).max(240),
});

export const MemberParamsSchema = z.object({
  username: z.string().trim().min(3).max(30),
});

export const MemberListParamsSchema = MemberParamsSchema.extend({
  slug: z.string().min(1).max(120),
});

export const ListIdParamsSchema = z.object({
  listId: UuidSchema,
});

export const ListItemParamsSchema = ListIdParamsSchema.extend({
  productionId: UuidSchema,
});

export const ReviewProductionParamsSchema = z.object({
  productionId: UuidSchema,
});

export const CompanyIdParamsSchema = z.object({
  companyId: UuidSchema,
});

export const CompanyProductionParamsSchema = CompanyIdParamsSchema.extend({
  productionId: UuidSchema,
});

export const CompanyClaimIdParamsSchema = z.object({
  claimId: UuidSchema,
});

export const CatalogRevisionIdParamsSchema = z.object({
  revisionId: UuidSchema,
});

export const ProductionIdParamsSchema = z.object({
  id: UuidSchema,
});

export const DiaryEntryIdParamsSchema = z.object({
  entryId: UuidSchema,
});

export const ContentReportBodySchema = z
  .object({
    targetType: z.enum(["production", "venue", "company", "member", "list", "review"]),
    targetId: z.string().trim().min(1).max(240),
    category: z.enum(["visual_rights", "information", "schedule", "other"]),
    mediaId: UuidSchema.nullable().default(null),
    reason: z.string().trim().min(10).max(2000),
  })
  .superRefine((value, context) => {
    if (
      value.targetType !== "member" &&
      !UuidSchema.safeParse(value.targetId).success
    ) {
      context.addIssue({
        code: "custom",
        message: "La référence du contenu est invalide.",
        path: ["targetId"],
      });
    }
    if (value.category === "visual_rights" && !value.mediaId) {
      context.addIssue({
        code: "custom",
        message: "Sélectionnez l’affiche concernée.",
        path: ["mediaId"],
      });
    }
    if (value.mediaId && value.targetType !== "production") {
      context.addIssue({
        code: "custom",
        message: "Une affiche ne peut être associée qu’à un spectacle.",
        path: ["mediaId"],
      });
    }
  });
export type ContentReportBody = z.infer<typeof ContentReportBodySchema>;

export const ContactBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Indiquez votre nom.")
    .max(120, "Le nom ne peut pas dépasser 120 caractères."),
  email: z
    .string()
    .trim()
    .email("Indiquez une adresse e-mail valide.")
    .max(254, "L’adresse e-mail est trop longue."),
  subject: z
    .string()
    .trim()
    .min(3, "L’objet doit contenir au moins 3 caractères.")
    .max(160, "L’objet ne peut pas dépasser 160 caractères."),
  message: z
    .string()
    .trim()
    .min(10, "Le message doit contenir au moins 10 caractères.")
    .max(5000, "Le message ne peut pas dépasser 5000 caractères."),
  website: z.string().max(200).default(""),
});
export type ContactBody = z.infer<typeof ContactBodySchema>;

export const ContentReportResponseSchema = z.object({
  id: UuidSchema,
  status: z.literal("open"),
});
export type ContentReportResponse = z.infer<typeof ContentReportResponseSchema>;

export const ProductionResponseSchema = ProductionDetailSchema;
export const VenueResponseSchema = VenueDetailSchema;
export const CompanyResponseSchema = CompanyDetailSchema;
export const MemberResponseSchema = PublicMemberSchema;
export const MemberJournalPageSchema = MemberJournalResponseSchema;
export const MemberListResponseSchema = UserListDetailSchema;
export const ProfileSettingsResponseSchema = ProfileSettingsSchema;
export const ListsResponseSchema = z.object({
  items: z.array(UserListSummarySchema),
});
export const WatchlistPageSchema = WatchlistResponseSchema;
export const OwnReviewsPageSchema = OwnReviewsResponseSchema;
export const ListResponseSchema = UserListDetailSchema;
export const EmptyResponseSchema = z.object({ ok: z.literal(true) });

export const ViewerProductionStateSchema = z.object({
  productionId: UuidSchema,
  seen: z.boolean(),
  rating: z.number().int().min(1).max(10).nullable(),
  watchlisted: z.boolean(),
  review: z
    .object({
      id: UuidSchema,
      body: z.string(),
      containsSpoiler: z.boolean(),
      visibility: ContentVisibilitySchema,
      status: z.enum(["published", "hidden", "rejected"]),
    })
    .nullable(),
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
    username: z.string(),
  }),
  counts: z.object({
    seen: z.number().int().nonnegative(),
    ratings: z.number().int().nonnegative(),
    watchlist: z.number().int().nonnegative(),
    lists: z.number().int().nonnegative(),
    reviews: z.number().int().nonnegative(),
  }),
  recentDiary: z.array(DiaryEntrySchema),
  recentRatings: z.array(
    z.object({
      production: ProductionCardSchema,
      value: z.number().int().min(1).max(10),
      ratedAt: z.string().datetime({ offset: true }),
      hasReview: z.boolean(),
    }),
  ),
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
    username: z.string(),
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
  activeVenues: z.number().int().nonnegative(),
  generatedAt: z.string().datetime({ offset: true }),
});
export type PublicStats = z.infer<typeof PublicStatsSchema>;

export const CompanyClaimResponseSchema = CompanyClaimSchema;
export const CompanyClaimsResponseSchema = z.object({
  items: z.array(CompanyClaimSchema),
});
export const CompanyMembershipsResponseSchema = z.object({
  items: z.array(CompanyMembershipSchema),
});
export const CatalogRevisionResponseSchema = CatalogRevisionSchema;
export const CatalogRevisionsResponseSchema = z.object({
  items: z.array(CatalogRevisionSchema),
});
export const EditableProductionResponseSchema = EditableProductionSummarySchema;
export const EditableProductionDetailResponseSchema = EditableProductionDetailSchema;

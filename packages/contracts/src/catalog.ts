import { z } from "zod";

import { RightsStatusSchema } from "./rights.js";

export const DisciplineSchema = z.enum(["theatre", "opera", "ballet"]);
export type Discipline = z.infer<typeof DisciplineSchema>;

export const PerformanceStatusSchema = z.enum([
  "scheduled",
  "completed",
  "cancelled",
  "postponed",
]);
export type PerformanceStatus = z.infer<typeof PerformanceStatusSchema>;

export const PublicationStatusSchema = z.enum(["draft", "published", "hidden"]);
export type PublicationStatus = z.infer<typeof PublicationStatusSchema>;

export const ContentVisibilitySchema = z.enum(["public", "private"]);
export type ContentVisibility = z.infer<typeof ContentVisibilitySchema>;

export const CreditRoleSchema = z.enum([
  "author",
  "director",
  "performer",
  "choreographer",
  "composer",
  "musical_director",
  "designer",
  "other",
]);
export type CreditRole = z.infer<typeof CreditRoleSchema>;

export const AudienceSchema = z.enum(["general", "family", "children"]);
export type Audience = z.infer<typeof AudienceSchema>;

export const UuidSchema = z.string().uuid();

export const PosterSchema = z.object({
  id: UuidSchema,
  url: z.string().url(),
  kind: z.enum(["poster", "key_visual", "photo", "logo"]),
  alt: z.string().nullable(),
  credit: z.string(),
  copyrightHolder: z.string().nullable(),
  license: z.string().nullable(),
  rightsStatus: RightsStatusSchema.extract([
    "permission_granted",
    "open_license",
    "contractual_display",
    "hotlink_only",
    "todam_original",
  ]),
  sourceUrl: z.string().url(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});
export type Poster = z.infer<typeof PosterSchema>;

export const VenueSummarySchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  name: z.string(),
  locality: z.string(),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  timezone: z.string(),
  officialUrl: z.string().url().nullable(),
});
export type VenueSummary = z.infer<typeof VenueSummarySchema>;

export const CompanySummarySchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  name: z.string(),
  officialUrl: z.string().url().nullable(),
});
export type CompanySummary = z.infer<typeof CompanySummarySchema>;

export const PerformanceSchema = z.object({
  id: UuidSchema,
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).nullable().default(null),
  status: PerformanceStatusSchema,
  officialUrl: z.string().url().nullable().default(null),
  venue: VenueSummarySchema,
});
export type Performance = z.infer<typeof PerformanceSchema>;

export const ProductionCardSchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  title: z.string(),
  discipline: DisciplineSchema,
  audience: AudienceSchema,
  minimumAge: z.number().int().min(0).max(99).nullable().default(null),
  workTitle: z.string().nullable(),
  primaryCredit: z.string().nullable(),
  company: CompanySummarySchema.nullable().default(null),
  venueNames: z.array(z.string()),
  nextPerformance: z.string().datetime({ offset: true }).nullable(),
  nextVenue: VenueSummarySchema.nullable().default(null),
  poster: PosterSchema.nullable().default(null),
});
export type ProductionCard = z.infer<typeof ProductionCardSchema>;

export const VenueProgramProductionSchema = ProductionCardSchema.extend({
  venuePerformances: z.array(PerformanceSchema).default([]),
});
export type VenueProgramProduction = z.infer<typeof VenueProgramProductionSchema>;

export const ProductionDescriptionSchema = z.object({
  id: UuidSchema,
  locale: z.string().min(2).max(16),
  kind: z.enum(["short", "full"]),
  body: z.string().min(1),
  rightsStatus: RightsStatusSchema,
  license: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),
  sourceTitle: z.string().nullable(),
  retrievedAt: z.string().datetime({ offset: true }).nullable(),
  lastVerifiedAt: z.string().datetime({ offset: true }),
});
export type ProductionDescription = z.infer<typeof ProductionDescriptionSchema>;

export const RatingSummarySchema = z.object({
  average: z.number().min(1).max(10).nullable(),
  count: z.number().int().nonnegative(),
});
export type RatingSummary = z.infer<typeof RatingSummarySchema>;

export const PublicReviewSchema = z.object({
  id: UuidSchema,
  username: z.string(),
  rating: z.number().int().min(1).max(10).nullable(),
  body: z.string(),
  containsSpoiler: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type PublicReview = z.infer<typeof PublicReviewSchema>;

export const CatalogSourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  retrievedAt: z.string().datetime({ offset: true }),
  rightsStatus: RightsStatusSchema,
  license: z.string().nullable(),
});
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;

export const ProductionDetailSchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  title: z.string(),
  discipline: DisciplineSchema,
  audience: AudienceSchema,
  minimumAge: z.number().int().min(0).max(99).nullable().default(null),
  work: z
    .object({
      id: UuidSchema,
      slug: z.string(),
      title: z.string(),
    })
    .nullable(),
  company: CompanySummarySchema.nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  language: z.string().nullable(),
  officialUrl: z.string().url().nullable().default(null),
  posters: z.array(PosterSchema).default([]),
  imagePolicyMessage: z
    .string()
    .default(
      "Todam ne publie que les visuels dont les droits d’affichage sont confirmés.",
    ),
  descriptions: z.array(ProductionDescriptionSchema),
  credits: z.array(
    z.object({
      artistId: UuidSchema,
      artistName: z.string(),
      role: CreditRoleSchema,
      label: z.string().nullable(),
      position: z.number().int().nonnegative(),
    }),
  ),
  performances: z.array(PerformanceSchema),
  ratingSummary: RatingSummarySchema,
  reviews: z.array(PublicReviewSchema),
  relatedProductions: z.array(ProductionCardSchema),
  sources: z.array(CatalogSourceSchema),
  lastVerifiedAt: z.string().datetime({ offset: true }).nullable(),
  sourceUrls: z.array(z.string().url()),
});
export type ProductionDetail = z.infer<typeof ProductionDetailSchema>;

export const VenueDetailSchema = VenueSummarySchema.extend({
  addressLine1: z.string(),
  postalCode: z.string(),
  coordinates: z
    .object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
    })
    .nullable(),
  upcoming: z.array(VenueProgramProductionSchema),
  archives: z.array(VenueProgramProductionSchema),
  disciplines: z.array(DisciplineSchema),
  sources: z.array(CatalogSourceSchema),
  lastVerifiedAt: z.string().datetime({ offset: true }).nullable(),
});
export type VenueDetail = z.infer<typeof VenueDetailSchema>;

export const CompanyDetailSchema = CompanySummarySchema.extend({
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),
  locality: z.string().nullable(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
  currentProductions: z.array(ProductionCardSchema),
  touringDates: z.array(
    PerformanceSchema.extend({
      production: z.object({
        id: UuidSchema,
        slug: z.string(),
        title: z.string(),
        discipline: DisciplineSchema,
      }),
    }),
  ),
  archives: z.array(ProductionCardSchema),
  principalArtists: z.array(
    z.object({
      id: UuidSchema,
      slug: z.string(),
      name: z.string(),
      roles: z.array(CreditRoleSchema),
    }),
  ),
  sources: z.array(CatalogSourceSchema),
  lastVerifiedAt: z.string().datetime({ offset: true }).nullable(),
});
export type CompanyDetail = z.infer<typeof CompanyDetailSchema>;

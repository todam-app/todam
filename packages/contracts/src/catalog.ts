import { z } from "zod";

export const DisciplineSchema = z.enum(["theatre", "opera", "ballet"]);
export type Discipline = z.infer<typeof DisciplineSchema>;

export const PerformanceStatusSchema = z.enum([
  "scheduled",
  "completed",
  "cancelled",
  "postponed",
]);
export type PerformanceStatus = z.infer<typeof PerformanceStatusSchema>;

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
  rightsStatus: z.enum([
    "permission_granted",
    "open_license",
    "contractual_display",
    "hotlink_only",
  ]),
  sourceUrl: z.string().url(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});
export type Poster = z.infer<typeof PosterSchema>;

export const PerformanceSchema = z.object({
  id: UuidSchema,
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).nullable().default(null),
  status: PerformanceStatusSchema,
  officialUrl: z.string().url().nullable().default(null),
  venue: z.object({
    id: UuidSchema,
    slug: z.string(),
    name: z.string(),
    locality: z.string(),
    timezone: z.string(),
  }),
});
export type Performance = z.infer<typeof PerformanceSchema>;

export const ProductionCardSchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  title: z.string(),
  discipline: DisciplineSchema,
  audience: AudienceSchema,
  workTitle: z.string().nullable(),
  primaryCredit: z.string().nullable(),
  venueNames: z.array(z.string()),
  nextPerformance: z.string().datetime({ offset: true }).nullable(),
  poster: PosterSchema.nullable().default(null),
});
export type ProductionCard = z.infer<typeof ProductionCardSchema>;

export const ProductionDetailSchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  title: z.string(),
  discipline: DisciplineSchema,
  audience: AudienceSchema,
  work: z
    .object({
      id: UuidSchema,
      slug: z.string(),
      title: z.string(),
    })
    .nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  language: z.string().nullable(),
  officialUrl: z.string().url().nullable().default(null),
  posters: z.array(PosterSchema).default([]),
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
  sourceUrls: z.array(z.string().url()),
});
export type ProductionDetail = z.infer<typeof ProductionDetailSchema>;

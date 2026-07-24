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

export const PerformanceSchema = z.object({
  id: UuidSchema,
  startsAt: z.string().datetime({ offset: true }),
  status: PerformanceStatusSchema,
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

import { z } from "zod";

import { AudienceSchema, DisciplineSchema, UuidSchema } from "./catalog.js";

const HttpsUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "L’URL doit utiliser HTTPS.",
  });

const HttpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "L’URL doit utiliser HTTP ou HTTPS.",
  });

export const COMMUNITY_POSTER_ERROR =
  "Le fichier d’affiche ne respecte pas les formats acceptés. Utilisez une image JPEG, PNG ou WebP de 2 Mo maximum et d’au moins 300 px de large.";

export const CommunityCompanyInputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    id: UuidSchema,
  }),
  z.object({
    mode: z.literal("new"),
    name: z.string().trim().min(2).max(240),
    officialUrl: HttpUrlSchema.nullable().default(null),
  }),
]);
export type CommunityCompanyInput = z.infer<typeof CommunityCompanyInputSchema>;

export const CommunityVenueInputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    id: UuidSchema,
  }),
  z.object({
    mode: z.literal("new"),
    name: z.string().trim().min(2).max(240),
    addressLine1: z.string().trim().min(2).max(320),
    postalCode: z.string().trim().min(2).max(24),
    locality: z.string().trim().min(2).max(160),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/)
      .default("FR"),
    timezone: z.string().trim().min(3).max(80).default("Europe/Paris"),
    officialUrl: HttpUrlSchema.nullable().default(null),
  }),
]);
export type CommunityVenueInput = z.infer<typeof CommunityVenueInputSchema>;

export const CommunityPerformanceInputSchema = z
  .object({
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }).nullable().default(null),
    officialUrl: HttpUrlSchema.nullable().default(null),
    venue: CommunityVenueInputSchema,
  })
  .superRefine((value, context) => {
    if (value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "La fin doit être postérieure au début.",
        path: ["endsAt"],
      });
    }
  });
export type CommunityPerformanceInput = z.infer<typeof CommunityPerformanceInputSchema>;

export const CommunityRemotePosterInputSchema = z.object({
  url: HttpsUrlSchema,
  credit: z.string().trim().max(240).nullable().default(null),
});
export type CommunityRemotePosterInput = z.infer<
  typeof CommunityRemotePosterInputSchema
>;

export const CreateCommunityProductionBodySchema = z.object({
  title: z.string().trim().min(2).max(240),
  discipline: DisciplineSchema,
  company: CommunityCompanyInputSchema,
  officialUrl: HttpUrlSchema,
  performances: z.array(CommunityPerformanceInputSchema).min(1).max(50),
  audience: AudienceSchema.default("general"),
  minimumAge: z.number().int().min(0).max(99).nullable().default(null),
  durationMinutes: z.number().int().min(1).max(1440).nullable().default(null),
  language: z.string().trim().min(2).max(80).nullable().default(null),
  description: z.string().trim().min(1).max(2000).nullable().default(null),
  poster: CommunityRemotePosterInputSchema.nullable().default(null),
});
export type CreateCommunityProductionBody = z.infer<
  typeof CreateCommunityProductionBodySchema
>;

export const CommunityProductionCreatedSchema = z.object({
  id: UuidSchema,
  slug: z.string().min(1),
  contributionId: UuidSchema,
  publicationStatus: z.literal("published"),
});
export type CommunityProductionCreated = z.infer<
  typeof CommunityProductionCreatedSchema
>;

export interface CreateCommunityProductionInput {
  data: CreateCommunityProductionBody;
  posterFile?: Blob;
  posterFilename?: string;
}

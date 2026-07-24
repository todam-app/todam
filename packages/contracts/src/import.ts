import { z } from "zod";

import {
  AudienceSchema,
  CreditRoleSchema,
  DisciplineSchema,
  PerformanceStatusSchema,
} from "./catalog.js";

export const RightsStatusSchema = z.enum([
  "review_required",
  "factual_metadata_only",
  "permission_granted",
  "open_license",
]);
export type RightsStatus = z.infer<typeof RightsStatusSchema>;

const ExternalKeySchema = z
  .string()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/);

const SourceDocumentSchema = z.object({
  externalKey: ExternalKeySchema,
  title: z.string().min(1).max(240),
  url: z.string().url(),
  retrievedAt: z.string().datetime({ offset: true }),
  rightsStatus: RightsStatusSchema,
  license: z.string().max(120).nullable().default(null),
});

const WorkImportSchema = z.object({
  externalKey: ExternalKeySchema,
  sourceDocumentKey: ExternalKeySchema,
  title: z.string().min(1).max(240),
  slug: z.string().min(1).max(240),
  discipline: DisciplineSchema,
});

const VenueImportSchema = z.object({
  externalKey: ExternalKeySchema,
  sourceDocumentKey: ExternalKeySchema,
  name: z.string().min(1).max(240),
  slug: z.string().min(1).max(240),
  addressLine1: z.string().min(1).max(240),
  postalCode: z.string().min(1).max(24),
  locality: z.string().min(1).max(120),
  countryCode: z
    .string()
    .length(2)
    .transform((value) => value.toUpperCase()),
  timezone: z.string().min(1).max(80),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
});

const ArtistImportSchema = z.object({
  externalKey: ExternalKeySchema,
  sourceDocumentKey: ExternalKeySchema,
  name: z.string().min(1).max(240),
  slug: z.string().min(1).max(240),
});

const ProductionImportSchema = z.object({
  externalKey: ExternalKeySchema,
  sourceDocumentKey: ExternalKeySchema,
  workExternalKey: ExternalKeySchema.nullable().default(null),
  title: z.string().min(1).max(240),
  slug: z.string().min(1).max(240),
  discipline: DisciplineSchema,
  audience: AudienceSchema.default("general"),
  durationMinutes: z.number().int().positive().max(1440).nullable().default(null),
  language: z.string().max(80).nullable().default(null),
  credits: z
    .array(
      z.object({
        artistExternalKey: ExternalKeySchema,
        role: CreditRoleSchema,
        label: z.string().max(120).nullable().default(null),
        position: z.number().int().nonnegative(),
      }),
    )
    .default([]),
});

const PerformanceImportSchema = z.object({
  externalKey: ExternalKeySchema,
  sourceDocumentKey: ExternalKeySchema,
  productionExternalKey: ExternalKeySchema,
  venueExternalKey: ExternalKeySchema,
  startsAt: z.string().datetime({ offset: true }),
  status: PerformanceStatusSchema.default("completed"),
});

const ExclusionImportSchema = z.object({
  externalKey: ExternalKeySchema,
  sourceDocumentKey: ExternalKeySchema,
  title: z.string().min(1).max(240),
  category: z.string().min(1).max(80),
  reason: z.string().min(1).max(500),
});

export const CatalogImportSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.object({
      externalKey: ExternalKeySchema,
      name: z.string().min(1).max(240),
      homepageUrl: z.string().url(),
    }),
    coverage: z.object({
      territory: z.enum(["avignon", "monaco"]),
      label: z.string().min(1).max(120),
      startsOn: z.string().date(),
      endsOn: z.string().date(),
      expectedCompleteness: z.enum(["sample", "complete"]),
    }),
    documents: z.array(SourceDocumentSchema).min(1),
    works: z.array(WorkImportSchema).default([]),
    venues: z.array(VenueImportSchema).min(1),
    artists: z.array(ArtistImportSchema).default([]),
    productions: z.array(ProductionImportSchema).min(1),
    performances: z.array(PerformanceImportSchema).min(1),
    exclusions: z.array(ExclusionImportSchema).default([]),
  })
  .superRefine((catalog, context) => {
    const documentKeys = new Set(
      catalog.documents.map((document) => document.externalKey),
    );
    const venueKeys = new Set(catalog.venues.map((venue) => venue.externalKey));
    const workKeys = new Set(catalog.works.map((work) => work.externalKey));
    const artistKeys = new Set(catalog.artists.map((artist) => artist.externalKey));
    const productionKeys = new Set(
      catalog.productions.map((production) => production.externalKey),
    );

    const requireDocument = (sourceDocumentKey: string, path: (string | number)[]) => {
      if (!documentKeys.has(sourceDocumentKey)) {
        context.addIssue({
          code: "custom",
          message: `Document source inconnu : ${sourceDocumentKey}`,
          path,
        });
      }
    };

    catalog.works.forEach((work, index) =>
      requireDocument(work.sourceDocumentKey, ["works", index, "sourceDocumentKey"]),
    );
    catalog.venues.forEach((venue, index) =>
      requireDocument(venue.sourceDocumentKey, ["venues", index, "sourceDocumentKey"]),
    );
    catalog.artists.forEach((artist, index) =>
      requireDocument(artist.sourceDocumentKey, [
        "artists",
        index,
        "sourceDocumentKey",
      ]),
    );
    catalog.productions.forEach((production, index) => {
      requireDocument(production.sourceDocumentKey, [
        "productions",
        index,
        "sourceDocumentKey",
      ]);
      if (
        production.workExternalKey !== null &&
        !workKeys.has(production.workExternalKey)
      ) {
        context.addIssue({
          code: "custom",
          message: `Œuvre inconnue : ${production.workExternalKey}`,
          path: ["productions", index, "workExternalKey"],
        });
      }
      production.credits.forEach((credit, creditIndex) => {
        if (!artistKeys.has(credit.artistExternalKey)) {
          context.addIssue({
            code: "custom",
            message: `Artiste inconnu : ${credit.artistExternalKey}`,
            path: ["productions", index, "credits", creditIndex, "artistExternalKey"],
          });
        }
      });
    });
    catalog.performances.forEach((performance, index) => {
      requireDocument(performance.sourceDocumentKey, [
        "performances",
        index,
        "sourceDocumentKey",
      ]);
      if (!productionKeys.has(performance.productionExternalKey)) {
        context.addIssue({
          code: "custom",
          message: `Production inconnue : ${performance.productionExternalKey}`,
          path: ["performances", index, "productionExternalKey"],
        });
      }
      if (!venueKeys.has(performance.venueExternalKey)) {
        context.addIssue({
          code: "custom",
          message: `Lieu inconnu : ${performance.venueExternalKey}`,
          path: ["performances", index, "venueExternalKey"],
        });
      }
    });
    catalog.exclusions.forEach((exclusion, index) =>
      requireDocument(exclusion.sourceDocumentKey, [
        "exclusions",
        index,
        "sourceDocumentKey",
      ]),
    );
  });

export type CatalogImport = z.infer<typeof CatalogImportSchema>;

export const ImportReportSchema = z.object({
  source: z.string(),
  coverage: z.string(),
  mode: z.enum(["dry-run", "apply", "coverage"]),
  counts: z.object({
    documents: z.number().int().nonnegative(),
    works: z.number().int().nonnegative(),
    venues: z.number().int().nonnegative(),
    artists: z.number().int().nonnegative(),
    productions: z.number().int().nonnegative(),
    performances: z.number().int().nonnegative(),
    exclusions: z.number().int().nonnegative(),
  }),
  inserted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
});
export type ImportReport = z.infer<typeof ImportReportSchema>;

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
  "contractual_display",
  "hotlink_only",
]);
export type RightsStatus = z.infer<typeof RightsStatusSchema>;

export const SourceConnectorKindSchema = z.enum([
  "file",
  "base_lieux",
  "datatourisme",
  "openagenda",
  "ticketmaster",
  "partner",
]);
export type SourceConnectorKind = z.infer<typeof SourceConnectorKindSchema>;

export const MediaKindSchema = z.enum(["poster", "key_visual", "photo", "logo"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const MediaStoragePolicySchema = z.enum([
  "mirror",
  "hotlink",
  "temporary_cache",
  "metadata_only",
  "forbidden",
]);
export type MediaStoragePolicy = z.infer<typeof MediaStoragePolicySchema>;

export const ExternalKeySchema = z
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
  officialUrl: z.string().url().nullable().default(null),
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
  endsAt: z.string().datetime({ offset: true }).nullable().default(null),
  status: PerformanceStatusSchema.default("completed"),
  officialUrl: z.string().url().nullable().default(null),
});

const MediaImportSchema = z.object({
  externalKey: ExternalKeySchema,
  sourceDocumentKey: ExternalKeySchema,
  productionExternalKey: ExternalKeySchema,
  performanceExternalKey: ExternalKeySchema.nullable().default(null),
  kind: MediaKindSchema,
  url: z.string().url(),
  alt: z.string().max(500).nullable().default(null),
  credit: z.string().min(1).max(500),
  copyrightHolder: z.string().max(240).nullable().default(null),
  rightsStatus: RightsStatusSchema,
  license: z.string().max(120).nullable().default(null),
  termsUrl: z.string().url().nullable().default(null),
  storagePolicy: MediaStoragePolicySchema,
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
  mimeType: z.string().max(120).nullable().default(null),
  validFrom: z.string().datetime({ offset: true }).nullable().default(null),
  validUntil: z.string().datetime({ offset: true }).nullable().default(null),
  isPrimary: z.boolean().default(false),
  position: z.number().int().nonnegative().default(0),
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
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    source: z.object({
      externalKey: ExternalKeySchema,
      name: z.string().min(1).max(240),
      homepageUrl: z.string().url(),
      connectorKind: SourceConnectorKindSchema.default("file"),
      metadataLicense: z.string().max(120).nullable().default(null),
      defaultMediaPolicy: MediaStoragePolicySchema.default("metadata_only"),
    }),
    coverage: z.union([
      z.object({
        territory: z.enum(["avignon", "monaco"]),
        label: z.string().min(1).max(120),
        startsOn: z.string().date(),
        endsOn: z.string().date(),
        expectedCompleteness: z.enum(["sample", "complete"]),
      }),
      z.object({
        countryCodes: z
          .array(
            z
              .string()
              .length(2)
              .transform((value) => value.toUpperCase()),
          )
          .min(1),
        inseeTerritoryCodes: z.array(z.string().min(2).max(12)).default([]),
        label: z.string().min(1).max(120),
        startsOn: z.string().date(),
        endsOn: z.string().date(),
        expectedCompleteness: z.enum(["sample", "partial", "complete"]),
      }),
    ]),
    documents: z.array(SourceDocumentSchema).min(1),
    works: z.array(WorkImportSchema).default([]),
    venues: z.array(VenueImportSchema).default([]),
    artists: z.array(ArtistImportSchema).default([]),
    productions: z.array(ProductionImportSchema).default([]),
    performances: z.array(PerformanceImportSchema).default([]),
    media: z.array(MediaImportSchema).default([]),
    withdrawnProductionExternalKeys: z.array(ExternalKeySchema).default([]),
    exclusions: z.array(ExclusionImportSchema).default([]),
  })
  .superRefine((catalog, context) => {
    if (catalog.schemaVersion === 2 && !("countryCodes" in catalog.coverage)) {
      context.addIssue({
        code: "custom",
        message: "Le schéma v2 exige une couverture nationale par codes pays.",
        path: ["coverage"],
      });
    }
    if (
      catalog.schemaVersion === 1 &&
      (catalog.venues.length === 0 ||
        catalog.productions.length === 0 ||
        catalog.performances.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Le schéma v1 exige au moins un lieu, une production et une représentation.",
        path: [],
      });
    }
    const documentKeys = new Set(
      catalog.documents.map((document) => document.externalKey),
    );
    const venueKeys = new Set(catalog.venues.map((venue) => venue.externalKey));
    const workKeys = new Set(catalog.works.map((work) => work.externalKey));
    const artistKeys = new Set(catalog.artists.map((artist) => artist.externalKey));
    const productionKeys = new Set(
      catalog.productions.map((production) => production.externalKey),
    );
    const performanceKeys = new Set(
      catalog.performances.map((performance) => performance.externalKey),
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
    catalog.media.forEach((media, index) => {
      requireDocument(media.sourceDocumentKey, ["media", index, "sourceDocumentKey"]);
      if (!productionKeys.has(media.productionExternalKey)) {
        context.addIssue({
          code: "custom",
          message: `Production d'affiche inconnue : ${media.productionExternalKey}`,
          path: ["media", index, "productionExternalKey"],
        });
      }
      if (
        media.performanceExternalKey !== null &&
        !performanceKeys.has(media.performanceExternalKey)
      ) {
        context.addIssue({
          code: "custom",
          message: `Représentation d'affiche inconnue : ${media.performanceExternalKey}`,
          path: ["media", index, "performanceExternalKey"],
        });
      }
      if (
        media.storagePolicy === "mirror" &&
        !["open_license", "permission_granted"].includes(media.rightsStatus)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "La copie d'une affiche exige une licence ouverte ou une permission.",
          path: ["media", index, "storagePolicy"],
        });
      }
      if (media.rightsStatus === "open_license" && media.license === null) {
        context.addIssue({
          code: "custom",
          message: "Une affiche sous licence ouverte doit nommer sa licence.",
          path: ["media", index, "license"],
        });
      }
    });
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
    media: z.number().int().nonnegative(),
    withdrawnProductions: z.number().int().nonnegative(),
    exclusions: z.number().int().nonnegative(),
  }),
  inserted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  deactivated: z.number().int().nonnegative(),
  quarantined: z.number().int().nonnegative(),
});
export type ImportReport = z.infer<typeof ImportReportSchema>;

import { z } from "zod";

import {
  AudienceSchema,
  CatalogSourceSchema,
  DisciplineSchema,
  ProductionDetailSchema,
  PublicationStatusSchema,
  UuidSchema,
} from "./catalog.js";
import { RightsStatusSchema } from "./rights.js";

const HttpUrlSchema = z
  .string()
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "L’URL doit utiliser HTTP ou HTTPS.",
  });

export const CompanyClaimStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "revoked",
]);
export type CompanyClaimStatus = z.infer<typeof CompanyClaimStatusSchema>;

export const CreateCompanyClaimBodySchema = z.object({
  representativeName: z.string().trim().min(2).max(160),
  roleTitle: z.string().trim().min(2).max(120),
  professionalEmail: z.string().trim().email(),
  officialWebsiteUrl: HttpUrlSchema,
  evidence: z.string().trim().min(30).max(4000),
  authorityConfirmed: z.literal(true),
});
export type CreateCompanyClaimBody = z.infer<typeof CreateCompanyClaimBodySchema>;

export const CompanyClaimSchema = z.object({
  id: UuidSchema,
  companyId: UuidSchema,
  companyName: z.string(),
  companySlug: z.string(),
  representativeName: z.string(),
  roleTitle: z.string(),
  professionalEmail: z.string().email(),
  officialWebsiteUrl: HttpUrlSchema,
  evidence: z.string(),
  authorityConfirmed: z.literal(true),
  status: CompanyClaimStatusSchema,
  decisionReason: z.string().nullable(),
  submittedAt: z.string().datetime({ offset: true }),
  reviewedAt: z.string().datetime({ offset: true }).nullable(),
});
export type CompanyClaim = z.infer<typeof CompanyClaimSchema>;

export const CompanyMembershipSchema = z.object({
  companyId: UuidSchema,
  companyName: z.string(),
  companySlug: z.string(),
  role: z.enum(["representative", "editor", "manager"]),
  roleTitle: z.string(),
});
export type CompanyMembership = z.infer<typeof CompanyMembershipSchema>;

export const ContentReportStatusSchema = z.enum([
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);
export type ContentReportStatus = z.infer<typeof ContentReportStatusSchema>;

export const ContentReportSchema = z.object({
  id: UuidSchema,
  targetType: z.enum(["production", "venue", "company", "member", "list", "review"]),
  targetId: z.string(),
  targetLabel: z.string(),
  targetPath: z.string().startsWith("/").nullable(),
  canHide: z.boolean(),
  reason: z.string(),
  status: ContentReportStatusSchema,
  decision: z.string().nullable(),
  submittedAt: z.string().datetime({ offset: true }),
  reviewedAt: z.string().datetime({ offset: true }).nullable(),
});
export type ContentReport = z.infer<typeof ContentReportSchema>;

export const ContentReportsResponseSchema = z.object({
  items: z.array(ContentReportSchema),
});

export const CatalogCandidateSchema = z.object({
  id: UuidSchema,
  targetType: z.enum(["company", "production"]),
  slug: z.string(),
  label: z.string(),
  secondaryLabel: z.string().nullable(),
  discipline: DisciplineSchema.nullable(),
  publicationStatus: PublicationStatusSchema,
  readinessIssues: z.array(z.string()),
  sources: z.array(CatalogSourceSchema),
  updatedAt: z.string().datetime({ offset: true }),
  reviewedAt: z.string().datetime({ offset: true }).nullable(),
});
export type CatalogCandidate = z.infer<typeof CatalogCandidateSchema>;

export const CatalogCandidatesResponseSchema = z.object({
  items: z.array(CatalogCandidateSchema),
});

export const AdminCatalogCandidatesQuerySchema = z.object({
  status: PublicationStatusSchema.or(z.literal("all")).default("draft"),
  type: z.enum(["company", "production", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AdminCatalogCandidatesQuery = z.infer<
  typeof AdminCatalogCandidatesQuerySchema
>;

export const CatalogCandidateParamsSchema = z.object({
  targetType: z.enum(["company", "production"]),
  targetId: UuidSchema,
});

export const CatalogCandidateDecisionSchema = z.enum(["publish", "hide", "draft"]);

export const AdminContentReportsQuerySchema = z.object({
  status: z.enum(["open", "reviewing", "resolved", "dismissed", "all"]).default("open"),
});

export const ContentReportIdParamsSchema = z.object({
  reportId: UuidSchema,
});

export const ModerateContentReportBodySchema = z.object({
  decision: z.string().trim().min(10).max(2000),
  contentAction: z.enum(["none", "hide"]).default("none"),
});
export type ModerateContentReportBody = z.infer<typeof ModerateContentReportBodySchema>;

export const CatalogRevisionStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
  "superseded",
]);
export type CatalogRevisionStatus = z.infer<typeof CatalogRevisionStatusSchema>;

export const RevisionChangeInputSchema = z.object({
  field: z.string().trim().min(1).max(160),
  newValue: z.unknown(),
  provenanceUrl: HttpUrlSchema.nullable().default(null),
  rightsStatus: RightsStatusSchema.nullable().default(null),
});
export type RevisionChangeInput = z.infer<typeof RevisionChangeInputSchema>;

export const CreateCatalogRevisionBodySchema = z.object({
  targetType: z.enum(["company", "production"]),
  targetId: UuidSchema,
  justification: z.string().trim().max(2000).nullable().default(null),
  changes: z.array(RevisionChangeInputSchema).min(1).max(100),
});
export type CreateCatalogRevisionBody = z.infer<typeof CreateCatalogRevisionBodySchema>;

export const UpdateCatalogRevisionBodySchema = z.object({
  justification: z.string().trim().max(2000).nullable().optional(),
  changes: z.array(RevisionChangeInputSchema).min(1).max(100),
});
export type UpdateCatalogRevisionBody = z.infer<typeof UpdateCatalogRevisionBodySchema>;

export const CatalogRevisionChangeSchema = RevisionChangeInputSchema.extend({
  id: UuidSchema,
  oldValue: z.unknown(),
});

export const CatalogRevisionSchema = z.object({
  id: UuidSchema,
  companyId: UuidSchema,
  targetType: z.enum(["company", "production"]),
  targetId: UuidSchema,
  status: CatalogRevisionStatusSchema,
  justification: z.string().nullable(),
  decisionReason: z.string().nullable(),
  changes: z.array(CatalogRevisionChangeSchema),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  submittedAt: z.string().datetime({ offset: true }).nullable(),
  reviewedAt: z.string().datetime({ offset: true }).nullable(),
});
export type CatalogRevision = z.infer<typeof CatalogRevisionSchema>;

export const ReviewRevisionBodySchema = z.object({
  decisionReason: z.string().trim().min(10).max(2000),
});
export type ReviewRevisionBody = z.infer<typeof ReviewRevisionBodySchema>;

export const ModerateClaimBodySchema = z.object({
  decisionReason: z.string().trim().min(10).max(2000),
  membershipRole: z
    .enum(["representative", "editor", "manager"])
    .default("representative"),
});
export type ModerateClaimBody = z.infer<typeof ModerateClaimBodySchema>;

export const AdminCompanyClaimsQuerySchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "revoked", "all"])
    .default("pending"),
});
export type AdminCompanyClaimsQuery = z.infer<typeof AdminCompanyClaimsQuerySchema>;

export const AdminCatalogRevisionsQuerySchema = z.object({
  status: CatalogRevisionStatusSchema.or(z.literal("all")).default("submitted"),
});
export type AdminCatalogRevisionsQuery = z.infer<
  typeof AdminCatalogRevisionsQuerySchema
>;

export const EditableProductionSummarySchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  title: z.string(),
  discipline: DisciplineSchema,
  audience: AudienceSchema,
  minimumAge: z.number().int().min(0).max(99).nullable(),
  publicationStatus: PublicationStatusSchema,
});
export type EditableProductionSummary = z.infer<typeof EditableProductionSummarySchema>;

export const EditableProductionsResponseSchema = z.object({
  items: z.array(EditableProductionSummarySchema),
});

export const EditableMediaAssetSchema = z.object({
  id: UuidSchema,
  remoteUrl: HttpUrlSchema,
  kind: z.enum(["poster", "key_visual", "photo", "logo"]),
  alt: z.string().nullable(),
  credit: z.string(),
  copyrightHolder: z.string().nullable(),
  rightsStatus: RightsStatusSchema.extract([
    "permission_granted",
    "open_license",
    "contractual_display",
    "hotlink_only",
    "todam_original",
  ]),
  storagePolicy: z.enum(["hotlink", "mirror"]),
  termsUrl: HttpUrlSchema.nullable(),
  license: z.string().nullable(),
  validUntil: z.string().datetime({ offset: true }).nullable(),
  isPrimary: z.boolean(),
  position: z.number().int().nonnegative(),
});
export type EditableMediaAsset = z.infer<typeof EditableMediaAssetSchema>;

export const EditableProductionDetailSchema = ProductionDetailSchema.extend({
  editableMedia: z.array(EditableMediaAssetSchema),
});
export type EditableProductionDetail = z.infer<typeof EditableProductionDetailSchema>;

const EditorialTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .refine(
    (value) =>
      !/[\n\r\t]|\s{2,}/u.test(value) &&
      !/[-–—|:]\s*(compagnie|cie\.?|classe|durée|mise en scène|\d+\s*(?:min|mn))/iu.test(
        value,
      ),
    "Le titre doit être séparé de la compagnie, des crédits, de la durée et des informations techniques.",
  );

export const CreateCompanyProductionBodySchema = z.object({
  title: EditorialTitleSchema,
  discipline: DisciplineSchema,
  audience: AudienceSchema.default("general"),
  minimumAge: z.number().int().min(0).max(99).nullable().default(null),
  officialUrl: HttpUrlSchema.nullable().default(null),
});
export type CreateCompanyProductionBody = z.infer<
  typeof CreateCompanyProductionBodySchema
>;

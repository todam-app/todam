import { z } from "zod";

import { UsernameSchema } from "./identity.js";
import { RightsStatusSchema } from "./rights.js";

export const CURRENT_TERMS_VERSION = "1.0.3";
export const CURRENT_PRIVACY_NOTICE_VERSION = "1.0.4";
export const LEGAL_EFFECTIVE_DATE = "2026-07-29";

export const RegistrationChannelSchema = z.enum(["web", "android"]);
export type RegistrationChannel = z.infer<typeof RegistrationChannelSchema>;

export const LegalDocumentSchema = z.object({
  version: z.string(),
  effectiveDate: z.string().date(),
  url: z.string().url(),
  pdfUrl: z.string().url(),
});

export const LegalCurrentResponseSchema = z.object({
  terms: LegalDocumentSchema,
  privacyNotice: LegalDocumentSchema,
});
export type LegalCurrentResponse = z.infer<typeof LegalCurrentResponseSchema>;

export const SignUpBodySchema = z.object({
  name: UsernameSchema,
  username: UsernameSchema,
  displayUsername: UsernameSchema,
  email: z.string().email(),
  password: z.string().min(8),
  age15OrOlder: z.literal(true),
  termsVersion: z.literal(CURRENT_TERMS_VERSION),
  privacyNoticeVersion: z.literal(CURRENT_PRIVACY_NOTICE_VERSION),
  channel: RegistrationChannelSchema,
  callbackURL: z.string().url().optional(),
});
export type SignUpBody = z.infer<typeof SignUpBodySchema>;

export const AccountExportQuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
});

export const AccountExportSchema = z.object({
  exportedAt: z.string().datetime({ offset: true }),
  account: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    createdAt: z.string().datetime({ offset: true }),
    profileVisibility: z.enum(["public", "private"]),
    ratingVisibility: z.enum(["review_only", "public"]),
    bio: z.string().nullable(),
    homeCity: z
      .object({
        locality: z.string(),
        countryCode: z.string().regex(/^[A-Z]{2}$/),
      })
      .nullable(),
  }),
  legal: z.object({
    age15OrOlder: z.boolean(),
    ageConfirmedAt: z.string().datetime({ offset: true }),
    termsVersion: z.string(),
    termsAcceptedAt: z.string().datetime({ offset: true }),
    privacyNoticeVersion: z.string(),
    channel: RegistrationChannelSchema,
  }),
  diary: z.array(
    z.object({
      id: z.string().uuid(),
      productionId: z.string().uuid(),
      performanceId: z.string().uuid().nullable(),
      attendedOn: z.string().date().nullable(),
      createdAt: z.string().datetime({ offset: true }),
    }),
  ),
  ratings: z.array(
    z.object({
      productionId: z.string().uuid(),
      value: z.number().int().min(1).max(10),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
    }),
  ),
  watchlist: z.array(
    z.object({
      productionId: z.string().uuid(),
      addedAt: z.string().datetime({ offset: true }),
    }),
  ),
  reviews: z.array(
    z.object({
      id: z.string().uuid(),
      productionId: z.string().uuid(),
      body: z.string(),
      containsSpoiler: z.boolean(),
      visibility: z.enum(["public", "private"]),
      status: z.enum(["published", "hidden", "rejected"]),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
    }),
  ),
  lists: z.array(
    z.object({
      id: z.string().uuid(),
      slug: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      visibility: z.enum(["public", "private"]),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
      items: z.array(
        z.object({
          productionId: z.string().uuid(),
          position: z.number().int().nonnegative(),
          addedAt: z.string().datetime({ offset: true }),
        }),
      ),
    }),
  ),
  contentReports: z.array(
    z.object({
      id: z.string().uuid(),
      targetType: z.enum([
        "production",
        "venue",
        "company",
        "member",
        "list",
        "review",
      ]),
      targetId: z.string(),
      category: z.enum(["visual_rights", "information", "schedule", "other"]),
      mediaId: z.string().uuid().nullable(),
      reason: z.string(),
      status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
      decision: z.string().nullable(),
      submittedAt: z.string().datetime({ offset: true }),
      reviewedAt: z.string().datetime({ offset: true }).nullable(),
    }),
  ),
  communitySubmissions: z.array(
    z.object({
      id: z.string().uuid(),
      productionId: z.string().uuid(),
      sourceUrl: z.string().url(),
      submittedData: z.unknown(),
      status: z.enum(["published", "hidden"]),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
    }),
  ),
  companyClaims: z.array(
    z.object({
      id: z.string().uuid(),
      companyId: z.string().uuid(),
      representativeName: z.string(),
      roleTitle: z.string(),
      professionalEmail: z.string().email(),
      officialWebsiteUrl: z.string().url(),
      evidence: z.string(),
      authorityConfirmed: z.boolean(),
      status: z.enum(["pending", "approved", "rejected", "revoked"]),
      decisionReason: z.string().nullable(),
      submittedAt: z.string().datetime({ offset: true }),
      reviewedAt: z.string().datetime({ offset: true }).nullable(),
    }),
  ),
  companyMemberships: z.array(
    z.object({
      companyId: z.string().uuid(),
      role: z.enum(["representative", "editor", "manager"]),
      roleTitle: z.string(),
      createdAt: z.string().datetime({ offset: true }),
    }),
  ),
  catalogRevisions: z.array(
    z.object({
      id: z.string().uuid(),
      companyId: z.string().uuid(),
      targetType: z.enum(["company", "production"]),
      targetId: z.string().uuid(),
      status: z.enum(["draft", "submitted", "approved", "rejected", "superseded"]),
      justification: z.string().nullable(),
      decisionReason: z.string().nullable(),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
      submittedAt: z.string().datetime({ offset: true }).nullable(),
      reviewedAt: z.string().datetime({ offset: true }).nullable(),
      changes: z.array(
        z.object({
          id: z.string().uuid(),
          field: z.string(),
          oldValue: z.unknown(),
          newValue: z.unknown(),
          provenanceUrl: z.string().url().nullable(),
          rightsStatus: RightsStatusSchema.nullable(),
          createdAt: z.string().datetime({ offset: true }),
        }),
      ),
    }),
  ),
});
export type AccountExport = z.infer<typeof AccountExportSchema>;
export const AccountExportResponseSchema = z.union([AccountExportSchema, z.string()]);

export const AccountDeletionRequestSchema = z.object({
  email: z.string().email(),
});

export const AccountDeletionConfirmSchema = z.object({
  token: z.string().min(32).max(512),
});

export const AcceptedResponseSchema = z.object({
  accepted: z.literal(true),
});

export const DeletedResponseSchema = z.object({
  deleted: z.literal(true),
});

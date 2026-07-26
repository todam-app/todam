import { z } from "zod";

export const CURRENT_TERMS_VERSION = "1.0.0";
export const CURRENT_PRIVACY_NOTICE_VERSION = "1.0.0";
export const LEGAL_EFFECTIVE_DATE = "2026-07-26";

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
  name: z.string().trim().min(3).max(30),
  username: z.string().trim().min(3).max(30),
  displayUsername: z.string().trim().min(3).max(30),
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
    pseudonym: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    createdAt: z.string().datetime({ offset: true }),
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

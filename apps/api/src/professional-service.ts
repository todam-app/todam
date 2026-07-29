import type {
  AdminCatalogCandidatesQuery,
  CatalogCandidate,
  CatalogRevision,
  CompanyClaim,
  CompanyMembership,
  ContentReport,
  ContentReportStatus,
  CreateCompanyProductionBody,
  CreateCatalogRevisionBody,
  CreateCompanyClaimBody,
  EditableMediaAsset,
  ModerateClaimBody,
  ModerateContentReportBody,
  ReviewRevisionBody,
  RevisionChangeInput,
  UpdateCatalogRevisionBody,
  EditableProductionSummary,
} from "@todam/contracts";
import { randomUUID } from "node:crypto";
import {
  artists,
  catalogRevisionChanges,
  catalogRevisions,
  catalogSources,
  companies,
  companyClaims,
  companyMemberships,
  companySources,
  communitySubmissions,
  contentReports,
  lists,
  mediaAssets,
  performanceSources,
  performances,
  productionCompanies,
  productionCredits,
  productionDescriptions,
  productionMedia,
  productionSources,
  productions,
  reviews,
  sourceDocuments,
  user,
  venueSources,
  venues,
  type TodamDatabase,
} from "@todam/database";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { HttpProblem } from "./errors.js";

type DatabaseTransaction = Parameters<Parameters<TodamDatabase["transaction"]>[0]>[0];
type DatabaseExecutor = TodamDatabase | DatabaseTransaction;

const companyFields = new Set([
  "name",
  "shortDescription",
  "description",
  "officialUrl",
  "locality",
  "countryCode",
]);
const productionFields = new Set([
  "title",
  "discipline",
  "audience",
  "minimumAge",
  "durationMinutes",
  "language",
  "officialUrl",
  "description.short",
  "description.full",
  "credits",
  "performances",
  "media",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function safeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function editableMediaRightsStatus(status: string): EditableMediaAsset["rightsStatus"] {
  if (status === "todam_original" || status === "community_submission") {
    return "permission_granted";
  }
  if (
    status === "permission_granted" ||
    status === "open_license" ||
    status === "contractual_display" ||
    status === "hotlink_only" ||
    status === "community_submission"
  ) {
    return status;
  }
  throw new HttpProblem(
    500,
    "INVALID_MEDIA_RIGHTS_STATUS",
    "Le statut de droits du visuel éditable est invalide.",
  );
}

function editableMediaStoragePolicy(
  policy: string,
): EditableMediaAsset["storagePolicy"] {
  if (policy === "hotlink" || policy === "mirror") return policy;
  throw new HttpProblem(
    500,
    "INVALID_MEDIA_STORAGE_POLICY",
    "La politique de stockage du visuel éditable est invalide.",
  );
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpProblem(400, "INVALID_REVISION_VALUE", `${label} est invalide.`);
  }
  return value as Record<string, unknown>;
}

function nullableString(
  value: unknown,
  label: string,
  maxLength = 10_000,
): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new HttpProblem(400, "INVALID_REVISION_VALUE", `${label} est invalide.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new HttpProblem(
      400,
      "INVALID_REVISION_VALUE",
      `${label} ne peut pas dépasser ${maxLength} caractères.`,
    );
  }
  return normalized || null;
}

function requiredString(value: unknown, label: string, maxLength = 10_000): string {
  const normalized = nullableString(value, label, maxLength);
  if (!normalized) {
    throw new HttpProblem(400, "INVALID_REVISION_VALUE", `${label} est obligatoire.`);
  }
  return normalized;
}

function httpUrlOrNull(value: unknown, label: string): string | null {
  const normalized = nullableString(value, label, 2_048);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
  } catch {
    throw new HttpProblem(
      400,
      "INVALID_REVISION_VALUE",
      `${label} doit être une URL HTTP ou HTTPS valide.`,
    );
  }
  return normalized;
}

function countryCodeOrNull(value: unknown): string | null {
  const normalized = nullableString(value, "Le code pays")?.toUpperCase() ?? null;
  if (normalized && !/^[A-Z]{2}$/.test(normalized)) {
    throw new HttpProblem(
      400,
      "INVALID_REVISION_VALUE",
      "Le code pays doit contenir deux lettres.",
    );
  }
  return normalized;
}

function dateOrNull(value: unknown, label: string): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new HttpProblem(400, "INVALID_REVISION_VALUE", `${label} est invalide.`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpProblem(400, "INVALID_REVISION_VALUE", `${label} est invalide.`);
  }
  return date;
}

function expirationDateOrNull(value: unknown): Date | null {
  const normalized =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value)
      ? `${value}T23:59:59.999Z`
      : value;
  const expiration = dateOrNull(normalized, "La date d’expiration");
  if (expiration && expiration.getTime() <= Date.now()) {
    throw new HttpProblem(
      400,
      "INVALID_MEDIA_EXPIRATION",
      "La date d’expiration du visuel doit être future.",
    );
  }
  return expiration;
}

function assertArrayLimit(value: unknown[], label: string, maxLength: number): void {
  if (value.length > maxLength) {
    throw new HttpProblem(
      400,
      "INVALID_REVISION_VALUE",
      `${label} ne peut pas contenir plus de ${maxLength} éléments.`,
    );
  }
}

function revisionValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function createProfessionalService(database: TodamDatabase) {
  async function assertModerator(userId: string): Promise<void> {
    const rows = await database
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!rows[0] || !["trusted_contributor", "admin"].includes(rows[0].role)) {
      throw new HttpProblem(
        403,
        "MODERATOR_REQUIRED",
        "Cette action est réservée à l’équipe éditoriale Todam.",
      );
    }
  }

  async function assertMembership(userId: string, companyId: string) {
    const rows = await database
      .select({ role: companyMemberships.role })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.userId, userId),
          eq(companyMemberships.companyId, companyId),
        ),
      )
      .limit(1);
    if (!rows[0]) {
      throw new HttpProblem(
        403,
        "COMPANY_MEMBERSHIP_REQUIRED",
        "Votre compte n’est pas autorisé à modifier cette compagnie.",
      );
    }
    return rows[0];
  }

  async function assertTargetBelongsToCompany(
    companyId: string,
    targetType: "company" | "production",
    targetId: string,
  ): Promise<void> {
    if (targetType === "company") {
      if (companyId !== targetId) {
        throw new HttpProblem(
          400,
          "INVALID_REVISION_TARGET",
          "La compagnie ne peut modifier que sa propre fiche.",
        );
      }
      const rows = await database
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.id, targetId))
        .limit(1);
      if (!rows[0]) {
        throw new HttpProblem(
          404,
          "COMPANY_NOT_FOUND",
          "Cette compagnie est introuvable.",
        );
      }
      return;
    }
    const rows = await database
      .select({ productionId: productionCompanies.productionId })
      .from(productionCompanies)
      .where(
        and(
          eq(productionCompanies.companyId, companyId),
          eq(productionCompanies.productionId, targetId),
        ),
      )
      .limit(1);
    if (!rows[0]) {
      throw new HttpProblem(
        400,
        "INVALID_REVISION_TARGET",
        "Ce spectacle n’est pas rattaché à cette compagnie.",
      );
    }
  }

  function assertAllowedChanges(
    targetType: "company" | "production",
    changes: RevisionChangeInput[],
  ): void {
    const allowed = targetType === "company" ? companyFields : productionFields;
    const seen = new Set<string>();
    for (const change of changes) {
      if (!allowed.has(change.field)) {
        throw new HttpProblem(
          400,
          "UNSUPPORTED_REVISION_FIELD",
          `Le champ « ${change.field} » ne peut pas être modifié dans cet espace.`,
        );
      }
      if (seen.has(change.field)) {
        throw new HttpProblem(
          400,
          "DUPLICATE_REVISION_FIELD",
          `Le champ « ${change.field} » est présent plusieurs fois.`,
        );
      }
      seen.add(change.field);
      if (
        ["description.short", "description.full", "media"].includes(change.field) &&
        !change.rightsStatus
      ) {
        throw new HttpProblem(
          400,
          "RIGHTS_STATUS_REQUIRED",
          `Le statut de droits est obligatoire pour « ${change.field} ».`,
        );
      }
      if (change.field.startsWith("description.") && change.newValue !== null) {
        if (
          !["todam_original", "permission_granted", "open_license"].includes(
            change.rightsStatus ?? "",
          )
        ) {
          throw new HttpProblem(
            400,
            "INVALID_DESCRIPTION_RIGHTS",
            "Le statut de droits ne permet pas de publier cette description.",
          );
        }
        const description = asObject(change.newValue, "La description");
        const sourceUrl =
          change.provenanceUrl ??
          httpUrlOrNull(description.sourceUrl ?? null, "La source");
        if (change.rightsStatus !== "todam_original" && !sourceUrl) {
          throw new HttpProblem(
            400,
            "DESCRIPTION_SOURCE_REQUIRED",
            "Une description reprise doit indiquer une source vérifiable.",
          );
        }
        if (
          change.rightsStatus === "open_license" &&
          !nullableString(description.license ?? null, "La licence")
        ) {
          throw new HttpProblem(
            400,
            "DESCRIPTION_LICENSE_REQUIRED",
            "Le nom de la licence ouverte est obligatoire.",
          );
        }
      }
    }
  }

  async function readSnapshot(
    executor: DatabaseExecutor,
    targetType: "company" | "production",
    targetId: string,
    fields: string[],
  ): Promise<Map<string, unknown>> {
    const snapshot = new Map<string, unknown>();
    if (targetType === "company") {
      const rows = await executor
        .select()
        .from(companies)
        .where(eq(companies.id, targetId))
        .limit(1);
      const company = rows[0];
      if (!company) {
        throw new HttpProblem(
          404,
          "COMPANY_NOT_FOUND",
          "Cette compagnie est introuvable.",
        );
      }
      for (const field of fields) {
        snapshot.set(field, company[field as keyof typeof company] ?? null);
      }
      return snapshot;
    }

    const rows = await executor
      .select()
      .from(productions)
      .where(eq(productions.id, targetId))
      .limit(1);
    const production = rows[0];
    if (!production) {
      throw new HttpProblem(
        404,
        "PRODUCTION_NOT_FOUND",
        "Ce spectacle est introuvable.",
      );
    }
    const simpleFields = fields.filter(
      (field) =>
        !field.includes(".") && !["credits", "performances", "media"].includes(field),
    );
    for (const field of simpleFields) {
      snapshot.set(field, production[field as keyof typeof production] ?? null);
    }
    if (fields.some((field) => field.startsWith("description."))) {
      const descriptionRows = await executor
        .select()
        .from(productionDescriptions)
        .where(eq(productionDescriptions.productionId, targetId));
      for (const kind of ["short", "full"] as const) {
        if (!fields.includes(`description.${kind}`)) continue;
        const description = descriptionRows.find((row) => row.kind === kind);
        snapshot.set(
          `description.${kind}`,
          description
            ? {
                body: description.body,
                locale: description.locale,
                sourceUrl: description.sourceUrl,
                rightsStatus: description.rightsStatus,
                license: description.license,
                lastVerifiedAt: description.lastVerifiedAt.toISOString(),
              }
            : null,
        );
      }
    }
    if (fields.includes("credits")) {
      const creditRows = await executor
        .select({
          artistId: artists.id,
          name: artists.name,
          role: productionCredits.role,
          label: productionCredits.label,
          position: productionCredits.position,
        })
        .from(productionCredits)
        .innerJoin(artists, eq(artists.id, productionCredits.artistId))
        .where(eq(productionCredits.productionId, targetId))
        .orderBy(asc(productionCredits.position));
      snapshot.set("credits", creditRows);
    }
    if (fields.includes("performances")) {
      const performanceRows = await executor
        .select({
          id: performances.id,
          venueId: performances.venueId,
          startsAt: performances.startsAt,
          endsAt: performances.endsAt,
          status: performances.status,
          officialUrl: performances.officialUrl,
        })
        .from(performances)
        .where(eq(performances.productionId, targetId))
        .orderBy(asc(performances.startsAt));
      snapshot.set(
        "performances",
        performanceRows.map((row) => ({
          ...row,
          startsAt: row.startsAt.toISOString(),
          endsAt: row.endsAt?.toISOString() ?? null,
        })),
      );
    }
    if (fields.includes("media")) {
      const mediaRows = await executor
        .select({
          remoteUrl: mediaAssets.remoteUrl,
          kind: mediaAssets.kind,
          storagePolicy: mediaAssets.storagePolicy,
          alt: mediaAssets.alt,
          credit: mediaAssets.credit,
          copyrightHolder: mediaAssets.copyrightHolder,
          rightsStatus: mediaAssets.rightsStatus,
          license: mediaAssets.license,
          termsUrl: mediaAssets.termsUrl,
          validUntil: mediaAssets.validUntil,
          isPrimary: productionMedia.isPrimary,
          position: productionMedia.position,
        })
        .from(productionMedia)
        .innerJoin(mediaAssets, eq(mediaAssets.id, productionMedia.mediaId))
        .where(eq(productionMedia.productionId, targetId))
        .orderBy(desc(productionMedia.isPrimary), asc(productionMedia.position));
      snapshot.set(
        "media",
        mediaRows.map((row) => ({
          ...row,
          validUntil: row.validUntil?.toISOString() ?? null,
        })),
      );
    }
    return snapshot;
  }

  async function getRevision(revisionId: string): Promise<CatalogRevision> {
    const rows = await database
      .select()
      .from(catalogRevisions)
      .where(eq(catalogRevisions.id, revisionId))
      .limit(1);
    const revision = rows[0];
    if (!revision) {
      throw new HttpProblem(
        404,
        "REVISION_NOT_FOUND",
        "Cette révision est introuvable.",
      );
    }
    const changes = await database
      .select()
      .from(catalogRevisionChanges)
      .where(eq(catalogRevisionChanges.revisionId, revision.id))
      .orderBy(asc(catalogRevisionChanges.field));
    return {
      id: revision.id,
      companyId: revision.companyId,
      targetType: revision.targetType,
      targetId: revision.targetId,
      status: revision.status,
      justification: revision.justification,
      decisionReason: revision.decisionReason,
      changes: changes.map((change) => ({
        id: change.id,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        provenanceUrl: change.provenanceUrl,
        rightsStatus: change.rightsStatus,
      })),
      createdAt: revision.createdAt.toISOString(),
      updatedAt: revision.updatedAt.toISOString(),
      submittedAt: revision.submittedAt?.toISOString() ?? null,
      reviewedAt: revision.reviewedAt?.toISOString() ?? null,
    };
  }

  async function replaceRevisionChanges(
    executor: DatabaseExecutor,
    revisionId: string,
    targetType: "company" | "production",
    targetId: string,
    changes: RevisionChangeInput[],
  ): Promise<void> {
    assertAllowedChanges(targetType, changes);
    const snapshot = await readSnapshot(
      executor,
      targetType,
      targetId,
      changes.map((change) => change.field),
    );
    for (const change of changes) {
      if (
        change.rightsStatus !== "todam_original" ||
        !change.field.startsWith("description.") ||
        change.newValue === null
      ) {
        continue;
      }
      const previous = snapshot.get(change.field);
      const previousBody =
        previous &&
        typeof previous === "object" &&
        !Array.isArray(previous) &&
        typeof (previous as Record<string, unknown>).body === "string"
          ? (previous as Record<string, unknown>).body
          : null;
      const nextDescription = asObject(change.newValue, "La description");
      if (previousBody === null || nextDescription.body !== previousBody) {
        throw new HttpProblem(
          400,
          "TODAM_ORIGINAL_RESERVED",
          "Le statut « Texte original Todam » ne peut être conservé que si le texte éditorial reste inchangé.",
        );
      }
    }
    await executor
      .delete(catalogRevisionChanges)
      .where(eq(catalogRevisionChanges.revisionId, revisionId));
    await executor.insert(catalogRevisionChanges).values(
      changes.map((change) => ({
        revisionId,
        field: change.field,
        oldValue: snapshot.get(change.field) ?? null,
        newValue: change.newValue,
        provenanceUrl: change.provenanceUrl,
        rightsStatus: change.rightsStatus,
      })),
    );
  }

  async function lockRevisionTarget(
    executor: DatabaseExecutor,
    targetType: "company" | "production",
    targetId: string,
  ): Promise<void> {
    const rows =
      targetType === "company"
        ? await executor
            .select({ id: companies.id })
            .from(companies)
            .where(eq(companies.id, targetId))
            .for("update")
            .limit(1)
        : await executor
            .select({ id: productions.id })
            .from(productions)
            .where(eq(productions.id, targetId))
            .for("update")
            .limit(1);
    if (!rows[0]) {
      throw new HttpProblem(
        404,
        targetType === "company" ? "COMPANY_NOT_FOUND" : "PRODUCTION_NOT_FOUND",
        targetType === "company"
          ? "Cette compagnie est introuvable."
          : "Ce spectacle est introuvable.",
      );
    }
  }

  async function assertRevisionFresh(
    executor: DatabaseExecutor,
    revision: CatalogRevision,
  ): Promise<void> {
    const current = await readSnapshot(
      executor,
      revision.targetType,
      revision.targetId,
      revision.changes.map((change) => change.field),
    );
    const conflictingFields = revision.changes
      .filter(
        (change) =>
          !revisionValuesEqual(current.get(change.field) ?? null, change.oldValue),
      )
      .map((change) => change.field);
    if (conflictingFields.length > 0) {
      throw new HttpProblem(
        409,
        "REVISION_CONFLICT",
        `La fiche publique a changé depuis la création de ce brouillon (${conflictingFields.join(
          ", ",
        )}). Créez une nouvelle révision à partir de la version actuelle.`,
      );
    }
  }

  async function attachRevisionProvenance(
    executor: DatabaseExecutor,
    revisionId: string,
    targetType: "company" | "production",
    targetId: string,
    changes: CatalogRevision["changes"],
  ): Promise<void> {
    const sourceRows = await executor
      .insert(catalogSources)
      .values({
        externalKey: "professional-contributions",
        name: "Contributions professionnelles vérifiées",
        homepageUrl: "https://todam.fr/pour-les-compagnies",
        connectorKind: "partner",
        defaultMediaPolicy: "hotlink",
      })
      .onConflictDoUpdate({
        target: catalogSources.externalKey,
        set: { updatedAt: new Date() },
      })
      .returning({ id: catalogSources.id });
    const sourceId = sourceRows[0]!.id;
    const target =
      targetType === "company"
        ? (
            await executor
              .select({
                name: companies.name,
                officialUrl: companies.officialUrl,
              })
              .from(companies)
              .where(eq(companies.id, targetId))
              .limit(1)
          )[0]
        : (
            await executor
              .select({
                name: productions.title,
                officialUrl: productions.officialUrl,
              })
              .from(productions)
              .where(eq(productions.id, targetId))
              .limit(1)
          )[0];
    if (!target) {
      throw new HttpProblem(
        404,
        "REVISION_TARGET_NOT_FOUND",
        "La cible de cette révision est introuvable.",
      );
    }
    const sourceUrl =
      changes.find((change) => change.provenanceUrl)?.provenanceUrl ??
      target.officialUrl ??
      "https://todam.fr/pour-les-compagnies";
    const externalKey = `catalog-revision:${revisionId}`;
    const documentRows = await executor
      .insert(sourceDocuments)
      .values({
        sourceId,
        externalKey,
        title: `Contribution professionnelle vérifiée — ${target.name}`,
        url: sourceUrl,
        retrievedAt: new Date(),
        rightsStatus: "factual_metadata_only",
        license: null,
      })
      .onConflictDoUpdate({
        target: [sourceDocuments.sourceId, sourceDocuments.externalKey],
        set: {
          title: `Contribution professionnelle vérifiée — ${target.name}`,
          url: sourceUrl,
          retrievedAt: new Date(),
          rightsStatus: "factual_metadata_only",
          license: null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: sourceDocuments.id });
    const documentId = documentRows[0]!.id;

    if (targetType === "company") {
      await executor
        .insert(companySources)
        .values({
          entityId: targetId,
          documentId,
          externalKey,
        })
        .onConflictDoUpdate({
          target: [companySources.entityId, companySources.documentId],
          set: { externalKey, observedAt: new Date() },
        });
    } else {
      await executor
        .insert(productionSources)
        .values({
          entityId: targetId,
          documentId,
          externalKey,
        })
        .onConflictDoUpdate({
          target: [productionSources.entityId, productionSources.documentId],
          set: { externalKey, observedAt: new Date() },
        });
      if (changes.some((change) => change.field === "performances")) {
        const performanceRows = await executor
          .select({ id: performances.id })
          .from(performances)
          .where(
            and(
              eq(performances.productionId, targetId),
              sql<boolean>`${performances.startsAt} >= now()`,
            ),
          );
        for (const performance of performanceRows) {
          await executor
            .insert(performanceSources)
            .values({
              entityId: performance.id,
              documentId,
              externalKey: `${externalKey}:performance:${performance.id}`,
            })
            .onConflictDoUpdate({
              target: [performanceSources.entityId, performanceSources.documentId],
              set: {
                externalKey: `${externalKey}:performance:${performance.id}`,
                observedAt: new Date(),
              },
            });
        }
      }
    }
  }

  async function assertProductionReadyForPublication(
    executor: DatabaseExecutor,
    productionId: string,
  ): Promise<void> {
    const missing: string[] = [];
    const productionRows = await executor
      .select({
        durationMinutes: productions.durationMinutes,
        language: productions.language,
        slug: productions.slug,
        title: productions.title,
      })
      .from(productions)
      .where(eq(productions.id, productionId))
      .limit(1);
    const production = productionRows[0];
    if (!production) {
      throw new HttpProblem(
        404,
        "PRODUCTION_NOT_FOUND",
        "Cette production est introuvable.",
      );
    }
    if (
      production.title !== production.title.trim() ||
      /[\n\r\t]|\s{2,}/u.test(production.title) ||
      /[-–—|:]\s*(compagnie|cie\.?|classe|durée|mise en scène|\d+\s*(?:min|mn))/iu.test(
        production.title,
      )
    ) {
      missing.push("titre éditorial propre et séparé des crédits techniques");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(production.slug)) {
      missing.push("URL publique normalisée");
    }
    if (!production.durationMinutes || production.durationMinutes <= 0) {
      missing.push("durée");
    }
    if (!production.language?.trim()) missing.push("langue");
    const primaryCompany = await executor
      .select({ id: companies.id })
      .from(productionCompanies)
      .innerJoin(companies, eq(companies.id, productionCompanies.companyId))
      .where(
        and(
          eq(productionCompanies.productionId, productionId),
          eq(productionCompanies.isPrimary, true),
          eq(companies.publicationStatus, "published"),
        ),
      )
      .limit(1);
    if (!primaryCompany[0]) missing.push("compagnie principale publiée");
    const creditRows = await executor
      .select({ id: productionCredits.artistId })
      .from(productionCredits)
      .where(eq(productionCredits.productionId, productionId))
      .limit(1);
    if (!creditRows[0]) missing.push("crédits artistiques");

    const descriptionRows = await executor
      .select({
        kind: productionDescriptions.kind,
        rightsStatus: productionDescriptions.rightsStatus,
        license: productionDescriptions.license,
        sourceDocumentId: productionDescriptions.sourceDocumentId,
        sourceUrl: productionDescriptions.sourceUrl,
      })
      .from(productionDescriptions)
      .where(
        and(
          eq(productionDescriptions.productionId, productionId),
          eq(productionDescriptions.locale, "fr"),
          sql<boolean>`nullif(btrim(${productionDescriptions.body}), '') is not null`,
        ),
      );
    const publishableDescriptionKinds = new Set(
      descriptionRows
        .filter(
          (row) =>
            [
              "permission_granted",
              "open_license",
              "contractual_display",
              "todam_original",
            ].includes(row.rightsStatus) &&
            (row.rightsStatus !== "open_license" || Boolean(row.license?.trim())) &&
            (row.rightsStatus === "todam_original" ||
              row.sourceDocumentId !== null ||
              Boolean(row.sourceUrl?.trim())),
        )
        .map((row) => row.kind),
    );
    if (!publishableDescriptionKinds.has("short")) {
      missing.push("résumé court en français avec droits publiables");
    }
    if (!publishableDescriptionKinds.has("full")) {
      missing.push("description complète en français avec droits publiables");
    }

    const performanceRows = await executor
      .select({ id: performances.id })
      .from(performances)
      .where(
        and(
          eq(performances.productionId, productionId),
          sql<boolean>`${performances.status} <> 'cancelled'`,
        ),
      )
      .limit(1);
    if (!performanceRows[0]) missing.push("représentation valide");
    const performanceWithoutSource = await executor
      .select({ id: performances.id })
      .from(performances)
      .where(
        and(
          eq(performances.productionId, productionId),
          sql<boolean>`not exists (
            select 1
            from ${performanceSources}
            where ${performanceSources.entityId} = ${performances.id}
          )`,
        ),
      )
      .limit(1);
    if (performanceWithoutSource[0]) {
      missing.push("provenance de chaque représentation");
    }
    const performanceWithUnverifiedVenue = await executor
      .select({ id: performances.id })
      .from(performances)
      .innerJoin(venues, eq(venues.id, performances.venueId))
      .where(
        and(
          eq(performances.productionId, productionId),
          sql<boolean>`not exists (
            select 1
            from ${venueSources}
            where ${venueSources.entityId} = ${venues.id}
          )`,
        ),
      )
      .limit(1);
    if (performanceWithUnverifiedVenue[0]) {
      missing.push("source vérifiée pour chaque lieu");
    }
    const performanceWithInvalidVenueSlug = await executor
      .select({ id: performances.id })
      .from(performances)
      .innerJoin(venues, eq(venues.id, performances.venueId))
      .where(
        and(
          eq(performances.productionId, productionId),
          sql<boolean>`${venues.slug} !~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
        ),
      )
      .limit(1);
    if (performanceWithInvalidVenueSlug[0]) {
      missing.push("URL publique normalisée pour chaque lieu");
    }
    const performanceWithIncompleteVenue = await executor
      .select({ id: performances.id })
      .from(performances)
      .innerJoin(venues, eq(venues.id, performances.venueId))
      .where(
        and(
          eq(performances.productionId, productionId),
          sql<boolean>`nullif(btrim(${venues.officialUrl}), '') is null`,
        ),
      )
      .limit(1);
    if (performanceWithIncompleteVenue[0]) {
      missing.push("site officiel pour chaque lieu");
    }

    const sourceRows = await executor
      .select({ documentId: productionSources.documentId })
      .from(productionSources)
      .where(eq(productionSources.entityId, productionId))
      .limit(1);
    if (!sourceRows[0]) missing.push("source catalogue");

    const duplicateResult = await executor.execute<{ id: string }>(sql`
      with target_occurrences as (
        select distinct
          regexp_replace(lower(unaccent(target.title)), '[^a-z0-9]+', '', 'g')
            as normalized_title,
          regexp_replace(lower(unaccent(target_company.name)), '[^a-z0-9]+', '', 'g')
            as normalized_company,
          target_venue.slug as venue_slug,
          case
            when extract(month from target_performance.starts_at) >= 7
              then extract(year from target_performance.starts_at)::integer
            else extract(year from target_performance.starts_at)::integer - 1
          end as season_start,
          target_source.external_key as source_key
        from productions target
        join production_companies target_company_link
          on target_company_link.production_id = target.id
         and target_company_link.is_primary = true
        join companies target_company
          on target_company.id = target_company_link.company_id
        join performances target_performance
          on target_performance.production_id = target.id
         and target_performance.status <> 'cancelled'
        join venues target_venue
          on target_venue.id = target_performance.venue_id
        join production_sources target_production_source
          on target_production_source.production_id = target.id
        join source_documents target_document
          on target_document.id = target_production_source.document_id
        join catalog_sources target_source
          on target_source.id = target_document.source_id
        where target.id = ${productionId}
      )
      select duplicate.id::text as id
      from productions duplicate
      join production_companies duplicate_company_link
        on duplicate_company_link.production_id = duplicate.id
       and duplicate_company_link.is_primary = true
      join companies duplicate_company
        on duplicate_company.id = duplicate_company_link.company_id
      join performances duplicate_performance
        on duplicate_performance.production_id = duplicate.id
       and duplicate_performance.status <> 'cancelled'
      join venues duplicate_venue
        on duplicate_venue.id = duplicate_performance.venue_id
      join production_sources duplicate_production_source
        on duplicate_production_source.production_id = duplicate.id
      join source_documents duplicate_document
        on duplicate_document.id = duplicate_production_source.document_id
      join catalog_sources duplicate_source
        on duplicate_source.id = duplicate_document.source_id
      join target_occurrences target_occurrence
        on target_occurrence.normalized_title =
           regexp_replace(lower(unaccent(duplicate.title)), '[^a-z0-9]+', '', 'g')
       and target_occurrence.normalized_company =
           regexp_replace(lower(unaccent(duplicate_company.name)), '[^a-z0-9]+', '', 'g')
       and target_occurrence.venue_slug = duplicate_venue.slug
       and target_occurrence.season_start = case
         when extract(month from duplicate_performance.starts_at) >= 7
           then extract(year from duplicate_performance.starts_at)::integer
         else extract(year from duplicate_performance.starts_at)::integer - 1
       end
       and target_occurrence.source_key = duplicate_source.external_key
      where duplicate.id <> ${productionId}
        and duplicate.is_active = true
        and duplicate.publication_status = 'published'
      limit 1
    `);
    if (duplicateResult.rows[0]) {
      missing.push("absence de doublon titre, compagnie, lieu, saison et source");
    }

    const linkedMedia = await executor
      .select({
        copyrightHolder: mediaAssets.copyrightHolder,
        credit: mediaAssets.credit,
        documentUrl: sourceDocuments.url,
        license: mediaAssets.license,
        rightsStatus: mediaAssets.rightsStatus,
        storagePolicy: mediaAssets.storagePolicy,
        termsUrl: mediaAssets.termsUrl,
        validUntil: mediaAssets.validUntil,
      })
      .from(productionMedia)
      .innerJoin(mediaAssets, eq(mediaAssets.id, productionMedia.mediaId))
      .leftJoin(sourceDocuments, eq(sourceDocuments.id, mediaAssets.documentId))
      .where(
        and(
          eq(productionMedia.productionId, productionId),
          eq(mediaAssets.isActive, true),
        ),
      );
    const now = Date.now();
    if (
      linkedMedia.some(
        (asset) =>
          !asset.credit?.trim() ||
          !asset.copyrightHolder?.trim() ||
          !(asset.termsUrl ?? asset.documentUrl)?.trim() ||
          ![
            "permission_granted",
            "open_license",
            "contractual_display",
            "hotlink_only",
            "todam_original",
          ].includes(asset.rightsStatus) ||
          (asset.storagePolicy === "mirror" &&
            !["permission_granted", "open_license", "todam_original"].includes(
              asset.rightsStatus,
            )) ||
          (asset.rightsStatus === "open_license" && !asset.license?.trim()) ||
          (asset.validUntil !== null && asset.validUntil.getTime() <= now),
      )
    ) {
      missing.push("droits complets et valides pour chaque visuel");
    }

    if (missing.length > 0) {
      throw new HttpProblem(
        409,
        "PRODUCTION_NOT_READY",
        `La production ne peut pas être publiée. Éléments manquants : ${missing.join(
          ", ",
        )}.`,
      );
    }
  }

  async function assertCompanyReadyForPublication(
    executor: DatabaseExecutor,
    companyId: string,
  ): Promise<void> {
    const companyRows = await executor
      .select({
        name: companies.name,
        slug: companies.slug,
        shortDescription: companies.shortDescription,
        officialUrl: companies.officialUrl,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    const company = companyRows[0];
    const missing: string[] = [];
    if (!company?.name.trim()) missing.push("nom");
    if (company && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(company.slug)) {
      missing.push("URL publique normalisée");
    }
    if (!company?.shortDescription?.trim()) missing.push("présentation courte");
    if (!company?.officialUrl) missing.push("site officiel");
    const sourceRows = await executor
      .select({ documentId: companySources.documentId })
      .from(companySources)
      .where(eq(companySources.entityId, companyId))
      .limit(1);
    if (!sourceRows[0]) missing.push("source catalogue");
    if (missing.length > 0) {
      throw new HttpProblem(
        409,
        "COMPANY_NOT_READY",
        `La compagnie ne peut pas être publiée. Éléments manquants : ${missing.join(
          ", ",
        )}.`,
      );
    }
  }

  async function candidateReadinessIssues(
    executor: DatabaseExecutor,
    targetType: "company" | "production",
    targetId: string,
  ): Promise<string[]> {
    try {
      if (targetType === "company") {
        await assertCompanyReadyForPublication(executor, targetId);
      } else {
        await assertProductionReadyForPublication(executor, targetId);
      }
      return [];
    } catch (error) {
      if (
        error instanceof HttpProblem &&
        ["COMPANY_NOT_READY", "PRODUCTION_NOT_READY"].includes(error.code)
      ) {
        const marker = "Éléments manquants : ";
        const details = error.message.includes(marker)
          ? error.message.split(marker)[1]!.replace(/\.$/u, "")
          : error.message;
        return details
          .split(",")
          .map((issue) => issue.trim())
          .filter(Boolean);
      }
      throw error;
    }
  }

  async function candidateSources(
    targetType: "company" | "production",
    targetId: string,
  ) {
    const fields = {
      title: sourceDocuments.title,
      url: sourceDocuments.url,
      retrievedAt: sourceDocuments.retrievedAt,
      rightsStatus: sourceDocuments.rightsStatus,
      license: sourceDocuments.license,
    };
    const rows =
      targetType === "company"
        ? await database
            .select(fields)
            .from(companySources)
            .innerJoin(
              sourceDocuments,
              eq(sourceDocuments.id, companySources.documentId),
            )
            .where(eq(companySources.entityId, targetId))
            .orderBy(desc(sourceDocuments.retrievedAt), asc(sourceDocuments.title))
        : await database
            .select(fields)
            .from(productionSources)
            .innerJoin(
              sourceDocuments,
              eq(sourceDocuments.id, productionSources.documentId),
            )
            .where(eq(productionSources.entityId, targetId))
            .orderBy(desc(sourceDocuments.retrievedAt), asc(sourceDocuments.title));
    return rows.map((source) => ({
      ...source,
      retrievedAt: source.retrievedAt.toISOString(),
    }));
  }

  async function applyChanges(
    executor: DatabaseExecutor,
    revisionId: string,
    targetType: "company" | "production",
    targetId: string,
    changes: CatalogRevision["changes"],
    options: { allowStaleMediaReferences?: boolean } = {},
  ): Promise<void> {
    if (targetType === "company") {
      const values: Record<string, unknown> = { updatedAt: new Date() };
      for (const change of changes) {
        if (change.field === "name") {
          values.name = requiredString(change.newValue, "Le nom", 240);
        } else if (change.field === "officialUrl") {
          values.officialUrl = httpUrlOrNull(change.newValue, "Le site officiel");
        } else if (change.field === "countryCode") {
          values.countryCode = countryCodeOrNull(change.newValue);
        } else if (change.field === "shortDescription") {
          values.shortDescription = nullableString(
            change.newValue,
            "La présentation courte",
            700,
          );
        } else if (change.field === "description") {
          values.description = nullableString(
            change.newValue,
            "La présentation complète",
            8_000,
          );
        } else if (change.field === "locality") {
          values.locality = nullableString(change.newValue, "La ville", 120);
        }
      }
      await executor.update(companies).set(values).where(eq(companies.id, targetId));
      return;
    }

    const simpleValues: Record<string, unknown> = { updatedAt: new Date() };
    for (const change of changes) {
      if (change.field === "title") {
        simpleValues.title = requiredString(change.newValue, "Le titre", 240);
      } else if (change.field === "discipline") {
        if (!["theatre", "opera", "ballet"].includes(String(change.newValue))) {
          throw new HttpProblem(
            400,
            "INVALID_REVISION_VALUE",
            "La discipline est invalide.",
          );
        }
        simpleValues.discipline = change.newValue;
      } else if (change.field === "audience") {
        if (!["general", "family", "children"].includes(String(change.newValue))) {
          throw new HttpProblem(
            400,
            "INVALID_REVISION_VALUE",
            "Le public conseillé est invalide.",
          );
        }
        simpleValues.audience = change.newValue;
      } else if (change.field === "minimumAge") {
        if (
          change.newValue !== null &&
          (!Number.isInteger(change.newValue) ||
            Number(change.newValue) < 0 ||
            Number(change.newValue) > 99)
        ) {
          throw new HttpProblem(
            400,
            "INVALID_REVISION_VALUE",
            "L’âge minimum doit être un nombre entier compris entre 0 et 99.",
          );
        }
        simpleValues.minimumAge = change.newValue;
      } else if (change.field === "durationMinutes") {
        if (
          change.newValue !== null &&
          (!Number.isInteger(change.newValue) || Number(change.newValue) <= 0)
        ) {
          throw new HttpProblem(
            400,
            "INVALID_REVISION_VALUE",
            "La durée doit être un nombre entier positif.",
          );
        }
        simpleValues.durationMinutes = change.newValue;
      } else if (change.field === "officialUrl") {
        simpleValues.officialUrl = httpUrlOrNull(change.newValue, "Le lien officiel");
      } else if (change.field === "language") {
        simpleValues.language = nullableString(change.newValue, "La langue", 80);
      }
    }
    await executor
      .update(productions)
      .set(simpleValues)
      .where(eq(productions.id, targetId));

    for (const change of changes) {
      if (change.field.startsWith("description.")) {
        const kind = change.field.endsWith(".short") ? "short" : "full";
        if (change.newValue === null) {
          await executor
            .delete(productionDescriptions)
            .where(
              and(
                eq(productionDescriptions.productionId, targetId),
                eq(productionDescriptions.locale, "fr"),
                eq(productionDescriptions.kind, kind),
              ),
            );
          continue;
        }
        const value = asObject(change.newValue, "La description");
        const body = requiredString(
          value.body,
          "Le texte de la description",
          kind === "short" ? 700 : 8_000,
        );
        const lastVerifiedAt =
          dateOrNull(value.lastVerifiedAt, "La date de vérification") ?? new Date();
        if (lastVerifiedAt.getTime() > Date.now() + 5 * 60 * 1_000) {
          throw new HttpProblem(
            400,
            "INVALID_REVISION_VALUE",
            "La date de vérification d’une description ne peut pas être future.",
          );
        }
        const sourceUrl =
          change.provenanceUrl ?? httpUrlOrNull(value.sourceUrl ?? null, "La source");
        const license = nullableString(value.license ?? null, "La licence", 240);
        await executor
          .insert(productionDescriptions)
          .values({
            productionId: targetId,
            locale: "fr",
            kind,
            body,
            sourceUrl,
            rightsStatus: change.rightsStatus!,
            license,
            lastVerifiedAt,
          })
          .onConflictDoUpdate({
            target: [
              productionDescriptions.productionId,
              productionDescriptions.locale,
              productionDescriptions.kind,
            ],
            set: {
              body,
              sourceDocumentId: null,
              sourceUrl,
              rightsStatus: change.rightsStatus!,
              license,
              lastVerifiedAt,
              updatedAt: new Date(),
            },
          });
      }

      if (change.field === "credits") {
        if (!Array.isArray(change.newValue)) {
          throw new HttpProblem(
            400,
            "INVALID_REVISION_VALUE",
            "Les crédits doivent être une liste.",
          );
        }
        assertArrayLimit(change.newValue, "Les crédits", 200);
        await executor
          .delete(productionCredits)
          .where(eq(productionCredits.productionId, targetId));
        for (const [position, rawCredit] of change.newValue.entries()) {
          const credit = asObject(rawCredit, "Un crédit");
          const name = requiredString(credit.name, "Le nom de l’artiste", 240);
          const role = String(credit.role);
          if (
            ![
              "author",
              "director",
              "performer",
              "choreographer",
              "composer",
              "musical_director",
              "designer",
              "other",
            ].includes(role)
          ) {
            throw new HttpProblem(
              400,
              "INVALID_REVISION_VALUE",
              `Le rôle du crédit « ${name} » est invalide.`,
            );
          }
          let artistId =
            typeof credit.artistId === "string" ? credit.artistId : undefined;
          if (artistId && !UUID_PATTERN.test(artistId)) {
            throw new HttpProblem(
              400,
              "INVALID_ARTIST_REFERENCE",
              `La référence de l’artiste « ${name} » est invalide.`,
            );
          }
          if (artistId) {
            const found = await executor
              .select({ id: artists.id, name: artists.name })
              .from(artists)
              .where(eq(artists.id, artistId))
              .limit(1);
            if (!found[0] || found[0].name !== name) artistId = undefined;
          }
          if (!artistId) {
            const slug = `${safeSlug(name) || "artiste"}-${revisionId.slice(0, 8)}-${position}`;
            const inserted = await executor
              .insert(artists)
              .values({ slug, name })
              .returning({ id: artists.id });
            artistId = inserted[0]!.id;
          }
          await executor.insert(productionCredits).values({
            productionId: targetId,
            artistId,
            role: role as
              | "author"
              | "director"
              | "performer"
              | "choreographer"
              | "composer"
              | "musical_director"
              | "designer"
              | "other",
            label: nullableString(credit.label ?? null, "Le libellé du crédit", 240),
            position:
              typeof credit.position === "number" &&
              Number.isInteger(credit.position) &&
              credit.position >= 0
                ? credit.position
                : position,
          });
        }
      }

      if (change.field === "performances") {
        if (!Array.isArray(change.newValue)) {
          throw new HttpProblem(
            400,
            "INVALID_REVISION_VALUE",
            "Les représentations doivent être une liste.",
          );
        }
        assertArrayLimit(change.newValue, "Les représentations", 500);
        await executor
          .delete(performances)
          .where(
            and(
              eq(performances.productionId, targetId),
              sql<boolean>`${performances.startsAt} >= now()`,
            ),
          );
        for (const rawPerformance of change.newValue) {
          const performance = asObject(rawPerformance, "Une représentation");
          const venueId = requiredString(performance.venueId, "Le lieu");
          const venueRows = await executor
            .select({ id: venues.id })
            .from(venues)
            .where(eq(venues.id, venueId))
            .limit(1);
          if (!venueRows[0]) {
            throw new HttpProblem(
              400,
              "INVALID_REVISION_VALUE",
              "Le lieu d’une représentation est inconnu.",
            );
          }
          const startsAt = dateOrNull(performance.startsAt, "La date de début");
          if (!startsAt) {
            throw new HttpProblem(
              400,
              "INVALID_REVISION_VALUE",
              "La date de début est obligatoire.",
            );
          }
          const status = String(performance.status ?? "scheduled");
          if (!["scheduled", "cancelled", "postponed"].includes(status)) {
            throw new HttpProblem(
              400,
              "INVALID_REVISION_VALUE",
              "Le statut d’une représentation est invalide.",
            );
          }
          const endsAt = dateOrNull(performance.endsAt, "La date de fin");
          if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
            throw new HttpProblem(
              400,
              "INVALID_REVISION_VALUE",
              "La fin d’une représentation doit suivre son début.",
            );
          }
          await executor.insert(performances).values({
            productionId: targetId,
            venueId,
            startsAt,
            endsAt,
            status: status as "scheduled" | "cancelled" | "postponed",
            officialUrl: httpUrlOrNull(
              performance.officialUrl ?? null,
              "Le lien de billetterie",
            ),
          });
        }
      }

      if (change.field === "media") {
        if (!Array.isArray(change.newValue)) {
          throw new HttpProblem(
            400,
            "INVALID_REVISION_VALUE",
            "Les visuels doivent être une liste.",
          );
        }
        assertArrayLimit(change.newValue, "Les visuels", 30);
        const sourceRows = await executor
          .insert(catalogSources)
          .values({
            externalKey: "professional-contributions",
            name: "Contributions professionnelles vérifiées",
            homepageUrl: "https://todam.fr/pour-les-compagnies",
            connectorKind: "partner",
            defaultMediaPolicy: "hotlink",
          })
          .onConflictDoUpdate({
            target: catalogSources.externalKey,
            set: { updatedAt: new Date() },
          })
          .returning({ id: catalogSources.id });
        const sourceId = sourceRows[0]!.id;
        const currentMediaRows = await executor
          .select({
            mediaId: productionMedia.mediaId,
            sourceId: mediaAssets.sourceId,
            documentId: mediaAssets.documentId,
            sourceUrl: sourceDocuments.url,
            remoteUrl: mediaAssets.remoteUrl,
            kind: mediaAssets.kind,
            storagePolicy: mediaAssets.storagePolicy,
            alt: mediaAssets.alt,
            credit: mediaAssets.credit,
            copyrightHolder: mediaAssets.copyrightHolder,
            rightsStatus: mediaAssets.rightsStatus,
            license: mediaAssets.license,
            termsUrl: mediaAssets.termsUrl,
            validUntil: mediaAssets.validUntil,
            isActive: mediaAssets.isActive,
          })
          .from(productionMedia)
          .innerJoin(mediaAssets, eq(mediaAssets.id, productionMedia.mediaId))
          .innerJoin(sourceDocuments, eq(sourceDocuments.id, mediaAssets.documentId))
          .where(eq(productionMedia.productionId, targetId));
        const currentMediaById = new Map(
          currentMediaRows.map((row) => [row.mediaId, row]),
        );
        const retainedMediaIds = new Set<string>();
        const nextMediaLinks: {
          productionId: string;
          mediaId: string;
          isPrimary: boolean;
          position: number;
        }[] = [];
        let primarySeen = false;
        for (const [position, rawMedia] of change.newValue.entries()) {
          const media = asObject(rawMedia, "Un visuel");
          const requestedMediaId =
            typeof media.assetId === "string" && UUID_PATTERN.test(media.assetId)
              ? media.assetId
              : null;
          if (media.assetId && !requestedMediaId) {
            throw new HttpProblem(
              400,
              "INVALID_MEDIA_REFERENCE",
              "La référence d’un visuel existant est invalide.",
            );
          }
          const existingMedia = requestedMediaId
            ? currentMediaById.get(requestedMediaId)
            : undefined;
          if (
            requestedMediaId &&
            !existingMedia &&
            !options.allowStaleMediaReferences
          ) {
            throw new HttpProblem(
              409,
              "MEDIA_REFERENCE_STALE",
              "Un visuel référencé n’est plus rattaché à ce spectacle.",
            );
          }
          if (requestedMediaId && retainedMediaIds.has(requestedMediaId)) {
            throw new HttpProblem(
              400,
              "DUPLICATE_MEDIA_REFERENCE",
              "Un même visuel ne peut apparaître qu’une fois.",
            );
          }
          const remoteUrl = httpUrlOrNull(media.remoteUrl, "L’URL du visuel");
          if (!remoteUrl) {
            throw new HttpProblem(
              400,
              "INVALID_REVISION_VALUE",
              "L’URL du visuel est obligatoire.",
            );
          }
          const credit = requiredString(media.credit, "Le crédit du visuel", 500);
          const copyrightHolder = requiredString(
            media.copyrightHolder,
            "Le détenteur des droits",
            500,
          );
          const rightsStatus = String(media.rightsStatus ?? change.rightsStatus ?? "");
          if (
            ![
              "permission_granted",
              "open_license",
              "contractual_display",
              "hotlink_only",
            ].includes(rightsStatus)
          ) {
            throw new HttpProblem(
              400,
              "INVALID_MEDIA_RIGHTS",
              "Le statut de droits du visuel ne permet pas sa publication.",
            );
          }
          const kind = String(media.kind ?? "poster");
          if (!["poster", "key_visual", "photo", "logo"].includes(kind)) {
            throw new HttpProblem(
              400,
              "INVALID_REVISION_VALUE",
              "Le type de visuel est invalide.",
            );
          }
          const storagePolicy = String(media.storagePolicy ?? "hotlink");
          if (!["hotlink", "mirror"].includes(storagePolicy)) {
            throw new HttpProblem(
              400,
              "INVALID_MEDIA_STORAGE_POLICY",
              "Le mode de stockage du visuel est invalide.",
            );
          }
          if (
            storagePolicy === "mirror" &&
            !["permission_granted", "open_license"].includes(rightsStatus)
          ) {
            throw new HttpProblem(
              400,
              "MEDIA_STORAGE_NOT_AUTHORIZED",
              "Le stockage d’un visuel exige une autorisation ou une licence ouverte.",
            );
          }
          const license = nullableString(media.license ?? null, "La licence", 240);
          if (rightsStatus === "open_license" && !license) {
            throw new HttpProblem(
              400,
              "MEDIA_LICENSE_REQUIRED",
              "Le nom de la licence ouverte est obligatoire.",
            );
          }
          const termsUrl = httpUrlOrNull(
            media.termsUrl ?? null,
            "Le justificatif des droits",
          );
          if (!termsUrl) {
            throw new HttpProblem(
              400,
              "MEDIA_RIGHTS_SOURCE_REQUIRED",
              "Chaque visuel doit fournir un justificatif ou une source de droits.",
            );
          }
          const alt = nullableString(media.alt ?? null, "Le texte alternatif", 500);
          const validUntil = expirationDateOrNull(media.validUntil);
          const requestedPrimary = Boolean(media.isPrimary ?? position === 0);
          if (requestedPrimary && primarySeen) {
            throw new HttpProblem(
              400,
              "MULTIPLE_PRIMARY_MEDIA",
              "Un spectacle ne peut avoir qu’un visuel principal.",
            );
          }
          primarySeen ||= requestedPrimary;

          const existingRightsMatch =
            existingMedia?.rightsStatus === rightsStatus ||
            (existingMedia?.rightsStatus === "todam_original" &&
              rightsStatus === "permission_granted");
          const existingExpiration = existingMedia?.validUntil?.getTime() ?? null;
          const requestedExpiration = validUntil?.getTime() ?? null;
          const canReuseExisting =
            existingMedia !== undefined &&
            existingMedia.isActive &&
            existingMedia.remoteUrl === remoteUrl &&
            existingMedia.kind === kind &&
            existingMedia.storagePolicy === storagePolicy &&
            existingMedia.alt === alt &&
            existingMedia.credit === credit &&
            existingMedia.copyrightHolder === copyrightHolder &&
            existingRightsMatch &&
            existingMedia.license === license &&
            (existingMedia.termsUrl ?? existingMedia.sourceUrl) === termsUrl &&
            existingExpiration === requestedExpiration;
          if (canReuseExisting) {
            retainedMediaIds.add(existingMedia.mediaId);
            nextMediaLinks.push({
              productionId: targetId,
              mediaId: existingMedia.mediaId,
              isPrimary: requestedPrimary,
              position,
            });
            continue;
          }

          const externalKey = `${revisionId}:media:${position}`;
          const documentRows = await executor
            .insert(sourceDocuments)
            .values({
              sourceId,
              externalKey,
              title: `Visuel professionnel ${position + 1}`,
              url: termsUrl,
              retrievedAt: new Date(),
              rightsStatus: rightsStatus as
                | "permission_granted"
                | "open_license"
                | "contractual_display"
                | "hotlink_only",
              license,
            })
            .returning({ id: sourceDocuments.id });
          const assetRows = await executor
            .insert(mediaAssets)
            .values({
              sourceId,
              documentId: documentRows[0]!.id,
              externalKey,
              kind: kind as "poster" | "key_visual" | "photo" | "logo",
              remoteUrl,
              storagePolicy: storagePolicy as "hotlink" | "mirror",
              alt,
              credit,
              copyrightHolder,
              rightsStatus: rightsStatus as
                | "permission_granted"
                | "open_license"
                | "contractual_display"
                | "hotlink_only",
              license,
              termsUrl,
              validUntil,
            })
            .returning({ id: mediaAssets.id });
          retainedMediaIds.add(assetRows[0]!.id);
          nextMediaLinks.push({
            productionId: targetId,
            mediaId: assetRows[0]!.id,
            isPrimary: requestedPrimary,
            position,
          });
        }
        if (nextMediaLinks.length > 0 && !primarySeen) {
          nextMediaLinks[0]!.isPrimary = true;
        }
        await executor
          .delete(productionMedia)
          .where(eq(productionMedia.productionId, targetId));
        if (nextMediaLinks.length > 0) {
          await executor.insert(productionMedia).values(nextMediaLinks);
        }

        const obsoleteProfessionalMedia = currentMediaRows.filter(
          (row) => row.sourceId === sourceId && !retainedMediaIds.has(row.mediaId),
        );
        if (obsoleteProfessionalMedia.length > 0) {
          await executor.delete(mediaAssets).where(
            inArray(
              mediaAssets.id,
              obsoleteProfessionalMedia.map((row) => row.mediaId),
            ),
          );
          await executor.delete(sourceDocuments).where(
            inArray(
              sourceDocuments.id,
              obsoleteProfessionalMedia.map((row) => row.documentId),
            ),
          );
        }
      }
    }
  }

  async function describeContentReportTarget(
    targetType: ContentReport["targetType"],
    targetId: string,
  ): Promise<Pick<ContentReport, "targetLabel" | "targetPath" | "canHide">> {
    if (targetType === "production") {
      const rows = await database
        .select({ slug: productions.slug, title: productions.title })
        .from(productions)
        .where(eq(productions.id, targetId))
        .limit(1);
      return rows[0]
        ? {
            targetLabel: rows[0].title,
            targetPath: `/production/${encodeURIComponent(rows[0].slug)}`,
            canHide: true,
          }
        : {
            targetLabel: "Spectacle supprimé",
            targetPath: null,
            canHide: false,
          };
    }
    if (targetType === "venue") {
      const [rows, communitySources] = await Promise.all([
        database
          .select({
            name: venues.name,
            slug: venues.slug,
          })
          .from(venues)
          .where(eq(venues.id, targetId))
          .limit(1),
        database
          .select({ id: venueSources.entityId })
          .from(venueSources)
          .innerJoin(sourceDocuments, eq(sourceDocuments.id, venueSources.documentId))
          .innerJoin(catalogSources, eq(catalogSources.id, sourceDocuments.sourceId))
          .where(
            and(
              eq(venueSources.entityId, targetId),
              eq(catalogSources.connectorKind, "community"),
            ),
          )
          .limit(1),
      ]);
      return rows[0]
        ? {
            targetLabel: rows[0].name,
            targetPath: `/lieu/${encodeURIComponent(rows[0].slug)}`,
            canHide: Boolean(communitySources[0]),
          }
        : {
            targetLabel: "Lieu supprimé",
            targetPath: null,
            canHide: false,
          };
    }
    if (targetType === "company") {
      const rows = await database
        .select({ name: companies.name, slug: companies.slug })
        .from(companies)
        .where(eq(companies.id, targetId))
        .limit(1);
      return rows[0]
        ? {
            targetLabel: rows[0].name,
            targetPath: `/compagnie/${encodeURIComponent(rows[0].slug)}`,
            canHide: true,
          }
        : {
            targetLabel: "Compagnie supprimée",
            targetPath: null,
            canHide: false,
          };
    }
    if (targetType === "member") {
      const rows = await database
        .select({ username: user.username })
        .from(user)
        .where(sql<boolean>`lower(${user.username}::text) = lower(${targetId})`)
        .limit(1);
      return rows[0]
        ? {
            targetLabel: `@${rows[0].username}`,
            targetPath: `/membre/${encodeURIComponent(rows[0].username)}`,
            canHide: false,
          }
        : {
            targetLabel: "Profil supprimé",
            targetPath: null,
            canHide: false,
          };
    }
    if (targetType === "list") {
      const rows = await database
        .select({
          name: lists.name,
          slug: lists.slug,
          username: user.username,
        })
        .from(lists)
        .innerJoin(user, eq(user.id, lists.userId))
        .where(eq(lists.id, targetId))
        .limit(1);
      return rows[0]
        ? {
            targetLabel: `${rows[0].name}, par @${rows[0].username}`,
            targetPath: `/membre/${encodeURIComponent(
              rows[0].username,
            )}/listes/${encodeURIComponent(rows[0].slug)}`,
            canHide: false,
          }
        : {
            targetLabel: "Liste supprimée",
            targetPath: null,
            canHide: false,
          };
    }
    const rows = await database
      .select({
        productionSlug: productions.slug,
        productionTitle: productions.title,
        username: user.username,
      })
      .from(reviews)
      .innerJoin(productions, eq(productions.id, reviews.productionId))
      .innerJoin(user, eq(user.id, reviews.userId))
      .where(eq(reviews.id, targetId))
      .limit(1);
    return rows[0]
      ? {
          targetLabel: `Avis de @${rows[0].username} sur ${rows[0].productionTitle}`,
          targetPath: `/production/${encodeURIComponent(rows[0].productionSlug)}`,
          canHide: true,
        }
      : {
          targetLabel: "Avis supprimé",
          targetPath: null,
          canHide: false,
        };
  }

  async function serializeContentReport(report: {
    id: string;
    targetType: ContentReport["targetType"];
    targetId: string;
    category: ContentReport["category"];
    mediaId: string | null;
    reason: string;
    status: ContentReport["status"];
    decision: string | null;
    submittedAt: Date;
    reviewedAt: Date | null;
  }): Promise<ContentReport> {
    const mediaRows = report.mediaId
      ? await database
          .select({
            id: mediaAssets.id,
            url: mediaAssets.remoteUrl,
            credit: mediaAssets.credit,
            sourceUrl: sourceDocuments.url,
            isActive: mediaAssets.isActive,
          })
          .from(mediaAssets)
          .innerJoin(sourceDocuments, eq(sourceDocuments.id, mediaAssets.documentId))
          .where(eq(mediaAssets.id, report.mediaId))
          .limit(1)
      : [];
    const contributionRows =
      report.targetType === "production"
        ? await database
            .select({
              id: communitySubmissions.id,
              status: communitySubmissions.status,
              sourceUrl: communitySubmissions.sourceUrl,
              submittedAt: communitySubmissions.createdAt,
            })
            .from(communitySubmissions)
            .where(
              report.mediaId
                ? and(
                    eq(communitySubmissions.productionId, report.targetId),
                    eq(communitySubmissions.mediaId, report.mediaId),
                  )
                : eq(communitySubmissions.productionId, report.targetId),
            )
            .orderBy(desc(communitySubmissions.createdAt))
            .limit(1)
        : [];
    const media = mediaRows[0];
    const contribution = contributionRows[0];
    return {
      ...report,
      ...(await describeContentReportTarget(report.targetType, report.targetId)),
      canHideMedia: Boolean(media?.isActive),
      media: media
        ? {
            id: media.id,
            url: media.url,
            credit: media.credit,
            sourceUrl: media.sourceUrl,
          }
        : null,
      contribution: contribution
        ? {
            id: contribution.id,
            status: contribution.status,
            sourceUrl: contribution.sourceUrl,
            submittedAt: contribution.submittedAt.toISOString(),
          }
        : null,
      submittedAt: report.submittedAt.toISOString(),
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
    };
  }

  return {
    async listCatalogCandidates(
      userId: string,
      input: AdminCatalogCandidatesQuery,
    ): Promise<CatalogCandidate[]> {
      await assertModerator(userId);
      const companyRows =
        input.type === "production"
          ? []
          : await database
              .select({
                id: companies.id,
                slug: companies.slug,
                label: companies.name,
                publicationStatus: companies.publicationStatus,
                updatedAt: companies.updatedAt,
                reviewedAt: companies.reviewedAt,
              })
              .from(companies)
              .where(
                input.status === "all"
                  ? undefined
                  : eq(companies.publicationStatus, input.status),
              )
              .orderBy(desc(companies.updatedAt), asc(companies.name))
              .limit(input.limit);
      const productionRows =
        input.type === "company"
          ? []
          : await database
              .select({
                id: productions.id,
                slug: productions.slug,
                label: productions.title,
                discipline: productions.discipline,
                publicationStatus: productions.publicationStatus,
                updatedAt: productions.updatedAt,
                reviewedAt: productions.reviewedAt,
                companyName: sql<string | null>`(
                  select candidate_company.name
                  from ${productionCompanies} candidate_link
                  join ${companies} candidate_company
                    on candidate_company.id = candidate_link.company_id
                  where candidate_link.production_id = ${productions.id}
                  order by candidate_link.is_primary desc,
                    candidate_link.position,
                    candidate_company.name
                  limit 1
                )`,
              })
              .from(productions)
              .where(
                and(
                  eq(productions.isActive, true),
                  input.status === "all"
                    ? undefined
                    : eq(productions.publicationStatus, input.status),
                ),
              )
              .orderBy(desc(productions.updatedAt), asc(productions.title))
              .limit(input.limit);

      const candidates = await Promise.all([
        ...companyRows.map(async (candidate): Promise<CatalogCandidate> => ({
          id: candidate.id,
          targetType: "company",
          slug: candidate.slug,
          label: candidate.label,
          secondaryLabel: null,
          discipline: null,
          publicationStatus: candidate.publicationStatus,
          readinessIssues: await candidateReadinessIssues(
            database,
            "company",
            candidate.id,
          ),
          sources: await candidateSources("company", candidate.id),
          updatedAt: candidate.updatedAt.toISOString(),
          reviewedAt: candidate.reviewedAt?.toISOString() ?? null,
        })),
        ...productionRows.map(async (candidate): Promise<CatalogCandidate> => ({
          id: candidate.id,
          targetType: "production",
          slug: candidate.slug,
          label: candidate.label,
          secondaryLabel: candidate.companyName,
          discipline: candidate.discipline,
          publicationStatus: candidate.publicationStatus,
          readinessIssues: await candidateReadinessIssues(
            database,
            "production",
            candidate.id,
          ),
          sources: await candidateSources("production", candidate.id),
          updatedAt: candidate.updatedAt.toISOString(),
          reviewedAt: candidate.reviewedAt?.toISOString() ?? null,
        })),
      ]);
      return candidates
        .sort(
          (left, right) =>
            right.updatedAt.localeCompare(left.updatedAt) ||
            left.label.localeCompare(right.label, "fr"),
        )
        .slice(0, input.limit);
    },

    async moderateCatalogCandidate(
      userId: string,
      targetType: "company" | "production",
      targetId: string,
      decision: "publish" | "hide" | "draft",
    ): Promise<void> {
      await assertModerator(userId);
      await database.transaction(async (transaction) => {
        await lockRevisionTarget(transaction, targetType, targetId);
        const now = new Date();
        const publicationStatus: "published" | "hidden" | "draft" =
          decision === "publish"
            ? "published"
            : decision === "hide"
              ? "hidden"
              : "draft";
        if (decision === "publish") {
          if (targetType === "company") {
            await assertCompanyReadyForPublication(transaction, targetId);
          } else {
            await assertProductionReadyForPublication(transaction, targetId);
          }
        }
        const moderationFields =
          decision === "draft"
            ? {
                publicationStatus,
                reviewedAt: null,
                reviewedBy: null,
                updatedAt: now,
              }
            : {
                publicationStatus,
                reviewedAt: now,
                reviewedBy: userId,
                updatedAt: now,
              };
        if (targetType === "company") {
          await transaction
            .update(companies)
            .set(moderationFields)
            .where(eq(companies.id, targetId));
          if (decision !== "publish") {
            await transaction
              .update(productions)
              .set({
                publicationStatus: "draft",
                reviewedAt: null,
                reviewedBy: null,
                updatedAt: now,
              })
              .where(
                and(
                  eq(productions.publicationStatus, "published"),
                  sql<boolean>`exists (
                    select 1
                    from ${productionCompanies}
                    where ${productionCompanies.productionId} = ${productions.id}
                      and ${productionCompanies.companyId} = ${targetId}
                      and ${productionCompanies.isPrimary} = true
                  )`,
                ),
              );
          }
        } else {
          await transaction
            .update(productions)
            .set(moderationFields)
            .where(eq(productions.id, targetId));
        }
      });
    },

    async listContentReports(
      userId: string,
      status: ContentReportStatus | "all" = "open",
    ): Promise<ContentReport[]> {
      await assertModerator(userId);
      const rows = await database
        .select({
          id: contentReports.id,
          targetType: contentReports.targetType,
          targetId: contentReports.targetId,
          category: contentReports.category,
          mediaId: contentReports.mediaId,
          reason: contentReports.reason,
          status: contentReports.status,
          decision: contentReports.decision,
          submittedAt: contentReports.createdAt,
          reviewedAt: contentReports.reviewedAt,
        })
        .from(contentReports)
        .where(status === "all" ? undefined : eq(contentReports.status, status))
        .orderBy(asc(contentReports.status), desc(contentReports.createdAt));
      return Promise.all(rows.map((report) => serializeContentReport(report)));
    },

    async moderateContentReport(
      userId: string,
      reportId: string,
      status: Exclude<ContentReportStatus, "open">,
      input: ModerateContentReportBody,
    ): Promise<ContentReport> {
      await assertModerator(userId);
      const report = await database.transaction(async (transaction) => {
        const currentRows = await transaction
          .select()
          .from(contentReports)
          .where(eq(contentReports.id, reportId))
          .for("update")
          .limit(1);
        const current = currentRows[0];
        if (!current) {
          throw new HttpProblem(
            404,
            "CONTENT_REPORT_NOT_FOUND",
            "Ce signalement est introuvable.",
          );
        }
        if (["resolved", "dismissed"].includes(current.status)) {
          throw new HttpProblem(
            409,
            "CONTENT_REPORT_ALREADY_CLOSED",
            "Ce signalement a déjà reçu une décision définitive.",
          );
        }
        if (input.contentAction !== "none" && status !== "resolved") {
          throw new HttpProblem(
            400,
            "INVALID_CONTENT_REPORT_ACTION",
            "Le masquage doit clôturer le signalement comme résolu.",
          );
        }
        if (input.contentAction === "hide_media") {
          if (
            current.targetType !== "production" ||
            current.category !== "visual_rights" ||
            !current.mediaId
          ) {
            throw new HttpProblem(
              400,
              "CONTENT_REPORT_MEDIA_NOT_HIDEABLE",
              "Ce signalement n’est pas associé à une affiche.",
            );
          }
          const linkedMedia = await transaction
            .select({ id: mediaAssets.id })
            .from(mediaAssets)
            .innerJoin(productionMedia, eq(productionMedia.mediaId, mediaAssets.id))
            .where(
              and(
                eq(mediaAssets.id, current.mediaId),
                eq(productionMedia.productionId, current.targetId),
              ),
            )
            .limit(1);
          if (!linkedMedia[0]) {
            throw new HttpProblem(
              404,
              "CONTENT_REPORT_MEDIA_NOT_FOUND",
              "L’affiche concernée est introuvable.",
            );
          }
          const now = new Date();
          await transaction
            .update(mediaAssets)
            .set({ isActive: false, updatedAt: now })
            .where(eq(mediaAssets.id, current.mediaId));
          await transaction
            .update(communitySubmissions)
            .set({
              moderationHistory: sql`${communitySubmissions.moderationHistory} || ${JSON.stringify(
                [
                  {
                    at: now.toISOString(),
                    by: userId,
                    action: "hide_media",
                    reason: input.decision,
                  },
                ],
              )}::jsonb`,
              reviewedBy: userId,
              reviewedAt: now,
              updatedAt: now,
            })
            .where(eq(communitySubmissions.mediaId, current.mediaId));
        } else if (input.contentAction === "hide") {
          if (current.targetType === "production") {
            const now = new Date();
            const hidden = await transaction
              .update(productions)
              .set({
                publicationStatus: "hidden",
                reviewedAt: now,
                reviewedBy: userId,
                updatedAt: now,
              })
              .where(eq(productions.id, current.targetId))
              .returning({ id: productions.id });
            if (!hidden[0]) {
              throw new HttpProblem(
                404,
                "CONTENT_REPORT_TARGET_NOT_FOUND",
                "Le spectacle concerné est introuvable.",
              );
            }
            await transaction
              .update(communitySubmissions)
              .set({
                status: "hidden",
                moderationHistory: sql`${communitySubmissions.moderationHistory} || ${JSON.stringify(
                  [
                    {
                      at: now.toISOString(),
                      by: userId,
                      action: "hide_production",
                      reason: input.decision,
                    },
                  ],
                )}::jsonb`,
                reviewedBy: userId,
                reviewedAt: now,
                updatedAt: now,
              })
              .where(eq(communitySubmissions.productionId, current.targetId));
          } else if (current.targetType === "company") {
            const hidden = await transaction
              .update(companies)
              .set({
                publicationStatus: "hidden",
                reviewedAt: new Date(),
                reviewedBy: userId,
                updatedAt: new Date(),
              })
              .where(eq(companies.id, current.targetId))
              .returning({ id: companies.id });
            if (!hidden[0]) {
              throw new HttpProblem(
                404,
                "CONTENT_REPORT_TARGET_NOT_FOUND",
                "La compagnie concernée est introuvable.",
              );
            }
            await transaction
              .update(productions)
              .set({
                publicationStatus: "draft",
                reviewedAt: null,
                reviewedBy: null,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(productions.publicationStatus, "published"),
                  sql<boolean>`exists (
                    select 1
                    from ${productionCompanies}
                    where ${productionCompanies.productionId} = ${productions.id}
                      and ${productionCompanies.companyId} = ${current.targetId}
                      and ${productionCompanies.isPrimary} = true
                  )`,
                ),
              );
          } else if (current.targetType === "venue") {
            const communityVenue = await transaction
              .select({ id: venues.id })
              .from(venues)
              .innerJoin(venueSources, eq(venueSources.entityId, venues.id))
              .innerJoin(
                sourceDocuments,
                eq(sourceDocuments.id, venueSources.documentId),
              )
              .innerJoin(
                catalogSources,
                eq(catalogSources.id, sourceDocuments.sourceId),
              )
              .where(
                and(
                  eq(venues.id, current.targetId),
                  eq(catalogSources.connectorKind, "community"),
                ),
              )
              .limit(1);
            if (!communityVenue[0]) {
              throw new HttpProblem(
                400,
                "CONTENT_REPORT_TARGET_NOT_HIDEABLE",
                "Seuls les lieux créés par la communauté peuvent être masqués ici.",
              );
            }
            await transaction
              .update(venues)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(venues.id, current.targetId));
          } else if (current.targetType === "review") {
            const hidden = await transaction
              .update(reviews)
              .set({ status: "hidden", updatedAt: new Date() })
              .where(eq(reviews.id, current.targetId))
              .returning({ id: reviews.id });
            if (!hidden[0]) {
              throw new HttpProblem(
                404,
                "CONTENT_REPORT_TARGET_NOT_FOUND",
                "L’avis concerné est introuvable.",
              );
            }
          } else {
            throw new HttpProblem(
              400,
              "CONTENT_REPORT_TARGET_NOT_HIDEABLE",
              "Ce type de contenu doit être corrigé sans masquage automatique.",
            );
          }
        }

        const terminal = status === "resolved" || status === "dismissed";
        const rows = await transaction
          .update(contentReports)
          .set({
            status,
            decision: input.decision,
            reviewedBy: userId,
            reviewedAt: terminal ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(contentReports.id, reportId))
          .returning({
            id: contentReports.id,
            targetType: contentReports.targetType,
            targetId: contentReports.targetId,
            category: contentReports.category,
            mediaId: contentReports.mediaId,
            reason: contentReports.reason,
            status: contentReports.status,
            decision: contentReports.decision,
            submittedAt: contentReports.createdAt,
            reviewedAt: contentReports.reviewedAt,
          });
        return rows[0]!;
      });
      return serializeContentReport(report);
    },

    async createClaim(
      userId: string,
      companyId: string,
      input: CreateCompanyClaimBody,
    ): Promise<CompanyClaim> {
      const companyRows = await database
        .select({ id: companies.id, name: companies.name, slug: companies.slug })
        .from(companies)
        .where(
          and(
            eq(companies.id, companyId),
            eq(companies.publicationStatus, "published"),
          ),
        )
        .limit(1);
      const company = companyRows[0];
      if (!company) {
        throw new HttpProblem(
          404,
          "COMPANY_NOT_FOUND",
          "Cette compagnie est introuvable.",
        );
      }
      const [membershipRows, activeRows] = await Promise.all([
        database
          .select({ companyId: companyMemberships.companyId })
          .from(companyMemberships)
          .where(eq(companyMemberships.userId, userId))
          .limit(1),
        database
          .select({
            companyId: companyClaims.companyId,
            id: companyClaims.id,
          })
          .from(companyClaims)
          .where(
            and(
              eq(companyClaims.userId, userId),
              inArray(companyClaims.status, ["pending", "approved"]),
            ),
          )
          .limit(1),
      ]);
      if (membershipRows[0]) {
        throw new HttpProblem(
          409,
          "COMPANY_MEMBERSHIP_ALREADY_EXISTS",
          membershipRows[0].companyId === companyId
            ? "Votre compte représente déjà cette compagnie."
            : "Un compte professionnel ne peut représenter qu’une seule compagnie pendant le pilote.",
        );
      }
      if (activeRows[0]) {
        throw new HttpProblem(
          409,
          "CLAIM_ALREADY_ACTIVE",
          activeRows[0].companyId === companyId
            ? "Une demande active existe déjà pour cette compagnie."
            : "Une seule revendication peut être active par compte pendant le pilote.",
        );
      }
      const rows = await database
        .insert(companyClaims)
        .values({ companyId, userId, ...input })
        .onConflictDoNothing()
        .returning();
      const claim = rows[0];
      if (!claim) {
        throw new HttpProblem(
          409,
          "CLAIM_ALREADY_ACTIVE",
          "Une seule revendication peut être active par compte pendant le pilote.",
        );
      }
      return {
        id: claim.id,
        companyId,
        companyName: company.name,
        companySlug: company.slug,
        representativeName: claim.representativeName,
        roleTitle: claim.roleTitle,
        professionalEmail: claim.professionalEmail,
        officialWebsiteUrl: claim.officialWebsiteUrl,
        evidence: claim.evidence,
        authorityConfirmed: true,
        status: claim.status,
        decisionReason: claim.decisionReason,
        submittedAt: claim.createdAt.toISOString(),
        reviewedAt: claim.reviewedAt?.toISOString() ?? null,
      };
    },

    async listClaims(
      userId: string,
      moderation = false,
      status: "pending" | "approved" | "rejected" | "revoked" | "all" = "pending",
    ): Promise<CompanyClaim[]> {
      if (moderation) await assertModerator(userId);
      const rows = await database
        .select({
          id: companyClaims.id,
          companyId: companyClaims.companyId,
          companyName: companies.name,
          companySlug: companies.slug,
          representativeName: companyClaims.representativeName,
          roleTitle: companyClaims.roleTitle,
          professionalEmail: companyClaims.professionalEmail,
          officialWebsiteUrl: companyClaims.officialWebsiteUrl,
          evidence: companyClaims.evidence,
          authorityConfirmed: companyClaims.authorityConfirmed,
          status: companyClaims.status,
          decisionReason: companyClaims.decisionReason,
          submittedAt: companyClaims.createdAt,
          reviewedAt: companyClaims.reviewedAt,
        })
        .from(companyClaims)
        .innerJoin(companies, eq(companies.id, companyClaims.companyId))
        .where(
          moderation
            ? status === "all"
              ? undefined
              : eq(companyClaims.status, status)
            : eq(companyClaims.userId, userId),
        )
        .orderBy(desc(companyClaims.createdAt));
      return rows.map((claim) => ({
        ...claim,
        authorityConfirmed: true,
        submittedAt: claim.submittedAt.toISOString(),
        reviewedAt: claim.reviewedAt?.toISOString() ?? null,
      }));
    },

    async listMemberships(userId: string): Promise<CompanyMembership[]> {
      return database
        .select({
          companyId: companies.id,
          companyName: companies.name,
          companySlug: companies.slug,
          role: companyMemberships.role,
          roleTitle: companyMemberships.roleTitle,
        })
        .from(companyMemberships)
        .innerJoin(companies, eq(companies.id, companyMemberships.companyId))
        .where(eq(companyMemberships.userId, userId))
        .orderBy(asc(companies.name));
    },

    async listEditableProductions(
      userId: string,
      companyId: string,
    ): Promise<EditableProductionSummary[]> {
      await assertMembership(userId, companyId);
      return database
        .select({
          id: productions.id,
          slug: productions.slug,
          title: productions.title,
          discipline: productions.discipline,
          audience: productions.audience,
          minimumAge: productions.minimumAge,
          publicationStatus: productions.publicationStatus,
        })
        .from(productions)
        .innerJoin(
          productionCompanies,
          eq(productionCompanies.productionId, productions.id),
        )
        .where(eq(productionCompanies.companyId, companyId))
        .orderBy(asc(productions.title));
    },

    async getEditableProductionSlug(
      userId: string,
      companyId: string,
      productionId: string,
    ): Promise<string> {
      await assertMembership(userId, companyId);
      await assertTargetBelongsToCompany(companyId, "production", productionId);
      const rows = await database
        .select({ slug: productions.slug })
        .from(productions)
        .where(and(eq(productions.id, productionId), eq(productions.isActive, true)))
        .limit(1);
      const production = rows[0];
      if (!production) {
        throw new HttpProblem(
          404,
          "PRODUCTION_NOT_FOUND",
          "Ce spectacle n’est pas disponible dans l’espace professionnel.",
        );
      }
      return production.slug;
    },

    async getEditableProductionMedia(
      userId: string,
      companyId: string,
      productionId: string,
    ): Promise<EditableMediaAsset[]> {
      await assertMembership(userId, companyId);
      await assertTargetBelongsToCompany(companyId, "production", productionId);
      const rows = await database
        .select({
          id: mediaAssets.id,
          remoteUrl: mediaAssets.remoteUrl,
          kind: mediaAssets.kind,
          alt: mediaAssets.alt,
          credit: mediaAssets.credit,
          copyrightHolder: mediaAssets.copyrightHolder,
          rightsStatus: mediaAssets.rightsStatus,
          storagePolicy: mediaAssets.storagePolicy,
          termsUrl: mediaAssets.termsUrl,
          sourceUrl: sourceDocuments.url,
          license: mediaAssets.license,
          validUntil: mediaAssets.validUntil,
          isPrimary: productionMedia.isPrimary,
          position: productionMedia.position,
        })
        .from(productionMedia)
        .innerJoin(mediaAssets, eq(mediaAssets.id, productionMedia.mediaId))
        .innerJoin(sourceDocuments, eq(sourceDocuments.id, mediaAssets.documentId))
        .where(
          and(
            eq(productionMedia.productionId, productionId),
            eq(mediaAssets.isActive, true),
            inArray(mediaAssets.rightsStatus, [
              "permission_granted",
              "open_license",
              "contractual_display",
              "hotlink_only",
              "todam_original",
            ]),
            inArray(mediaAssets.storagePolicy, ["hotlink", "mirror"]),
          ),
        )
        .orderBy(desc(productionMedia.isPrimary), asc(productionMedia.position));
      return rows.map((row) => ({
        id: row.id,
        remoteUrl: row.remoteUrl,
        kind: row.kind,
        alt: row.alt,
        credit: row.credit,
        copyrightHolder: row.copyrightHolder,
        rightsStatus: editableMediaRightsStatus(row.rightsStatus),
        storagePolicy: editableMediaStoragePolicy(row.storagePolicy),
        termsUrl: row.termsUrl ?? row.sourceUrl,
        license: row.license,
        validUntil: row.validUntil?.toISOString() ?? null,
        isPrimary: row.isPrimary,
        position: row.position,
      }));
    },

    async createDraftProduction(
      userId: string,
      companyId: string,
      input: CreateCompanyProductionBody,
    ): Promise<EditableProductionSummary> {
      await assertMembership(userId, companyId);
      const slugBase = safeSlug(input.title) || "nouveau-spectacle";
      const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
      const inserted = await database.transaction(async (transaction) => {
        const rows = await transaction
          .insert(productions)
          .values({
            slug: `${slugBase}-${suffix}`,
            title: input.title.trim(),
            discipline: input.discipline,
            audience: input.audience,
            minimumAge: input.minimumAge,
            officialUrl: input.officialUrl,
            publicationStatus: "draft",
          })
          .returning({
            id: productions.id,
            slug: productions.slug,
            title: productions.title,
            discipline: productions.discipline,
            audience: productions.audience,
            minimumAge: productions.minimumAge,
            publicationStatus: productions.publicationStatus,
          });
        const production = rows[0]!;
        await transaction.insert(productionCompanies).values({
          productionId: production.id,
          companyId,
          isPrimary: true,
          position: 0,
        });
        return production;
      });
      return inserted;
    },

    async moderateClaim(
      reviewerId: string,
      claimId: string,
      decision: "approved" | "rejected" | "revoked",
      input: ModerateClaimBody,
    ): Promise<CompanyClaim> {
      await assertModerator(reviewerId);
      await database.transaction(async (transaction) => {
        const rows = await transaction
          .select()
          .from(companyClaims)
          .where(eq(companyClaims.id, claimId))
          .for("update")
          .limit(1);
        const claim = rows[0];
        if (!claim) {
          throw new HttpProblem(
            404,
            "CLAIM_NOT_FOUND",
            "Cette demande est introuvable.",
          );
        }
        if (decision !== "revoked" && claim.status !== "pending") {
          throw new HttpProblem(
            409,
            "CLAIM_NOT_PENDING",
            "Cette demande a déjà été traitée.",
          );
        }
        if (decision === "revoked" && claim.status !== "approved") {
          throw new HttpProblem(
            409,
            "CLAIM_NOT_APPROVED",
            "Seule une revendication approuvée peut être révoquée.",
          );
        }
        await transaction
          .update(companyClaims)
          .set({
            status: decision,
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            decisionReason: input.decisionReason,
            updatedAt: new Date(),
          })
          .where(eq(companyClaims.id, claimId));
        if (decision === "approved") {
          await transaction
            .select({ id: user.id })
            .from(user)
            .where(eq(user.id, claim.userId))
            .for("update")
            .limit(1);
          const existingMembership = await transaction
            .select({ companyId: companyMemberships.companyId })
            .from(companyMemberships)
            .where(eq(companyMemberships.userId, claim.userId))
            .limit(1);
          if (
            existingMembership[0] &&
            existingMembership[0].companyId !== claim.companyId
          ) {
            throw new HttpProblem(
              409,
              "COMPANY_MEMBERSHIP_ALREADY_EXISTS",
              "Ce compte représente déjà une autre compagnie pendant le pilote.",
            );
          }
          await transaction
            .insert(companyMemberships)
            .values({
              companyId: claim.companyId,
              userId: claim.userId,
              role: input.membershipRole,
              roleTitle: claim.roleTitle,
              createdBy: reviewerId,
            })
            .onConflictDoUpdate({
              target: [companyMemberships.companyId, companyMemberships.userId],
              set: {
                role: input.membershipRole,
                roleTitle: claim.roleTitle,
                createdBy: reviewerId,
              },
            });
        } else if (decision === "revoked") {
          await transaction
            .delete(companyMemberships)
            .where(
              and(
                eq(companyMemberships.companyId, claim.companyId),
                eq(companyMemberships.userId, claim.userId),
              ),
            );
        }
      });
      const all = await this.listClaims(reviewerId, true);
      const moderated = all.find((claim) => claim.id === claimId);
      if (moderated) return moderated;
      const rows = await database
        .select({
          id: companyClaims.id,
          companyId: companyClaims.companyId,
          companyName: companies.name,
          companySlug: companies.slug,
          representativeName: companyClaims.representativeName,
          roleTitle: companyClaims.roleTitle,
          professionalEmail: companyClaims.professionalEmail,
          officialWebsiteUrl: companyClaims.officialWebsiteUrl,
          evidence: companyClaims.evidence,
          authorityConfirmed: companyClaims.authorityConfirmed,
          status: companyClaims.status,
          decisionReason: companyClaims.decisionReason,
          submittedAt: companyClaims.createdAt,
          reviewedAt: companyClaims.reviewedAt,
        })
        .from(companyClaims)
        .innerJoin(companies, eq(companies.id, companyClaims.companyId))
        .where(eq(companyClaims.id, claimId))
        .limit(1);
      const claim = rows[0]!;
      return {
        ...claim,
        authorityConfirmed: true,
        submittedAt: claim.submittedAt.toISOString(),
        reviewedAt: claim.reviewedAt?.toISOString() ?? null,
      };
    },

    async createRevision(
      userId: string,
      companyId: string,
      input: CreateCatalogRevisionBody,
    ): Promise<CatalogRevision> {
      await assertMembership(userId, companyId);
      await assertTargetBelongsToCompany(companyId, input.targetType, input.targetId);
      assertAllowedChanges(input.targetType, input.changes);
      const revisionId = await database.transaction(async (transaction) => {
        await lockRevisionTarget(transaction, input.targetType, input.targetId);
        const rows = await transaction
          .insert(catalogRevisions)
          .values({
            companyId,
            authorUserId: userId,
            targetType: input.targetType,
            targetId: input.targetId,
            justification: input.justification,
          })
          .returning({ id: catalogRevisions.id });
        const id = rows[0]!.id;
        await replaceRevisionChanges(
          transaction,
          id,
          input.targetType,
          input.targetId,
          input.changes,
        );
        return id;
      });
      return getRevision(revisionId);
    },

    async updateRevision(
      userId: string,
      revisionId: string,
      input: UpdateCatalogRevisionBody,
    ): Promise<CatalogRevision> {
      const revision = await getRevision(revisionId);
      await assertMembership(userId, revision.companyId);
      if (revision.status !== "draft") {
        throw new HttpProblem(
          409,
          "REVISION_NOT_EDITABLE",
          "Seule une révision brouillon peut être modifiée.",
        );
      }
      await database.transaction(async (transaction) => {
        const lockedRows = await transaction
          .select({ status: catalogRevisions.status })
          .from(catalogRevisions)
          .where(eq(catalogRevisions.id, revisionId))
          .for("update")
          .limit(1);
        if (lockedRows[0]?.status !== "draft") {
          throw new HttpProblem(
            409,
            "REVISION_NOT_EDITABLE",
            "Cette révision n’est plus modifiable.",
          );
        }
        await lockRevisionTarget(transaction, revision.targetType, revision.targetId);
        await transaction
          .update(catalogRevisions)
          .set({
            ...(input.justification !== undefined
              ? { justification: input.justification }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(catalogRevisions.id, revisionId));
        await replaceRevisionChanges(
          transaction,
          revisionId,
          revision.targetType,
          revision.targetId,
          input.changes,
        );
      });
      return getRevision(revisionId);
    },

    async submitRevision(userId: string, revisionId: string): Promise<CatalogRevision> {
      const revision = await getRevision(revisionId);
      await assertMembership(userId, revision.companyId);
      if (revision.status !== "draft") {
        throw new HttpProblem(
          409,
          "REVISION_NOT_SUBMITTABLE",
          "Cette révision n’est plus un brouillon.",
        );
      }
      await database.transaction(async (transaction) => {
        const lockedRows = await transaction
          .select({ status: catalogRevisions.status })
          .from(catalogRevisions)
          .where(eq(catalogRevisions.id, revisionId))
          .for("update")
          .limit(1);
        if (lockedRows[0]?.status !== "draft") {
          throw new HttpProblem(
            409,
            "REVISION_NOT_SUBMITTABLE",
            "Cette révision n’est plus un brouillon.",
          );
        }
        await transaction
          .update(catalogRevisions)
          .set({
            status: "submitted",
            submittedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(catalogRevisions.id, revisionId));
      });
      return getRevision(revisionId);
    },

    async listRevisions(
      userId: string,
      moderation = false,
      status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "superseded"
        | "all" = "submitted",
    ): Promise<CatalogRevision[]> {
      if (moderation) await assertModerator(userId);
      const rows = moderation
        ? await database
            .select({ id: catalogRevisions.id })
            .from(catalogRevisions)
            .where(status === "all" ? undefined : eq(catalogRevisions.status, status))
            .orderBy(asc(catalogRevisions.submittedAt))
        : await database
            .selectDistinct({ id: catalogRevisions.id })
            .from(catalogRevisions)
            .innerJoin(
              companyMemberships,
              eq(companyMemberships.companyId, catalogRevisions.companyId),
            )
            .where(eq(companyMemberships.userId, userId))
            .orderBy(desc(catalogRevisions.updatedAt));
      return Promise.all(rows.map((row) => getRevision(row.id)));
    },

    async getRevisionForMember(
      userId: string,
      revisionId: string,
    ): Promise<CatalogRevision> {
      const revision = await getRevision(revisionId);
      await assertMembership(userId, revision.companyId);
      return revision;
    },

    async reviewRevision(
      reviewerId: string,
      revisionId: string,
      decision: "approved" | "rejected",
      input: ReviewRevisionBody,
    ): Promise<CatalogRevision> {
      await assertModerator(reviewerId);
      const revision = await getRevision(revisionId);
      if (revision.status !== "submitted") {
        throw new HttpProblem(
          409,
          "REVISION_NOT_SUBMITTED",
          "Cette révision n’est pas en attente de validation.",
        );
      }
      await database.transaction(async (transaction) => {
        const lockedRevisionRows = await transaction
          .select({ status: catalogRevisions.status })
          .from(catalogRevisions)
          .where(eq(catalogRevisions.id, revision.id))
          .for("update")
          .limit(1);
        if (lockedRevisionRows[0]?.status !== "submitted") {
          throw new HttpProblem(
            409,
            "REVISION_NOT_SUBMITTED",
            "Cette révision a déjà été traitée.",
          );
        }
        if (decision === "approved") {
          await lockRevisionTarget(transaction, revision.targetType, revision.targetId);
          await assertRevisionFresh(transaction, revision);
          await applyChanges(
            transaction,
            revision.id,
            revision.targetType,
            revision.targetId,
            revision.changes,
          );
          await attachRevisionProvenance(
            transaction,
            revision.id,
            revision.targetType,
            revision.targetId,
            revision.changes,
          );
          if (revision.targetType === "company") {
            await assertCompanyReadyForPublication(transaction, revision.targetId);
            await transaction
              .update(companies)
              .set({
                publicationStatus: "published",
                reviewedAt: new Date(),
                reviewedBy: reviewerId,
                updatedAt: new Date(),
              })
              .where(eq(companies.id, revision.targetId));
          } else {
            await assertProductionReadyForPublication(transaction, revision.targetId);
            await transaction
              .update(productions)
              .set({
                publicationStatus: "published",
                reviewedAt: new Date(),
                reviewedBy: reviewerId,
                updatedAt: new Date(),
              })
              .where(eq(productions.id, revision.targetId));
          }
          await transaction
            .update(catalogRevisions)
            .set({ status: "superseded", updatedAt: new Date() })
            .where(
              and(
                eq(catalogRevisions.targetType, revision.targetType),
                eq(catalogRevisions.targetId, revision.targetId),
                eq(catalogRevisions.status, "approved"),
                sql<boolean>`${catalogRevisions.id} <> ${revision.id}`,
              ),
            );
        }
        await transaction
          .update(catalogRevisions)
          .set({
            status: decision,
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            decisionReason: input.decisionReason,
            updatedAt: new Date(),
          })
          .where(eq(catalogRevisions.id, revision.id));
      });
      return getRevision(revisionId);
    },

    async restoreRevision(
      reviewerId: string,
      revisionId: string,
      input: ReviewRevisionBody,
    ): Promise<CatalogRevision> {
      await assertModerator(reviewerId);
      const sourceRevision = await getRevision(revisionId);
      if (!["approved", "superseded"].includes(sourceRevision.status)) {
        throw new HttpProblem(
          409,
          "REVISION_NOT_RESTORABLE",
          "Seule une version précédemment approuvée peut être restaurée.",
        );
      }
      const restoredId = await database.transaction(async (transaction) => {
        await lockRevisionTarget(
          transaction,
          sourceRevision.targetType,
          sourceRevision.targetId,
        );
        const snapshot = await readSnapshot(
          transaction,
          sourceRevision.targetType,
          sourceRevision.targetId,
          sourceRevision.changes.map((change) => change.field),
        );
        const rows = await transaction
          .insert(catalogRevisions)
          .values({
            companyId: sourceRevision.companyId,
            authorUserId: reviewerId,
            targetType: sourceRevision.targetType,
            targetId: sourceRevision.targetId,
            status: "approved",
            justification: `Restauration de la révision ${sourceRevision.id}`,
            submittedAt: new Date(),
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            decisionReason: input.decisionReason,
          })
          .returning({ id: catalogRevisions.id });
        const id = rows[0]!.id;
        const undoCurrentRevision = sourceRevision.status === "approved";
        const restoredChanges = sourceRevision.changes.map((change) => ({
          revisionId: id,
          field: change.field,
          oldValue: snapshot.get(change.field) ?? null,
          newValue: undoCurrentRevision ? change.oldValue : change.newValue,
          provenanceUrl: change.provenanceUrl,
          rightsStatus: change.rightsStatus,
        }));
        await transaction.insert(catalogRevisionChanges).values(restoredChanges);
        await applyChanges(
          transaction,
          id,
          sourceRevision.targetType,
          sourceRevision.targetId,
          restoredChanges.map((change, index) => ({
            id: `${sourceRevision.changes[index]!.id}`,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            provenanceUrl: change.provenanceUrl,
            rightsStatus: change.rightsStatus,
          })),
          { allowStaleMediaReferences: true },
        );
        await attachRevisionProvenance(
          transaction,
          id,
          sourceRevision.targetType,
          sourceRevision.targetId,
          restoredChanges.map((change, index) => ({
            id: `${sourceRevision.changes[index]!.id}`,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            provenanceUrl: change.provenanceUrl,
            rightsStatus: change.rightsStatus,
          })),
        );
        if (sourceRevision.targetType === "production") {
          await assertProductionReadyForPublication(
            transaction,
            sourceRevision.targetId,
          );
          await transaction
            .update(productions)
            .set({
              publicationStatus: "published",
              reviewedAt: new Date(),
              reviewedBy: reviewerId,
              updatedAt: new Date(),
            })
            .where(eq(productions.id, sourceRevision.targetId));
        } else {
          await assertCompanyReadyForPublication(transaction, sourceRevision.targetId);
          await transaction
            .update(companies)
            .set({
              publicationStatus: "published",
              reviewedAt: new Date(),
              reviewedBy: reviewerId,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, sourceRevision.targetId));
        }
        await transaction
          .update(catalogRevisions)
          .set({ status: "superseded", updatedAt: new Date() })
          .where(
            and(
              eq(catalogRevisions.targetType, sourceRevision.targetType),
              eq(catalogRevisions.targetId, sourceRevision.targetId),
              eq(catalogRevisions.status, "approved"),
              sql<boolean>`${catalogRevisions.id} <> ${id}`,
            ),
          );
        return id;
      });
      return getRevision(restoredId);
    },
  };
}

export type ProfessionalService = ReturnType<typeof createProfessionalService>;

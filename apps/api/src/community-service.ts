import { randomUUID } from "node:crypto";

import type {
  CommunityProductionCreated,
  CreateCommunityProductionBody,
} from "@todam/contracts";
import {
  catalogSources,
  communitySubmissions,
  companies,
  companySources,
  mediaAssets,
  performanceSources,
  performances,
  productionCompanies,
  productionDescriptions,
  productionMedia,
  productionSources,
  productions,
  sourceDocuments,
  user,
  venues,
  venueSources,
  type TodamDatabase,
} from "@todam/database";
import { and, eq, sql } from "drizzle-orm";

import type {
  CommunityMediaService,
  CommunityPosterFile,
  PreparedCommunityPoster,
} from "./community-media.js";
import { HttpProblem } from "./errors.js";

type DatabaseTransaction = Parameters<Parameters<TodamDatabase["transaction"]>[0]>[0];

function safeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function uniqueSlug(value: string, fallback: string): string {
  return `${safeSlug(value) || fallback}-${randomUUID().slice(0, 8)}`;
}

function normalizedIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, "");
}

async function communitySource(transaction: DatabaseTransaction) {
  await transaction
    .insert(catalogSources)
    .values({
      externalKey: "community",
      name: "Contributions communautaires Todam",
      homepageUrl: `${process.env.WEB_APP_URL ?? "http://localhost:8081"}/politique-editoriale`,
      connectorKind: "community",
      defaultMediaPolicy: "hotlink",
      enabled: true,
    })
    .onConflictDoNothing({ target: catalogSources.externalKey });
  const rows = await transaction
    .select({ id: catalogSources.id })
    .from(catalogSources)
    .where(eq(catalogSources.externalKey, "community"))
    .limit(1);
  return rows[0]!.id;
}

async function createSourceDocument(
  transaction: DatabaseTransaction,
  sourceId: string,
  title: string,
  url: string,
) {
  const rows = await transaction
    .insert(sourceDocuments)
    .values({
      sourceId,
      externalKey: randomUUID(),
      title,
      url,
      retrievedAt: new Date(),
      rightsStatus: "community_submission",
    })
    .returning({ id: sourceDocuments.id });
  return rows[0]!.id;
}

async function resolveCompany(
  transaction: DatabaseTransaction,
  input: CreateCommunityProductionBody["company"],
  sourceDocumentId: string,
) {
  if (input.mode === "existing") {
    const rows = await transaction
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(
        and(eq(companies.id, input.id), eq(companies.publicationStatus, "published")),
      )
      .limit(1);
    if (!rows[0]) {
      throw new HttpProblem(
        404,
        "COMMUNITY_COMPANY_NOT_FOUND",
        "Cette compagnie est introuvable.",
      );
    }
    return rows[0];
  }

  const existing = await transaction
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(
      and(
        eq(companies.publicationStatus, "published"),
        sql<boolean>`regexp_replace(lower(unaccent(${companies.name})), '[^a-z0-9]+', '', 'g') =
          regexp_replace(lower(unaccent(${input.name})), '[^a-z0-9]+', '', 'g')`,
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  const rows = await transaction
    .insert(companies)
    .values({
      slug: uniqueSlug(input.name, "compagnie"),
      name: input.name,
      officialUrl: input.officialUrl,
      publicationStatus: "published",
    })
    .returning({ id: companies.id, name: companies.name });
  await transaction.insert(companySources).values({
    entityId: rows[0]!.id,
    documentId: sourceDocumentId,
    externalKey: randomUUID(),
  });
  return rows[0]!;
}

async function resolveVenue(
  transaction: DatabaseTransaction,
  input: CreateCommunityProductionBody["performances"][number]["venue"],
  sourceDocumentId: string,
) {
  if (input.mode === "existing") {
    const rows = await transaction
      .select({ id: venues.id })
      .from(venues)
      .where(and(eq(venues.id, input.id), eq(venues.isActive, true)))
      .limit(1);
    if (!rows[0]) {
      throw new HttpProblem(
        404,
        "COMMUNITY_VENUE_NOT_FOUND",
        "Ce lieu est introuvable.",
      );
    }
    return rows[0].id;
  }

  const existing = await transaction
    .select({ id: venues.id })
    .from(venues)
    .where(
      and(
        eq(venues.isActive, true),
        sql<boolean>`regexp_replace(lower(unaccent(${venues.name})), '[^a-z0-9]+', '', 'g') =
          regexp_replace(lower(unaccent(${input.name})), '[^a-z0-9]+', '', 'g')`,
        sql<boolean>`lower(btrim(${venues.postalCode})) = lower(btrim(${input.postalCode}))`,
        sql<boolean>`lower(unaccent(btrim(${venues.locality}))) =
          lower(unaccent(btrim(${input.locality})))`,
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0].id;

  const rows = await transaction
    .insert(venues)
    .values({
      slug: uniqueSlug(input.name, "lieu"),
      name: input.name,
      addressLine1: input.addressLine1,
      postalCode: input.postalCode,
      locality: input.locality,
      countryCode: input.countryCode,
      timezone: input.timezone,
      officialUrl: input.officialUrl,
      isActive: true,
    })
    .returning({ id: venues.id });
  await transaction.insert(venueSources).values({
    entityId: rows[0]!.id,
    documentId: sourceDocumentId,
    externalKey: randomUUID(),
  });
  return rows[0]!.id;
}

async function assertNoExactDuplicate(
  transaction: DatabaseTransaction,
  title: string,
  companyName: string,
) {
  const duplicate = await transaction.execute<{ id: string; slug: string }>(sql`
    select duplicate.id::text, duplicate.slug
    from ${productions} duplicate
    join ${productionCompanies} duplicate_link
      on duplicate_link.production_id = duplicate.id
     and duplicate_link.is_primary = true
    join ${companies} duplicate_company
      on duplicate_company.id = duplicate_link.company_id
    where duplicate.is_active = true
      and duplicate.publication_status <> 'hidden'
      and regexp_replace(lower(unaccent(duplicate.title)), '[^a-z0-9]+', '', 'g') =
        regexp_replace(lower(unaccent(${title})), '[^a-z0-9]+', '', 'g')
      and regexp_replace(lower(unaccent(duplicate_company.name)), '[^a-z0-9]+', '', 'g') =
        regexp_replace(lower(unaccent(${companyName})), '[^a-z0-9]+', '', 'g')
    limit 1
  `);
  if (duplicate.rows[0]) {
    throw new HttpProblem(
      409,
      "COMMUNITY_PRODUCTION_DUPLICATE",
      `Ce spectacle existe déjà dans Todam (${duplicate.rows[0].slug}).`,
    );
  }
}

export function createCommunityService(
  database: TodamDatabase,
  mediaService: CommunityMediaService,
) {
  return {
    async createProduction(
      userId: string,
      input: CreateCommunityProductionBody,
      posterFile?: CommunityPosterFile,
    ): Promise<CommunityProductionCreated> {
      const identity = await database
        .select({ emailVerified: user.emailVerified })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (!identity[0]) {
        throw new HttpProblem(
          401,
          "AUTHENTICATION_REQUIRED",
          "Connectez-vous pour ajouter un spectacle.",
        );
      }
      if (!identity[0].emailVerified) {
        throw new HttpProblem(
          403,
          "EMAIL_VERIFICATION_REQUIRED",
          "Vérifiez votre adresse e-mail avant d’ajouter un spectacle.",
        );
      }
      if (posterFile && input.poster) {
        throw new HttpProblem(
          400,
          "COMMUNITY_POSTER_INPUT_CONFLICT",
          "Choisissez une URL d’affiche ou un fichier, pas les deux.",
        );
      }

      let preparedPoster: PreparedCommunityPoster | undefined;
      if (posterFile) {
        preparedPoster = await mediaService.prepareUploadedPoster(posterFile);
      } else if (input.poster) {
        preparedPoster = await mediaService.prepareRemotePoster(
          input.poster.url,
          input.poster.credit,
        );
      }

      try {
        return await database.transaction(async (transaction) => {
          const sourceId = await communitySource(transaction);
          const sourceDocumentId = await createSourceDocument(
            transaction,
            sourceId,
            `Contribution communautaire : ${input.title}`,
            input.officialUrl,
          );
          const company = await resolveCompany(
            transaction,
            input.company,
            sourceDocumentId,
          );
          await transaction.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(
              ${`${normalizedIdentity(input.title)}:${normalizedIdentity(company.name)}`},
              0
            ))`,
          );
          await assertNoExactDuplicate(transaction, input.title, company.name);

          const productionRows = await transaction
            .insert(productions)
            .values({
              slug: uniqueSlug(input.title, "spectacle"),
              title: input.title,
              discipline: input.discipline,
              audience: input.audience,
              minimumAge: input.minimumAge,
              durationMinutes: input.durationMinutes,
              language: input.language,
              officialUrl: input.officialUrl,
              isActive: true,
              publicationStatus: "published",
            })
            .returning({ id: productions.id, slug: productions.slug });
          const production = productionRows[0]!;

          await transaction.insert(productionCompanies).values({
            productionId: production.id,
            companyId: company.id,
            isPrimary: true,
            position: 0,
          });
          await transaction.insert(productionSources).values({
            entityId: production.id,
            documentId: sourceDocumentId,
            externalKey: randomUUID(),
          });

          if (input.description) {
            await transaction.insert(productionDescriptions).values({
              productionId: production.id,
              locale: "fr",
              kind: "full",
              body: input.description,
              sourceDocumentId,
              sourceUrl: input.officialUrl,
              rightsStatus: "community_submission",
              lastVerifiedAt: new Date(),
            });
          }

          for (const performanceInput of input.performances) {
            const venueId = await resolveVenue(
              transaction,
              performanceInput.venue,
              sourceDocumentId,
            );
            const performanceRows = await transaction
              .insert(performances)
              .values({
                productionId: production.id,
                venueId,
                startsAt: new Date(performanceInput.startsAt),
                endsAt: performanceInput.endsAt
                  ? new Date(performanceInput.endsAt)
                  : null,
                status: "scheduled",
                officialUrl: performanceInput.officialUrl ?? input.officialUrl,
              })
              .returning({ id: performances.id });
            await transaction.insert(performanceSources).values({
              entityId: performanceRows[0]!.id,
              documentId: sourceDocumentId,
              externalKey: randomUUID(),
            });
          }

          let mediaId: string | null = null;
          if (preparedPoster) {
            const posterDocumentId = await createSourceDocument(
              transaction,
              sourceId,
              `Affiche communautaire : ${input.title}`,
              input.poster?.url ?? input.officialUrl,
            );
            const mediaRows = await transaction
              .insert(mediaAssets)
              .values({
                sourceId,
                documentId: posterDocumentId,
                externalKey: randomUUID(),
                kind: "poster",
                remoteUrl: preparedPoster.remoteUrl,
                storageKey: preparedPoster.storageKey,
                sha256: preparedPoster.sha256,
                mirroredAt: preparedPoster.storageKey ? new Date() : null,
                storagePolicy: preparedPoster.storagePolicy,
                alt: `Affiche de ${input.title}`,
                credit: preparedPoster.credit,
                rightsStatus: "community_submission",
                termsUrl: input.officialUrl,
                width: preparedPoster.width,
                height: preparedPoster.height,
                mimeType: preparedPoster.mimeType,
                isActive: true,
              })
              .returning({ id: mediaAssets.id });
            mediaId = mediaRows[0]!.id;
            await transaction.insert(productionMedia).values({
              productionId: production.id,
              mediaId,
              isPrimary: true,
              position: 0,
            });
          }

          const submissionRows = await transaction
            .insert(communitySubmissions)
            .values({
              authorUserId: userId,
              productionId: production.id,
              mediaId,
              sourceUrl: input.officialUrl,
              submittedData: input as unknown as Record<string, unknown>,
              status: "published",
            })
            .returning({ id: communitySubmissions.id });

          return {
            id: production.id,
            slug: production.slug,
            contributionId: submissionRows[0]!.id,
            publicationStatus: "published" as const,
          };
        });
      } catch (error) {
        if (preparedPoster) await preparedPoster.cleanup();
        throw error;
      }
    },
  };
}

export type CommunityService = ReturnType<typeof createCommunityService>;

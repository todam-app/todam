import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
} from "@todam/contracts";
import {
  catalogSources,
  catalogRevisions,
  communitySubmissions,
  companies,
  createDatabase,
  legalAcceptances,
  lists,
  mediaAssets,
  performances,
  productionMedia,
  productions,
  productionCompanies,
  sourceDocuments,
  user,
  venues,
  venueSources,
} from "@todam/database";
import type { EmailSender, TransactionalEmail } from "@todam/domain";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildServer } from "../../src/server.js";

const { db, pool } = createDatabase();
let app: FastifyInstance;
let isolatedDatabase = false;
let productionId: string;
let performanceId: string;
let venueId: string;
const sentEmails: TransactionalEmail[] = [];
const emailSender: EmailSender = {
  async send(message) {
    sentEmails.push(message);
  },
};

async function assertIsolatedDatabase() {
  const result = await pool.query<{ database: string }>(
    "select current_database() as database",
  );
  const database = result.rows[0]?.database ?? "";
  if (!/(test|integration)/iu.test(database)) {
    throw new Error(
      `La base d'intégration doit contenir test ou integration dans son nom : ${database}`,
    );
  }
}

async function cleanDatabase() {
  const tables = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables " +
      "where schemaname = 'public' " +
      "and tablename not in ('__drizzle_migrations', 'spatial_ref_sys')",
  );
  if (tables.rows.length === 0) return;
  const names = tables.rows
    .map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
    .join(", ");
  await pool.query(`truncate table ${names} restart identity cascade`);
}

async function seedCatalog() {
  const [source] = await db
    .insert(catalogSources)
    .values({
      externalKey: "test.muses",
      name: "Théâtre des Muses",
      homepageUrl: "https://www.letheatredesmuses.com/",
    })
    .returning({ id: catalogSources.id });
  const [document] = await db
    .insert(sourceDocuments)
    .values({
      sourceId: source!.id,
      externalKey: "test.production",
      title: "Fiche officielle",
      url: "https://www.letheatredesmuses.com/programme-adulte/",
      retrievedAt: new Date(),
      rightsStatus: "factual_metadata_only",
      license: null,
    })
    .returning({ id: sourceDocuments.id });
  const [venue] = await db
    .insert(venues)
    .values({
      slug: "theatre-des-muses-monaco",
      name: "Théâtre des Muses",
      addressLine1: "45 A, boulevard du Jardin Exotique",
      postalCode: "98000",
      locality: "Monaco",
      countryCode: "MC",
      timezone: "Europe/Monaco",
      coordinates: null,
      officialUrl: "https://www.letheatredesmuses.com/",
    })
    .returning({ id: venues.id });
  await db.insert(venueSources).values({
    entityId: venue!.id,
    documentId: document!.id,
    externalKey: "test.venue",
  });
  venueId = venue!.id;
  const [production] = await db
    .insert(productions)
    .values({
      slug: "reve-elodie-muses-2025",
      title: "Le Rêve d'Élodie",
      discipline: "theatre",
      audience: "family",
      publicationStatus: "published",
      reviewedAt: new Date(),
      language: "français",
    })
    .returning({ id: productions.id });
  productionId = production!.id;
  const [performance] = await db
    .insert(performances)
    .values({
      productionId,
      venueId: venue!.id,
      startsAt: new Date("2025-11-08T13:30:00.000Z"),
      status: "completed",
    })
    .returning({ id: performances.id });
  performanceId = performance!.id;
}

async function signUp(
  email = "spectatrice@example.test",
  username = email.split("@")[0]!,
  remoteAddress?: string,
): Promise<string> {
  sentEmails.length = 0;
  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/sign-up/email",
    ...(remoteAddress ? { remoteAddress } : {}),
    payload: {
      name: username,
      username,
      displayUsername: username,
      email,
      password: "Todam-test-2026",
      age15OrOlder: true,
      termsVersion: CURRENT_TERMS_VERSION,
      privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
      channel: "web",
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.headers["set-cookie"]).toBeFalsy();
  const verificationEmail = sentEmails.find((message) =>
    message.subject.includes("Confirme ton adresse"),
  );
  expect(verificationEmail).toBeTruthy();
  expect(verificationEmail!.html).toContain("Ton journal t’attend.");
  const verificationUrl = verificationEmail!.text.match(/https?:\/\/\S+/)?.[0];
  expect(verificationUrl).toBeTruthy();
  const target = new URL(verificationUrl!);
  const verification = await app.inject({
    method: "GET",
    url: `${target.pathname}${target.search}`,
  });
  expect([200, 302]).toContain(verification.statusCode);
  const welcomeEmail = sentEmails.find((message) =>
    message.subject.includes("Bienvenue sur Todam"),
  );
  expect(welcomeEmail?.html).toContain("Tes documents d’inscription");
  const cookie = verification.headers["set-cookie"];
  expect(cookie).toBeTruthy();
  return Array.isArray(cookie) ? cookie.join("; ") : cookie!;
}

function communityMultipart(
  payload: unknown,
  file?: { contents: Buffer; filename: string; mimeType: string },
) {
  const boundary = `todam-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const chunks: Uint8Array[] = [
    Buffer.from(
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="payload"\r\n' +
        "Content-Type: application/json\r\n\r\n" +
        `${JSON.stringify(payload)}\r\n`,
    ),
  ];
  if (file) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="poster"; filename="${file.filename}"\r\n` +
          `Content-Type: ${file.mimeType}\r\n\r\n`,
      ),
      file.contents,
      Buffer.from("\r\n"),
    );
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.concat(chunks),
  };
}

describe("première boucle API sur PostgreSQL/PostGIS", () => {
  beforeAll(async () => {
    await assertIsolatedDatabase();
    isolatedDatabase = true;
    app = await buildServer({ database: db, emailSender, logger: false });
  });
  beforeEach(async () => {
    await cleanDatabase();
    await seedCatalog();
  });
  afterAll(async () => {
    if (isolatedDatabase) {
      await app.close();
      await cleanDatabase();
    }
    await pool.end();
  });

  it("protège les données personnelles et recherche sans accent", async () => {
    const privateResponse = await app.inject({
      method: "GET",
      url: "/v1/me/dashboard",
    });
    const privateHome = await app.inject({
      method: "GET",
      url: "/v1/me/home",
    });
    const privateShows = await app.inject({
      method: "GET",
      url: "/v1/me/shows?section=seen",
    });
    const privateDiary = await app.inject({
      method: "GET",
      url: `/v1/me/productions/${productionId}/diary`,
    });
    const privateDiaryRemoval = await app.inject({
      method: "DELETE",
      url: `/v1/me/diary/${performanceId}`,
    });
    const searchResponse = await app.inject({
      method: "GET",
      url: "/v1/search?q=Elodie",
    });
    const accentedSearchResponse = await app.inject({
      method: "GET",
      url: `/v1/search?q=${encodeURIComponent("Rêve")}`,
    });

    expect(privateResponse.statusCode).toBe(401);
    expect(privateHome.statusCode).toBe(401);
    expect(privateShows.statusCode).toBe(401);
    expect(privateDiary.statusCode).toBe(401);
    expect(privateDiaryRemoval.statusCode).toBe(401);
    expect(searchResponse.statusCode).toBe(200);
    expect(searchResponse.json().productions[0].title).toBe("Le Rêve d'Élodie");
    expect(accentedSearchResponse.statusCode).toBe(200);
    expect(accentedSearchResponse.json().productions[0].title).toBe("Le Rêve d'Élodie");
  });

  it("publie immédiatement une contribution et bloque le doublon titre-compagnie", async () => {
    const input = {
      title: "Une pédagogie du conflit",
      discipline: "theatre",
      company: {
        mode: "new",
        name: "Compagnie du Conflit",
        officialUrl: "https://compagnie-conflit.example.test",
      },
      officialUrl: "https://festival.example.test/spectacles/pedagogie-conflit",
      performances: [
        {
          startsAt: "2026-07-15T18:00:00.000Z",
          endsAt: "2026-07-15T19:15:00.000Z",
          officialUrl: null,
          venue: {
            mode: "new",
            name: "Théâtre du Test",
            addressLine1: "1 place des Tests",
            postalCode: "84000",
            locality: "Avignon",
            countryCode: "FR",
            timezone: "Europe/Paris",
            officialUrl: "https://theatre-test.example.test",
          },
        },
      ],
      audience: "general",
      minimumAge: null,
      durationMinutes: 75,
      language: "fr",
      description:
        "Une description promotionnelle déjà publiée sur la page officielle.",
      poster: null,
    };

    const anonymous = await app.inject({
      method: "POST",
      url: "/v1/community/productions",
      ...communityMultipart(input),
    });
    expect(anonymous.statusCode).toBe(401);

    const cookie = await signUp(
      "contribution@example.test",
      "contribution-test",
      "127.0.0.81",
    );
    const createdMultipart = communityMultipart(input);
    const created = await app.inject({
      method: "POST",
      url: "/v1/community/productions",
      headers: { ...createdMultipart.headers, cookie },
      payload: createdMultipart.payload,
      remoteAddress: "127.0.0.81",
    });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json()).toMatchObject({ publicationStatus: "published" });

    const detail = await app.inject({
      method: "GET",
      url: `/v1/productions/${created.json().slug}`,
    });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json()).toMatchObject({
      title: input.title,
      company: { name: "Compagnie du Conflit" },
      durationMinutes: 75,
      language: "fr",
    });
    expect(detail.json().descriptions[0]).toMatchObject({
      body: input.description,
      rightsStatus: "community_submission",
    });
    expect(detail.json().performances).toHaveLength(1);

    const submissionRows = await db
      .select()
      .from(communitySubmissions)
      .where(eq(communitySubmissions.id, created.json().contributionId));
    expect(submissionRows[0]).toMatchObject({
      productionId: created.json().id,
      sourceUrl: input.officialUrl,
      status: "published",
    });
    expect(submissionRows[0]?.authorUserId).toBeTruthy();

    const duplicateInput = {
      ...input,
      title: "Une pedagogie du conflit !",
      performances: [
        {
          ...input.performances[0],
          startsAt: "2027-07-15T18:00:00.000Z",
          endsAt: "2027-07-15T19:15:00.000Z",
          venue: {
            ...input.performances[0]!.venue,
            name: "Un autre théâtre",
            addressLine1: "2 place des Tests",
          },
        },
      ],
    };
    const duplicateMultipart = communityMultipart(duplicateInput);
    const duplicate = await app.inject({
      method: "POST",
      url: "/v1/community/productions",
      headers: { ...duplicateMultipart.headers, cookie },
      payload: duplicateMultipart.payload,
      remoteAddress: "127.0.0.81",
    });
    expect(duplicate.statusCode, duplicate.body).toBe(409);
    expect(duplicate.json().code).toBe("COMMUNITY_PRODUCTION_DUPLICATE");

    const reuseInput = {
      ...input,
      title: "Une seconde création",
      company: { mode: "existing", id: detail.json().company.id },
      performances: [
        {
          startsAt: "2026-07-16T18:00:00.000Z",
          endsAt: null,
          officialUrl: null,
          venue: {
            mode: "existing",
            id: detail.json().performances[0].venue.id,
          },
        },
      ],
      description: null,
    };
    const reuseMultipart = communityMultipart(reuseInput);
    const reused = await app.inject({
      method: "POST",
      url: "/v1/community/productions",
      headers: { ...reuseMultipart.headers, cookie },
      payload: reuseMultipart.payload,
      remoteAddress: "127.0.0.81",
    });
    expect(reused.statusCode, reused.body).toBe(201);
    expect(
      await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.name, "Compagnie du Conflit")),
    ).toHaveLength(1);
    expect(
      await db
        .select({ id: venues.id })
        .from(venues)
        .where(eq(venues.name, "Théâtre du Test")),
    ).toHaveLength(1);

    await db.delete(user).where(eq(user.id, submissionRows[0]!.authorUserId!));
    const dissociated = await db
      .select({
        authorUserId: communitySubmissions.authorUserId,
        productionId: communitySubmissions.productionId,
      })
      .from(communitySubmissions)
      .where(eq(communitySubmissions.id, created.json().contributionId));
    expect(dissociated[0]).toEqual({
      authorUserId: null,
      productionId: created.json().id,
    });
    const retainedProduction = await db
      .select({ id: productions.id })
      .from(productions)
      .where(eq(productions.id, created.json().id));
    expect(retainedProduction).toHaveLength(1);
  });

  it("refuse les affiches dangereuses ou invalides sans créer de fiche", async () => {
    const cookie = await signUp(
      "affiche-communaute@example.test",
      "affiche-communaute",
      "127.0.0.82",
    );
    const baseInput = {
      title: "Affiche communautaire test",
      discipline: "opera",
      company: { mode: "new", name: "Compagnie Affiche", officialUrl: null },
      officialUrl: "https://spectacle.example.test/affiche",
      performances: [
        {
          startsAt: "2026-09-10T18:00:00.000Z",
          endsAt: null,
          officialUrl: null,
          venue: { mode: "existing", id: venueId },
        },
      ],
      audience: "general",
      minimumAge: null,
      durationMinutes: null,
      language: null,
      description: null,
      poster: { url: "https://127.0.0.1/affiche.jpg", credit: null },
    };
    const dangerousMultipart = communityMultipart(baseInput);
    const dangerous = await app.inject({
      method: "POST",
      url: "/v1/community/productions",
      headers: { ...dangerousMultipart.headers, cookie },
      payload: dangerousMultipart.payload,
      remoteAddress: "127.0.0.82",
    });
    expect(dangerous.statusCode, dangerous.body).toBe(400);
    expect(dangerous.json().detail).toBe(
      "Le fichier d’affiche ne respecte pas les formats acceptés. Utilisez une image JPEG, PNG ou WebP de 2 Mo maximum et d’au moins 300 px de large.",
    );

    const invalidFileInput = { ...baseInput, poster: null };
    const invalidFileMultipart = communityMultipart(invalidFileInput, {
      contents: Buffer.from("ceci n'est pas une image"),
      filename: "affiche.png",
      mimeType: "image/png",
    });
    const invalidFile = await app.inject({
      method: "POST",
      url: "/v1/community/productions",
      headers: { ...invalidFileMultipart.headers, cookie },
      payload: invalidFileMultipart.payload,
      remoteAddress: "127.0.0.82",
    });
    expect(invalidFile.statusCode, invalidFile.body).toBe(400);

    const createdRows = await db
      .select({ id: productions.id })
      .from(productions)
      .where(eq(productions.title, baseInput.title));
    expect(createdRows).toHaveLength(0);
  });

  it("annule toute la contribution si la transaction échoue", async () => {
    const cookie = await signUp(
      "rollback-communaute@example.test",
      "rollback-communaute",
      "127.0.0.85",
    );
    await pool.query(`
      create or replace function todam_test_fail_community_submission()
      returns trigger language plpgsql as $$
      begin
        raise exception 'échec forcé après les insertions catalogue';
      end
      $$;
      create trigger todam_test_fail_community_submission_trigger
      before insert on community_submissions
      for each row execute function todam_test_fail_community_submission();
    `);
    try {
      const input = {
        title: "Contribution à annuler",
        discipline: "ballet",
        company: { mode: "new", name: "Compagnie Rollback", officialUrl: null },
        officialUrl: "https://rollback.example.test/spectacle",
        performances: [
          {
            startsAt: "2026-10-01T18:00:00.000Z",
            endsAt: null,
            officialUrl: null,
            venue: {
              mode: "new",
              name: "Lieu Rollback",
              addressLine1: "3 place des Tests",
              postalCode: "84000",
              locality: "Avignon",
              countryCode: "FR",
              timezone: "Europe/Paris",
              officialUrl: null,
            },
          },
        ],
        audience: "general",
        minimumAge: null,
        durationMinutes: null,
        language: null,
        description: null,
        poster: null,
      };
      const multipart = communityMultipart(input);
      const response = await app.inject({
        method: "POST",
        url: "/v1/community/productions",
        headers: { ...multipart.headers, cookie },
        payload: multipart.payload,
        remoteAddress: "127.0.0.85",
      });
      expect(response.statusCode).toBe(500);

      expect(
        await db
          .select({ id: productions.id })
          .from(productions)
          .where(eq(productions.title, input.title)),
      ).toHaveLength(0);
      expect(
        await db
          .select({ id: companies.id })
          .from(companies)
          .where(eq(companies.name, "Compagnie Rollback")),
      ).toHaveLength(0);
      expect(
        await db
          .select({ id: venues.id })
          .from(venues)
          .where(eq(venues.name, "Lieu Rollback")),
      ).toHaveLength(0);
    } finally {
      await pool.query(`
        drop trigger if exists todam_test_fail_community_submission_trigger
          on community_submissions;
        drop function if exists todam_test_fail_community_submission();
      `);
    }
  });

  it("construit la programmation publique d'un lieu depuis les données publiées", async () => {
    const [futureProduction, draftProduction] = await db
      .insert(productions)
      .values([
        {
          slug: "creation-future-muses",
          title: "Création future",
          discipline: "theatre",
          audience: "general",
          publicationStatus: "published",
          reviewedAt: new Date(),
          language: "français",
        },
        {
          slug: "creation-brouillon-muses",
          title: "Création en brouillon",
          discipline: "theatre",
          audience: "general",
          publicationStatus: "draft",
          language: "français",
        },
      ])
      .returning({ id: productions.id });
    const [futurePerformance] = await db
      .insert(performances)
      .values([
        {
          productionId: futureProduction!.id,
          venueId,
          startsAt: new Date("2099-03-18T19:30:00.000Z"),
          status: "scheduled",
          officialUrl: "https://billetterie.example.test/creation-future",
        },
        {
          productionId: draftProduction!.id,
          venueId,
          startsAt: new Date("2099-04-12T19:30:00.000Z"),
          status: "scheduled",
        },
      ])
      .returning({ id: performances.id });

    const response = await app.inject({
      method: "GET",
      url: "/v1/venues/theatre-des-muses-monaco",
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      slug: "theatre-des-muses-monaco",
      name: "Théâtre des Muses",
    });
    expect(response.json().upcoming).toEqual([
      expect.objectContaining({
        id: futureProduction!.id,
        venuePerformances: [
          expect.objectContaining({
            id: futurePerformance!.id,
            status: "scheduled",
            venue: expect.objectContaining({
              id: venueId,
              slug: "theatre-des-muses-monaco",
            }),
          }),
        ],
      }),
    ]);
    expect(response.json().archives).toEqual([
      expect.objectContaining({
        id: productionId,
        venuePerformances: [
          expect.objectContaining({
            id: performanceId,
            status: "completed",
          }),
        ],
      }),
    ]);
    expect(
      [...response.json().upcoming, ...response.json().archives].some(
        (production: { id: string }) => production.id === draftProduction!.id,
      ),
    ).toBe(false);
  });

  it("personnalise l'accueil par ville dans un rayon de 50 km", async () => {
    const cookie = await signUp("accueil@example.test", "spectatrice-accueil");
    await db
      .update(venues)
      .set({ coordinates: { x: 7.4246, y: 43.7384 } })
      .where(eq(venues.id, venueId));

    const [nearVenue, farVenue] = await db
      .insert(venues)
      .values([
        {
          slug: "lieu-a-moins-de-50-km",
          name: "Lieu proche",
          addressLine1: "1 rue du Test",
          postalCode: "06000",
          locality: "Ville proche",
          countryCode: "FR",
          timezone: "Europe/Paris",
          coordinates: { x: 7.4246, y: 44.1784 },
        },
        {
          slug: "lieu-a-plus-de-50-km",
          name: "Lieu lointain",
          addressLine1: "2 rue du Test",
          postalCode: "06001",
          locality: "Ville lointaine",
          countryCode: "FR",
          timezone: "Europe/Paris",
          coordinates: { x: 7.4246, y: 44.1984 },
        },
      ])
      .returning({ id: venues.id });
    const [nearProduction, farProduction] = await db
      .insert(productions)
      .values([
        {
          slug: "spectacle-proche-accueil",
          title: "Spectacle proche",
          discipline: "theatre",
          audience: "general",
          publicationStatus: "published",
          reviewedAt: new Date(),
        },
        {
          slug: "spectacle-lointain-accueil",
          title: "Spectacle lointain",
          discipline: "opera",
          audience: "general",
          publicationStatus: "published",
          reviewedAt: new Date(),
        },
      ])
      .returning({ id: productions.id });
    await db.insert(performances).values([
      {
        productionId,
        venueId,
        startsAt: new Date("2030-01-05T19:00:00.000Z"),
        status: "scheduled",
      },
      {
        productionId: nearProduction!.id,
        venueId: nearVenue!.id,
        startsAt: new Date("2030-01-06T19:00:00.000Z"),
        status: "scheduled",
      },
      {
        productionId: farProduction!.id,
        venueId: farVenue!.id,
        startsAt: new Date("2030-01-07T19:00:00.000Z"),
        status: "scheduled",
      },
      {
        productionId: nearProduction!.id,
        venueId: nearVenue!.id,
        startsAt: new Date("2030-01-04T19:00:00.000Z"),
        status: "cancelled",
      },
    ]);

    const cities = await app.inject({
      method: "GET",
      url: "/v1/catalog/cities?q=Mon",
    });
    expect(cities.statusCode).toBe(200);
    expect(cities.json().items).toContainEqual({
      locality: "Monaco",
      countryCode: "MC",
      label: "Monaco",
    });

    const savedCity = await app.inject({
      method: "PUT",
      url: "/v1/me/home-city",
      headers: { cookie },
      payload: {
        city: { locality: "monaco", countryCode: "MC" },
      },
    });
    expect(savedCity.statusCode).toBe(200);
    expect(savedCity.json().city).toMatchObject({ locality: "Monaco" });

    await app.inject({
      method: "PUT",
      url: `/v1/me/productions/${productionId}/rating`,
      headers: { cookie },
      payload: { value: 8 },
    });
    const firstHome = await app.inject({
      method: "GET",
      url: "/v1/me/home",
      headers: { cookie },
    });
    expect(firstHome.statusCode, firstHome.body).toBe(200);
    expect(firstHome.json()).toMatchObject({
      profile: { username: "spectatrice-accueil" },
      homeCity: { locality: "Monaco", countryCode: "MC" },
      progress: { current: 1, target: 5, completed: false },
      radiusKm: 50,
    });
    expect(
      firstHome
        .json()
        .nearby.map((item: { production: { title: string } }) => item.production.title),
    ).toEqual(["Le Rêve d'Élodie", "Spectacle proche"]);
    expect(firstHome.json().nearby[1].performance.distanceKm).toBeGreaterThan(48);
    expect(firstHome.json().nearby[1].performance.distanceKm).toBeLessThan(50);
    expect(
      firstHome
        .json()
        .nationalUpcoming.map(
          (item: { production: { title: string } }) => item.production.title,
        ),
    ).toContain("Spectacle lointain");

    const additionalProductions = await db
      .insert(productions)
      .values(
        Array.from({ length: 4 }, (_, index) => ({
          slug: `progression-accueil-${index}`,
          title: `Progression accueil ${index}`,
          discipline: "theatre" as const,
          audience: "general" as const,
          publicationStatus: "published" as const,
          reviewedAt: new Date(),
        })),
      )
      .returning({ id: productions.id });
    for (const production of additionalProductions) {
      const response = await app.inject({
        method: "PUT",
        url: `/v1/me/watchlist/${production.id}`,
        headers: { cookie },
      });
      expect(response.statusCode).toBe(200);
    }
    const completedHome = await app.inject({
      method: "GET",
      url: "/v1/me/home",
      headers: { cookie },
    });
    expect(completedHome.json().progress).toEqual({
      current: 5,
      target: 5,
      completed: true,
    });
    for (const production of additionalProductions) {
      await app.inject({
        method: "DELETE",
        url: `/v1/me/watchlist/${production.id}`,
        headers: { cookie },
      });
    }
    const permanentlyCompletedHome = await app.inject({
      method: "GET",
      url: "/v1/me/home",
      headers: { cookie },
    });
    expect(permanentlyCompletedHome.json().progress).toEqual({
      current: 1,
      target: 5,
      completed: true,
    });

    const jsonExport = await app.inject({
      method: "GET",
      url: "/v1/me/export?format=json",
      headers: { cookie },
    });
    expect(jsonExport.json().account.homeCity).toEqual({
      locality: "Monaco",
      countryCode: "MC",
    });

    const unknownCity = await app.inject({
      method: "PUT",
      url: "/v1/me/home-city",
      headers: { cookie },
      payload: {
        city: { locality: "Ville inconnue", countryCode: "FR" },
      },
    });
    expect(unknownCity.statusCode).toBe(404);
    expect(unknownCity.json().code).toBe("CITY_NOT_FOUND");

    const clearedCity = await app.inject({
      method: "PUT",
      url: "/v1/me/home-city",
      headers: { cookie },
      payload: { city: null },
    });
    expect(clearedCity.statusCode).toBe(200);
    expect(clearedCity.json()).toEqual({ city: null });
  });

  it("refuse l'âge absent et les versions juridiques obsolètes", async () => {
    const missingAge = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-up/email",
      payload: {
        name: "sans-age",
        username: "sans-age",
        displayUsername: "sans-age",
        email: "sans-age@example.test",
        password: "Todam-test-2026",
        termsVersion: CURRENT_TERMS_VERSION,
        privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
        channel: "web",
      },
    });
    const obsolete = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-up/email",
      payload: {
        name: "ancienne-version",
        username: "ancienne-version",
        displayUsername: "ancienne-version",
        email: "ancienne-version@example.test",
        password: "Todam-test-2026",
        age15OrOlder: true,
        termsVersion: "0.9.0",
        privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
        channel: "web",
      },
    });

    expect(missingAge.statusCode).toBe(400);
    expect(obsolete.statusCode).toBe(400);
  });

  it("rejette une déclaration d'âge absente avant tout accès à la base", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-up/email",
      payload: {
        name: "validation-seule",
        username: "validation-seule",
        displayUsername: "validation-seule",
        email: "validation-seule@example.test",
        password: "Todam-test-2026",
        termsVersion: CURRENT_TERMS_VERSION,
        privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
        channel: "web",
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("crée un compte inactif et envoie la vérification", async () => {
    sentEmails.length = 0;
    const startedAt = Date.now();
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-up/email",
      payload: {
        name: "attente-verification",
        username: "attente-verification",
        displayUsername: "attente-verification",
        email: "attente-verification@example.test",
        password: "Todam-test-2026",
        age15OrOlder: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
        channel: "web",
        ageConfirmedAt: "2000-01-01T00:00:00.000Z",
        termsAcceptedAt: "2000-01-01T00:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toBeFalsy();
    expect(sentEmails.some((email) => email.subject.includes("Confirme"))).toBe(true);
    const proof = await db
      .select({ acceptedAt: legalAcceptances.acceptedAt })
      .from(legalAcceptances)
      .innerJoin(user, eq(user.id, legalAcceptances.userId))
      .where(eq(user.email, "attente-verification@example.test"))
      .limit(1);
    expect(proof).toHaveLength(1);
    expect(proof[0]!.acceptedAt.getTime()).toBeGreaterThanOrEqual(startedAt);
  });

  it("refuse explicitement les doublons sans envoyer d'e-mail", async () => {
    await signUp("doublon@example.test", "compte-doublon", "127.0.0.21");
    sentEmails.length = 0;

    const duplicateEmail = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-up/email",
      remoteAddress: "127.0.0.22",
      payload: {
        name: "autre-nom-utilisateur",
        username: "autre-nom-utilisateur",
        displayUsername: "autre-nom-utilisateur",
        email: "DOUBLON@example.test",
        password: "Todam-test-2026",
        age15OrOlder: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
        channel: "web",
      },
    });
    const duplicateUsername = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-up/email",
      remoteAddress: "127.0.0.23",
      payload: {
        name: "compte-doublon",
        username: "COMPTE-DOUBLON",
        displayUsername: "compte-doublon",
        email: "autre-doublon@example.test",
        password: "Todam-test-2026",
        age15OrOlder: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
        channel: "web",
      },
    });

    expect(duplicateEmail.statusCode).toBe(409);
    expect(duplicateEmail.json().code).toBe("EMAIL_ALREADY_REGISTERED");
    expect(duplicateUsername.statusCode).toBe(409);
    expect(duplicateUsername.json().code).toBe("USERNAME_ALREADY_TAKEN");
    expect(sentEmails).toEqual([]);
  });

  it("modifie les identifiants et le mot de passe sans perdre la session courante", async () => {
    const email = "parametres@example.test";
    let cookie = await signUp(email, "parametres", "127.0.0.31");
    const secondSession = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-in/email",
      remoteAddress: "127.0.0.32",
      payload: { email, password: "Todam-test-2026" },
    });
    const secondCookie = secondSession.headers["set-cookie"] as string;
    const directPasswordChange = await app.inject({
      method: "POST",
      url: "/v1/auth/change-password",
      headers: { cookie },
      remoteAddress: "127.0.0.32",
      payload: {
        currentPassword: "Todam-test-2026",
        newPassword: "contournement-refuse",
        revokeOtherSessions: false,
      },
    });
    expect(directPasswordChange.statusCode).toBe(404);
    expect(directPasswordChange.json().code).toBe("ROUTE_NOT_FOUND");

    await db.insert(user).values({
      id: "compte-occupe",
      name: "Nom occupé",
      email: "occupee@example.test",
      emailVerified: true,
      username: "nom-occupe",
      ageConfirmedAt: new Date(),
      age15OrOlder: true,
      termsVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: new Date(),
      privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
      registrationChannel: "web",
    });

    const duplicateUsername = await app.inject({
      method: "PATCH",
      url: "/v1/me/username",
      headers: { cookie },
      remoteAddress: "127.0.0.33",
      payload: { username: "NOM-OCCUPE" },
    });
    const usernameChange = await app.inject({
      method: "PATCH",
      url: "/v1/me/username",
      headers: { cookie },
      remoteAddress: "127.0.0.33",
      payload: { username: "nouveau-nom-utilisateur" },
    });
    expect(duplicateUsername.statusCode).toBe(409);
    expect(duplicateUsername.json().code).toBe("USERNAME_ALREADY_TAKEN");
    expect(usernameChange.statusCode).toBe(200);
    expect(usernameChange.json()).toEqual({ username: "nouveau-nom-utilisateur" });
    if (usernameChange.headers["set-cookie"]) {
      cookie = usernameChange.headers["set-cookie"] as string;
    }

    sentEmails.length = 0;
    const invalidEmailPassword = await app.inject({
      method: "POST",
      url: "/v1/me/email-change",
      headers: { cookie },
      remoteAddress: "127.0.0.33",
      payload: {
        currentPassword: "mot-de-passe-incorrect",
        newEmail: "nouvelle@example.test",
        callbackURL: "http://localhost:8081/email-verifie?mode=change-email",
      },
    });
    const unchangedEmail = await app.inject({
      method: "POST",
      url: "/v1/me/email-change",
      headers: { cookie },
      remoteAddress: "127.0.0.33",
      payload: {
        currentPassword: "Todam-test-2026",
        newEmail: email.toUpperCase(),
        callbackURL: "http://localhost:8081/email-verifie?mode=change-email",
      },
    });
    const occupiedEmail = await app.inject({
      method: "POST",
      url: "/v1/me/email-change",
      headers: { cookie },
      remoteAddress: "127.0.0.33",
      payload: {
        currentPassword: "Todam-test-2026",
        newEmail: "OCCUPEE@example.test",
        callbackURL: "http://localhost:8081/email-verifie?mode=change-email",
      },
    });
    const emailChange = await app.inject({
      method: "POST",
      url: "/v1/me/email-change",
      headers: { cookie },
      remoteAddress: "127.0.0.33",
      payload: {
        currentPassword: "Todam-test-2026",
        newEmail: "nouvelle@example.test",
        callbackURL: "http://localhost:8081/email-verifie?mode=change-email",
      },
    });

    expect(invalidEmailPassword.statusCode).toBe(400);
    expect(invalidEmailPassword.json().code).toBe("INVALID_CURRENT_PASSWORD");
    expect(unchangedEmail.statusCode).toBe(409);
    expect(unchangedEmail.json().code).toBe("EMAIL_UNCHANGED");
    expect(occupiedEmail.statusCode).toBe(409);
    expect(occupiedEmail.json().code).toBe("EMAIL_ALREADY_REGISTERED");
    expect(emailChange.statusCode).toBe(200);
    expect(emailChange.json()).toEqual({ verificationSent: true });

    const beforeConfirmation = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.username, "nouveau-nom-utilisateur"))
      .limit(1);
    expect(beforeConfirmation[0]?.email).toBe(email);
    const verificationEmail = sentEmails.find(
      (message) => message.to === "nouvelle@example.test",
    );
    expect(verificationEmail?.subject).toContain("nouvelle adresse");
    expect(
      sentEmails.some(
        (message) =>
          message.to === email && message.subject.includes("Demande de changement"),
      ),
    ).toBe(true);
    const emailChangeUrl = verificationEmail?.text.match(/https?:\/\/\S+/)?.[0];
    expect(emailChangeUrl).toBeTruthy();
    const target = new URL(emailChangeUrl!);
    const confirmation = await app.inject({
      method: "GET",
      url: `${target.pathname}${target.search}`,
      headers: { cookie },
    });
    expect([200, 302]).toContain(confirmation.statusCode);
    expect(
      sentEmails.some((message) => message.subject.includes("Bienvenue sur Todam")),
    ).toBe(false);
    const afterConfirmation = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.username, "nouveau-nom-utilisateur"))
      .limit(1);
    expect(afterConfirmation[0]?.email).toBe("nouvelle@example.test");
    if (confirmation.headers["set-cookie"]) {
      cookie = confirmation.headers["set-cookie"] as string;
    }

    const invalidPassword = await app.inject({
      method: "POST",
      url: "/v1/me/password-change",
      headers: { cookie },
      remoteAddress: "127.0.0.33",
      payload: {
        currentPassword: "mot-de-passe-incorrect",
        newPassword: "Todam-test-2027",
      },
    });
    const unchangedPassword = await app.inject({
      method: "POST",
      url: "/v1/me/password-change",
      headers: { cookie },
      remoteAddress: "127.0.0.33",
      payload: {
        currentPassword: "Todam-test-2026",
        newPassword: "Todam-test-2026",
      },
    });
    const passwordChange = await app.inject({
      method: "POST",
      url: "/v1/me/password-change",
      headers: { cookie },
      remoteAddress: "127.0.0.33",
      payload: {
        currentPassword: "Todam-test-2026",
        newPassword: "Todam-test-2027",
      },
    });
    expect(invalidPassword.statusCode).toBe(400);
    expect(invalidPassword.json().code).toBe("INVALID_CURRENT_PASSWORD");
    expect(unchangedPassword.statusCode).toBe(409);
    expect(unchangedPassword.json().code).toBe("PASSWORD_UNCHANGED");
    expect(passwordChange.statusCode).toBe(200);
    expect(passwordChange.headers["set-cookie"]).toBeTruthy();
    cookie = passwordChange.headers["set-cookie"] as string;

    const currentSession = await app.inject({
      method: "GET",
      url: "/v1/me/dashboard",
      headers: { cookie },
    });
    const revokedSession = await app.inject({
      method: "GET",
      url: "/v1/me/dashboard",
      headers: { cookie: secondCookie },
    });
    const oldPassword = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-in/email",
      remoteAddress: "127.0.0.34",
      payload: {
        email: "nouvelle@example.test",
        password: "Todam-test-2026",
      },
    });
    const newPasswordLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-in/email",
      remoteAddress: "127.0.0.35",
      payload: {
        email: "nouvelle@example.test",
        password: "Todam-test-2027",
      },
    });
    expect(currentSession.statusCode).toBe(200);
    expect(revokedSession.statusCode).toBe(401);
    expect(oldPassword.statusCode).toBe(401);
    expect(newPasswordLogin.statusCode).toBe(200);
  });

  it("connecte avec l'email ou le nom d'utilisateur", async () => {
    const email = "connexion@example.test";
    const username = "Spectatrice-Connexion";
    await signUp(email, username);

    const emailResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-in/email",
      payload: {
        email,
        password: "Todam-test-2026",
      },
    });
    const usernameResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/sign-in/username",
      payload: {
        username: username.toLowerCase(),
        password: "Todam-test-2026",
      },
    });

    expect(emailResponse.statusCode).toBe(200);
    expect(emailResponse.headers["set-cookie"]).toBeTruthy();
    expect(usernameResponse.statusCode).toBe(200);
    expect(usernameResponse.headers["set-cookie"]).toBeTruthy();
  });

  it("enchaîne À voir, note, journal et histogramme", async () => {
    const cookie = await signUp();
    const watchlist = await app.inject({
      method: "PUT",
      url: `/v1/me/watchlist/${productionId}`,
      headers: { cookie },
    });
    expect(watchlist.statusCode).toBe(200);
    expect(watchlist.json().state.watchlisted).toBe(true);

    const rating = await app.inject({
      method: "PUT",
      url: `/v1/me/productions/${productionId}/rating`,
      headers: { cookie },
      payload: { value: 8 },
    });
    expect(rating.statusCode).toBe(200);
    expect(rating.json().state).toMatchObject({
      rating: 8,
      seen: true,
      watchlisted: false,
    });

    const dashboard = await app.inject({
      method: "GET",
      url: "/v1/me/dashboard",
      headers: { cookie },
    });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json().counts).toMatchObject({
      ratings: 1,
      reviews: 0,
      seen: 1,
      watchlist: 0,
    });
    expect(dashboard.json().recentRatings[0]).toMatchObject({
      production: { id: productionId },
      value: 8,
      hasReview: false,
    });
    expect(dashboard.json().ratingDistribution[7]).toEqual({
      value: 8,
      count: 1,
    });
    const profile = await app.inject({
      method: "GET",
      url: "/v1/me/profile",
      headers: { cookie },
    });
    expect(profile.statusCode, profile.body).toBe(200);
    expect(new Date(profile.json().memberSince).toString()).not.toBe("Invalid Date");
  });

  it("exclut la note personnelle des facettes communautaires", async () => {
    const cookie = await signUp("facettes@example.test", "facettes", "127.0.0.81");
    const otherCookie = await signUp(
      "facettes-autre@example.test",
      "facettes-autre",
      "127.0.0.82",
    );
    const thirdCookie = await signUp(
      "facettes-tiers@example.test",
      "facettes-tiers",
      "127.0.0.83",
    );
    for (const [ratingCookie, value] of [
      [cookie, 1],
      [otherCookie, 8],
      [thirdCookie, 10],
    ] as const) {
      const response = await app.inject({
        method: "PUT",
        url: `/v1/me/productions/${productionId}/rating`,
        headers: { cookie: ratingCookie },
        payload: { value },
      });
      expect(response.statusCode, response.body).toBe(200);
    }
    const review = await app.inject({
      method: "PUT",
      url: `/v1/me/reviews/${productionId}`,
      headers: { cookie },
      payload: {
        body: "Un avis personnel pour tester les filtres combinés.",
        containsSpoiler: false,
        visibility: "private",
      },
    });
    expect(review.statusCode, review.body).toBe(200);
    const [otherProduction] = await db
      .insert(productions)
      .values({
        slug: "autre-spectacle-facettes",
        title: "Autre spectacle",
        discipline: "opera",
        audience: "general",
        publicationStatus: "published",
        reviewedAt: new Date(),
        language: "français",
      })
      .returning({ id: productions.id });
    const secondRating = await app.inject({
      method: "PUT",
      url: `/v1/me/productions/${otherProduction!.id}/rating`,
      headers: { cookie },
      payload: { value: 2 },
    });
    expect(secondRating.statusCode, secondRating.body).toBe(200);

    const seen = await app.inject({
      method: "GET",
      url: "/v1/me/shows?section=seen&communityRating=9&hasReview=true&limit=1",
      headers: { cookie },
    });
    expect(seen.statusCode, seen.body).toBe(200);
    expect(seen.json()).toMatchObject({
      total: 1,
      nextCursor: null,
      items: [
        {
          myRating: 1,
          communityRating: { average: 9, count: 2 },
          review: { visibility: "private" },
        },
      ],
    });
    expect(seen.json().facets.communityRatings).toContainEqual({
      value: 9,
      count: 1,
    });
    expect(seen.json().facets.reviews).toContainEqual({
      value: "with",
      count: 1,
    });

    const rated = await app.inject({
      method: "GET",
      url: "/v1/me/shows?section=rated&myRating=1",
      headers: { cookie },
    });
    expect(rated.statusCode, rated.body).toBe(200);
    expect(rated.json().items).toHaveLength(1);
    expect(rated.json().items[0]).toMatchObject({
      myRating: 1,
      communityRating: { average: 9, count: 2 },
    });
    const firstPage = await app.inject({
      method: "GET",
      url: "/v1/me/shows?section=rated&limit=1",
      headers: { cookie },
    });
    expect(firstPage.statusCode, firstPage.body).toBe(200);
    expect(firstPage.json().total).toBe(2);
    expect(firstPage.json().items).toHaveLength(1);
    expect(firstPage.json().nextCursor).toEqual(expect.any(String));
    expect(firstPage.json().facets.myRatings).toEqual([
      { value: 1, count: 1 },
      { value: 2, count: 1 },
    ]);
    const secondPage = await app.inject({
      method: "GET",
      url: `/v1/me/shows?section=rated&limit=1&cursor=${encodeURIComponent(
        firstPage.json().nextCursor,
      )}`,
      headers: { cookie },
    });
    expect(secondPage.statusCode, secondPage.body).toBe(200);
    expect(secondPage.json().items).toHaveLength(1);
    expect(secondPage.json().nextCursor).toBeNull();
    expect(secondPage.json().items[0].production.id).not.toBe(
      firstPage.json().items[0].production.id,
    );
    const searched = await app.inject({
      method: "GET",
      url: "/v1/me/shows?section=rated&q=Autre",
      headers: { cookie },
    });
    expect(searched.statusCode, searched.body).toBe(200);
    expect(searched.json()).toMatchObject({
      total: 1,
      items: [{ myRating: 2 }],
    });
    const absentValue = await app.inject({
      method: "GET",
      url: "/v1/me/shows?section=rated&myRating=7",
      headers: { cookie },
    });
    expect(absentValue.statusCode, absentValue.body).toBe(200);
    expect(absentValue.json()).toMatchObject({ total: 0, items: [] });
  });

  it("liste et retire des séances sans dissocier une note de la dernière", async () => {
    const cookie = await signUp();
    const firstSeen = await app.inject({
      method: "POST",
      url: "/v1/me/diary",
      headers: { cookie },
      payload: {
        productionId,
        performanceId,
        attendedOn: null,
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const secondSeen = await app.inject({
      method: "POST",
      url: "/v1/me/diary",
      headers: { cookie },
      payload: {
        productionId,
        performanceId: null,
        attendedOn: null,
      },
    });
    expect(firstSeen.statusCode).toBe(200);
    expect(secondSeen.statusCode).toBe(200);

    const diary = await app.inject({
      method: "GET",
      url: `/v1/me/productions/${productionId}/diary`,
      headers: { cookie },
    });
    expect(diary.statusCode).toBe(200);
    expect(diary.json().items).toHaveLength(2);
    expect(new Date(diary.json().items[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(diary.json().items[1].createdAt).getTime(),
    );
    expect(diary.json().items[0]).toMatchObject({
      attendedOn: null,
      performance: null,
    });
    expect(diary.json().items[1].performance).toMatchObject({
      id: performanceId,
      venue: {
        name: "Théâtre des Muses",
        locality: "Monaco",
        timezone: "Europe/Monaco",
      },
    });

    const otherCookie = await signUp("autre-spectatrice@example.test");
    const otherDiary = await app.inject({
      method: "GET",
      url: `/v1/me/productions/${productionId}/diary`,
      headers: { cookie: otherCookie },
    });
    const hiddenEntry = await app.inject({
      method: "DELETE",
      url: `/v1/me/diary/${diary.json().items[0].id}`,
      headers: { cookie: otherCookie },
    });
    expect(otherDiary.statusCode).toBe(200);
    expect(otherDiary.json().items).toEqual([]);
    expect(hiddenEntry.statusCode).toBe(404);
    expect(hiddenEntry.json().code).toBe("DIARY_ENTRY_NOT_FOUND");

    const rating = await app.inject({
      method: "PUT",
      url: `/v1/me/productions/${productionId}/rating`,
      headers: { cookie },
      payload: { value: 8 },
    });
    expect(rating.statusCode).toBe(200);

    const removeIntermediate = await app.inject({
      method: "DELETE",
      url: `/v1/me/diary/${diary.json().items[0].id}`,
      headers: { cookie },
    });
    expect(removeIntermediate.statusCode).toBe(200);
    expect(removeIntermediate.json().state).toMatchObject({
      rating: 8,
      seen: true,
    });

    const removeRatedLast = await app.inject({
      method: "DELETE",
      url: `/v1/me/diary/${diary.json().items[1].id}`,
      headers: { cookie },
    });
    expect(removeRatedLast.statusCode).toBe(409);
    expect(removeRatedLast.json().code).toBe("RATING_REQUIRES_DIARY_ENTRY");

    const deleteRating = await app.inject({
      method: "DELETE",
      url: `/v1/me/productions/${productionId}/rating`,
      headers: { cookie },
    });
    expect(deleteRating.statusCode).toBe(200);

    const removeLast = await app.inject({
      method: "DELETE",
      url: `/v1/me/diary/${diary.json().items[1].id}`,
      headers: { cookie },
    });
    expect(removeLast.statusCode).toBe(200);
    expect(removeLast.json().state).toMatchObject({
      rating: null,
      seen: false,
    });
  });

  it("exporte les données puis supprime le compte par lien public", async () => {
    const email = "suppression@example.test";
    const cookie = await signUp(email, "compte-suppression");
    const profile = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    const [claimedCompany] = await db
      .insert(companies)
      .values({
        slug: "compagnie-suppression",
        name: "Compagnie Suppression",
        publicationStatus: "published",
        reviewedAt: new Date(),
      })
      .returning({ id: companies.id });
    const [revision] = await db
      .insert(catalogRevisions)
      .values({
        companyId: claimedCompany!.id,
        authorUserId: profile[0]!.id,
        targetType: "company",
        targetId: claimedCompany!.id,
        status: "draft",
        justification: "Révision à conserver sous une forme anonymisée.",
      })
      .returning({ id: catalogRevisions.id });
    await app.inject({
      method: "POST",
      url: "/v1/me/diary",
      headers: { cookie },
      payload: {
        productionId,
        performanceId,
        attendedOn: null,
      },
    });
    await app.inject({
      method: "PUT",
      url: `/v1/me/reviews/${productionId}`,
      headers: { cookie },
      payload: {
        body: "Un avis suffisamment détaillé pour vérifier l’export du compte.",
        containsSpoiler: false,
        visibility: "private",
      },
    });
    const list = await app.inject({
      method: "POST",
      url: "/v1/me/lists",
      headers: { cookie },
      payload: {
        name: "Avant suppression",
        description: "Liste exportée avant la suppression du compte.",
        visibility: "private",
      },
    });
    await app.inject({
      method: "POST",
      url: `/v1/me/lists/${list.json().id}/items`,
      headers: { cookie },
      payload: { productionId },
    });
    await app.inject({
      method: "POST",
      url: "/v1/content-reports",
      headers: { cookie },
      payload: {
        targetType: "production",
        targetId: productionId,
        category: "other",
        reason: "Ce signalement personnel doit apparaître dans l’export du compte.",
      },
    });
    await app.inject({
      method: "POST",
      url: `/v1/me/company-claims/${claimedCompany!.id}`,
      headers: { cookie },
      payload: {
        representativeName: "Camille Suppression",
        roleTitle: "Responsable",
        professionalEmail: "camille@compagnie-suppression.example.test",
        officialWebsiteUrl: "https://compagnie-suppression.example.test",
        evidence:
          "Le domaine professionnel et la page équipe permettent de vérifier cette demande.",
        authorityConfirmed: true,
      },
    });
    await app.inject({
      method: "PUT",
      url: `/v1/me/watchlist/${productionId}`,
      headers: { cookie },
    });

    const jsonExport = await app.inject({
      method: "GET",
      url: "/v1/me/export?format=json",
      headers: { cookie },
    });
    const csvExport = await app.inject({
      method: "GET",
      url: "/v1/me/export?format=csv",
      headers: { cookie },
    });
    expect(jsonExport.statusCode).toBe(200);
    expect(jsonExport.json()).toMatchObject({
      account: { email },
      legal: {
        age15OrOlder: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
      },
    });
    expect(jsonExport.json().watchlist).toHaveLength(1);
    expect(jsonExport.json().reviews).toHaveLength(1);
    expect(jsonExport.json().lists[0].items).toHaveLength(1);
    expect(jsonExport.json().contentReports).toHaveLength(1);
    expect(jsonExport.json().companyClaims).toHaveLength(1);
    expect(jsonExport.json().catalogRevisions).toHaveLength(1);
    expect(csvExport.statusCode).toBe(200);
    expect(csvExport.headers["content-type"]).toContain("text/csv");
    expect(csvExport.body).toContain("version_cgu");
    expect(csvExport.body).toContain("revision_catalogue");

    sentEmails.length = 0;
    const request = await app.inject({
      method: "POST",
      url: "/v1/account-deletion/request",
      payload: { email },
    });
    expect(request.statusCode).toBe(202);
    const deletionEmail = sentEmails.find((message) =>
      message.subject.includes("suppression"),
    );
    const deletionUrl = deletionEmail?.text.match(/https?:\/\/\S+/)?.[0];
    expect(deletionUrl).toBeTruthy();
    const token = new URL(deletionUrl!).searchParams.get("token");
    expect(token).toBeTruthy();

    const confirmation = await app.inject({
      method: "POST",
      url: "/v1/account-deletion/confirm",
      payload: { token },
    });
    expect(confirmation.statusCode).toBe(200);
    const anonymizedRevision = await db
      .select({ authorUserId: catalogRevisions.authorUserId })
      .from(catalogRevisions)
      .where(eq(catalogRevisions.id, revision!.id))
      .limit(1);
    expect(anonymizedRevision[0]?.authorUserId).toBeNull();

    const revoked = await app.inject({
      method: "GET",
      url: "/v1/me/dashboard",
      headers: { cookie },
    });
    expect(revoked.statusCode).toBe(401);
  });

  it("publie uniquement les comptes vérifiés, les salles et le catalogue actifs", async () => {
    await signUp("verifiee@example.test", "compte-verifie");
    await db.insert(user).values({
      id: "compte-non-verifie",
      name: "Compte non vérifié",
      email: "non-verifie@example.test",
      emailVerified: false,
      username: "compte-non-verifie",
      ageConfirmedAt: new Date(),
      age15OrOlder: true,
      termsVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: new Date(),
      privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
      registrationChannel: "web",
    });
    await db.insert(venues).values({
      slug: "salle-inactive-statistiques",
      name: "Salle inactive",
      addressLine1: "1 rue des Tests",
      postalCode: "38000",
      locality: "Grenoble",
      countryCode: "FR",
      timezone: "Europe/Paris",
      isActive: false,
    });

    const [activeProduction, inactiveProduction] = await db
      .insert(productions)
      .values([
        {
          slug: "spectacle-actif-statistiques",
          title: "Spectacle actif",
          discipline: "theatre",
          audience: "general",
          publicationStatus: "published",
          reviewedAt: new Date(),
        },
        {
          slug: "spectacle-inactif-statistiques",
          title: "Spectacle inactif",
          discipline: "theatre",
          audience: "general",
          isActive: false,
          publicationStatus: "published",
          reviewedAt: new Date(),
        },
      ])
      .returning({ id: productions.id, isActive: productions.isActive });
    const activeProductionId = activeProduction!.isActive
      ? activeProduction!.id
      : inactiveProduction!.id;
    const inactiveProductionId = activeProduction!.isActive
      ? inactiveProduction!.id
      : activeProduction!.id;

    await db.insert(performances).values([
      {
        productionId: activeProductionId,
        venueId,
        startsAt: new Date("2030-01-10T19:00:00.000Z"),
        status: "scheduled",
      },
      {
        productionId: activeProductionId,
        venueId,
        startsAt: new Date("2030-01-11T19:00:00.000Z"),
        status: "cancelled",
      },
      {
        productionId: activeProductionId,
        venueId,
        startsAt: new Date("2020-01-10T19:00:00.000Z"),
        status: "scheduled",
      },
      {
        productionId: inactiveProductionId,
        venueId,
        startsAt: new Date("2030-01-12T19:00:00.000Z"),
        status: "scheduled",
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/v1/public/stats",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    expect(response.json()).toMatchObject({
      verifiedUsers: 1,
      activeProductions: 2,
      upcomingPerformances: 1,
      activeVenues: 1,
    });
    expect(new Date(response.json().generatedAt).toString()).not.toBe("Invalid Date");
  });

  it("gère le journal public, les avis et les listes personnalisées", async () => {
    const cookie = await signUp(
      "journal-public@example.test",
      "journal-public",
      "127.0.0.61",
    );
    const diary = await app.inject({
      method: "POST",
      url: "/v1/me/diary",
      headers: { cookie },
      payload: {
        productionId,
        performanceId,
        attendedOn: null,
      },
    });
    expect(diary.statusCode, diary.body).toBe(200);
    const rating = await app.inject({
      method: "PUT",
      url: `/v1/me/productions/${productionId}/rating`,
      headers: { cookie },
      payload: { value: 9 },
    });
    expect(rating.statusCode, rating.body).toBe(200);

    const privateStandaloneRating = await app.inject({
      method: "GET",
      url: "/v1/members/journal-public/journal",
    });
    expect(privateStandaloneRating.statusCode, privateStandaloneRating.body).toBe(200);
    expect(privateStandaloneRating.json().items[0]).toMatchObject({
      rating: null,
      ratedAt: null,
      hasReview: false,
    });
    const aggregateWithPrivateRating = await app.inject({
      method: "GET",
      url: "/v1/productions/reve-elodie-muses-2025",
    });
    expect(aggregateWithPrivateRating.statusCode, aggregateWithPrivateRating.body).toBe(
      200,
    );
    expect(aggregateWithPrivateRating.json().ratingSummary).toEqual({
      average: 9,
      count: 1,
    });
    const publicStandaloneSetting = await app.inject({
      method: "PATCH",
      url: "/v1/me/profile",
      headers: { cookie },
      payload: { ratingVisibility: "public" },
    });
    expect(publicStandaloneSetting.statusCode, publicStandaloneSetting.body).toBe(200);
    expect(publicStandaloneSetting.json().ratingVisibility).toBe("public");
    const publicStandaloneRating = await app.inject({
      method: "GET",
      url: "/v1/members/journal-public/journal",
    });
    expect(publicStandaloneRating.statusCode, publicStandaloneRating.body).toBe(200);
    expect(publicStandaloneRating.json().items[0]).toMatchObject({
      rating: 9,
      hasReview: false,
    });
    const restorePrivateDefault = await app.inject({
      method: "PATCH",
      url: "/v1/me/profile",
      headers: { cookie },
      payload: { ratingVisibility: "review_only" },
    });
    expect(restorePrivateDefault.statusCode, restorePrivateDefault.body).toBe(200);

    const review = await app.inject({
      method: "PUT",
      url: `/v1/me/reviews/${productionId}`,
      headers: { cookie },
      payload: {
        body: "Une proposition sensible, précise et vraiment mémorable.",
        containsSpoiler: false,
        visibility: "public",
      },
    });
    expect(review.statusCode, review.body).toBe(200);

    const publicList = await app.inject({
      method: "POST",
      url: "/v1/me/lists",
      headers: { cookie },
      payload: {
        name: "Liste publique",
        description: null,
        visibility: "public",
      },
    });
    expect(publicList.statusCode).toBe(400);

    const createdList = await app.inject({
      method: "POST",
      url: "/v1/me/lists",
      headers: { cookie },
      payload: {
        name: "Mes découvertes",
        description: "Les spectacles à faire connaître.",
        visibility: "private",
      },
    });
    expect(createdList.statusCode, createdList.body).toBe(200);
    const listId = createdList.json().id as string;
    const listSlug = createdList.json().slug as string;
    const addItem = await app.inject({
      method: "POST",
      url: `/v1/me/lists/${listId}/items`,
      headers: { cookie },
      payload: { productionId },
    });
    expect(addItem.statusCode, addItem.body).toBe(200);

    const publicProfile = await app.inject({
      method: "GET",
      url: "/v1/members/journal-public",
    });
    expect(publicProfile.statusCode, publicProfile.body).toBe(200);
    expect(publicProfile.json().counts).toMatchObject({
      seen: 1,
      lists: 0,
      reviews: 1,
    });
    expect(publicProfile.json().recentReviews[0]).toMatchObject({
      rating: 9,
      body: "Une proposition sensible, précise et vraiment mémorable.",
      production: {
        id: productionId,
        slug: "reve-elodie-muses-2025",
      },
    });
    const publicJournal = await app.inject({
      method: "GET",
      url: "/v1/members/journal-public/journal?rating=9&hasReview=true",
    });
    expect(publicJournal.statusCode, publicJournal.body).toBe(200);
    expect(publicJournal.json().items[0]).toMatchObject({
      attendedOn: "2025-11-08",
      rating: 9,
      hasReview: true,
    });

    const privateProfile = await app.inject({
      method: "PATCH",
      url: "/v1/me/profile",
      headers: { cookie },
      payload: { profileVisibility: "private" },
    });
    expect(privateProfile.statusCode, privateProfile.body).toBe(200);
    const hiddenJournal = await app.inject({
      method: "GET",
      url: "/v1/members/journal-public/journal",
    });
    expect(hiddenJournal.statusCode).toBe(404);
    const privateList = await app.inject({
      method: "GET",
      url: `/v1/members/journal-public/lists/${listSlug}`,
    });
    expect(privateList.statusCode).toBe(404);
  });

  it("enregistre un signalement public sans exposer de données personnelles", async () => {
    const report = await app.inject({
      method: "POST",
      url: "/v1/content-reports",
      payload: {
        targetType: "production",
        targetId: productionId,
        category: "schedule",
        reason:
          "La date indiquée semble incorrecte par rapport à la billetterie officielle.",
      },
    });
    expect(report.statusCode, report.body).toBe(200);
    expect(report.json()).toMatchObject({ status: "open" });

    const invalid = await app.inject({
      method: "POST",
      url: "/v1/content-reports",
      payload: {
        targetType: "production",
        targetId: productionId,
        category: "other",
        reason: "Erreur",
      },
    });
    expect(invalid.statusCode).toBe(400);

    const missingTarget = await app.inject({
      method: "POST",
      url: "/v1/content-reports",
      payload: {
        targetType: "production",
        targetId: "00000000-0000-4000-8000-000000000099",
        category: "other",
        reason:
          "Cette fiche n’existe plus et ne devrait pas accepter de nouveau signalement.",
      },
    });
    expect(missingTarget.statusCode).toBe(404);
    expect(missingTarget.json().code).toBe("CONTENT_REPORT_TARGET_NOT_FOUND");

    const ownerCookie = await signUp(
      "private-report@example.test",
      "private-report-owner",
      "127.0.0.69",
    );
    const [owner] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, "private-report-owner"))
      .limit(1);
    const [privateList] = await db
      .insert(lists)
      .values({
        userId: owner!.id,
        slug: "liste-privee-a-signaler",
        name: "Liste privée à signaler",
        visibility: "private",
      })
      .returning({ id: lists.id });
    const anonymousPrivateReport = await app.inject({
      method: "POST",
      url: "/v1/content-reports",
      payload: {
        targetType: "list",
        targetId: privateList!.id,
        category: "other",
        reason:
          "Un visiteur anonyme ne doit pas pouvoir confirmer l’existence de cette liste privée.",
      },
    });
    expect(anonymousPrivateReport.statusCode).toBe(404);
    const ownerPrivateReport = await app.inject({
      method: "POST",
      url: "/v1/content-reports",
      headers: { cookie: ownerCookie },
      payload: {
        targetType: "list",
        targetId: privateList!.id,
        category: "other",
        reason: "Le propriétaire peut signaler un problème sur sa propre liste privée.",
      },
    });
    expect(ownerPrivateReport.statusCode, ownerPrivateReport.body).toBe(200);
  });

  it("traite chaque correction dans une file éditoriale motivée", async () => {
    const report = await app.inject({
      method: "POST",
      url: "/v1/content-reports",
      payload: {
        targetType: "production",
        targetId: productionId,
        category: "information",
        reason:
          "Le lien officiel doit être revérifié avant la prochaine démonstration publique.",
      },
    });
    expect(report.statusCode, report.body).toBe(200);

    const moderatorCookie = await signUp(
      "corrections@example.test",
      "corrections-todam",
      "127.0.0.70",
    );
    await db
      .update(user)
      .set({ role: "trusted_contributor" })
      .where(eq(user.username, "corrections-todam"));

    const queue = await app.inject({
      method: "GET",
      url: "/v1/admin/content-reports?status=open",
      headers: { cookie: moderatorCookie },
    });
    expect(queue.statusCode, queue.body).toBe(200);
    expect(queue.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: report.json().id,
          targetId: productionId,
          status: "open",
        }),
      ]),
    );

    const reviewing = await app.inject({
      method: "POST",
      url: `/v1/admin/content-reports/${report.json().id}/reviewing`,
      headers: { cookie: moderatorCookie },
      payload: {
        decision: "Vérification engagée auprès de la source officielle indiquée.",
      },
    });
    expect(reviewing.statusCode, reviewing.body).toBe(200);
    expect(reviewing.json()).toMatchObject({
      status: "reviewing",
      reviewedAt: null,
    });

    const resolved = await app.inject({
      method: "POST",
      url: `/v1/admin/content-reports/${report.json().id}/resolved`,
      headers: { cookie: moderatorCookie },
      payload: {
        decision:
          "Le lien officiel a été contrôlé et la fiche publique a été confirmée.",
      },
    });
    expect(resolved.statusCode, resolved.body).toBe(200);
    expect(resolved.json().status).toBe("resolved");
    expect(resolved.json().reviewedAt).not.toBeNull();

    const duplicateDecision = await app.inject({
      method: "POST",
      url: `/v1/admin/content-reports/${report.json().id}/dismissed`,
      headers: { cookie: moderatorCookie },
      payload: {
        decision: "Tentative de modifier une décision déjà définitive.",
      },
    });
    expect(duplicateDecision.statusCode).toBe(409);
    expect(duplicateDecision.json().code).toBe("CONTENT_REPORT_ALREADY_CLOSED");
  });

  it("associe un signalement à la bonne affiche et masque seulement ce visuel", async () => {
    const [source] = await db
      .select({ id: catalogSources.id })
      .from(catalogSources)
      .limit(1);
    const [document] = await db
      .select({ id: sourceDocuments.id })
      .from(sourceDocuments)
      .where(eq(sourceDocuments.sourceId, source!.id))
      .limit(1);
    const [media] = await db
      .insert(mediaAssets)
      .values({
        sourceId: source!.id,
        documentId: document!.id,
        externalKey: "community-report-poster",
        kind: "poster",
        remoteUrl: "https://images.example.test/affiche.webp",
        storagePolicy: "hotlink",
        alt: "Affiche à signaler",
        credit: null,
        rightsStatus: "permission_granted",
        width: 600,
        height: 900,
        mimeType: "image/webp",
      })
      .returning({ id: mediaAssets.id });
    await db.insert(productionMedia).values({
      productionId,
      mediaId: media!.id,
      isPrimary: true,
      position: 0,
    });
    await db.insert(communitySubmissions).values({
      productionId,
      mediaId: media!.id,
      sourceUrl: "https://www.letheatredesmuses.com/programme-adulte/",
      submittedData: { poster: "test" },
      status: "published",
    });

    const report = await app.inject({
      method: "POST",
      url: "/v1/content-reports",
      remoteAddress: "127.0.0.83",
      payload: {
        targetType: "production",
        targetId: productionId,
        category: "visual_rights",
        mediaId: media!.id,
        reason: "Le titulaire demande le retrait de cette affiche précise.",
      },
    });
    expect(report.statusCode, report.body).toBe(200);

    const moderatorCookie = await signUp(
      "affiche-moderation@example.test",
      "affiche-moderation",
      "127.0.0.84",
    );
    await db
      .update(user)
      .set({ role: "trusted_contributor" })
      .where(eq(user.username, "affiche-moderation"));

    const queue = await app.inject({
      method: "GET",
      url: "/v1/admin/content-reports?status=open",
      headers: { cookie: moderatorCookie },
    });
    expect(queue.statusCode, queue.body).toBe(200);
    expect(queue.json().items[0]).toMatchObject({
      category: "visual_rights",
      media: {
        id: media!.id,
        sourceUrl: "https://www.letheatredesmuses.com/programme-adulte/",
      },
      contribution: { status: "published" },
      canHideMedia: true,
    });

    const resolved = await app.inject({
      method: "POST",
      url: `/v1/admin/content-reports/${report.json().id}/resolved`,
      headers: { cookie: moderatorCookie },
      payload: {
        decision: "Le visuel précis est retiré après vérification du signalement.",
        contentAction: "hide_media",
      },
    });
    expect(resolved.statusCode, resolved.body).toBe(200);
    expect(resolved.json().canHideMedia).toBe(false);

    const detail = await app.inject({
      method: "GET",
      url: "/v1/productions/reve-elodie-muses-2025",
    });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json().posters).toEqual([]);
  });

  it("masque un lieu communautaire et retire ses représentations publiques", async () => {
    const [source] = await db
      .insert(catalogSources)
      .values({
        externalKey: "community-venue-moderation",
        name: "Contribution communautaire de test",
        homepageUrl: "https://todam.fr/politique-editoriale",
        connectorKind: "community",
      })
      .returning({ id: catalogSources.id });
    const [document] = await db
      .insert(sourceDocuments)
      .values({
        sourceId: source!.id,
        externalKey: "community-venue-document",
        title: "Source officielle du lieu",
        url: "https://lieu-communautaire.example.test",
        retrievedAt: new Date(),
        rightsStatus: "community_submission",
      })
      .returning({ id: sourceDocuments.id });
    const [communityVenue] = await db
      .insert(venues)
      .values({
        slug: "lieu-communautaire-a-masquer",
        name: "Lieu communautaire à masquer",
        addressLine1: "3 place des Tests",
        postalCode: "84000",
        locality: "Avignon",
        countryCode: "FR",
        timezone: "Europe/Paris",
        officialUrl: "https://lieu-communautaire.example.test",
      })
      .returning({ id: venues.id });
    await db.insert(venueSources).values({
      entityId: communityVenue!.id,
      documentId: document!.id,
      externalKey: "community-venue-source",
    });
    await db.insert(performances).values({
      productionId,
      venueId: communityVenue!.id,
      startsAt: new Date("2027-07-15T18:00:00.000Z"),
      status: "scheduled",
    });

    const report = await app.inject({
      method: "POST",
      url: "/v1/content-reports",
      remoteAddress: "127.0.0.86",
      payload: {
        targetType: "venue",
        targetId: communityVenue!.id,
        category: "schedule",
        reason: "Ce lieu communautaire doit être retiré avec ses représentations.",
      },
    });
    expect(report.statusCode, report.body).toBe(200);

    const moderatorCookie = await signUp(
      "lieu-moderation@example.test",
      "lieu-moderation",
      "127.0.0.87",
    );
    await db
      .update(user)
      .set({ role: "trusted_contributor" })
      .where(eq(user.username, "lieu-moderation"));

    const resolved = await app.inject({
      method: "POST",
      url: `/v1/admin/content-reports/${report.json().id}/resolved`,
      headers: { cookie: moderatorCookie },
      payload: {
        decision:
          "Le lieu communautaire et ses représentations sont retirés du catalogue public.",
        contentAction: "hide",
      },
    });
    expect(resolved.statusCode, resolved.body).toBe(200);

    const hiddenVenue = await app.inject({
      method: "GET",
      url: "/v1/venues/lieu-communautaire-a-masquer",
    });
    expect(hiddenVenue.statusCode).toBe(404);
    const productionDetail = await app.inject({
      method: "GET",
      url: "/v1/productions/reve-elodie-muses-2025",
    });
    expect(productionDetail.statusCode, productionDetail.body).toBe(200);
    expect(
      productionDetail
        .json()
        .performances.some(
          (performance: { venue: { id: string } }) =>
            performance.venue.id === communityVenue!.id,
        ),
    ).toBe(false);
  });

  it("valide une revendication et publie une révision de compagnie", async () => {
    const [company] = await db
      .insert(companies)
      .values({
        slug: "compagnie-pilote",
        name: "Compagnie Pilote",
        shortDescription: "Une compagnie pilote engagée dans la création théâtrale.",
        description: "Version publique initiale.",
        officialUrl: "https://compagnie.example.test",
        publicationStatus: "published",
        reviewedAt: new Date(),
      })
      .returning({ id: companies.id });
    await db.insert(productionCompanies).values({
      companyId: company!.id,
      productionId,
      isPrimary: true,
    });
    const [touringProduction] = await db
      .insert(productions)
      .values({
        slug: "creation-en-tournee",
        title: "Création en tournée",
        discipline: "theatre",
        audience: "general",
        publicationStatus: "published",
        reviewedAt: new Date(),
      })
      .returning({ id: productions.id });
    await db.insert(productionCompanies).values({
      companyId: company!.id,
      productionId: touringProduction!.id,
      isPrimary: true,
    });
    const [touringPerformance] = await db
      .insert(performances)
      .values({
        productionId: touringProduction!.id,
        venueId,
        startsAt: new Date("2099-09-14T18:30:00.000Z"),
        status: "scheduled",
      })
      .returning({ id: performances.id });

    const representativeCookie = await signUp(
      "direction@compagnie.example.test",
      "direction-pilote",
      "127.0.0.71",
    );
    const claim = await app.inject({
      method: "POST",
      url: `/v1/me/company-claims/${company!.id}`,
      headers: { cookie: representativeCookie },
      payload: {
        representativeName: "Camille Martin",
        roleTitle: "Directrice artistique",
        professionalEmail: "direction@compagnie.example.test",
        officialWebsiteUrl: "https://compagnie.example.test",
        evidence:
          "Je dirige la compagnie et peux confirmer cette demande depuis le domaine officiel.",
        authorityConfirmed: true,
      },
    });
    expect(claim.statusCode, claim.body).toBe(200);

    const adminCookie = await signUp(
      "moderation@example.test",
      "moderation-todam",
      "127.0.0.72",
    );
    await db
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.username, "moderation-todam"));
    const approval = await app.inject({
      method: "POST",
      url: `/v1/admin/company-claims/${claim.json().id}/approved`,
      headers: { cookie: adminCookie },
      payload: {
        decisionReason: "Identité et domaine professionnel vérifiés manuellement.",
        membershipRole: "manager",
      },
    });
    expect(approval.statusCode, approval.body).toBe(200);
    expect(approval.json().status).toBe("approved");

    const [otherCompany] = await db
      .insert(companies)
      .values({
        slug: "compagnie-seconde",
        name: "Compagnie Seconde",
        description: "Une autre compagnie du catalogue pilote.",
        officialUrl: "https://seconde.example.test",
        publicationStatus: "published",
        reviewedAt: new Date(),
      })
      .returning({ id: companies.id });
    const secondClaim = await app.inject({
      method: "POST",
      url: `/v1/me/company-claims/${otherCompany!.id}`,
      headers: { cookie: representativeCookie },
      payload: {
        representativeName: "Camille Martin",
        roleTitle: "Responsable artistique",
        professionalEmail: "direction@compagnie.example.test",
        officialWebsiteUrl: "https://seconde.example.test",
        evidence:
          "Cette tentative vérifie la limite d’une seule compagnie par compte pendant le pilote.",
        authorityConfirmed: true,
      },
    });
    expect(secondClaim.statusCode).toBe(409);
    expect(secondClaim.json().code).toBe("COMPANY_MEMBERSHIP_ALREADY_EXISTS");

    const revision = await app.inject({
      method: "POST",
      url: `/v1/me/companies/${company!.id}/revisions`,
      headers: { cookie: representativeCookie },
      payload: {
        targetType: "company",
        targetId: company!.id,
        justification: "Mise à jour de la présentation publique.",
        changes: [
          {
            field: "description",
            newValue: "Version relue et transmise par la compagnie.",
            provenanceUrl: "https://compagnie.example.test/a-propos",
            rightsStatus: "permission_granted",
          },
        ],
      },
    });
    expect(revision.statusCode, revision.body).toBe(200);
    expect(revision.json().status).toBe("draft");
    const submitted = await app.inject({
      method: "POST",
      url: `/v1/me/catalog-revisions/${revision.json().id}/submit`,
      headers: { cookie: representativeCookie },
    });
    expect(submitted.statusCode, submitted.body).toBe(200);
    const beforeApproval = await app.inject({
      method: "GET",
      url: "/v1/companies/compagnie-pilote",
    });
    expect(beforeApproval.json().description).toBe("Version publique initiale.");
    expect(beforeApproval.json().touringDates).toEqual([
      expect.objectContaining({
        id: touringPerformance!.id,
        production: {
          id: touringProduction!.id,
          slug: "creation-en-tournee",
          title: "Création en tournée",
          discipline: "theatre",
        },
      }),
    ]);
    expect(beforeApproval.json().archives).toEqual([
      expect.objectContaining({
        id: productionId,
        company: expect.objectContaining({
          id: company!.id,
          slug: "compagnie-pilote",
        }),
      }),
    ]);

    const revisionApproval = await app.inject({
      method: "POST",
      url: `/v1/admin/catalog-revisions/${revision.json().id}/approved`,
      headers: { cookie: adminCookie },
      payload: {
        decisionReason: "Contenu cohérent et provenance professionnelle vérifiée.",
      },
    });
    expect(revisionApproval.statusCode, revisionApproval.body).toBe(200);
    const afterApproval = await app.inject({
      method: "GET",
      url: "/v1/companies/compagnie-pilote",
    });
    expect(afterApproval.json().description).toBe(
      "Version relue et transmise par la compagnie.",
    );

    const restored = await app.inject({
      method: "POST",
      url: `/v1/admin/catalog-revisions/${revision.json().id}/restore`,
      headers: { cookie: adminCookie },
      payload: {
        decisionReason: "Restauration demandée après contrôle éditorial.",
      },
    });
    expect(restored.statusCode, restored.body).toBe(200);
    const afterRestore = await app.inject({
      method: "GET",
      url: "/v1/companies/compagnie-pilote",
    });
    expect(afterRestore.json().description).toBe("Version publique initiale.");

    const draftProduction = await app.inject({
      method: "POST",
      url: `/v1/me/companies/${company!.id}/productions`,
      headers: { cookie: representativeCookie },
      payload: {
        title: "Création pilote 2027",
        discipline: "theatre",
        audience: "general",
        officialUrl: "https://compagnie.example.test/creation-2027",
      },
    });
    expect(draftProduction.statusCode, draftProduction.body).toBe(200);
    expect(draftProduction.json().publicationStatus).toBe("draft");

    const editableProductions = await app.inject({
      method: "GET",
      url: `/v1/me/companies/${company!.id}/productions`,
      headers: { cookie: representativeCookie },
    });
    expect(editableProductions.statusCode, editableProductions.body).toBe(200);
    expect(editableProductions.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: draftProduction.json().id }),
      ]),
    );

    const privateDraftWithoutSession = await app.inject({
      method: "GET",
      url: `/v1/me/companies/${company!.id}/productions/${draftProduction.json().id}`,
    });
    expect(privateDraftWithoutSession.statusCode).toBe(401);
    const editableDraftDetail = await app.inject({
      method: "GET",
      url: `/v1/me/companies/${company!.id}/productions/${draftProduction.json().id}`,
      headers: { cookie: representativeCookie },
    });
    expect(editableDraftDetail.statusCode, editableDraftDetail.body).toBe(200);
    expect(editableDraftDetail.json()).toMatchObject({
      id: draftProduction.json().id,
      title: "Création pilote 2027",
      discipline: "theatre",
    });

    const hiddenDraft = await app.inject({
      method: "GET",
      url: `/v1/productions/${draftProduction.json().slug}`,
    });
    expect(hiddenDraft.statusCode).toBe(404);

    const incompleteRightsRevision = await app.inject({
      method: "POST",
      url: `/v1/me/companies/${company!.id}/revisions`,
      headers: { cookie: representativeCookie },
      payload: {
        targetType: "production",
        targetId: draftProduction.json().id,
        changes: [
          {
            field: "description.full",
            newValue: {
              body: "Texte annoncé sous licence ouverte sans nom de licence.",
              locale: "fr",
              sourceUrl: "https://compagnie.example.test/creation-2027",
            },
            provenanceUrl: "https://compagnie.example.test/creation-2027",
            rightsStatus: "open_license",
          },
        ],
      },
    });
    expect(incompleteRightsRevision.statusCode).toBe(400);
    expect(incompleteRightsRevision.json().code).toBe("DESCRIPTION_LICENSE_REQUIRED");

    const productionRevision = await app.inject({
      method: "POST",
      url: `/v1/me/companies/${company!.id}/revisions`,
      headers: { cookie: representativeCookie },
      payload: {
        targetType: "production",
        targetId: draftProduction.json().id,
        justification: "Création complète transmise par la compagnie.",
        changes: [
          {
            field: "title",
            newValue: "Création pilote 2027",
            provenanceUrl: "https://compagnie.example.test/creation-2027",
            rightsStatus: null,
          },
          {
            field: "discipline",
            newValue: "ballet",
            provenanceUrl: "https://compagnie.example.test/creation-2027",
            rightsStatus: null,
          },
          {
            field: "durationMinutes",
            newValue: 65,
            provenanceUrl: "https://compagnie.example.test/creation-2027",
            rightsStatus: null,
          },
          {
            field: "language",
            newValue: "fr",
            provenanceUrl: "https://compagnie.example.test/creation-2027",
            rightsStatus: null,
          },
          {
            field: "description.short",
            newValue: {
              body: "Une création originale de la compagnie pour la saison 2027.",
              locale: "fr",
            },
            provenanceUrl: "https://compagnie.example.test/creation-2027",
            rightsStatus: "permission_granted",
          },
          {
            field: "description.full",
            newValue: {
              body: "Cette création chorégraphique originale organise un dialogue précis entre mouvement, espace et lumière.",
              locale: "fr",
            },
            provenanceUrl: "https://compagnie.example.test/creation-2027",
            rightsStatus: "permission_granted",
          },
          {
            field: "credits",
            newValue: [
              {
                artistId: null,
                name: "Camille Martin",
                role: "choreographer",
                label: null,
              },
            ],
            provenanceUrl: "https://compagnie.example.test/creation-2027",
            rightsStatus: null,
          },
          {
            field: "performances",
            newValue: [
              {
                venueId,
                startsAt: "2099-10-12T19:00:00.000Z",
                endsAt: "2099-10-12T20:05:00.000Z",
                status: "scheduled",
                officialUrl: "https://compagnie.example.test/creation-2027#billetterie",
              },
            ],
            provenanceUrl: "https://compagnie.example.test/creation-2027",
            rightsStatus: null,
          },
        ],
      },
    });
    expect(productionRevision.statusCode, productionRevision.body).toBe(200);
    const productionSubmitted = await app.inject({
      method: "POST",
      url: `/v1/me/catalog-revisions/${productionRevision.json().id}/submit`,
      headers: { cookie: representativeCookie },
    });
    expect(productionSubmitted.statusCode, productionSubmitted.body).toBe(200);
    const productionApproved = await app.inject({
      method: "POST",
      url: `/v1/admin/catalog-revisions/${productionRevision.json().id}/approved`,
      headers: { cookie: adminCookie },
      payload: {
        decisionReason:
          "Création, provenance et texte original contrôlés avant publication.",
      },
    });
    expect(productionApproved.statusCode, productionApproved.body).toBe(200);

    const nowPublic = await app.inject({
      method: "GET",
      url: `/v1/productions/${draftProduction.json().slug}`,
    });
    expect(nowPublic.statusCode, nowPublic.body).toBe(200);
    expect(nowPublic.json().title).toBe("Création pilote 2027");
    expect(nowPublic.json().discipline).toBe("ballet");

    const moderationHistory = await app.inject({
      method: "GET",
      url: "/v1/admin/catalog-revisions?status=all",
      headers: { cookie: adminCookie },
    });
    expect(moderationHistory.statusCode, moderationHistory.body).toBe(200);
    expect(moderationHistory.json().items.length).toBeGreaterThanOrEqual(2);
  }, 20_000);
});

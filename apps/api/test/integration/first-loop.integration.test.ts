import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
} from "@todam/contracts";
import {
  catalogSources,
  createDatabase,
  legalAcceptances,
  performances,
  productions,
  sourceDocuments,
  user,
  venues,
} from "@todam/database";
import type { EmailSender, TransactionalEmail } from "@todam/domain";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildServer } from "../../src/server.js";

const { db, pool } = createDatabase();
let app: FastifyInstance;
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
  await db.insert(sourceDocuments).values({
    sourceId: source!.id,
    externalKey: "test.production",
    title: "Fiche officielle",
    url: "https://www.letheatredesmuses.com/programme-adulte/",
    retrievedAt: new Date(),
    rightsStatus: "factual_metadata_only",
    license: null,
  });
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
    })
    .returning({ id: venues.id });
  venueId = venue!.id;
  const [production] = await db
    .insert(productions)
    .values({
      slug: "reve-elodie-muses-2025",
      title: "Le Rêve d'Élodie",
      discipline: "theatre",
      audience: "family",
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

describe("première boucle API sur PostgreSQL/PostGIS", () => {
  beforeAll(async () => {
    await assertIsolatedDatabase();
    app = await buildServer({ database: db, emailSender, logger: false });
  });
  beforeEach(async () => {
    await cleanDatabase();
    await seedCatalog();
  });
  afterAll(async () => {
    await app.close();
    await cleanDatabase();
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
    expect(privateDiary.statusCode).toBe(401);
    expect(privateDiaryRemoval.statusCode).toBe(401);
    expect(searchResponse.statusCode).toBe(200);
    expect(searchResponse.json().items[0].title).toBe("Le Rêve d'Élodie");
    expect(accentedSearchResponse.statusCode).toBe(200);
    expect(accentedSearchResponse.json().items[0].title).toBe("Le Rêve d'Élodie");
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
        },
        {
          slug: "spectacle-lointain-accueil",
          title: "Spectacle lointain",
          discipline: "opera",
          audience: "general",
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
      profile: { pseudonym: "spectatrice-accueil" },
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
        name: "autre-pseudonyme",
        username: "autre-pseudonyme",
        displayUsername: "autre-pseudonyme",
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
      pseudonym: "nom-occupe",
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
      payload: { username: "nouveau-pseudonyme" },
    });
    expect(duplicateUsername.statusCode).toBe(409);
    expect(duplicateUsername.json().code).toBe("USERNAME_ALREADY_TAKEN");
    expect(usernameChange.statusCode).toBe(200);
    expect(usernameChange.json()).toEqual({ username: "nouveau-pseudonyme" });
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
      .where(eq(user.pseudonym, "nouveau-pseudonyme"))
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
      .where(eq(user.pseudonym, "nouveau-pseudonyme"))
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
      seen: 1,
      watchlist: 0,
    });
    expect(dashboard.json().ratingDistribution[7]).toEqual({
      value: 8,
      count: 1,
    });
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
    expect(csvExport.statusCode).toBe(200);
    expect(csvExport.headers["content-type"]).toContain("text/csv");
    expect(csvExport.body).toContain("version_cgu");

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

    const revoked = await app.inject({
      method: "GET",
      url: "/v1/me/dashboard",
      headers: { cookie },
    });
    expect(revoked.statusCode).toBe(401);
  });

  it("publie uniquement les comptes vérifiés et le catalogue actif à venir", async () => {
    await signUp("verifiee@example.test", "compte-verifie");
    await db.insert(user).values({
      id: "compte-non-verifie",
      name: "Compte non vérifié",
      email: "non-verifie@example.test",
      emailVerified: false,
      pseudonym: "compte-non-verifie",
      ageConfirmedAt: new Date(),
      age15OrOlder: true,
      termsVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: new Date(),
      privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
      registrationChannel: "web",
    });

    const [activeProduction, inactiveProduction] = await db
      .insert(productions)
      .values([
        {
          slug: "spectacle-actif-statistiques",
          title: "Spectacle actif",
          discipline: "theatre",
          audience: "general",
        },
        {
          slug: "spectacle-inactif-statistiques",
          title: "Spectacle inactif",
          discipline: "theatre",
          audience: "general",
          isActive: false,
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
    });
    expect(new Date(response.json().generatedAt).toString()).not.toBe("Invalid Date");
  });
});

import {
  catalogSources,
  createDatabase,
  performances,
  productions,
  sourceDocuments,
  venues,
} from "@todam/database";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildServer } from "../../src/server.js";

const { db, pool } = createDatabase();
let app: FastifyInstance;
let productionId: string;
let performanceId: string;

async function cleanDatabase() {
  const tables = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables " +
      "where schemaname = 'public' and tablename <> '__drizzle_migrations'",
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
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/sign-up/email",
    payload: {
      name: username,
      username,
      displayUsername: username,
      email,
      password: "Todam-test-2026",
      ageConfirmedAt: new Date().toISOString(),
    },
  });
  expect(response.statusCode).toBe(200);
  const cookie = response.headers["set-cookie"];
  expect(cookie).toBeTruthy();
  return Array.isArray(cookie) ? cookie.join("; ") : cookie!;
}

describe("première boucle API sur PostgreSQL/PostGIS", () => {
  beforeAll(async () => {
    app = await buildServer({ database: db, logger: false });
  });
  beforeEach(async () => {
    await cleanDatabase();
    await seedCatalog();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it("protège les données personnelles et recherche sans accent", async () => {
    const privateResponse = await app.inject({
      method: "GET",
      url: "/v1/me/dashboard",
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

    expect(privateResponse.statusCode).toBe(401);
    expect(privateDiary.statusCode).toBe(401);
    expect(privateDiaryRemoval.statusCode).toBe(401);
    expect(searchResponse.statusCode).toBe(200);
    expect(searchResponse.json().items[0].title).toBe("Le Rêve d'Élodie");
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
});

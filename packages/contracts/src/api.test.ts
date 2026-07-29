import { describe, expect, it } from "vitest";

import {
  CitySearchQuerySchema,
  CompanyProductionParamsSchema,
  ContactBodySchema,
  EmailChangeBodySchema,
  EmailSignInBodySchema,
  HomeCityBodySchema,
  HomeResponseSchema,
  MarkSeenBodySchema,
  PasswordChangeBodySchema,
  ProductionDiaryResponseSchema,
  RatingBodySchema,
  SearchQuerySchema,
  UsernameSignInBodySchema,
  UpdateUsernameBodySchema,
} from "./api.js";
import { ProductionCardSchema } from "./catalog.js";

describe("contrats API", () => {
  it("valide et normalise un message de contact", () => {
    expect(
      ContactBodySchema.parse({
        name: "  Camille  ",
        email: "camille@example.test",
        subject: "  Une question  ",
        message: "  Bonjour, voici ma question.  ",
      }),
    ).toEqual({
      name: "Camille",
      email: "camille@example.test",
      subject: "Une question",
      message: "Bonjour, voici ma question.",
      website: "",
    });

    expect(() =>
      ContactBodySchema.parse({
        name: "",
        email: "adresse-invalide",
        subject: "Hi",
        message: "Trop court",
      }),
    ).toThrow();
    expect(() =>
      ContactBodySchema.parse({
        name: "Camille",
        email: "camille@example.test",
        subject: "Question",
        message: "Un message suffisamment détaillé.",
        website: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("décrit les connexions par email et nom d'utilisateur", () => {
    expect(
      EmailSignInBodySchema.parse({
        email: "spectatrice@example.test",
        password: "Todam-test-2026",
      }),
    ).toMatchObject({ email: "spectatrice@example.test" });
    expect(
      UsernameSignInBodySchema.parse({
        username: "spectatrice",
        password: "Todam-test-2026",
      }),
    ).toMatchObject({ username: "spectatrice" });
  });

  it("décrit les changements sensibles du compte", () => {
    expect(UpdateUsernameBodySchema.parse({ username: "  nouvelle-scene  " })).toEqual({
      username: "nouvelle-scene",
    });
    expect(
      EmailChangeBodySchema.parse({
        currentPassword: "Todam-test-2026",
        newEmail: "nouvelle@example.test",
        callbackURL: "https://todam.fr/email-verifie?mode=change-email",
      }),
    ).toMatchObject({ newEmail: "nouvelle@example.test" });
    expect(
      PasswordChangeBodySchema.parse({
        currentPassword: "Todam-test-2026",
        newPassword: "Todam-test-2027",
      }),
    ).toMatchObject({ newPassword: "Todam-test-2027" });
    expect(() => UpdateUsernameBodySchema.parse({ username: "ab" })).toThrow();
  });

  it("normalise la pagination de recherche", () => {
    expect(SearchQuerySchema.parse({ q: "Muses" })).toEqual({
      q: "Muses",
      type: "productions",
      temporal: "all",
      sort: "relevance",
      limit: 20,
    });
  });

  it("contraint les identifiants de l’éditeur privé d’une production", () => {
    expect(
      CompanyProductionParamsSchema.parse({
        companyId: "5aecf9f4-b9da-4da0-b8fa-8898e882d99f",
        productionId: "a902c9b8-7c10-4bef-898d-8037c0501480",
      }),
    ).toEqual({
      companyId: "5aecf9f4-b9da-4da0-b8fa-8898e882d99f",
      productionId: "a902c9b8-7c10-4bef-898d-8037c0501480",
    });
    expect(() =>
      CompanyProductionParamsSchema.parse({
        companyId: "compagnie",
        productionId: "production",
      }),
    ).toThrow();
  });

  it("contraint la ville à une option canonique du catalogue", () => {
    expect(CitySearchQuerySchema.parse({ q: "Mon" })).toEqual({
      q: "Mon",
      limit: 10,
    });
    expect(
      HomeCityBodySchema.parse({
        city: { locality: "Monaco", countryCode: "MC" },
      }),
    ).toEqual({
      city: { locality: "Monaco", countryCode: "MC" },
    });
    expect(() =>
      HomeCityBodySchema.parse({
        city: { locality: "Monaco", countryCode: "Monaco" },
      }),
    ).toThrow();
    expect(HomeCityBodySchema.parse({ city: null })).toEqual({ city: null });
  });

  it("décrit l'accueil connecté et sa progression sur cinq spectacles", () => {
    const home = HomeResponseSchema.parse({
      profile: { username: "spectatrice" },
      homeCity: {
        locality: "Monaco",
        countryCode: "MC",
        label: "Monaco",
      },
      progress: { current: 4, target: 5, completed: false },
      radiusKm: 50,
      nearby: [],
      nationalUpcoming: [],
      recentlyAdded: [],
    });

    expect(home.profile.username).toBe("spectatrice");
    expect(home.progress).toEqual({ current: 4, target: 5, completed: false });
  });

  it("refuse une note hors de l'échelle de 1 à 10", () => {
    expect(() => RatingBodySchema.parse({ value: 11 })).toThrow();
  });

  it("refuse une date personnelle avec une représentation précise", () => {
    expect(() =>
      MarkSeenBodySchema.parse({
        productionId: "5aecf9f4-b9da-4da0-b8fa-8898e882d99f",
        performanceId: "a902c9b8-7c10-4bef-898d-8037c0501480",
        attendedOn: "2026-01-01",
      }),
    ).toThrow();
  });

  it("décrit une séance avec sa représentation et son lieu", () => {
    const response = ProductionDiaryResponseSchema.parse({
      items: [
        {
          id: "5aecf9f4-b9da-4da0-b8fa-8898e882d99f",
          attendedOn: null,
          createdAt: "2026-07-24T12:00:00.000Z",
          performance: {
            id: "a902c9b8-7c10-4bef-898d-8037c0501480",
            startsAt: "2026-07-30T18:00:00.000Z",
            status: "scheduled",
            venue: {
              id: "acdb7d46-cb72-4109-a3ec-b075778623f2",
              slug: "theatre-des-muses",
              name: "Théâtre des Muses",
              locality: "Monaco",
              countryCode: "MC",
              timezone: "Europe/Monaco",
              officialUrl: null,
            },
          },
        },
      ],
    });

    expect(response.items[0]?.performance?.venue.timezone).toBe("Europe/Monaco");
  });

  it("expose une affiche avec son crédit et sa provenance", () => {
    const card = ProductionCardSchema.parse({
      id: "5aecf9f4-b9da-4da0-b8fa-8898e882d99f",
      slug: "une-piece",
      title: "Une pièce",
      discipline: "theatre",
      audience: "general",
      minimumAge: null,
      workTitle: null,
      primaryCredit: null,
      venueNames: ["Scène Exemple"],
      nextPerformance: "2026-09-10T18:00:00.000Z",
      poster: {
        id: "a902c9b8-7c10-4bef-898d-8037c0501480",
        url: "https://images.example.test/affiche.jpg",
        kind: "poster",
        alt: "Affiche de Une pièce",
        credit: "Compagnie Exemple",
        copyrightHolder: null,
        license: null,
        rightsStatus: "hotlink_only",
        sourceUrl: "https://example.test/une-piece",
        width: 1200,
        height: 1800,
      },
    });

    expect(card.poster?.credit).toBe("Compagnie Exemple");
  });
});

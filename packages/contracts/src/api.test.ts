import { describe, expect, it } from "vitest";

import {
  MarkSeenBodySchema,
  ProductionDiaryResponseSchema,
  RatingBodySchema,
  SearchQuerySchema,
} from "./api.js";

describe("contrats API", () => {
  it("normalise la pagination de recherche", () => {
    expect(SearchQuerySchema.parse({ q: "Muses" })).toEqual({
      q: "Muses",
      limit: 20,
    });
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
              timezone: "Europe/Monaco",
            },
          },
        },
      ],
    });

    expect(response.items[0]?.performance?.venue.timezone).toBe("Europe/Monaco");
  });
});

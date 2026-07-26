import { describe, expect, it } from "vitest";

import { PublicStatsSchema } from "./api.js";

describe("statistiques publiques", () => {
  it("valide les chiffres publics et leur date de génération", () => {
    expect(
      PublicStatsSchema.parse({
        verifiedUsers: 12,
        activeProductions: 48,
        upcomingPerformances: 96,
        generatedAt: "2026-07-26T12:00:00.000Z",
      }),
    ).toEqual({
      verifiedUsers: 12,
      activeProductions: 48,
      upcomingPerformances: 96,
      generatedAt: "2026-07-26T12:00:00.000Z",
    });
    expect(() =>
      PublicStatsSchema.parse({
        verifiedUsers: -1,
        activeProductions: 48,
        upcomingPerformances: 96,
        generatedAt: "maintenant",
      }),
    ).toThrow();
  });
});

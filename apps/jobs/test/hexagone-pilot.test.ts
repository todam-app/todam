import { describe, expect, it } from "vitest";

import {
  HEXAGONE_PILOT_PRODUCTIONS,
  HEXAGONE_PILOT_VERIFIED_AT,
  validateHexagonePilotData,
} from "../src/hexagone-pilot.js";

describe("cohorte pilote Hexagone", () => {
  it("reste dans le périmètre éditorial et sans visuel tiers", () => {
    expect(() => validateHexagonePilotData()).not.toThrow();
    expect(HEXAGONE_PILOT_PRODUCTIONS.length).toBeGreaterThanOrEqual(7);
    expect(
      HEXAGONE_PILOT_PRODUCTIONS.every((item) =>
        ["theatre", "ballet"].includes(item.discipline),
      ),
    ).toBe(true);
    expect(
      HEXAGONE_PILOT_PRODUCTIONS.every((item) =>
        item.officialUrl.startsWith("https://theatre-hexagone.mapado.com/"),
      ),
    ).toBe(true);
    expect(
      HEXAGONE_PILOT_PRODUCTIONS.flatMap((item) => item.performances).every(
        (date) =>
          new Date(date).getTime() > new Date(HEXAGONE_PILOT_VERIFIED_AT).getTime(),
      ),
    ).toBe(true);
  });

  it("sépare le titre et la compagnie", () => {
    for (const item of HEXAGONE_PILOT_PRODUCTIONS) {
      expect(item.title).not.toContain(item.company.name);
      expect(item.originalSummary.length).toBeGreaterThan(40);
      expect(item.company.shortDescription.length).toBeGreaterThan(40);
      expect(item.company.sourceUrl).toMatch(/^https:\/\//);
      expect(item.credits.length).toBeGreaterThan(0);
      expect(item.creditsSourceUrl).toMatch(/^https:\/\//);
    }
  });
});

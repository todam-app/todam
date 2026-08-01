import { describe, expect, it } from "vitest";

import { formatLocation, formatPerformance, getAsyncPresentation } from "../lib/format";

describe("présentation des états Expo", () => {
  it("donne la priorité au chargement puis à l'erreur et au vide", () => {
    expect(getAsyncPresentation(true, true, 0)).toBe("loading");
    expect(getAsyncPresentation(false, true, 3)).toBe("error");
    expect(getAsyncPresentation(false, false, 0)).toBe("empty");
    expect(getAsyncPresentation(false, false, 2)).toBe("content");
  });

  it("affiche une représentation avec le fuseau du lieu", () => {
    const formatted = formatPerformance("2025-10-05T14:00:00.000Z", "Europe/Monaco");
    expect(formatted).toContain("16:00");
  });

  it("affiche une ville et le nom français du pays", () => {
    expect(formatLocation("Grenoble", "FR")).toBe("Grenoble · France");
    expect(formatLocation("Grenoble", null)).toBe("Grenoble");
  });
});

import { describe, expect, it } from "vitest";

import { getRelatedProductionCardWidth } from "../lib/related-productions-carousel";

describe("getRelatedProductionCardWidth", () => {
  it("laisse entrevoir la carte suivante sur mobile", () => {
    expect(getRelatedProductionCardWidth(320)).toBe(248);
    expect(getRelatedProductionCardWidth(390)).toBe(318);
  });

  it("affiche plusieurs grandes cartes aux largeurs supérieures", () => {
    expect(getRelatedProductionCardWidth(768)).toBe(260);
    expect(getRelatedProductionCardWidth(1024)).toBe(280);
    expect(getRelatedProductionCardWidth(1440)).toBe(320);
  });
});

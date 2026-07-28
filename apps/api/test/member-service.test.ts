import { describe, expect, it } from "vitest";

import { communityRatingBucket } from "../src/member-service.js";

describe("filtres des spectacles personnels", () => {
  it("classe les moyennes communautaires par tranches et isole exactement 10", () => {
    expect(communityRatingBucket(null)).toBeNull();
    for (let value = 1; value <= 9; value += 1) {
      expect(communityRatingBucket(value)).toBe(value);
      expect(communityRatingBucket(value + 0.9)).toBe(value);
    }
    expect(communityRatingBucket(10)).toBe(10);
  });
});

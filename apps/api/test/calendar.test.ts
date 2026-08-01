import { describe, expect, it } from "vitest";

import { currentFrenchCalendarDate } from "../src/calendar.js";

describe("date calendaire du journal", () => {
  it("utilise le jour civil français autour de minuit", () => {
    expect(currentFrenchCalendarDate(new Date("2026-07-26T22:30:00.000Z"))).toBe(
      "2026-07-27",
    );
  });
});

import { describe, expect, it } from "vitest";

import { unverifiedAccountCutoff } from "../src/purge-unverified-users.js";

describe("purge des comptes non vérifiés", () => {
  it("retient une fenêtre exacte de sept jours", () => {
    expect(
      unverifiedAccountCutoff(new Date("2026-09-08T12:00:00.000Z")).toISOString(),
    ).toBe("2026-09-01T12:00:00.000Z");
  });
});

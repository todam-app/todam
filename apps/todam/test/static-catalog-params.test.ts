import { afterEach, describe, expect, it, vi } from "vitest";

import { areRouteLoadersDisabled } from "../lib/static-catalog-params";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("areRouteLoadersDisabled", () => {
  it("désactive les loaders pendant le développement", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TODAM_DISABLE_ROUTE_LOADERS", "");

    expect(areRouteLoadersDisabled()).toBe(true);
  });

  it("conserve les loaders pendant l'export de production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TODAM_DISABLE_ROUTE_LOADERS", "");

    expect(areRouteLoadersDisabled()).toBe(false);
  });

  it("respecte la désactivation explicite hors développement", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TODAM_DISABLE_ROUTE_LOADERS", "1");

    expect(areRouteLoadersDisabled()).toBe(true);
  });
});

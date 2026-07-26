import { describe, expect, it } from "vitest";

import { resolveBuildInfo } from "../lib/build-info";

describe("informations de build", () => {
  it("affiche un build local sans lien quand aucun SHA n'est injecté", () => {
    expect(resolveBuildInfo("0.1.0", undefined)).toEqual({
      version: "0.1.0",
      label: "build local",
      commitUrl: null,
    });
  });

  it("relie un build de production à son commit complet", () => {
    expect(
      resolveBuildInfo("0.1.0", "D755517B591BDA36B650107CD0A2B24DBA989053"),
    ).toEqual({
      version: "0.1.0",
      label: "build d755517",
      commitUrl:
        "https://github.com/todam-app/todam/commit/d755517b591bda36b650107cd0a2b24dba989053",
    });
  });
});

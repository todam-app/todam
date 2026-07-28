import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "../lib/json-ld";

describe("JSON-LD", () => {
  it("neutralise les séquences capables de fermer la balise script", () => {
    const serialized = serializeJsonLd({
      name: "</script><script>alert('xss')</script>",
      description: "Théâtre & ballet",
    });

    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(JSON.parse(serialized)).toEqual({
      name: "</script><script>alert('xss')</script>",
      description: "Théâtre & ballet",
    });
  });
});

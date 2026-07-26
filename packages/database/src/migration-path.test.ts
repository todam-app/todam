import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { migrationsFolder } from "./migration-path.js";

describe("dossier des migrations", () => {
  it("contient le journal Drizzle versionné", () => {
    expect(existsSync(join(migrationsFolder, "meta", "_journal.json"))).toBe(true);
  });
});

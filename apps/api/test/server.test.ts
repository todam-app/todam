import { randomUUID } from "node:crypto";

import type { TodamDatabase } from "@todam/database";
import { describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";

describe("API Todam", () => {
  it("répond au probe live et expose OpenAPI", async () => {
    const app = await buildServer({
      database: {} as TodamDatabase,
      logger: false,
    });

    const live = await app.inject({ method: "GET", url: "/health/live" });
    const openapi = await app.inject({ method: "GET", url: "/openapi.json" });

    expect(live.statusCode).toBe(200);
    expect(live.json()).toEqual({ status: "ok" });
    expect(openapi.statusCode).toBe(200);
    expect(openapi.json().info.title).toBe("API Todam");
    await app.close();
  });

  it("refuse un identifiant de production invalide avant l'authentification", async () => {
    const app = await buildServer({
      database: {} as TodamDatabase,
      logger: false,
    });
    const response = await app.inject({
      method: "GET",
      url: `/v1/me/productions/${randomUUID().slice(0, 8)}/state`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    await app.close();
  });

  it("autorise les mutations personnelles dans les précontrôles CORS", async () => {
    const app = await buildServer({
      database: {} as TodamDatabase,
      logger: false,
    });

    for (const method of ["PUT", "DELETE"]) {
      const response = await app.inject({
        method: "OPTIONS",
        url: `/v1/me/watchlist/${randomUUID()}`,
        headers: {
          origin: "http://localhost:8081",
          "access-control-request-method": method,
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:8081",
      );
      expect(response.headers["access-control-allow-methods"]).toContain(method);
    }

    await app.close();
  });
});

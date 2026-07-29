import { randomUUID } from "node:crypto";

import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
} from "@todam/contracts";
import type { TodamDatabase } from "@todam/database";
import type { EmailSender, TransactionalEmail } from "@todam/domain";
import { describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";

describe("API Todam", () => {
  it("envoie un message de contact à Todam sans utiliser la base", async () => {
    const sentEmails: TransactionalEmail[] = [];
    const emailSender: EmailSender = {
      async send(message) {
        sentEmails.push(message);
      },
    };
    const app = await buildServer({
      database: {} as TodamDatabase,
      emailSender,
      logger: false,
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/contact",
      payload: {
        name: "  Camille  ",
        email: "camille@example.test",
        subject: "  Une question  ",
        message: "Bonjour, voici ma question à propos de Todam.",
        website: "",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(sentEmails).toEqual([
      {
        to: "contact@todam.fr",
        replyTo: {
          email: "camille@example.test",
          name: "Camille",
        },
        subject: "[Todam] Une question",
        text: expect.stringContaining("Bonjour, voici ma question à propos de Todam."),
      },
    ]);
    await app.close();
  }, 15_000);

  it("ignore silencieusement le honeypot et refuse les messages invalides", async () => {
    const sentEmails: TransactionalEmail[] = [];
    const emailSender: EmailSender = {
      async send(message) {
        sentEmails.push(message);
      },
    };
    const app = await buildServer({
      database: {} as TodamDatabase,
      emailSender,
      logger: false,
    });

    const honeypot = await app.inject({
      method: "POST",
      url: "/v1/contact",
      payload: {
        name: "Robot",
        email: "robot@example.test",
        subject: "Message automatisé",
        message: "Ce message ne doit pas être transmis.",
        website: "https://spam.example.test",
      },
    });
    const invalid = await app.inject({
      method: "POST",
      url: "/v1/contact",
      payload: {
        name: "",
        email: "invalide",
        subject: "x",
        message: "court",
      },
    });

    expect(honeypot.statusCode).toBe(200);
    expect(invalid.statusCode).toBe(400);
    expect(sentEmails).toHaveLength(0);
    await app.close();
  }, 15_000);

  it("limite le formulaire de contact à cinq envois par heure et par IP", async () => {
    const emailSender: EmailSender = {
      async send() {},
    };
    const app = await buildServer({
      database: {} as TodamDatabase,
      emailSender,
      logger: false,
    });
    const payload = {
      name: "Camille",
      email: "camille@example.test",
      subject: "Une question",
      message: "Bonjour, voici ma question à propos de Todam.",
      website: "",
    };

    for (let index = 0; index < 5; index += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/contact",
        payload,
      });
      expect(response.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: "POST",
      url: "/v1/contact",
      payload,
    });

    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toMatchObject({ code: "RATE_LIMIT_EXCEEDED" });
    await app.close();
  }, 15_000);

  it("répond sans exposer Brevo lorsque le message ne peut pas être envoyé", async () => {
    const emailSender: EmailSender = {
      async send() {
        throw new Error("Erreur de transport confidentielle");
      },
    };
    const app = await buildServer({
      database: {} as TodamDatabase,
      emailSender,
      logger: false,
    });
    const response = await app.inject({
      method: "POST",
      url: "/v1/contact",
      payload: {
        name: "Camille",
        email: "camille@example.test",
        subject: "Une question",
        message: "Bonjour, voici ma question à propos de Todam.",
        website: "",
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      code: "CONTACT_DELIVERY_UNAVAILABLE",
      detail: "Le message n’a pas pu être envoyé. Réessayez dans quelques instants.",
    });
    expect(response.body).not.toContain("Brevo");
    expect(response.body).not.toContain("confidentielle");
    await app.close();
  }, 15_000);

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
  }, 15_000);

  it("publie les versions juridiques courantes sans accéder à la base", async () => {
    const app = await buildServer({
      database: {} as TodamDatabase,
      logger: false,
    });
    const response = await app.inject({ method: "GET", url: "/v1/legal/current" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      terms: { version: CURRENT_TERMS_VERSION },
      privacyNotice: { version: CURRENT_PRIVACY_NOTICE_VERSION },
    });
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
    const webAppOrigin = process.env.WEB_APP_URL ?? "http://localhost:8081";
    const app = await buildServer({
      database: {} as TodamDatabase,
      logger: false,
    });

    for (const origin of [webAppOrigin, "http://127.0.0.1:8082"]) {
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const response = await app.inject({
          method: "OPTIONS",
          url: `/v1/me/watchlist/${randomUUID()}`,
          headers: {
            origin,
            "access-control-request-method": method,
          },
        });

        expect(response.statusCode).toBe(204);
        expect(response.headers["access-control-allow-origin"]).toBe(origin);
        expect(response.headers["access-control-allow-methods"]).toContain(method);
      }
    }

    await app.close();
  });
});

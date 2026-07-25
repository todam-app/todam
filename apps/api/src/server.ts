import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { TodamDatabase } from "@todam/database";
import Fastify, { type FastifyError } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import { createAuth } from "./auth.js";
import { createAccountService } from "./account-service.js";
import { createCatalogService } from "./catalog-service.js";
import { createEmailSenderFromEnvironment, type EmailSender } from "./email.js";
import { HttpProblem, problemDocument } from "./errors.js";
import { registerRoutes } from "./routes.js";
import { assertProductionConfiguration } from "./production-config.js";

export interface BuildServerOptions {
  database: TodamDatabase;
  logger?: boolean;
  emailSender?: EmailSender;
}

function statusTitle(status: number): string {
  switch (status) {
    case 400:
      return "Requête invalide";
    case 401:
      return "Authentification requise";
    case 404:
      return "Ressource introuvable";
    case 409:
      return "Conflit";
    case 429:
      return "Trop de requêtes";
    default:
      return "Erreur interne";
  }
}

export async function buildServer(options: BuildServerOptions) {
  assertProductionConfiguration();
  const redaction = {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers.set-cookie",
      "req.body.email",
      "req.body.password",
      "req.body.token",
    ],
    censor: "[MASQUÉ]",
  };
  const logger =
    options.logger === false
      ? false
      : process.env.NODE_ENV === "development"
        ? { redact: redaction, transport: { target: "pino-pretty" } }
        : { redact: redaction };
  const app = Fastify({
    logger,
    trustProxy: true,
  });
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
    if (process.env.NODE_ENV === "production") {
      reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    }
    return payload;
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: process.env.WEB_APP_URL ?? "http://localhost:8081",
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE"],
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "API Todam",
        description:
          "Contrats publics de la première boucle Todam consacrée au spectacle vivant.",
        version: "0.1.0",
      },
      servers: [{ url: "http://localhost:3000" }],
      components: {
        securitySchemes: {
          sessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "better-auth.session_token",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, {
    routePrefix: "/documentation",
  });

  const emailSender = options.emailSender ?? createEmailSenderFromEnvironment();
  const auth = createAuth(options.database, emailSender);
  const account = createAccountService(options.database, emailSender);
  const catalog = createCatalogService(options.database);
  await registerRoutes(app, { account, auth, catalog });

  app.setNotFoundHandler((request, reply) =>
    reply
      .status(404)
      .type("application/problem+json")
      .send(
        problemDocument(
          404,
          "Ressource introuvable",
          "Cette route n'existe pas.",
          "ROUTE_NOT_FOUND",
          request.url,
        ),
      ),
  );

  app.setErrorHandler((error: FastifyError | HttpProblem, request, reply) => {
    if (error instanceof HttpProblem) {
      return reply
        .status(error.status)
        .type("application/problem+json")
        .send(
          problemDocument(
            error.status,
            statusTitle(error.status),
            error.message,
            error.code,
            request.url,
          ),
        );
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply
        .status(400)
        .type("application/problem+json")
        .send(
          problemDocument(
            400,
            "Requête invalide",
            "Les données envoyées ne respectent pas le contrat de l'API.",
            "VALIDATION_ERROR",
            request.url,
          ),
        );
    }

    request.log.error(error);
    return reply
      .status(500)
      .type("application/problem+json")
      .send(
        problemDocument(
          500,
          "Erreur interne",
          "Une erreur inattendue est survenue.",
          "INTERNAL_ERROR",
          request.url,
        ),
      );
  });

  return app;
}

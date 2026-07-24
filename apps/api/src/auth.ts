import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import {
  account,
  schema,
  session,
  user,
  verification,
  type TodamDatabase,
} from "@todam/database";
import { betterAuth } from "better-auth";
import type { FastifyReply, FastifyRequest } from "fastify";

import { HttpProblem } from "./errors.js";

export function createAuth(database: TodamDatabase) {
  const baseUrl = process.env.BETTER_AUTH_URL
    ? process.env.BETTER_AUTH_URL.replace(/\/v1\/auth\/?$/, "")
    : "http://127.0.0.1:3000";
  const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:8081";

  return betterAuth({
    appName: "Todam",
    baseURL: baseUrl,
    basePath: "/v1/auth",
    secret:
      process.env.BETTER_AUTH_SECRET ??
      "development-only-secret-change-before-production",
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: {
        ...schema,
        user,
        session,
        account,
        verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    trustedOrigins: [
      webAppUrl,
      "todam://",
      ...(process.env.NODE_ENV === "development"
        ? ["exp://", "exp://**", "http://localhost:*"]
        : []),
    ],
    user: {
      additionalFields: {
        pseudonym: {
          type: "string",
          required: true,
          input: true,
        },
        ageConfirmedAt: {
          type: "date",
          required: true,
          input: true,
        },
        role: {
          type: "string",
          required: false,
          defaultValue: "member",
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (candidate) => {
            const pseudonym =
              typeof candidate.pseudonym === "string" ? candidate.pseudonym.trim() : "";
            if (pseudonym.length < 3 || pseudonym.length > 30) {
              throw new HttpProblem(
                400,
                "INVALID_PSEUDONYM",
                "Le pseudonyme doit contenir entre 3 et 30 caractères.",
              );
            }
            if (!candidate.ageConfirmedAt) {
              throw new HttpProblem(
                400,
                "AGE_CONFIRMATION_REQUIRED",
                "La déclaration d'âge est obligatoire.",
              );
            }
            return {
              data: {
                ...candidate,
                name: pseudonym,
                pseudonym,
                ageConfirmedAt: new Date(),
                role: "member",
              },
            };
          },
        },
      },
    },
    plugins: [expo()],
  });
}

export type TodamAuth = ReturnType<typeof createAuth>;

function toWebHeaders(request: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, String(value));
    }
  }
  return headers;
}

export async function getRequiredUserId(
  auth: TodamAuth,
  request: FastifyRequest,
): Promise<string> {
  const current = await auth.api.getSession({
    headers: toWebHeaders(request),
  });
  if (!current?.user.id) {
    throw new HttpProblem(
      401,
      "AUTHENTICATION_REQUIRED",
      "Connecte-toi pour effectuer cette action.",
    );
  }
  return current.user.id;
}

export async function handleAuthRequest(
  auth: TodamAuth,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const host = request.headers.host ?? "127.0.0.1:3000";
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProtocol === "string" ? forwardedProtocol : "http";
  const url = new URL(request.raw.url ?? "/v1/auth", `${protocol}://${host}`);
  const headers = toWebHeaders(request);
  let body: BodyInit | undefined;

  if (!["GET", "HEAD"].includes(request.method)) {
    if (typeof request.body === "string") {
      body = request.body;
    } else if (request.body instanceof Uint8Array) {
      body = Buffer.from(request.body).toString("utf8");
    } else if (request.body !== undefined) {
      body = JSON.stringify(request.body);
    }
  }

  const response = await auth.handler(
    new Request(url, {
      method: request.method,
      headers,
      ...(body === undefined ? {} : { body }),
    }),
  );

  reply.status(response.status);
  for (const [name, value] of response.headers.entries()) {
    if (name.toLowerCase() !== "set-cookie") {
      reply.header(name, value);
    }
  }
  const responseHeaders = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = responseHeaders.getSetCookie?.() ?? [];
  if (cookies.length > 0) {
    reply.header("set-cookie", cookies);
  }
  const payload = Buffer.from(await response.arrayBuffer());
  return reply.send(payload);
}

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
} from "@todam/contracts";
import {
  account,
  schema,
  session,
  user,
  verification,
  type TodamDatabase,
} from "@todam/database";
import type { EmailSender } from "@todam/domain";
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

import { HttpProblem } from "./errors.js";
import { currentLegalDocuments } from "./legal.js";

export function createAuth(database: TodamDatabase, emailSender: EmailSender) {
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
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: target, url }) => {
        await emailSender.send({
          to: target.email,
          subject: "Réinitialisez votre mot de passe Todam",
          text:
            "Utilisez ce lien dans l'heure pour choisir un nouveau mot de passe : " +
            `${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 24 * 60 * 60,
      sendVerificationEmail: async ({ user: target, url }) => {
        await emailSender.send({
          to: target.email,
          subject: "Confirmez votre adresse e-mail Todam",
          text:
            "Confirmez votre adresse e-mail dans les 24 heures pour activer votre compte : " +
            `${url}\n\nSi vous n'avez pas créé ce compte, ignorez cet e-mail.`,
        });
      },
      afterEmailVerification: async (verifiedUser) => {
        const rows = await database
          .select({
            email: user.email,
            termsVersion: user.termsVersion,
            privacyNoticeVersion: user.privacyNoticeVersion,
            termsAcceptedAt: user.termsAcceptedAt,
          })
          .from(user)
          .where(eq(user.id, verifiedUser.id))
          .limit(1);
        const profile = rows[0];
        if (!profile) return;

        const documents = currentLegalDocuments();
        try {
          await emailSender.send({
            to: profile.email,
            subject: "Votre compte Todam est activé",
            text:
              "Votre compte Todam est activé.\n\n" +
              `CGU acceptées : version ${profile.termsVersion}, le ${profile.termsAcceptedAt.toISOString()}.\n` +
              `Politique de confidentialité présentée : version ${profile.privacyNoticeVersion}.\n` +
              `Archive des CGU : ${documents.terms.pdfUrl}\n` +
              `Archive de la politique : ${documents.privacyNotice.pdfUrl}`,
          });
        } catch {
          console.error("L'e-mail de preuve juridique n'a pas pu être envoyé.");
        }
      },
    },
    disabledPaths: ["/is-username-available"],
    trustedOrigins: [
      webAppUrl,
      "todam://",
      ...(process.env.NODE_ENV === "development"
        ? ["exp://", "exp://**", "http://localhost:*"]
        : []),
    ],
    user: {
      additionalFields: {
        ageConfirmedAt: {
          type: "date",
          required: false,
          input: false,
        },
        age15OrOlder: {
          type: "boolean",
          required: true,
          input: true,
        },
        termsVersion: {
          type: "string",
          required: true,
          input: true,
        },
        termsAcceptedAt: {
          type: "date",
          required: false,
          input: false,
        },
        privacyNoticeVersion: {
          type: "string",
          required: true,
          input: true,
        },
        channel: {
          type: "string",
          required: true,
          input: true,
          fieldName: "registrationChannel",
        },
        role: {
          type: "string",
          required: false,
          defaultValue: "member",
          input: false,
        },
      },
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 24 * 60 * 60,
        sendDeleteAccountVerification: async ({ user: target, url }) => {
          await emailSender.send({
            to: target.email,
            subject: "Confirmez la suppression de votre compte Todam",
            text:
              "Confirmez la suppression définitive de votre compte dans les 24 heures : " +
              `${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
          });
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (candidate) => {
            const usernameValue =
              typeof candidate.username === "string" ? candidate.username.trim() : "";
            if (usernameValue.length < 3 || usernameValue.length > 30) {
              throw new HttpProblem(
                400,
                "INVALID_PSEUDONYM",
                "Le nom d'utilisateur doit contenir entre 3 et 30 caractères.",
              );
            }
            if (candidate.age15OrOlder !== true) {
              throw new HttpProblem(
                400,
                "AGE_CONFIRMATION_REQUIRED",
                "La déclaration d'âge est obligatoire.",
              );
            }
            if (
              candidate.termsVersion !== CURRENT_TERMS_VERSION ||
              candidate.privacyNoticeVersion !== CURRENT_PRIVACY_NOTICE_VERSION
            ) {
              throw new HttpProblem(
                409,
                "LEGAL_VERSION_OUTDATED",
                "Les documents juridiques présentés ne sont plus à jour.",
              );
            }
            if (candidate.channel !== "web" && candidate.channel !== "android") {
              throw new HttpProblem(
                400,
                "INVALID_REGISTRATION_CHANNEL",
                "Le canal d'inscription est invalide.",
              );
            }

            const acceptedAt = new Date();
            return {
              data: {
                ...candidate,
                name: usernameValue,
                username: usernameValue,
                displayUsername: usernameValue,
                ageConfirmedAt: acceptedAt,
                age15OrOlder: true,
                termsVersion: CURRENT_TERMS_VERSION,
                termsAcceptedAt: acceptedAt,
                privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
                channel: candidate.channel,
                role: "member",
              },
            };
          },
        },
      },
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 30,
        usernameValidator: () => true,
        usernameNormalization: (value) => value.trim(),
        displayUsernameNormalization: (value) => value.trim(),
        schema: {
          user: {
            fields: {
              username: "pseudonym",
              displayUsername: "name",
            },
          },
        },
      }),
      expo(),
    ],
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

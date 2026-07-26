import {
  AcceptedResponseSchema,
  AccountDeletionConfirmSchema,
  AccountDeletionRequestSchema,
  AccountExportQuerySchema,
  AccountExportResponseSchema,
  DashboardSchema,
  DiaryEntryIdParamsSchema,
  EmailSignInBodySchema,
  HealthResponseSchema,
  LegalCurrentResponseSchema,
  MarkSeenBodySchema,
  MutationResponseSchema,
  ProblemDetailsSchema,
  ProductionDiaryResponseSchema,
  ProductionIdParamsSchema,
  ProductionParamsSchema,
  ProductionResponseSchema,
  PublicStatsSchema,
  RatingBodySchema,
  SearchQuerySchema,
  SearchResponseSchema,
  SignUpBodySchema,
  UsernameSignInBodySchema,
  ViewerProductionStateSchema,
} from "@todam/contracts";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { accountExportToCsv, type AccountService } from "./account-service.js";
import type { TodamAuth } from "./auth.js";
import { getRequiredUserId, handleAuthRequest } from "./auth.js";
import type { CatalogService } from "./catalog-service.js";
import { currentLegalDocuments } from "./legal.js";
import type { PublicStatsService } from "./public-stats-service.js";
import { InMemoryRateLimiter } from "./rate-limit.js";

const problemResponses = {
  400: ProblemDetailsSchema,
  401: ProblemDetailsSchema,
  404: ProblemDetailsSchema,
  409: ProblemDetailsSchema,
  429: ProblemDetailsSchema,
  500: ProblemDetailsSchema,
};

export interface RouteDependencies {
  account: AccountService;
  auth: TodamAuth;
  catalog: CatalogService;
  publicStats: PublicStatsService;
}

export async function registerRoutes(
  baseApp: FastifyInstance,
  dependencies: RouteDependencies,
) {
  const app = baseApp.withTypeProvider<ZodTypeProvider>();
  const { account, auth, catalog, publicStats } = dependencies;
  const rateLimiter = new InMemoryRateLimiter();
  const guardAuth = (scope: string, ip: string) =>
    rateLimiter.assertAllowed(`auth:${scope}:${ip}`, 10, 15 * 60_000);
  const guardDeletion = (ip: string) =>
    rateLimiter.assertAllowed(`delete:${ip}`, 5, 60 * 60_000);

  app.get(
    "/v1/legal/current",
    {
      schema: {
        tags: ["Juridique"],
        summary: "Retourne les documents juridiques actuellement applicables",
        response: { 200: LegalCurrentResponseSchema },
      },
    },
    async () => currentLegalDocuments(),
  );

  app.get(
    "/v1/public/stats",
    {
      schema: {
        tags: ["Transparence"],
        summary: "Retourne les chiffres publics de Todam",
        response: {
          200: PublicStatsSchema,
          ...problemResponses,
        },
      },
    },
    async (_request, reply) =>
      reply
        .header("cache-control", "public, max-age=60, stale-while-revalidate=300")
        .send(await publicStats.getStats()),
  );

  app.post(
    "/v1/auth/sign-up/email",
    {
      schema: {
        tags: ["Authentification"],
        summary: "Crée un compte avec les versions juridiques présentées",
        body: SignUpBodySchema,
      },
      preHandler: async (request) => guardAuth("signup", request.ip),
    },
    (request, reply) => handleAuthRequest(auth, request, reply),
  );

  app.post(
    "/v1/auth/sign-in/email",
    {
      schema: {
        tags: ["Authentification"],
        summary: "Connecte un compte avec son email",
        body: EmailSignInBodySchema,
      },
      preHandler: async (request) => guardAuth("signin-email", request.ip),
    },
    (request, reply) => handleAuthRequest(auth, request, reply),
  );

  app.post(
    "/v1/auth/sign-in/username",
    {
      schema: {
        tags: ["Authentification"],
        summary: "Connecte un compte avec son nom d'utilisateur",
        body: UsernameSignInBodySchema,
      },
      preHandler: async (request) => guardAuth("signin-username", request.ip),
    },
    (request, reply) => handleAuthRequest(auth, request, reply),
  );

  app.route({
    method: ["GET", "POST"],
    url: "/v1/auth/*",
    schema: { hide: true },
    preHandler: async (request) => {
      if (request.method === "POST") guardAuth(request.url, request.ip);
    },
    handler: (request, reply) => handleAuthRequest(auth, request, reply),
  });

  app.get(
    "/health/live",
    {
      schema: {
        tags: ["Santé"],
        summary: "Vérifie que le processus API répond",
        response: { 200: HealthResponseSchema },
      },
    },
    async () => ({ status: "ok" as const }),
  );

  app.get(
    "/v1/me/export",
    {
      schema: {
        tags: ["Compte"],
        summary: "Exporte toutes les données du compte en JSON ou CSV",
        security: [{ sessionCookie: [] }],
        querystring: AccountExportQuerySchema,
        response: {
          200: AccountExportResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request, reply) => {
      const userId = await getRequiredUserId(auth, request);
      const exported = await account.exportAccount(userId);
      if (request.query.format === "csv") {
        return reply
          .type("text/csv; charset=utf-8")
          .header(
            "content-disposition",
            `attachment; filename="todam-export-${new Date().toISOString().slice(0, 10)}.csv"`,
          )
          .send(accountExportToCsv(exported));
      }
      return exported;
    },
  );

  app.post(
    "/v1/account-deletion/request",
    {
      schema: {
        tags: ["Compte"],
        summary: "Envoie un lien public de suppression de compte",
        body: AccountDeletionRequestSchema,
        response: {
          202: AcceptedResponseSchema,
          ...problemResponses,
        },
      },
      preHandler: async (request) => guardDeletion(request.ip),
    },
    async (request, reply) => {
      await account.requestDeletion(request.body.email);
      return reply.status(202).send({ accepted: true as const });
    },
  );

  app.post(
    "/v1/account-deletion/confirm",
    {
      schema: {
        tags: ["Compte"],
        summary: "Supprime le compte associé à un jeton confirmé",
        body: AccountDeletionConfirmSchema,
        response: {
          200: AcceptedResponseSchema,
          ...problemResponses,
        },
      },
      preHandler: async (request) => guardDeletion(request.ip),
    },
    async (request) => {
      await account.confirmDeletion(request.body.token);
      return { accepted: true as const };
    },
  );

  app.get(
    "/health/ready",
    {
      schema: {
        tags: ["Santé"],
        summary: "Vérifie que PostgreSQL répond",
        response: {
          200: HealthResponseSchema,
          503: HealthResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      try {
        await catalog.ping();
        return { status: "ok" as const };
      } catch {
        return reply.status(503).send({ status: "unavailable" as const });
      }
    },
  );

  app.get(
    "/openapi.json",
    {
      schema: {
        hide: true,
      },
    },
    async () => app.swagger(),
  );

  app.get(
    "/v1/search",
    {
      schema: {
        tags: ["Catalogue"],
        summary: "Recherche des spectacles, artistes et lieux",
        querystring: SearchQuerySchema,
        response: {
          200: SearchResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => catalog.search(request.query),
  );

  app.get(
    "/v1/productions/:slug",
    {
      schema: {
        tags: ["Catalogue"],
        summary: "Consulte le détail d'une production",
        params: ProductionParamsSchema,
        response: {
          200: ProductionResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => catalog.getProduction(request.params.slug),
  );

  app.get(
    "/v1/me/productions/:id/state",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte l'état personnel d'une production",
        security: [{ sessionCookie: [] }],
        params: ProductionIdParamsSchema,
        response: {
          200: ViewerProductionStateSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return catalog.getProductionState(userId, request.params.id);
    },
  );

  app.get(
    "/v1/me/productions/:id/diary",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte les séances d'une production dans le journal",
        security: [{ sessionCookie: [] }],
        params: ProductionIdParamsSchema,
        response: {
          200: ProductionDiaryResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      const items = await catalog.getProductionDiary(userId, request.params.id);
      return { items };
    },
  );

  app.get(
    "/v1/me/dashboard",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte le tableau de bord personnel",
        security: [{ sessionCookie: [] }],
        response: {
          200: DashboardSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return catalog.getDashboard(userId);
    },
  );

  app.post(
    "/v1/me/diary",
    {
      schema: {
        tags: ["Compte"],
        summary: "Marque une production comme vue",
        security: [{ sessionCookie: [] }],
        body: MarkSeenBodySchema,
        response: {
          200: MutationResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      const state = await catalog.markSeen(userId, request.body);
      return { state };
    },
  );

  app.delete(
    "/v1/me/diary/:entryId",
    {
      schema: {
        tags: ["Compte"],
        summary: "Retire une séance du journal",
        security: [{ sessionCookie: [] }],
        params: DiaryEntryIdParamsSchema,
        response: {
          200: MutationResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      const state = await catalog.deleteDiaryEntry(userId, request.params.entryId);
      return { state };
    },
  );

  app.put(
    "/v1/me/productions/:id/rating",
    {
      schema: {
        tags: ["Compte"],
        summary: "Crée ou modifie une note",
        security: [{ sessionCookie: [] }],
        params: ProductionIdParamsSchema,
        body: RatingBodySchema,
        response: {
          200: MutationResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      const state = await catalog.setRating(
        userId,
        request.params.id,
        request.body.value,
      );
      return { state };
    },
  );

  app.delete(
    "/v1/me/productions/:id/rating",
    {
      schema: {
        tags: ["Compte"],
        summary: "Supprime une note sans effacer le statut vu",
        security: [{ sessionCookie: [] }],
        params: ProductionIdParamsSchema,
        response: {
          200: MutationResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      const state = await catalog.deleteRating(userId, request.params.id);
      return { state };
    },
  );

  app.put(
    "/v1/me/watchlist/:id",
    {
      schema: {
        tags: ["Compte"],
        summary: "Ajoute une production à la liste À voir",
        security: [{ sessionCookie: [] }],
        params: ProductionIdParamsSchema,
        response: {
          200: MutationResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      const state = await catalog.setWatchlist(userId, request.params.id, true);
      return { state };
    },
  );

  app.delete(
    "/v1/me/watchlist/:id",
    {
      schema: {
        tags: ["Compte"],
        summary: "Retire une production de la liste À voir",
        security: [{ sessionCookie: [] }],
        params: ProductionIdParamsSchema,
        response: {
          200: MutationResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      const state = await catalog.setWatchlist(userId, request.params.id, false);
      return { state };
    },
  );
}

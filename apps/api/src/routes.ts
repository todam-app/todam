import {
  DashboardSchema,
  DiaryEntryIdParamsSchema,
  HealthResponseSchema,
  MarkSeenBodySchema,
  MutationResponseSchema,
  ProblemDetailsSchema,
  ProductionDiaryResponseSchema,
  ProductionIdParamsSchema,
  ProductionParamsSchema,
  ProductionResponseSchema,
  RatingBodySchema,
  SearchQuerySchema,
  SearchResponseSchema,
  ViewerProductionStateSchema,
} from "@todam/contracts";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { TodamAuth } from "./auth.js";
import { getRequiredUserId, handleAuthRequest } from "./auth.js";
import type { CatalogService } from "./catalog-service.js";

const problemResponses = {
  400: ProblemDetailsSchema,
  401: ProblemDetailsSchema,
  404: ProblemDetailsSchema,
  409: ProblemDetailsSchema,
  500: ProblemDetailsSchema,
};

export interface RouteDependencies {
  auth: TodamAuth;
  catalog: CatalogService;
}

export async function registerRoutes(
  baseApp: FastifyInstance,
  dependencies: RouteDependencies,
) {
  const app = baseApp.withTypeProvider<ZodTypeProvider>();
  const { auth, catalog } = dependencies;

  app.route({
    method: ["GET", "POST"],
    url: "/v1/auth/*",
    schema: { hide: true },
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

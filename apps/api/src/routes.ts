import {
  AcceptedResponseSchema,
  AdminCatalogCandidatesQuerySchema,
  AdminContentReportsQuerySchema,
  AdminCatalogRevisionsQuerySchema,
  AdminCompanyClaimsQuerySchema,
  AccountDeletionConfirmSchema,
  AccountDeletionRequestSchema,
  AccountExportQuerySchema,
  AccountExportResponseSchema,
  AddListItemBodySchema,
  CatalogRevisionIdParamsSchema,
  CatalogCandidateParamsSchema,
  CatalogCandidatesResponseSchema,
  CatalogRevisionResponseSchema,
  CatalogRevisionsResponseSchema,
  CitySearchQuerySchema,
  CitySearchResponseSchema,
  CompanyClaimIdParamsSchema,
  CompanyClaimResponseSchema,
  CompanyClaimsResponseSchema,
  CompanyIdParamsSchema,
  CompanyMembershipsResponseSchema,
  CompanyParamsSchema,
  CompanyProductionParamsSchema,
  CompanyResponseSchema,
  ContentReportBodySchema,
  ContentReportIdParamsSchema,
  ContentReportSchema,
  ContentReportsResponseSchema,
  ContentReportResponseSchema,
  CreateCatalogRevisionBodySchema,
  CreateCompanyClaimBodySchema,
  CreateCompanyProductionBodySchema,
  CreateListBodySchema,
  DashboardSchema,
  DiaryEntryIdParamsSchema,
  EmailChangeBodySchema,
  EmailChangeResponseSchema,
  EmailSignInBodySchema,
  EmptyResponseSchema,
  EditableProductionResponseSchema,
  EditableProductionDetailResponseSchema,
  EditableProductionsResponseSchema,
  HealthResponseSchema,
  HomeCityBodySchema,
  HomeCityResponseSchema,
  HomeResponseSchema,
  LegalCurrentResponseSchema,
  ListIdParamsSchema,
  ListItemParamsSchema,
  ListResponseSchema,
  ListsResponseSchema,
  MarkSeenBodySchema,
  MemberJournalPageSchema,
  MemberJournalQuerySchema,
  MemberListParamsSchema,
  MemberListResponseSchema,
  MemberParamsSchema,
  MemberResponseSchema,
  MyShowsQuerySchema,
  MyShowsResponseSchema,
  ModerateClaimBodySchema,
  ModerateContentReportBodySchema,
  MutationResponseSchema,
  OwnReviewsPageSchema,
  PasswordChangeBodySchema,
  PasswordChangeResponseSchema,
  ProblemDetailsSchema,
  ProductionDiaryResponseSchema,
  ProductionIdParamsSchema,
  ProductionParamsSchema,
  ProductionResponseSchema,
  ProfileSettingsResponseSchema,
  PublicStatsSchema,
  RatingBodySchema,
  ReorderListBodySchema,
  ReviewProductionParamsSchema,
  ReviewRevisionBodySchema,
  SearchQuerySchema,
  SearchResponseSchema,
  SignUpBodySchema,
  UpdateCatalogRevisionBodySchema,
  UpdateDiaryEntryBodySchema,
  UpdateListBodySchema,
  UpdateProfileBodySchema,
  UpdateUsernameBodySchema,
  UpdateUsernameResponseSchema,
  UpsertReviewBodySchema,
  UsernameSignInBodySchema,
  VenueParamsSchema,
  VenueResponseSchema,
  ViewerProductionStateSchema,
  WatchlistPageSchema,
} from "@todam/contracts";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { accountExportToCsv, type AccountService } from "./account-service.js";
import type { TodamAuth } from "./auth.js";
import {
  forwardAuthHeaders,
  getOptionalUserId,
  getRequiredUserId,
  handleAuthRequest,
  toWebHeaders,
} from "./auth.js";
import type { CatalogService } from "./catalog-service.js";
import { HttpProblem } from "./errors.js";
import { currentLegalDocuments } from "./legal.js";
import type { MemberService } from "./member-service.js";
import type { ProfessionalService } from "./professional-service.js";
import type { PublicStatsService } from "./public-stats-service.js";
import { InMemoryRateLimiter } from "./rate-limit.js";

const problemResponses = {
  400: ProblemDetailsSchema,
  401: ProblemDetailsSchema,
  403: ProblemDetailsSchema,
  404: ProblemDetailsSchema,
  409: ProblemDetailsSchema,
  429: ProblemDetailsSchema,
  500: ProblemDetailsSchema,
};

export interface RouteDependencies {
  account: AccountService;
  auth: TodamAuth;
  catalog: CatalogService;
  member: MemberService;
  professional: ProfessionalService;
  publicStats: PublicStatsService;
}

export async function registerRoutes(
  baseApp: FastifyInstance,
  dependencies: RouteDependencies,
) {
  const app = baseApp.withTypeProvider<ZodTypeProvider>();
  const { account, auth, catalog, member, professional, publicStats } = dependencies;
  const rateLimiter = new InMemoryRateLimiter();
  const guardAuth = (scope: string, ip: string) =>
    rateLimiter.assertAllowed(`auth:${scope}:${ip}`, 10, 15 * 60_000);
  const guardDeletion = (ip: string) =>
    rateLimiter.assertAllowed(`delete:${ip}`, 5, 60 * 60_000);
  const guardContentReport = (ip: string) =>
    rateLimiter.assertAllowed(`content-report:${ip}`, 10, 60 * 60_000);
  const guardSensitiveAccountChange = (scope: string, userId: string, ip: string) =>
    rateLimiter.assertAllowed(`account:${scope}:${userId}:${ip}`, 5, 60 * 60_000);

  const verifyCurrentPassword = async (
    request: Parameters<typeof toWebHeaders>[0],
    password: string,
  ) => {
    try {
      await auth.api.verifyPassword({
        body: { password },
        headers: toWebHeaders(request),
      });
    } catch {
      throw new HttpProblem(
        400,
        "INVALID_CURRENT_PASSWORD",
        "Le mot de passe actuel est incorrect.",
      );
    }
  };

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
        tags: ["Les coulisses"],
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
    "/v1/content-reports",
    {
      schema: {
        tags: ["Catalogue"],
        summary: "Signale une information à corriger",
        body: ContentReportBodySchema,
        response: {
          200: ContentReportResponseSchema,
          ...problemResponses,
        },
      },
      preHandler: async (request) => guardContentReport(request.ip),
    },
    async (request) =>
      member.createContentReport(request.body, await getOptionalUserId(auth, request)),
  );

  app.post(
    "/v1/auth/sign-up/email",
    {
      schema: {
        tags: ["Authentification"],
        summary: "Crée un compte avec les versions juridiques présentées",
        body: SignUpBodySchema,
      },
      preHandler: async (request) => {
        guardAuth("signup", request.ip);
        await account.assertEmailAvailable(request.body.email);
        await account.assertUsernameAvailable(request.body.username);
      },
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
      const authPath = request.url.split("?")[0];
      if (
        authPath === "/v1/auth/change-email" ||
        authPath === "/v1/auth/change-password" ||
        authPath === "/v1/auth/update-user"
      ) {
        throw new HttpProblem(
          404,
          "ROUTE_NOT_FOUND",
          "Utilise les paramètres du compte pour effectuer cette modification.",
        );
      }
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

  app.patch(
    "/v1/me/username",
    {
      schema: {
        tags: ["Compte"],
        summary: "Modifie le nom d'utilisateur du compte",
        security: [{ sessionCookie: [] }],
        body: UpdateUsernameBodySchema,
        response: {
          200: UpdateUsernameResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request, reply) => {
      const userId = await getRequiredUserId(auth, request);
      guardSensitiveAccountChange("username", userId, request.ip);
      const username = request.body.username.trim();
      await account.assertUsernameAvailable(username, userId);
      const response = await auth.api.updateUser({
        body: {
          name: username,
          username,
          displayUsername: username,
        },
        headers: toWebHeaders(request),
        asResponse: true,
      });
      forwardAuthHeaders(response, reply);
      return { username };
    },
  );

  app.post(
    "/v1/me/email-change",
    {
      schema: {
        tags: ["Compte"],
        summary: "Envoie la confirmation d'une nouvelle adresse e-mail",
        security: [{ sessionCookie: [] }],
        body: EmailChangeBodySchema,
        response: {
          200: EmailChangeResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      guardSensitiveAccountChange("email", userId, request.ip);
      const identity = await account.getIdentity(userId);
      const newEmail = request.body.newEmail.trim().toLowerCase();
      if (identity.email.trim().toLowerCase() === newEmail) {
        throw new HttpProblem(
          409,
          "EMAIL_UNCHANGED",
          "Cette adresse e-mail est déjà associée à ton compte.",
        );
      }
      await account.assertEmailAvailable(newEmail, userId);
      await verifyCurrentPassword(request, request.body.currentPassword);
      await auth.api.changeEmail({
        body: {
          newEmail,
          callbackURL: request.body.callbackURL,
        },
        headers: toWebHeaders(request),
      });
      await account.notifyEmailChangeRequested(userId, newEmail);
      return { verificationSent: true as const };
    },
  );

  app.post(
    "/v1/me/password-change",
    {
      schema: {
        tags: ["Compte"],
        summary: "Modifie le mot de passe et révoque les autres sessions",
        security: [{ sessionCookie: [] }],
        body: PasswordChangeBodySchema,
        response: {
          200: PasswordChangeResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request, reply) => {
      const userId = await getRequiredUserId(auth, request);
      guardSensitiveAccountChange("password", userId, request.ip);
      if (request.body.currentPassword === request.body.newPassword) {
        throw new HttpProblem(
          409,
          "PASSWORD_UNCHANGED",
          "Le nouveau mot de passe doit être différent du mot de passe actuel.",
        );
      }
      await verifyCurrentPassword(request, request.body.currentPassword);
      const response = await auth.api.changePassword({
        body: {
          currentPassword: request.body.currentPassword,
          newPassword: request.body.newPassword,
          revokeOtherSessions: true,
        },
        headers: toWebHeaders(request),
        asResponse: true,
      });
      forwardAuthHeaders(response, reply);
      return { changed: true as const };
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
    "/v1/catalog/cities",
    {
      schema: {
        tags: ["Catalogue"],
        summary: "Recherche les villes présentes dans le catalogue",
        querystring: CitySearchQuerySchema,
        response: {
          200: CitySearchResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => ({ items: await catalog.searchCities(request.query) }),
  );

  app.get(
    "/v1/search",
    {
      schema: {
        tags: ["Catalogue"],
        summary: "Recherche des spectacles, lieux, compagnies et membres",
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
    "/v1/venues/:slug",
    {
      schema: {
        tags: ["Catalogue"],
        summary: "Consulte la programmation publique d’un lieu",
        params: VenueParamsSchema,
        response: {
          200: VenueResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => catalog.getVenue(request.params.slug),
  );

  app.get(
    "/v1/companies/:slug",
    {
      schema: {
        tags: ["Catalogue"],
        summary: "Consulte la fiche publique d’une compagnie",
        params: CompanyParamsSchema,
        response: {
          200: CompanyResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => catalog.getCompany(request.params.slug),
  );

  app.get(
    "/v1/members/:username",
    {
      schema: {
        tags: ["Membres"],
        summary: "Consulte un profil membre public",
        params: MemberParamsSchema,
        response: {
          200: MemberResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => member.getPublicMember(request.params.username),
  );

  app.get(
    "/v1/members/:username/journal",
    {
      schema: {
        tags: ["Membres"],
        summary: "Consulte le journal public d’un membre",
        params: MemberParamsSchema,
        querystring: MemberJournalQuerySchema,
        response: {
          200: MemberJournalPageSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => member.getPublicJournal(request.params.username, request.query),
  );

  app.get(
    "/v1/members/:username/lists/:slug",
    {
      schema: {
        tags: ["Membres"],
        summary: "Consulte une liste publique d’un membre",
        params: MemberListParamsSchema,
        response: {
          200: MemberListResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) =>
      member.getPublicList(request.params.username, request.params.slug),
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
    "/v1/me/home",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte l'accueil personnalisé",
        security: [{ sessionCookie: [] }],
        response: {
          200: HomeResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return catalog.getHome(userId);
    },
  );

  app.put(
    "/v1/me/home-city",
    {
      schema: {
        tags: ["Compte"],
        summary: "Enregistre la ville de découverte",
        security: [{ sessionCookie: [] }],
        body: HomeCityBodySchema,
        response: {
          200: HomeCityResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return { city: await catalog.setHomeCity(userId, request.body.city) };
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

  app.get(
    "/v1/me/shows",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte et filtre ses spectacles personnels",
        security: [{ sessionCookie: [] }],
        querystring: MyShowsQuerySchema,
        response: {
          200: MyShowsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return member.getMyShows(userId, request.query);
    },
  );

  app.get(
    "/v1/me/profile",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte les paramètres du profil public",
        security: [{ sessionCookie: [] }],
        response: {
          200: ProfileSettingsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return member.getProfileSettings(userId);
    },
  );

  app.patch(
    "/v1/me/profile",
    {
      schema: {
        tags: ["Compte"],
        summary: "Modifie la présentation et la visibilité du profil",
        security: [{ sessionCookie: [] }],
        body: UpdateProfileBodySchema,
        response: {
          200: ProfileSettingsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return member.updateProfile(userId, request.body);
    },
  );

  app.get(
    "/v1/me/journal",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte et filtre son journal complet",
        security: [{ sessionCookie: [] }],
        querystring: MemberJournalQuerySchema,
        response: {
          200: MemberJournalPageSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return member.getMyJournal(userId, request.query);
    },
  );

  app.get(
    "/v1/me/lists",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte ses listes personnalisées",
        security: [{ sessionCookie: [] }],
        response: {
          200: ListsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return { items: await member.listMyLists(userId) };
    },
  );

  app.get(
    "/v1/me/watchlist",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte toute sa liste À voir",
        security: [{ sessionCookie: [] }],
        response: {
          200: WatchlistPageSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return { items: await member.getWatchlist(userId) };
    },
  );

  app.get(
    "/v1/me/reviews",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte tous ses avis",
        security: [{ sessionCookie: [] }],
        response: {
          200: OwnReviewsPageSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return { items: await member.getOwnReviews(userId) };
    },
  );

  app.post(
    "/v1/me/lists",
    {
      schema: {
        tags: ["Compte"],
        summary: "Crée une liste personnalisée",
        security: [{ sessionCookie: [] }],
        body: CreateListBodySchema,
        response: {
          200: ListResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return member.createList(userId, request.body);
    },
  );

  app.get(
    "/v1/me/lists/:listId",
    {
      schema: {
        tags: ["Compte"],
        summary: "Consulte une liste personnalisée",
        security: [{ sessionCookie: [] }],
        params: ListIdParamsSchema,
        response: {
          200: ListResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return member.getMyList(userId, request.params.listId);
    },
  );

  app.patch(
    "/v1/me/lists/:listId",
    {
      schema: {
        tags: ["Compte"],
        summary: "Renomme ou modifie une liste",
        security: [{ sessionCookie: [] }],
        params: ListIdParamsSchema,
        body: UpdateListBodySchema,
        response: {
          200: ListResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return member.updateList(userId, request.params.listId, request.body);
    },
  );

  app.delete(
    "/v1/me/lists/:listId",
    {
      schema: {
        tags: ["Compte"],
        summary: "Supprime une liste personnalisée",
        security: [{ sessionCookie: [] }],
        params: ListIdParamsSchema,
        response: {
          200: EmptyResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      await member.deleteList(userId, request.params.listId);
      return { ok: true as const };
    },
  );

  app.post(
    "/v1/me/lists/:listId/items",
    {
      schema: {
        tags: ["Compte"],
        summary: "Ajoute un spectacle à une liste",
        security: [{ sessionCookie: [] }],
        params: ListIdParamsSchema,
        body: AddListItemBodySchema,
        response: {
          200: EmptyResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      await member.addListItem(userId, request.params.listId, request.body);
      return { ok: true as const };
    },
  );

  app.delete(
    "/v1/me/lists/:listId/items/:productionId",
    {
      schema: {
        tags: ["Compte"],
        summary: "Retire un spectacle d’une liste",
        security: [{ sessionCookie: [] }],
        params: ListItemParamsSchema,
        response: {
          200: EmptyResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      await member.removeListItem(
        userId,
        request.params.listId,
        request.params.productionId,
      );
      return { ok: true as const };
    },
  );

  app.put(
    "/v1/me/lists/:listId/order",
    {
      schema: {
        tags: ["Compte"],
        summary: "Réordonne les spectacles d’une liste",
        security: [{ sessionCookie: [] }],
        params: ListIdParamsSchema,
        body: ReorderListBodySchema,
        response: {
          200: EmptyResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      await member.reorderList(userId, request.params.listId, request.body);
      return { ok: true as const };
    },
  );

  app.put(
    "/v1/me/reviews/:productionId",
    {
      schema: {
        tags: ["Compte"],
        summary: "Crée ou modifie un avis",
        security: [{ sessionCookie: [] }],
        params: ReviewProductionParamsSchema,
        body: UpsertReviewBodySchema,
        response: {
          200: EmptyResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      await member.upsertReview(userId, request.params.productionId, request.body);
      return { ok: true as const };
    },
  );

  app.delete(
    "/v1/me/reviews/:productionId",
    {
      schema: {
        tags: ["Compte"],
        summary: "Supprime un avis",
        security: [{ sessionCookie: [] }],
        params: ReviewProductionParamsSchema,
        response: {
          200: EmptyResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      await member.deleteReview(userId, request.params.productionId);
      return { ok: true as const };
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

  app.patch(
    "/v1/me/diary/:entryId",
    {
      schema: {
        tags: ["Compte"],
        summary: "Modifie la date ou la représentation d’une entrée du journal",
        security: [{ sessionCookie: [] }],
        params: DiaryEntryIdParamsSchema,
        body: UpdateDiaryEntryBodySchema,
        response: {
          200: EmptyResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      await member.updateDiaryEntry(userId, request.params.entryId, request.body);
      return { ok: true as const };
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

  app.post(
    "/v1/me/company-claims/:companyId",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Soumet une demande de revendication de compagnie",
        security: [{ sessionCookie: [] }],
        params: CompanyIdParamsSchema,
        body: CreateCompanyClaimBodySchema,
        response: {
          200: CompanyClaimResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return professional.createClaim(userId, request.params.companyId, request.body);
    },
  );

  app.get(
    "/v1/me/company-claims",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Consulte ses demandes de revendication",
        security: [{ sessionCookie: [] }],
        response: {
          200: CompanyClaimsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return { items: await professional.listClaims(userId) };
    },
  );

  app.get(
    "/v1/me/company-memberships",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Consulte les compagnies gérées par le compte",
        security: [{ sessionCookie: [] }],
        response: {
          200: CompanyMembershipsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return { items: await professional.listMemberships(userId) };
    },
  );

  app.post(
    "/v1/me/companies/:companyId/productions",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Crée un spectacle brouillon pour une compagnie",
        security: [{ sessionCookie: [] }],
        params: CompanyIdParamsSchema,
        body: CreateCompanyProductionBodySchema,
        response: {
          200: EditableProductionResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return professional.createDraftProduction(
        userId,
        request.params.companyId,
        request.body,
      );
    },
  );

  app.get(
    "/v1/me/companies/:companyId/productions",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Consulte les spectacles modifiables d’une compagnie",
        security: [{ sessionCookie: [] }],
        params: CompanyIdParamsSchema,
        response: {
          200: EditableProductionsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return {
        items: await professional.listEditableProductions(
          userId,
          request.params.companyId,
        ),
      };
    },
  );

  app.get(
    "/v1/me/companies/:companyId/productions/:productionId",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Consulte une fiche spectacle modifiable, y compris en brouillon",
        security: [{ sessionCookie: [] }],
        params: CompanyProductionParamsSchema,
        response: {
          200: EditableProductionDetailResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      const slug = await professional.getEditableProductionSlug(
        userId,
        request.params.companyId,
        request.params.productionId,
      );
      const [detail, editableMedia] = await Promise.all([
        catalog.getProduction(slug, { includeUnpublished: true }),
        professional.getEditableProductionMedia(
          userId,
          request.params.companyId,
          request.params.productionId,
        ),
      ]);
      return { ...detail, editableMedia };
    },
  );

  app.post(
    "/v1/me/companies/:companyId/revisions",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Crée une révision brouillon du catalogue",
        security: [{ sessionCookie: [] }],
        params: CompanyIdParamsSchema,
        body: CreateCatalogRevisionBodySchema,
        response: {
          200: CatalogRevisionResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return professional.createRevision(
        userId,
        request.params.companyId,
        request.body,
      );
    },
  );

  app.get(
    "/v1/me/catalog-revisions",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Consulte l’historique des révisions autorisées",
        security: [{ sessionCookie: [] }],
        response: {
          200: CatalogRevisionsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return { items: await professional.listRevisions(userId) };
    },
  );

  app.get(
    "/v1/me/catalog-revisions/:revisionId",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Prévisualise une révision du catalogue",
        security: [{ sessionCookie: [] }],
        params: CatalogRevisionIdParamsSchema,
        response: {
          200: CatalogRevisionResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return professional.getRevisionForMember(userId, request.params.revisionId);
    },
  );

  app.patch(
    "/v1/me/catalog-revisions/:revisionId",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Modifie une révision brouillon",
        security: [{ sessionCookie: [] }],
        params: CatalogRevisionIdParamsSchema,
        body: UpdateCatalogRevisionBodySchema,
        response: {
          200: CatalogRevisionResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return professional.updateRevision(
        userId,
        request.params.revisionId,
        request.body,
      );
    },
  );

  app.post(
    "/v1/me/catalog-revisions/:revisionId/submit",
    {
      schema: {
        tags: ["Compagnies"],
        summary: "Soumet une révision à la validation Todam",
        security: [{ sessionCookie: [] }],
        params: CatalogRevisionIdParamsSchema,
        response: {
          200: CatalogRevisionResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return professional.submitRevision(userId, request.params.revisionId);
    },
  );

  app.get(
    "/v1/admin/catalog-candidates",
    {
      schema: {
        tags: ["Administration"],
        summary: "Liste les compagnies et spectacles à relire avant publication",
        security: [{ sessionCookie: [] }],
        querystring: AdminCatalogCandidatesQuerySchema,
        response: {
          200: CatalogCandidatesResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => ({
      items: await professional.listCatalogCandidates(
        await getRequiredUserId(auth, request),
        request.query,
      ),
    }),
  );

  for (const decision of ["publish", "hide", "draft"] as const) {
    app.post(
      `/v1/admin/catalog-candidates/:targetType/:targetId/${decision}`,
      {
        schema: {
          tags: ["Administration"],
          summary:
            decision === "publish"
              ? "Publie une fiche de catalogue validée"
              : decision === "hide"
                ? "Masque une fiche de catalogue"
                : "Replace une fiche de catalogue en brouillon",
          security: [{ sessionCookie: [] }],
          params: CatalogCandidateParamsSchema,
          response: {
            200: EmptyResponseSchema,
            ...problemResponses,
          },
        },
      },
      async (request) => {
        await professional.moderateCatalogCandidate(
          await getRequiredUserId(auth, request),
          request.params.targetType,
          request.params.targetId,
          decision,
        );
        return { ok: true as const };
      },
    );
  }

  app.get(
    "/v1/admin/content-reports",
    {
      schema: {
        tags: ["Modération"],
        summary: "Consulte les signalements et corrections",
        security: [{ sessionCookie: [] }],
        querystring: AdminContentReportsQuerySchema,
        response: {
          200: ContentReportsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return {
        items: await professional.listContentReports(userId, request.query.status),
      };
    },
  );

  for (const decision of ["reviewing", "resolved", "dismissed"] as const) {
    app.post(
      `/v1/admin/content-reports/:reportId/${decision}`,
      {
        schema: {
          tags: ["Modération"],
          summary: `${decision} un signalement ou une correction`,
          security: [{ sessionCookie: [] }],
          params: ContentReportIdParamsSchema,
          body: ModerateContentReportBodySchema,
          response: {
            200: ContentReportSchema,
            ...problemResponses,
          },
        },
      },
      async (request) => {
        const userId = await getRequiredUserId(auth, request);
        return professional.moderateContentReport(
          userId,
          request.params.reportId,
          decision,
          request.body,
        );
      },
    );
  }

  app.get(
    "/v1/admin/company-claims",
    {
      schema: {
        tags: ["Modération"],
        summary: "Consulte les revendications en attente",
        security: [{ sessionCookie: [] }],
        querystring: AdminCompanyClaimsQuerySchema,
        response: {
          200: CompanyClaimsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return {
        items: await professional.listClaims(userId, true, request.query.status),
      };
    },
  );

  const claimDecisionSummaries = {
    approved: "Approuve une revendication de compagnie",
    rejected: "Refuse une revendication de compagnie",
    revoked: "Révoque une revendication de compagnie",
  } as const;

  for (const decision of ["approved", "rejected", "revoked"] as const) {
    app.post(
      `/v1/admin/company-claims/:claimId/${decision}`,
      {
        schema: {
          tags: ["Modération"],
          summary: claimDecisionSummaries[decision],
          security: [{ sessionCookie: [] }],
          params: CompanyClaimIdParamsSchema,
          body: ModerateClaimBodySchema,
          response: {
            200: CompanyClaimResponseSchema,
            ...problemResponses,
          },
        },
      },
      async (request) => {
        const userId = await getRequiredUserId(auth, request);
        return professional.moderateClaim(
          userId,
          request.params.claimId,
          decision,
          request.body,
        );
      },
    );
  }

  app.get(
    "/v1/admin/catalog-revisions",
    {
      schema: {
        tags: ["Modération"],
        summary: "Consulte les révisions en attente",
        security: [{ sessionCookie: [] }],
        querystring: AdminCatalogRevisionsQuerySchema,
        response: {
          200: CatalogRevisionsResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return {
        items: await professional.listRevisions(userId, true, request.query.status),
      };
    },
  );

  const revisionDecisionSummaries = {
    approved: "Approuve une révision du catalogue",
    rejected: "Refuse une révision du catalogue",
  } as const;

  for (const decision of ["approved", "rejected"] as const) {
    app.post(
      `/v1/admin/catalog-revisions/:revisionId/${decision}`,
      {
        schema: {
          tags: ["Modération"],
          summary: revisionDecisionSummaries[decision],
          security: [{ sessionCookie: [] }],
          params: CatalogRevisionIdParamsSchema,
          body: ReviewRevisionBodySchema,
          response: {
            200: CatalogRevisionResponseSchema,
            ...problemResponses,
          },
        },
      },
      async (request) => {
        const userId = await getRequiredUserId(auth, request);
        return professional.reviewRevision(
          userId,
          request.params.revisionId,
          decision,
          request.body,
        );
      },
    );
  }

  app.post(
    "/v1/admin/catalog-revisions/:revisionId/restore",
    {
      schema: {
        tags: ["Modération"],
        summary: "Restaure une version approuvée du catalogue",
        security: [{ sessionCookie: [] }],
        params: CatalogRevisionIdParamsSchema,
        body: ReviewRevisionBodySchema,
        response: {
          200: CatalogRevisionResponseSchema,
          ...problemResponses,
        },
      },
    },
    async (request) => {
      const userId = await getRequiredUserId(auth, request);
      return professional.restoreRevision(
        userId,
        request.params.revisionId,
        request.body,
      );
    },
  );
}

import {
  CitySearchResponseSchema,
  CatalogRevisionResponseSchema,
  CatalogRevisionsResponseSchema,
  ContentReportResponseSchema,
  CompanyClaimResponseSchema,
  CompanyClaimsResponseSchema,
  CompanyMembershipsResponseSchema,
  CompanyResponseSchema,
  EmptyResponseSchema,
  DashboardSchema,
  EmailChangeResponseSchema,
  EditableProductionDetailResponseSchema,
  EditableProductionResponseSchema,
  HomeCityResponseSchema,
  HomeResponseSchema,
  ListResponseSchema,
  ListsResponseSchema,
  MemberJournalPageSchema,
  MemberListResponseSchema,
  MemberResponseSchema,
  OwnReviewsPageSchema,
  MutationResponseSchema,
  PasswordChangeResponseSchema,
  ProblemDetailsSchema,
  ProductionDiaryResponseSchema,
  ProductionResponseSchema,
  ProfileSettingsResponseSchema,
  PublicStatsSchema,
  SearchResponseSchema,
  VenueResponseSchema,
  WatchlistPageSchema,
  UpdateUsernameResponseSchema,
  ViewerProductionStateSchema,
  type CityOption,
  type CitySelection,
  type ContentReportBody,
  type Dashboard,
  type DiarySession,
  type HomeResponse,
  type ProblemDetails,
  type PublicStats,
  type SearchResponse,
  type ViewerProductionState,
} from "./api.js";
import type {
  CompanyDetail,
  Discipline,
  ProductionDetail,
  VenueDetail,
} from "./catalog.js";
import type {
  AddListItemBody,
  CreateListBody,
  MemberJournalQuery,
  MemberJournalResponse,
  MyShowsQuery,
  MyShowsResponse,
  ProfileSettings,
  OwnReview,
  PublicMember,
  ReorderListBody,
  UpdateDiaryEntryBody,
  UpdateListBody,
  UpdateProfileBody,
  UpsertReviewBody,
  UserListDetail,
  UserListSummary,
  WatchlistItem,
} from "./member.js";
import { MyShowsResponseSchema } from "./member.js";
import {
  CatalogCandidatesResponseSchema,
  ContentReportSchema,
  ContentReportsResponseSchema,
  EditableProductionsResponseSchema,
  type CatalogRevision,
  type CatalogCandidate,
  type CompanyClaim,
  type CompanyMembership,
  type ContentReport,
  type ContentReportStatus,
  type CreateCompanyProductionBody,
  type CreateCatalogRevisionBody,
  type CreateCompanyClaimBody,
  type EditableProductionSummary,
  type EditableProductionDetail,
  type ModerateClaimBody,
  type ModerateContentReportBody,
  type ReviewRevisionBody,
  type UpdateCatalogRevisionBody,
} from "./professional.js";
import {
  AcceptedResponseSchema,
  AccountExportSchema,
  LegalCurrentResponseSchema,
  type AccountExport,
  type LegalCurrentResponse,
} from "./legal.js";

export class TodamApiError extends Error {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = "TodamApiError";
    this.problem = problem;
  }
}

export interface TodamApiClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

export interface MarkSeenInput {
  productionId: string;
  performanceId?: string | null;
  attendedOn?: string | null;
}

export interface CatalogSearchOptions {
  q?: string;
  type?: "productions" | "venues" | "companies" | "members";
  discipline?: Discipline;
  locality?: string;
  radiusKm?: number;
  from?: string;
  to?: string;
  temporal?: "upcoming" | "past" | "all";
  sort?: "relevance" | "date" | "proximity" | "popularity";
  cursor?: string | null;
  limit?: number;
}

export interface TodamApiClient {
  getCurrentLegalDocuments(): Promise<LegalCurrentResponse>;
  getPublicStats(): Promise<PublicStats>;
  search(query: string): Promise<SearchResponse>;
  searchCatalog(options: CatalogSearchOptions): Promise<SearchResponse>;
  searchCities(query?: string): Promise<CityOption[]>;
  getProduction(slug: string): Promise<ProductionDetail>;
  getVenue(slug: string): Promise<VenueDetail>;
  getCompany(slug: string): Promise<CompanyDetail>;
  getMember(username: string): Promise<PublicMember>;
  getMemberJournal(
    username: string,
    query?: Partial<MemberJournalQuery>,
  ): Promise<MemberJournalResponse>;
  getMemberList(username: string, slug: string): Promise<UserListDetail>;
  getProductionState(productionId: string): Promise<ViewerProductionState>;
  getDashboard(): Promise<Dashboard>;
  getMyShows(query: MyShowsQuery): Promise<MyShowsResponse>;
  getProfileSettings(): Promise<ProfileSettings>;
  updateProfile(input: UpdateProfileBody): Promise<ProfileSettings>;
  getMyJournal(query?: Partial<MemberJournalQuery>): Promise<MemberJournalResponse>;
  getLists(): Promise<UserListSummary[]>;
  getList(listId: string): Promise<UserListDetail>;
  getWatchlist(): Promise<WatchlistItem[]>;
  getOwnReviews(): Promise<OwnReview[]>;
  createList(input: CreateListBody): Promise<UserListDetail>;
  updateList(listId: string, input: UpdateListBody): Promise<UserListDetail>;
  deleteList(listId: string): Promise<void>;
  addListItem(listId: string, input: AddListItemBody): Promise<void>;
  removeListItem(listId: string, productionId: string): Promise<void>;
  reorderList(listId: string, input: ReorderListBody): Promise<void>;
  getHome(): Promise<HomeResponse>;
  setHomeCity(city: CitySelection | null): Promise<CityOption | null>;
  updateUsername(username: string): Promise<string>;
  requestEmailChange(input: {
    currentPassword: string;
    newEmail: string;
    callbackURL: string;
  }): Promise<void>;
  changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void>;
  getProductionDiary(productionId: string): Promise<DiarySession[]>;
  markSeen(input: MarkSeenInput): Promise<ViewerProductionState>;
  updateDiaryEntry(entryId: string, input: UpdateDiaryEntryBody): Promise<void>;
  deleteDiaryEntry(entryId: string): Promise<ViewerProductionState>;
  setRating(productionId: string, value: number): Promise<ViewerProductionState>;
  deleteRating(productionId: string): Promise<ViewerProductionState>;
  addToWatchlist(productionId: string): Promise<ViewerProductionState>;
  removeFromWatchlist(productionId: string): Promise<ViewerProductionState>;
  upsertReview(productionId: string, input: UpsertReviewBody): Promise<void>;
  deleteReview(productionId: string): Promise<void>;
  createCompanyClaim(
    companyId: string,
    input: CreateCompanyClaimBody,
  ): Promise<CompanyClaim>;
  getCompanyClaims(): Promise<CompanyClaim[]>;
  getCompanyMemberships(): Promise<CompanyMembership[]>;
  getEditableProductions(companyId: string): Promise<EditableProductionSummary[]>;
  getEditableProduction(
    companyId: string,
    productionId: string,
  ): Promise<EditableProductionDetail>;
  createDraftProduction(
    companyId: string,
    input: CreateCompanyProductionBody,
  ): Promise<EditableProductionSummary>;
  createCatalogRevision(
    companyId: string,
    input: CreateCatalogRevisionBody,
  ): Promise<CatalogRevision>;
  getCatalogRevisions(): Promise<CatalogRevision[]>;
  getCatalogRevision(revisionId: string): Promise<CatalogRevision>;
  updateCatalogRevision(
    revisionId: string,
    input: UpdateCatalogRevisionBody,
  ): Promise<CatalogRevision>;
  submitCatalogRevision(revisionId: string): Promise<CatalogRevision>;
  getAdminCatalogCandidates(options?: {
    status?: "draft" | "published" | "hidden" | "all";
    type?: "company" | "production" | "all";
    limit?: number;
  }): Promise<CatalogCandidate[]>;
  moderateCatalogCandidate(
    targetType: "company" | "production",
    targetId: string,
    decision: "publish" | "hide" | "draft",
  ): Promise<void>;
  getAdminCompanyClaims(
    status?: "pending" | "approved" | "rejected" | "revoked" | "all",
  ): Promise<CompanyClaim[]>;
  moderateCompanyClaim(
    claimId: string,
    decision: "approved" | "rejected" | "revoked",
    input: ModerateClaimBody,
  ): Promise<CompanyClaim>;
  getAdminContentReports(
    status?: ContentReportStatus | "all",
  ): Promise<ContentReport[]>;
  moderateContentReport(
    reportId: string,
    status: Exclude<ContentReportStatus, "open">,
    input: ModerateContentReportBody,
  ): Promise<ContentReport>;
  getAdminCatalogRevisions(
    status?: "draft" | "submitted" | "approved" | "rejected" | "superseded" | "all",
  ): Promise<CatalogRevision[]>;
  reviewCatalogRevision(
    revisionId: string,
    decision: "approved" | "rejected",
    input: ReviewRevisionBody,
  ): Promise<CatalogRevision>;
  restoreCatalogRevision(
    revisionId: string,
    input: ReviewRevisionBody,
  ): Promise<CatalogRevision>;
  createContentReport(
    input: ContentReportBody,
  ): Promise<{ id: string; status: "open" }>;
  exportAccountJson(): Promise<AccountExport>;
  exportAccountCsv(): Promise<string>;
  requestAccountDeletion(email: string): Promise<void>;
  confirmAccountDeletion(token: string): Promise<void>;
}

export function createTodamApiClient(options: TodamApiClientOptions): TodamApiClient {
  const fetcher = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  async function request<T>(
    path: string,
    schema: { parse(value: unknown): T },
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    const payload = (await response.json()) as unknown;
    if (!response.ok) {
      throw new TodamApiError(ProblemDetailsSchema.parse(payload));
    }
    return schema.parse(payload);
  }

  async function requestText(path: string): Promise<string> {
    const response = await fetcher(`${baseUrl}${path}`, {
      credentials: "include",
      headers: { Accept: "text/csv" },
    });
    const payload = await response.text();
    if (!response.ok) {
      try {
        throw new TodamApiError(ProblemDetailsSchema.parse(JSON.parse(payload)));
      } catch (error) {
        if (error instanceof TodamApiError) throw error;
        throw new Error("La réponse du serveur est illisible.");
      }
    }
    return payload;
  }

  function queryString(values: object): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
    const serialized = query.toString();
    return serialized ? `?${serialized}` : "";
  }

  return {
    getCurrentLegalDocuments: () =>
      request("/v1/legal/current", LegalCurrentResponseSchema),
    getPublicStats: () => request("/v1/public/stats", PublicStatsSchema),
    search: (query) =>
      request(`/v1/search?q=${encodeURIComponent(query)}`, SearchResponseSchema),
    searchCatalog: (input) =>
      request(`/v1/search${queryString(input)}`, SearchResponseSchema),
    searchCities: async (query) => {
      const response = await request(
        `/v1/catalog/cities${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        CitySearchResponseSchema,
      );
      return response.items;
    },
    getProduction: (slug) =>
      request(`/v1/productions/${encodeURIComponent(slug)}`, ProductionResponseSchema),
    getVenue: (slug) =>
      request(`/v1/venues/${encodeURIComponent(slug)}`, VenueResponseSchema),
    getCompany: (slug) =>
      request(`/v1/companies/${encodeURIComponent(slug)}`, CompanyResponseSchema),
    getMember: (username) =>
      request(`/v1/members/${encodeURIComponent(username)}`, MemberResponseSchema),
    getMemberJournal: (username, query = {}) =>
      request(
        `/v1/members/${encodeURIComponent(username)}/journal${queryString(query)}`,
        MemberJournalPageSchema,
      ),
    getMemberList: (username, slug) =>
      request(
        `/v1/members/${encodeURIComponent(username)}/lists/${encodeURIComponent(slug)}`,
        MemberListResponseSchema,
      ),
    getProductionState: (productionId) =>
      request(
        `/v1/me/productions/${encodeURIComponent(productionId)}/state`,
        ViewerProductionStateSchema,
      ),
    getDashboard: () => request("/v1/me/dashboard", DashboardSchema),
    getMyShows: (query) =>
      request(`/v1/me/shows${queryString(query)}`, MyShowsResponseSchema),
    getProfileSettings: () => request("/v1/me/profile", ProfileSettingsResponseSchema),
    updateProfile: (input) =>
      request("/v1/me/profile", ProfileSettingsResponseSchema, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    getMyJournal: (query = {}) =>
      request(`/v1/me/journal${queryString(query)}`, MemberJournalPageSchema),
    getLists: async () => {
      const response = await request("/v1/me/lists", ListsResponseSchema);
      return response.items;
    },
    getList: (listId) =>
      request(`/v1/me/lists/${encodeURIComponent(listId)}`, ListResponseSchema),
    getWatchlist: async () => {
      const response = await request("/v1/me/watchlist", WatchlistPageSchema);
      return response.items;
    },
    getOwnReviews: async () => {
      const response = await request("/v1/me/reviews", OwnReviewsPageSchema);
      return response.items;
    },
    createList: (input) =>
      request("/v1/me/lists", ListResponseSchema, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    updateList: (listId, input) =>
      request(`/v1/me/lists/${encodeURIComponent(listId)}`, ListResponseSchema, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    deleteList: async (listId) => {
      await request(`/v1/me/lists/${encodeURIComponent(listId)}`, EmptyResponseSchema, {
        method: "DELETE",
      });
    },
    addListItem: async (listId, input) => {
      await request(
        `/v1/me/lists/${encodeURIComponent(listId)}/items`,
        EmptyResponseSchema,
        { method: "POST", body: JSON.stringify(input) },
      );
    },
    removeListItem: async (listId, productionId) => {
      await request(
        `/v1/me/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(productionId)}`,
        EmptyResponseSchema,
        { method: "DELETE" },
      );
    },
    reorderList: async (listId, input) => {
      await request(
        `/v1/me/lists/${encodeURIComponent(listId)}/order`,
        EmptyResponseSchema,
        { method: "PUT", body: JSON.stringify(input) },
      );
    },
    getHome: () => request("/v1/me/home", HomeResponseSchema),
    setHomeCity: async (city) => {
      const response = await request("/v1/me/home-city", HomeCityResponseSchema, {
        method: "PUT",
        body: JSON.stringify({ city }),
      });
      return response.city;
    },
    updateUsername: async (username) => {
      const response = await request("/v1/me/username", UpdateUsernameResponseSchema, {
        method: "PATCH",
        body: JSON.stringify({ username }),
      });
      return response.username;
    },
    requestEmailChange: async (input) => {
      await request("/v1/me/email-change", EmailChangeResponseSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    changePassword: async (input) => {
      await request("/v1/me/password-change", PasswordChangeResponseSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    getProductionDiary: async (productionId) => {
      const response = await request(
        `/v1/me/productions/${encodeURIComponent(productionId)}/diary`,
        ProductionDiaryResponseSchema,
      );
      return response.items;
    },
    markSeen: async (input) => {
      const response = await request("/v1/me/diary", MutationResponseSchema, {
        method: "POST",
        body: JSON.stringify({
          productionId: input.productionId,
          performanceId: input.performanceId ?? null,
          attendedOn: input.attendedOn ?? null,
        }),
      });
      return response.state;
    },
    updateDiaryEntry: async (entryId, input) => {
      await request(
        `/v1/me/diary/${encodeURIComponent(entryId)}`,
        EmptyResponseSchema,
        { method: "PATCH", body: JSON.stringify(input) },
      );
    },
    deleteDiaryEntry: async (entryId) => {
      const response = await request(
        `/v1/me/diary/${encodeURIComponent(entryId)}`,
        MutationResponseSchema,
        { method: "DELETE" },
      );
      return response.state;
    },
    setRating: async (productionId, value) => {
      const response = await request(
        `/v1/me/productions/${encodeURIComponent(productionId)}/rating`,
        MutationResponseSchema,
        {
          method: "PUT",
          body: JSON.stringify({ value }),
        },
      );
      return response.state;
    },
    deleteRating: async (productionId) => {
      const response = await request(
        `/v1/me/productions/${encodeURIComponent(productionId)}/rating`,
        MutationResponseSchema,
        { method: "DELETE" },
      );
      return response.state;
    },
    addToWatchlist: async (productionId) => {
      const response = await request(
        `/v1/me/watchlist/${encodeURIComponent(productionId)}`,
        MutationResponseSchema,
        { method: "PUT" },
      );
      return response.state;
    },
    removeFromWatchlist: async (productionId) => {
      const response = await request(
        `/v1/me/watchlist/${encodeURIComponent(productionId)}`,
        MutationResponseSchema,
        { method: "DELETE" },
      );
      return response.state;
    },
    upsertReview: async (productionId, input) => {
      await request(
        `/v1/me/reviews/${encodeURIComponent(productionId)}`,
        EmptyResponseSchema,
        { method: "PUT", body: JSON.stringify(input) },
      );
    },
    deleteReview: async (productionId) => {
      await request(
        `/v1/me/reviews/${encodeURIComponent(productionId)}`,
        EmptyResponseSchema,
        { method: "DELETE" },
      );
    },
    createCompanyClaim: (companyId, input) =>
      request(
        `/v1/me/company-claims/${encodeURIComponent(companyId)}`,
        CompanyClaimResponseSchema,
        { method: "POST", body: JSON.stringify(input) },
      ),
    getCompanyClaims: async () => {
      const response = await request(
        "/v1/me/company-claims",
        CompanyClaimsResponseSchema,
      );
      return response.items;
    },
    getCompanyMemberships: async () => {
      const response = await request(
        "/v1/me/company-memberships",
        CompanyMembershipsResponseSchema,
      );
      return response.items;
    },
    getEditableProductions: async (companyId) => {
      const response = await request(
        `/v1/me/companies/${encodeURIComponent(companyId)}/productions`,
        EditableProductionsResponseSchema,
      );
      return response.items;
    },
    getEditableProduction: (companyId, productionId) =>
      request(
        `/v1/me/companies/${encodeURIComponent(
          companyId,
        )}/productions/${encodeURIComponent(productionId)}`,
        EditableProductionDetailResponseSchema,
      ),
    createDraftProduction: (companyId, input) =>
      request(
        `/v1/me/companies/${encodeURIComponent(companyId)}/productions`,
        EditableProductionResponseSchema,
        { method: "POST", body: JSON.stringify(input) },
      ),
    createCatalogRevision: (companyId, input) =>
      request(
        `/v1/me/companies/${encodeURIComponent(companyId)}/revisions`,
        CatalogRevisionResponseSchema,
        { method: "POST", body: JSON.stringify(input) },
      ),
    getCatalogRevisions: async () => {
      const response = await request(
        "/v1/me/catalog-revisions",
        CatalogRevisionsResponseSchema,
      );
      return response.items;
    },
    getCatalogRevision: (revisionId) =>
      request(
        `/v1/me/catalog-revisions/${encodeURIComponent(revisionId)}`,
        CatalogRevisionResponseSchema,
      ),
    updateCatalogRevision: (revisionId, input) =>
      request(
        `/v1/me/catalog-revisions/${encodeURIComponent(revisionId)}`,
        CatalogRevisionResponseSchema,
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    submitCatalogRevision: (revisionId) =>
      request(
        `/v1/me/catalog-revisions/${encodeURIComponent(revisionId)}/submit`,
        CatalogRevisionResponseSchema,
        { method: "POST" },
      ),
    getAdminCatalogCandidates: async (options = {}) => {
      const response = await request(
        `/v1/admin/catalog-candidates${queryString(options)}`,
        CatalogCandidatesResponseSchema,
      );
      return response.items;
    },
    moderateCatalogCandidate: async (targetType, targetId, decision) => {
      await request(
        `/v1/admin/catalog-candidates/${targetType}/${encodeURIComponent(
          targetId,
        )}/${decision}`,
        EmptyResponseSchema,
        { method: "POST" },
      );
    },
    getAdminContentReports: async (status = "open") => {
      const response = await request(
        `/v1/admin/content-reports${queryString({ status })}`,
        ContentReportsResponseSchema,
      );
      return response.items;
    },
    moderateContentReport: (reportId, status, input) =>
      request(
        `/v1/admin/content-reports/${encodeURIComponent(reportId)}/${status}`,
        ContentReportSchema,
        { method: "POST", body: JSON.stringify(input) },
      ),
    getAdminCompanyClaims: async (status = "pending") => {
      const response = await request(
        `/v1/admin/company-claims${queryString({ status })}`,
        CompanyClaimsResponseSchema,
      );
      return response.items;
    },
    moderateCompanyClaim: (claimId, decision, input) =>
      request(
        `/v1/admin/company-claims/${encodeURIComponent(claimId)}/${decision}`,
        CompanyClaimResponseSchema,
        { method: "POST", body: JSON.stringify(input) },
      ),
    getAdminCatalogRevisions: async (status = "submitted") => {
      const response = await request(
        `/v1/admin/catalog-revisions${queryString({ status })}`,
        CatalogRevisionsResponseSchema,
      );
      return response.items;
    },
    reviewCatalogRevision: (revisionId, decision, input) =>
      request(
        `/v1/admin/catalog-revisions/${encodeURIComponent(revisionId)}/${decision}`,
        CatalogRevisionResponseSchema,
        { method: "POST", body: JSON.stringify(input) },
      ),
    restoreCatalogRevision: (revisionId, input) =>
      request(
        `/v1/admin/catalog-revisions/${encodeURIComponent(revisionId)}/restore`,
        CatalogRevisionResponseSchema,
        { method: "POST", body: JSON.stringify(input) },
      ),
    createContentReport: (input) =>
      request("/v1/content-reports", ContentReportResponseSchema, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    exportAccountJson: () => request("/v1/me/export?format=json", AccountExportSchema),
    exportAccountCsv: () => requestText("/v1/me/export?format=csv"),
    requestAccountDeletion: async (email) => {
      await request("/v1/account-deletion/request", AcceptedResponseSchema, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    confirmAccountDeletion: async (token) => {
      await request("/v1/account-deletion/confirm", AcceptedResponseSchema, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    },
  };
}

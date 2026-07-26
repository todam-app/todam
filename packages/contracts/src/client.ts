import {
  DashboardSchema,
  MutationResponseSchema,
  ProblemDetailsSchema,
  ProductionDiaryResponseSchema,
  ProductionResponseSchema,
  PublicStatsSchema,
  SearchResponseSchema,
  ViewerProductionStateSchema,
  type Dashboard,
  type DiarySession,
  type ProblemDetails,
  type PublicStats,
  type SearchResponse,
  type ViewerProductionState,
} from "./api.js";
import type { ProductionDetail } from "./catalog.js";
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

export interface TodamApiClient {
  getCurrentLegalDocuments(): Promise<LegalCurrentResponse>;
  getPublicStats(): Promise<PublicStats>;
  search(query: string): Promise<SearchResponse>;
  getProduction(slug: string): Promise<ProductionDetail>;
  getProductionState(productionId: string): Promise<ViewerProductionState>;
  getDashboard(): Promise<Dashboard>;
  getProductionDiary(productionId: string): Promise<DiarySession[]>;
  markSeen(input: MarkSeenInput): Promise<ViewerProductionState>;
  deleteDiaryEntry(entryId: string): Promise<ViewerProductionState>;
  setRating(productionId: string, value: number): Promise<ViewerProductionState>;
  deleteRating(productionId: string): Promise<ViewerProductionState>;
  addToWatchlist(productionId: string): Promise<ViewerProductionState>;
  removeFromWatchlist(productionId: string): Promise<ViewerProductionState>;
  exportAccountJson(): Promise<AccountExport>;
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

  return {
    getCurrentLegalDocuments: () =>
      request("/v1/legal/current", LegalCurrentResponseSchema),
    getPublicStats: () => request("/v1/public/stats", PublicStatsSchema),
    search: (query) =>
      request(`/v1/search?q=${encodeURIComponent(query)}`, SearchResponseSchema),
    getProduction: (slug) =>
      request(`/v1/productions/${encodeURIComponent(slug)}`, ProductionResponseSchema),
    getProductionState: (productionId) =>
      request(
        `/v1/me/productions/${encodeURIComponent(productionId)}/state`,
        ViewerProductionStateSchema,
      ),
    getDashboard: () => request("/v1/me/dashboard", DashboardSchema),
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
    exportAccountJson: () => request("/v1/me/export?format=json", AccountExportSchema),
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

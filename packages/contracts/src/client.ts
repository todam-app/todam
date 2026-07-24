import {
  DashboardSchema,
  MutationResponseSchema,
  ProblemDetailsSchema,
  ProductionResponseSchema,
  SearchResponseSchema,
  ViewerProductionStateSchema,
  type Dashboard,
  type ProblemDetails,
  type SearchResponse,
  type ViewerProductionState,
} from "./api.js";
import type { ProductionDetail } from "./catalog.js";

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
  search(query: string): Promise<SearchResponse>;
  getProduction(slug: string): Promise<ProductionDetail>;
  getProductionState(productionId: string): Promise<ViewerProductionState>;
  getDashboard(): Promise<Dashboard>;
  markSeen(input: MarkSeenInput): Promise<ViewerProductionState>;
  setRating(productionId: string, value: number): Promise<ViewerProductionState>;
  deleteRating(productionId: string): Promise<ViewerProductionState>;
  addToWatchlist(productionId: string): Promise<ViewerProductionState>;
  removeFromWatchlist(productionId: string): Promise<ViewerProductionState>;
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
  };
}

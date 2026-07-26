import { asArray, asRecord, fetchJson, localizedText } from "./common.js";

export interface OpenAgendaCandidate {
  description: string | null;
  official: boolean;
  slug: string | null;
  title: string;
  uid: string;
}

interface DiscoveryOptions {
  apiKey?: string;
  baseUrl?: string;
  maxPagesPerTerm?: number;
  terms?: string[];
}

function agendasFromPayload(payload: unknown): Record<string, unknown>[] {
  const record = asRecord(payload);
  return asArray(record?.agendas ?? record?.results ?? record?.data)
    .map(asRecord)
    .filter((agenda): agenda is Record<string, unknown> => agenda !== null);
}

function afterFromPayload(payload: unknown): string[] | null {
  const record = asRecord(payload);
  const values = asArray(record?.after)
    .map(localizedText)
    .filter((value): value is string => value !== null);
  return values.length > 0 ? values : null;
}

export async function discoverOpenAgenda(
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
  options: DiscoveryOptions = {},
): Promise<OpenAgendaCandidate[]> {
  const apiKey = options.apiKey ?? process.env.TODAM_OPENAGENDA_API_KEY;
  if (!apiKey) {
    throw new Error("TODAM_OPENAGENDA_API_KEY est requis pour la découverte.");
  }
  const baseUrl =
    options.baseUrl ??
    process.env.TODAM_OPENAGENDA_API_URL ??
    "https://api.openagenda.com/v2/agendas";
  const configuredTerms =
    options.terms ??
    (process.env.TODAM_OPENAGENDA_DISCOVERY_TERMS ?? "")
      .split(",")
      .map((term) => term.trim())
      .filter(Boolean);
  const terms =
    configuredTerms.length > 0
      ? configuredTerms
      : ["théâtre", "opéra", "ballet", "spectacle vivant", "arts de la scène"];
  const candidates = new Map<string, OpenAgendaCandidate>();

  for (const term of terms) {
    let after: string[] | null = null;
    for (let page = 0; page < (options.maxPagesPerTerm ?? 10); page += 1) {
      const url = new URL(baseUrl);
      url.searchParams.set("official", "1");
      url.searchParams.set("search", term);
      url.searchParams.set("size", "100");
      for (const value of after ?? []) {
        url.searchParams.append("after[]", value);
      }
      const payload = await fetchJson(fetchImplementation, url, {
        headers: { key: apiKey },
      });
      for (const agenda of agendasFromPayload(payload)) {
        const uid = localizedText(agenda.uid ?? agenda.id);
        const title = localizedText(agenda.title ?? agenda.name);
        if (!uid || !title) continue;
        candidates.set(uid, {
          description: localizedText(agenda.description ?? agenda.summary),
          official: Boolean(agenda.official),
          slug: localizedText(agenda.slug),
          title,
          uid,
        });
      }
      after = afterFromPayload(payload);
      if (!after) break;
    }
  }

  return [...candidates.values()].sort((left, right) =>
    left.title.localeCompare(right.title, "fr"),
  );
}

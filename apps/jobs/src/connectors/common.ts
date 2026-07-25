import type { CatalogImport, Discipline } from "@todam/contracts";

export interface ConnectorContext {
  cursor: string | null;
  fetch: typeof globalThis.fetch;
  now: Date;
}

export interface ConnectorResult {
  catalog: CatalogImport;
  cursor: string | null;
  stats: {
    fetched: number;
    accepted: number;
    excluded: number;
    media: number;
  };
}

export function externalKey(namespace: string, value: unknown): string {
  const normalized = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${namespace}.${normalized || "inconnu"}`.slice(0, 160);
}

export function slug(value: unknown, suffix?: unknown): string {
  const base = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  const tail = suffix
    ? String(suffix)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(-32)
    : "";
  return [base || "spectacle", tail].filter(Boolean).join("-").slice(0, 240);
}

export function localizedText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = localizedText(item);
      if (text) return text;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["fr", "fr-FR", "value", "name", "label", "@value"]) {
      const text = localizedText(record[key]);
      if (text) return text;
    }
  }
  return null;
}

export function classifyDiscipline(value: unknown): Discipline | null {
  const text = localizedText(value)?.toLocaleLowerCase("fr") ?? "";
  if (/\b(op[eé]ra|art lyrique|lyrique)\b/u.test(text)) return "opera";
  if (/\b(ballet|danse classique|chor[eé]graph)/u.test(text)) return "ballet";
  if (
    /\b(th[eé][aâ]tre|spectacle vivant|pi[eè]ce|seul en sc[eè]ne|com[eé]die)\b/u.test(
      text,
    )
  ) {
    return "theatre";
  }
  return null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === null || value === undefined ? [] : [value];
}

export function absoluteUrl(value: unknown): string | null {
  const text = localizedText(value);
  if (!text) return null;
  try {
    return new URL(text).toString();
  } catch {
    return null;
  }
}

export async function fetchJson(
  fetchImplementation: typeof globalThis.fetch,
  url: URL,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetchImplementation(url, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": "TodamCatalogSync/0.1 (+https://todam.fr)",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `La source ${url.hostname} a répondu ${response.status} ${response.statusText}.`,
    );
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("json")) {
    throw new Error(
      `La source ${url.hostname} n'a pas renvoyé de données JSON structurées.`,
    );
  }
  return response.json() as Promise<unknown>;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function futureDate(now: Date, years = 2): string {
  const date = new Date(now);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return isoDate(date);
}

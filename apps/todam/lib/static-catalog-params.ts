import { SearchResponseSchema } from "@todam/contracts";

import { API_URL } from "./config";

type StaticCatalogType = "productions" | "venues" | "companies";

const PAGE_SIZE = 50;

export function areRouteLoadersDisabled(): boolean {
  return (
    process.env.TODAM_DISABLE_ROUTE_LOADERS === "1" ||
    process.env.NODE_ENV === "development"
  );
}

export async function loadOptionalStaticData<T>(
  label: string,
  load: () => Promise<T>,
): Promise<T | null> {
  if (areRouteLoadersDisabled()) return null;

  try {
    return await load();
  } catch (error) {
    if (process.env.TODAM_REQUIRE_STATIC_CATALOG === "1") throw error;
    console.warn(
      `${label} indisponible pendant le build : la page sera exportée sans données préchargées.`,
    );
    return null;
  }
}

export async function getPublishedCatalogSlugs(
  type: StaticCatalogType,
): Promise<string[]> {
  try {
    const slugs: string[] = [];
    let cursor: string | null = null;

    do {
      const search = new URLSearchParams({
        type,
        limit: String(PAGE_SIZE),
        ...(cursor ? { cursor } : {}),
      });
      const response = await fetch(`${API_URL}/v1/search?${search.toString()}`);

      if (!response.ok) {
        throw new Error(
          `Impossible de générer les routes ${type} depuis le catalogue (${response.status}).`,
        );
      }

      const page = SearchResponseSchema.parse(await response.json());
      const items =
        type === "productions"
          ? page.productions
          : type === "venues"
            ? page.venues
            : page.companies;

      slugs.push(...items.map((item) => item.slug));
      cursor = page.nextCursor;
    } while (cursor);

    return Array.from(new Set(slugs));
  } catch (error) {
    if (process.env.TODAM_REQUIRE_STATIC_CATALOG === "1") throw error;
    console.warn(
      `Catalogue ${type} indisponible pendant le build : seules les routes génériques seront exportées.`,
    );
    return [];
  }
}

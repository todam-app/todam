import type { ProductionCard, WatchlistItem } from "@todam/contracts";

export function getTicketWatchlistLabel(title: string, watchlisted: boolean): string {
  return watchlisted
    ? `Retirer ${title} de « À voir »`
    : `Ajouter ${title} à « À voir »`;
}

export function shouldStackTicketLocation(
  locality: string | null,
  venueName: string | null,
): boolean {
  return Boolean(locality && venueName && locality.length + venueName.length > 29);
}

export function updateTicketWatchlist(
  items: WatchlistItem[] | undefined,
  production: ProductionCard,
  watchlisted: boolean,
  addedAt = new Date().toISOString(),
): WatchlistItem[] {
  const withoutProduction = (items ?? []).filter(
    (item) => item.production.id !== production.id,
  );
  if (!watchlisted) return withoutProduction;
  return [{ production, addedAt }, ...withoutProduction];
}

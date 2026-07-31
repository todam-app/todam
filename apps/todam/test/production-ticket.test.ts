import type { ProductionCard, WatchlistItem } from "@todam/contracts";
import { describe, expect, it } from "vitest";

import {
  getTicketWatchlistLabel,
  shouldStackTicketLocation,
  updateTicketWatchlist,
} from "../lib/production-ticket";

const production = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "une-heure-de-philosophie",
  title: "1 heure de philosophie (avec un mec qui ne sait pas grand-chose)",
} as ProductionCard;

describe("présentation d’une carte-ticket", () => {
  it("nomme explicitement l’ajout et le retrait de « À voir »", () => {
    expect(getTicketWatchlistLabel(production.title, false)).toBe(
      `Ajouter ${production.title} à « À voir »`,
    );
    expect(getTicketWatchlistLabel(production.title, true)).toBe(
      `Retirer ${production.title} de « À voir »`,
    );
  });

  it("empile seulement les lieux trop longs", () => {
    expect(shouldStackTicketLocation("Brest", "Le Quartz")).toBe(false);
    expect(shouldStackTicketLocation("Lyon", "Théâtre de la Croix-Rousse")).toBe(true);
  });

  it("ajoute, déduplique puis retire une production de la watchlist", () => {
    const addedAt = "2026-07-30T12:00:00.000Z";
    const existing = [
      {
        production,
        addedAt: "2026-07-29T12:00:00.000Z",
      },
    ] satisfies WatchlistItem[];

    expect(updateTicketWatchlist(existing, production, true, addedAt)).toEqual([
      { production, addedAt },
    ]);
    expect(updateTicketWatchlist(existing, production, false, addedAt)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import { getProductionActionsPresentation } from "../lib/production-actions";

describe("actions personnelles d’une production", () => {
  it("donne la priorité visuelle à l’ajout dans « À voir »", () => {
    const actions = getProductionActionsPresentation({
      seen: false,
      seenLoading: false,
      watchlisted: false,
      watchlistLoading: false,
    });

    expect(actions.watchlist).toMatchObject({
      accessibilityLabel: "Ajouter à « À voir »",
      icon: "add",
      label: "Ajouter à « À voir »",
      loading: false,
      tone: "primary",
    });
    expect(actions.seen).toMatchObject({
      accessibilityLabel: "Marquer comme vu",
      icon: "eye-outline",
      tone: "secondary",
    });
  });

  it("expose les états actifs, leurs icônes et leur chargement", () => {
    const actions = getProductionActionsPresentation({
      seen: true,
      seenLoading: true,
      watchlisted: true,
      watchlistLoading: true,
    });

    expect(actions.watchlist).toMatchObject({
      accessibilityLabel: "Retirer de « À voir »",
      icon: "checkmark",
      label: "Ajouté à « À voir »",
      loading: true,
      selected: true,
    });
    expect(actions.seen).toMatchObject({
      accessibilityLabel: "Déjà vu, gérer mes séances",
      icon: "checkmark-circle-outline",
      loading: true,
      selected: true,
      subtitle: "Gérer mes séances",
      tone: "success",
      trailingIcon: "chevron-forward",
    });
  });
});

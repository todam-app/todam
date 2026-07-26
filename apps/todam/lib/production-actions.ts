export type ProductionActionIcon =
  "add" | "checkmark" | "checkmark-circle-outline" | "eye-outline";

export interface ProductionActionPresentation {
  accessibilityLabel: string;
  icon: ProductionActionIcon;
  label: string;
  loading: boolean;
  selected: boolean;
  tone: "primary" | "secondary" | "success";
}

export function getProductionActionsPresentation(input: {
  seen: boolean;
  seenLoading: boolean;
  watchlisted: boolean;
  watchlistLoading: boolean;
}): {
  seen: ProductionActionPresentation;
  watchlist: ProductionActionPresentation;
} {
  return {
    watchlist: {
      accessibilityLabel: input.watchlisted
        ? "Retirer de « À voir »"
        : "Ajouter à « À voir »",
      icon: input.watchlisted ? "checkmark" : "add",
      label: input.watchlisted ? "Ajouté à « À voir »" : "Ajouter à « À voir »",
      loading: input.watchlistLoading,
      selected: input.watchlisted,
      tone: input.watchlisted ? "secondary" : "primary",
    },
    seen: {
      accessibilityLabel: input.seen ? "Déjà vu" : "Marquer comme vu",
      icon: input.seen ? "checkmark-circle-outline" : "eye-outline",
      label: input.seen ? "Déjà vu" : "Marquer comme vu",
      loading: input.seenLoading,
      selected: input.seen,
      tone: input.seen ? "success" : "secondary",
    },
  };
}

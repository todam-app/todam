export interface ProductionInteractionSnapshot {
  hasDiaryEntry: boolean;
  rating: number | null;
  watchlisted: boolean;
}

export interface RatingPlan {
  value: number;
  createUndatedDiary: boolean;
  removeFromWatchlist: boolean;
}

export interface SeenPlan {
  removeFromWatchlist: boolean;
}

export function planRating(
  snapshot: ProductionInteractionSnapshot,
  value: number,
): RatingPlan {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new RangeError("Une note doit être un entier compris entre 1 et 10.");
  }

  return {
    value,
    createUndatedDiary: !snapshot.hasDiaryEntry,
    removeFromWatchlist: snapshot.watchlisted,
  };
}

export function planSeen(snapshot: ProductionInteractionSnapshot): SeenPlan {
  return {
    removeFromWatchlist: snapshot.watchlisted,
  };
}

export function canAddToWatchlist(_snapshot: ProductionInteractionSnapshot): boolean {
  return true;
}

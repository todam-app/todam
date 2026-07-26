import { describe, expect, it } from "vitest";

import { canAddToWatchlist, planRating, planSeen } from "../src/index.js";

describe("interactions avec une production", () => {
  it("crée une séance implicite à la première note", () => {
    expect(
      planRating({ hasDiaryEntry: false, rating: null, watchlisted: true }, 8),
    ).toEqual({
      value: 8,
      createUndatedDiary: true,
      removeFromWatchlist: true,
    });
  });

  it("ne crée pas une deuxième séance lors d'une modification", () => {
    expect(
      planRating({ hasDiaryEntry: true, rating: 7, watchlisted: false }, 9)
        .createUndatedDiary,
    ).toBe(false);
  });

  it("refuse une note hors de l'échelle", () => {
    expect(() =>
      planRating({ hasDiaryEntry: false, rating: null, watchlisted: false }, 11),
    ).toThrow(RangeError);
  });

  it("retire À voir lorsqu'une séance est enregistrée", () => {
    expect(planSeen({ hasDiaryEntry: false, rating: null, watchlisted: true })).toEqual(
      { removeFromWatchlist: true },
    );
  });

  it("autorise une revisite dans À voir", () => {
    expect(
      canAddToWatchlist({
        hasDiaryEntry: true,
        rating: 10,
        watchlisted: false,
      }),
    ).toBe(true);
  });
});

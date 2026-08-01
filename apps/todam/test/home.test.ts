import { describe, expect, it } from "vitest";

import { getHomeGreeting, getHomeProgressPercentage } from "../lib/home";

describe("présentation de l'accueil connecté", () => {
  it("salue le nom d'utilisateur complet sans ponctuation promotionnelle", () => {
    const username = "spectatrice-avec-un-nom-long-30";

    expect(getHomeGreeting(username)).toBe(`Bonjour, ${username}`);
  });

  it("borne la progression entre zéro et cent", () => {
    expect(getHomeProgressPercentage(0, 5)).toBe(0);
    expect(getHomeProgressPercentage(4, 5)).toBe(80);
    expect(getHomeProgressPercentage(5, 5)).toBe(100);
    expect(getHomeProgressPercentage(8, 5)).toBe(100);
  });
});

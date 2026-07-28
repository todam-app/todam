import { expect, test } from "@playwright/test";

test("la page Les coulisses expose les chiffres, les coûts et le code source", async ({
  page,
}) => {
  let releaseStats: (() => void) | undefined;
  const statsReady = new Promise<void>((resolve) => {
    releaseStats = resolve;
  });
  await page.route("**/v1/public/stats", async (route) => {
    await statsReady;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        verifiedUsers: 12,
        activeProductions: 48,
        upcomingPerformances: 96,
        generatedAt: "2026-07-26T12:00:00.000Z",
      }),
    });
  });
  await page.goto("/les-coulisses");

  await expect(page).toHaveURL("/les-coulisses");
  await expect(page).toHaveTitle(
    "Les coulisses de Todam | Coût, code et fonctionnement",
  );
  await expect(page.getByLabel("Comptes vérifiés : …")).toBeVisible();
  releaseStats?.();
  await expect(
    page.getByRole("heading", { name: "Todam, côté coulisses" }),
  ).toBeVisible();
  await expect(page.getByLabel("Comptes vérifiés : 12")).toBeVisible();
  await expect(page.getByLabel("Spectacles actifs : 48")).toBeVisible();
  await expect(page.getByLabel("Représentations à venir : 96")).toBeVisible();
  await expect(page.getByText("10,71 €")).toBeVisible();
  await expect(page.getByText("Le code de Todam est public")).toBeVisible();
  await expect(
    page.getByText("Vos données personnelles ne sont pas publiées avec le code", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Todam a été développé avec Codex, l’assistant de code d’OpenAI.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Voir le code sur GitHub" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Contribuer au projet" })).toBeVisible();
  await expect(
    page.getByText("Je vous le recommande : ça fait gagner un temps fou !"),
  ).toBeVisible();
  await expect(page.getByText("v0.1.0 · build local")).toBeVisible();

  const orderedSections = [
    page.getByRole("heading", { name: "Chiffres clés" }),
    page.getByRole("heading", { name: "Le code de Todam est public" }),
    page.getByText("Le coût du projet", { exact: true }),
    page.getByRole("heading", { name: "Sous le capot" }),
    page.getByRole("heading", { name: "Développé avec Codex" }),
  ];
  let previousY = Number.NEGATIVE_INFINITY;
  for (const section of orderedSections) {
    const bounds = await section.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThan(previousY);
    previousY = bounds!.y;
  }
});

test("la page Les coulisses ne transforme pas une panne API en zéro", async ({
  page,
}) => {
  await page.route("**/v1/public/stats", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/problem+json",
      body: JSON.stringify({
        type: "about:blank",
        title: "Service indisponible",
        status: 503,
        detail: "Les statistiques ne sont pas disponibles.",
      }),
    });
  });
  await page.goto("/les-coulisses");

  await expect(
    page.getByText("Les chiffres sont temporairement indisponibles."),
  ).toBeVisible();
  await expect(page.getByLabel("Comptes vérifiés : —")).toBeVisible();
  await expect(page.getByLabel("Spectacles actifs : —")).toBeVisible();
  await expect(page.getByLabel("Représentations à venir : —")).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("l’accueil présente Todam simplement et ouvre l’inscription", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Todam, accueil" })).toHaveText("Todam");
  await expect(
    page.getByRole("heading", {
      name: "Gardez une trace des spectacles que vous avez vus. Notez-les et partagez votre avis. Trouvez votre prochain spectacle.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Les spectacles restent avec vous.")).toHaveCount(0);
  await expect(page.getByText("Ce que vous pouvez faire")).toHaveCount(0);
  await expect(
    page.getByText("Mon journal de spectacles. Bientôt sur iOS et Android."),
  ).toBeVisible();
  await expect(page.getByText("Marquez les spectacles que vous avez vus.")).toHaveCount(
    0,
  );
  await expect(
    page.getByText(
      "Donnez une note sur 10. Ajoutez un commentaire si vous le souhaitez.",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByText("Enregistrez les spectacles que vous voulez voir."),
  ).toHaveCount(0);
  await expect(page.getByText("Monaco ouvre le bal")).toHaveCount(0);

  await page.getByRole("button", { name: "Commencez — c’est gratuit" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Créer ton journal" })).toBeVisible();
});

test("première boucle Todam au Théâtre des Muses", async ({ page }) => {
  test.setTimeout(90_000);
  const suffix = Date.now();
  await page.goto("/");
  await page.getByRole("link", { name: "Rechercher" }).click();
  await page.getByLabel("Titre, artiste ou théâtre").fill("Théâtre des Muses");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await page.getByRole("link").filter({ hasText: "Muses" }).first().click();
  await page.getByRole("button", { name: "Ajouter à « À voir »" }).click();

  await page.getByLabel("Pseudonyme").fill(`spectateur-${suffix}`);
  await page.getByLabel("Email").fill(`spectateur-${suffix}@example.test`);
  await page.getByLabel("Mot de passe (8 caractères minimum)").fill("Todam-test-2026");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(
    page.getByRole("button", { name: "Retirer de « À voir »" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retirer de « À voir »" }).click();
  await expect(
    page.getByRole("button", { name: "Ajouter à « À voir »" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ajouter à « À voir »" }).click();
  await page.getByRole("button", { name: "Noter 8 sur 10" }).click();
  await expect(
    page.getByRole("button", { name: "Ajouter à « À voir »" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Déjà vu, gérer mes séances" }).click();
  await expect(page.getByRole("heading", { name: "Mes séances" })).toBeVisible();
  await page.getByRole("button", { name: "Ajouter une séance" }).click();
  await expect(page.getByText("Séance sans date")).toHaveCount(2);

  await page
    .getByRole("button", { name: /Retirer la séance/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(page.getByText("Séance sans date")).toHaveCount(1);

  await page.getByRole("button", { name: /Retirer la séance/ }).click();
  await expect(page.getByText("Supprimez d’abord votre note")).toBeVisible();
  await page.getByRole("button", { name: "Revenir à ma note" }).click();
  await page.getByRole("button", { name: "Supprimer ma note" }).click();

  await page.getByRole("button", { name: "Déjà vu, gérer mes séances" }).click();
  await page.getByRole("button", { name: /Retirer la séance/ }).click();
  await page.getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Marquer comme vu" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByText("Répartition de mes notes")).toBeVisible();
  await expect(page.getByLabel("0 notes à 8 sur 10")).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByText(`spectateur-${suffix}`)).toBeVisible();
});

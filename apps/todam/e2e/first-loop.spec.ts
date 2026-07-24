import { expect, test } from "@playwright/test";

test("première boucle Todam au Théâtre des Muses", async ({ page }) => {
  const suffix = Date.now();
  await page.goto("/");
  await page.getByRole("link", { name: "Rechercher" }).click();
  await page.getByLabel("Titre, artiste ou théâtre").fill("Théâtre des Muses");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await page.getByRole("link").filter({ hasText: "Muses" }).first().click();
  await page.getByRole("button", { name: "Ajouter à À voir" }).click();

  await page.getByLabel("Pseudonyme").fill(`spectateur-${suffix}`);
  await page.getByLabel("Email").fill(`spectateur-${suffix}@example.test`);
  await page.getByLabel("Mot de passe (8 caractères minimum)").fill("Todam-test-2026");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByRole("button", { name: "Retirer de À voir" })).toBeVisible();
  await page.getByRole("button", { name: "Noter 8 sur 10" }).click();
  await expect(page.getByRole("button", { name: "Ajouter à À voir" })).toBeVisible();

  await page.getByRole("tab", { name: "Profil" }).click();
  await expect(page.getByText("Répartition de mes notes")).toBeVisible();
  await expect(page.getByLabel("1 notes à 8 sur 10")).toBeVisible();

  await page.reload();
  await expect(page.getByText(`spectateur-${suffix}`)).toBeVisible();
});

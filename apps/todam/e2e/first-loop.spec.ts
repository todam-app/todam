import { expect, test, type Page } from "@playwright/test";

async function expectFooterBelowViewport(page: Page) {
  const footer = page.getByTestId("site-footer");
  await expect(footer).toHaveCount(1);

  const [footerTop, viewportHeight] = await Promise.all([
    footer.evaluate((element) => element.getBoundingClientRect().top),
    page.evaluate(() => window.innerHeight),
  ]);

  expect(footerTop).toBeGreaterThanOrEqual(viewportHeight - 1);
}

test("l'accueil présente Todam simplement et ouvre l'inscription", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "Todam, accueil" }).filter({ hasText: "Todam" }),
  ).toHaveText("Todam");
  await expect(
    page.getByRole("heading", {
      name: "Gardez une trace des spectacles que vous avez vus. Notez-les et partagez votre avis. Trouvez votre prochain spectacle.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Mon journal de spectacles. Bientôt sur iOS et Android."),
  ).toBeVisible();
  await expectFooterBelowViewport(page);

  await page.getByRole("button", { name: /Commencez.*gratuit/ }).press("Enter");
  await expect(page.getByRole("heading", { name: "Créer ton journal" })).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "Créer un compte" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Todam, accueil" }).filter({ hasText: "Todam" }),
  ).toBeVisible();
});

test("l'inscription présente l'âge et les documents sans checkbox", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page.getByLabel("Nom d'utilisateur").fill("spectatrice-test");
  await page.getByLabel("E-mail").fill("spectatrice@example.test");
  await page.getByLabel("Mot de passe (8 caractères minimum)").fill("Todam-test-2026");

  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(
    page.getByText(/En créant mon compte, je déclare avoir au moins 15 ans/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Conditions générales d.utilisation/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Politique de confidentialité" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeEnabled();

  const [legalPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: /Conditions générales d.utilisation/ }).click(),
  ]);
  await legalPage.waitForLoadState("domcontentloaded");
  await expect(
    legalPage.getByRole("heading", {
      name: /Conditions générales d.utilisation de Todam/,
    }),
  ).toBeVisible();
  await expect(
    legalPage.getByRole("heading", {
      exact: true,
      name: "Conditions d'utilisation",
    }),
  ).toHaveCount(0);
  await expect(legalPage.getByText(/Date d'effet : 25 juillet 2026/)).toBeVisible();
  await expect(legalPage.getByText("Votre journal de spectacles.")).toBeVisible();
  await expectFooterBelowViewport(legalPage);
  await expect(
    legalPage.getByRole("link", {
      name: "Contact : contact@todam.fr",
    }),
  ).toBeVisible();
  await expect(legalPage.getByText("`signalement@todam.fr`")).toHaveCount(0);
  await expect(legalPage.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow",
  );
  await legalPage
    .getByRole("link", { name: "Todam, accueil" })
    .filter({ hasText: "Todam" })
    .click();
  await expect(legalPage).toHaveURL("/");
  await expect(page.getByLabel("Nom d'utilisateur")).toHaveValue("spectatrice-test");
  await expect(page.getByLabel("E-mail")).toHaveValue("spectatrice@example.test");
});

test("le footer commence sous le premier écran des pages courtes", async ({ page }) => {
  const pages = [
    { path: "/search", heading: "Rechercher" },
    { path: "/profile", heading: "Ton journal t’attend" },
  ];

  for (const item of pages) {
    await page.goto(item.path);
    await expect(
      page.getByRole("heading", { exact: true, name: item.heading }),
    ).toBeVisible();
    await expectFooterBelowViewport(page);
  }
});

test("la suppression reste demandable sans l'application", async ({ page }) => {
  await page.goto("/suppression-compte");

  await expect(
    page.getByRole("heading", { name: "Suppression d'un compte Todam" }),
  ).toBeVisible();
  await expect(page.getByLabel("Adresse e-mail du compte")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recevoir le lien de suppression" }),
  ).toBeDisabled();
});

test("les pages publiques Web utilisent uniquement l'en-tête Todam", async ({
  page,
}) => {
  const pages = [
    {
      path: "/confidentialite",
      contentTitle: "Politique de confidentialité de Todam",
      stackTitle: "Confidentialité",
    },
    {
      path: "/mentions-legales",
      contentTitle: "Mentions légales de Todam",
      stackTitle: "Mentions légales",
    },
    {
      path: "/sign-in",
      contentTitle: "Bon retour",
      stackTitle: "Connexion",
    },
  ];

  for (const item of pages) {
    await page.goto(item.path);
    await expect(
      page.getByRole("link", { name: "Todam, accueil" }).filter({ hasText: "Todam" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { exact: true, name: item.contentTitle }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { exact: true, name: item.stackTitle }),
    ).toHaveCount(0);
  }
});

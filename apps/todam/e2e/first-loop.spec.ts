import { expect, test, type Page } from "@playwright/test";
import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_EFFECTIVE_DATE,
} from "@todam/contracts";

async function expectFooterBelowViewport(page: Page) {
  const footer = page.getByTestId("site-footer");
  const pageScroller = page.locator(".todam-web-page-scroll");
  await expect(footer).toHaveCount(1);

  const [footerTop, viewportHeight, scrollMetrics] = await Promise.all([
    footer.evaluate((element) => element.getBoundingClientRect().top),
    page.evaluate(() => window.innerHeight),
    pageScroller.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    })),
  ]);

  expect(footerTop).toBeGreaterThanOrEqual(viewportHeight - 1);
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);

  const scrollerBox = await pageScroller.boundingBox();
  expect(scrollerBox).not.toBeNull();
  await page.mouse.move(
    scrollerBox!.x + scrollerBox!.width - 40,
    scrollerBox!.y + scrollerBox!.height / 2,
  );
  await page.mouse.wheel(0, scrollMetrics.scrollHeight);
  await expect
    .poll(() => footer.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(viewportHeight + 1);
  await page.mouse.wheel(0, -scrollMetrics.scrollHeight);
  await expect
    .poll(() => pageScroller.evaluate((element) => element.scrollTop))
    .toBe(0);
}

async function mockAuthenticatedProfile(
  page: Page,
  options: {
    ratingDistribution?: { value: number; count: number }[];
  } = {},
) {
  const now = "2026-07-26T12:00:00.000Z";
  const later = "2026-07-27T12:00:00.000Z";
  const ratingDistribution =
    options.ratingDistribution ??
    Array.from({ length: 10 }, (_, index) => ({
      value: index + 1,
      count: 0,
    }));

  await page.route("**/v1/auth/get-session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: "session-profile-test",
          token: "token-profile-test",
          userId: "user-profile-test",
          createdAt: now,
          updatedAt: now,
          expiresAt: later,
          ipAddress: null,
          userAgent: null,
        },
        user: {
          id: "user-profile-test",
          name: "spectatrice-test",
          username: "spectatrice-test",
          displayUsername: "spectatrice-test",
          email: "spectatrice@example.test",
          emailVerified: true,
          image: null,
          createdAt: now,
          updatedAt: now,
          age15OrOlder: true,
          termsVersion: CURRENT_TERMS_VERSION,
          privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
          channel: "web",
          role: "member",
        },
      }),
    });
  });
  await page.route("**/v1/me/dashboard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        profile: { pseudonym: "spectatrice-test" },
        counts: {
          seen: 0,
          ratings: ratingDistribution.reduce(
            (total, item) => total + item.count,
            0,
          ),
          watchlist: 0,
          lists: 0,
        },
        recentDiary: [],
        ratingDistribution,
        watchlist: [],
      }),
    });
  });
  await page.route("**/v1/me/home", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        profile: { pseudonym: "spectatrice-test" },
        homeCity: null,
        progress: { current: 0, target: 5, completed: false },
        radiusKm: 50,
        nearby: [],
        nationalUpcoming: [
          {
            production: {
              id: "5aecf9f4-b9da-4da0-b8fa-8898e882d99f",
              slug: "une-piece",
              title: "Une pièce",
              discipline: "theatre",
              audience: "general",
              workTitle: null,
              primaryCredit: "Compagnie Exemple",
              venueNames: ["Scène Exemple"],
              nextPerformance: "2030-09-10T18:00:00.000Z",
              poster: null,
            },
            performance: {
              startsAt: "2030-09-10T18:00:00.000Z",
              venueName: "Scène Exemple",
              locality: "Paris",
              distanceKm: null,
            },
          },
        ],
        recentlyAdded: [],
      }),
    });
  });
}

test("l'accueil présente Todam simplement et ouvre l'inscription", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Todam - Journal de spectacles");
  await expect(page.locator('link[rel="icon"][href="/favicon.ico?v=1"]')).toHaveCount(
    1,
  );
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

test("l'accueil connecté salue l'utilisateur et remplace le discours marketing", async ({
  page,
}) => {
  await mockAuthenticatedProfile(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { exact: true, name: "Bonjour, spectatrice-test" }),
  ).toBeVisible();
  await expect(page.getByText("0 sur 5", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Commencez.*gratuit/ })).toHaveCount(0);
  await expect(page.getByText("Choisissez votre ville")).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "À l'affiche en ce moment" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Une pièce" })).toBeVisible();

  const desktopBlocks = await Promise.all(
    [
      "home-progress-card",
      "home-recent-search",
      "home-city-selector",
      "home-discovery-section",
    ].map((testID) => page.getByTestId(testID).boundingBox()),
  );
  desktopBlocks.forEach((box) => expect(box).not.toBeNull());
  desktopBlocks.forEach((box) => {
    expect(box!.x).toBeCloseTo(desktopBlocks[0]!.x, 0);
    expect(box!.width).toBeCloseTo(desktopBlocks[0]!.width, 0);
  });
  expect(desktopBlocks[0]!.x).toBeCloseTo(192, 0);
  expect(desktopBlocks[0]!.width).toBeCloseTo(1056, 0);

  const desktopSteps = await Promise.all(
    [0, 1, 2].map((index) =>
      page.getByTestId(`home-progress-step-${index}`).boundingBox(),
    ),
  );
  desktopSteps.forEach((box) => expect(box).not.toBeNull());
  expect(desktopSteps[0]!.y).toBeCloseTo(desktopSteps[1]!.y, 0);
  expect(desktopSteps[1]!.y).toBeCloseTo(desktopSteps[2]!.y, 0);

  await page.setViewportSize({ width: 375, height: 800 });
  const mobileBlocks = await Promise.all(
    ["home-progress-card", "home-recent-search", "home-city-selector"].map(
      (testID) => page.getByTestId(testID).boundingBox(),
    ),
  );
  mobileBlocks.forEach((box) => expect(box).not.toBeNull());
  mobileBlocks.forEach((box) => {
    expect(box!.x).toBeCloseTo(20, 0);
    expect(box!.width).toBeCloseTo(335, 0);
  });
  const mobileSteps = await Promise.all(
    [0, 1, 2].map((index) =>
      page.getByTestId(`home-progress-step-${index}`).boundingBox(),
    ),
  );
  mobileSteps.forEach((box) => expect(box).not.toBeNull());
  expect(mobileSteps[1]!.y).toBeGreaterThan(mobileSteps[0]!.y);
  expect(mobileSteps[2]!.y).toBeGreaterThan(mobileSteps[1]!.y);

  const homeSearch = page.getByLabel("Rechercher un spectacle depuis l'accueil");
  await homeSearch.fill("Muses");
  await homeSearch.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=Muses$/);
});

test("le contenu reste centré et le scroll Web utilise le viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const frame = page.getByTestId("web-content-frame");
  const rootFrame = page.getByTestId("web-root-frame");
  const headerFrame = page.getByTestId("web-header-frame");
  const navigation = page.getByTestId("web-primary-navigation");
  const header = page.locator(".todam-web-header");
  const [frameBox, headerBox, navigationBox, webBackground] = await Promise.all([
    frame.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        borderLeftWidth: style.borderLeftWidth,
        borderRightWidth: style.borderRightWidth,
        boxShadow: style.boxShadow,
        left: rect.left,
        right: rect.right,
        width: rect.width,
      };
    }),
    headerFrame.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }),
    navigation.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { right: rect.right };
    }),
    page.locator("html").evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        color: style.backgroundColor,
        image: style.backgroundImage,
      };
    }),
  ]);

  expect(frameBox.width).toBeCloseTo(1440, 0);
  expect(frameBox.left).toBeCloseTo(0, 0);
  expect(frameBox.right).toBeCloseTo(1440, 0);
  expect(frameBox.borderLeftWidth).toBe("0px");
  expect(frameBox.borderRightWidth).toBe("0px");
  expect(frameBox.boxShadow).toBe("none");
  expect(headerBox.left).toBeCloseTo(160, 0);
  expect(headerBox.width).toBeCloseTo(1120, 0);
  expect(headerBox.right - navigationBox.right).toBeGreaterThanOrEqual(24);
  expect(headerBox.right - navigationBox.right).toBeLessThanOrEqual(26);
  expect(webBackground.color).toBe("rgb(240, 234, 225)");
  expect(webBackground.image).toContain("rgb(247, 243, 236)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator("#root")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(rootFrame).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(header).toHaveCSS("box-shadow", "none");

  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto("/confidentialite");
  const pageScroller = page.locator(".todam-web-page-scroll");
  await expect(pageScroller).toHaveCSS("overflow-y", "auto");
  expect(
    await pageScroller.evaluate(
      (element) =>
        Math.abs(element.getBoundingClientRect().right - window.innerWidth) < 1,
    ),
  ).toBe(true);
  await page.mouse.move(1400, 300);
  await page.mouse.wheel(0, 800);
  await expect
    .poll(() => pageScroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await expect(header).toHaveClass(/todam-web-header--scrolled/);
  expect(
    await header.evaluate((element) => window.getComputedStyle(element).boxShadow),
  ).not.toBe("none");
  const stickyHeaderBox = await headerFrame.boundingBox();
  expect(stickyHeaderBox).not.toBeNull();
  expect(stickyHeaderBox!.y).toBeCloseTo(0, 0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.mouse.wheel(0, -10_000);
  await expect
    .poll(() => pageScroller.evaluate((element) => element.scrollTop))
    .toBe(0);
  await expect(header).not.toHaveClass(/todam-web-header--scrolled/);
  await expect(header).toHaveCSS("box-shadow", "none");

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await expect(headerFrame.getByRole("link", { name: "Todam, accueil" })).toBeVisible();
  await expect(headerFrame.getByLabel("Titre, artiste ou théâtre")).toBeVisible();
  await expect(navigation.getByText("Accueil", { exact: true })).toBeVisible();
  await expect(navigation.getByText("Profil", { exact: true })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(247, 243, 236)",
  );
});

test("l'inscription présente l'âge et les documents sans checkbox", async ({
  page,
}) => {
  await page.route("**/v1/legal/current", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        terms: {
          version: CURRENT_TERMS_VERSION,
          effectiveDate: LEGAL_EFFECTIVE_DATE,
          url: "https://todam.fr/conditions-utilisation",
          pdfUrl: "https://todam.fr/legal/cgu-todam-v1.0.0.pdf",
        },
        privacyNotice: {
          version: CURRENT_PRIVACY_NOTICE_VERSION,
          effectiveDate: LEGAL_EFFECTIVE_DATE,
          url: "https://todam.fr/confidentialite",
          pdfUrl: `https://todam.fr/legal/confidentialite-todam-v${CURRENT_PRIVACY_NOTICE_VERSION}.pdf`,
        },
      }),
    });
  });
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
  await expect(legalPage).toHaveTitle("Conditions générales d'utilisation de Todam");
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
  await expect(legalPage.getByText(/Date d'effet : 26 juillet 2026/)).toBeVisible();
  await expect(legalPage.getByText("Votre journal de spectacles.")).toBeVisible();
  await expectFooterBelowViewport(legalPage);
  await expect(
    legalPage.getByRole("link", {
      name: "Contact : contact@todam.fr",
    }),
  ).toBeVisible();
  await expect(legalPage.getByText("`signalement@todam.fr`")).toHaveCount(0);
  await expect(legalPage.getByText(/médiateur|médiation/i)).toHaveCount(0);
  await expect(legalPage.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow,noarchive,nosnippet",
  );
  await legalPage
    .getByRole("link", { name: "Todam, accueil" })
    .filter({ hasText: "Todam" })
    .click();
  await expect(legalPage).toHaveURL("/");
  await expect(legalPage).toHaveTitle("Todam - Journal de spectacles");
  await expect(page.getByLabel("Nom d'utilisateur")).toHaveValue("spectatrice-test");
  await expect(page.getByLabel("E-mail")).toHaveValue("spectatrice@example.test");
});

test("le footer commence sous le premier écran des pages courtes", async ({ page }) => {
  const pages = [
    { path: "/search", heading: "Quel spectacle cherchez-vous ?" },
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

test("les pages juridiques utilisent le fond Web commun", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/confidentialite");

  const pageScroller = page.locator(".todam-web-page-scroll");
  const opaqueAncestors = await pageScroller.evaluate((element) => {
    const colors: string[] = [];
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== document.body) {
      const color = window.getComputedStyle(ancestor).backgroundColor;
      if (color !== "rgba(0, 0, 0, 0)") colors.push(color);
      ancestor = ancestor.parentElement;
    }
    return colors;
  });

  expect(opaqueAncestors.length).toBeGreaterThan(0);
  expect(
    opaqueAncestors.every((color) => color === "rgb(247, 243, 236)"),
  ).toBe(true);
  await expect(pageScroller).toHaveCSS("background-color", "rgb(240, 234, 225)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const htmlBackground = await page.locator("html").evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      color: style.backgroundColor,
      image: style.backgroundImage,
    };
  });
  expect(htmlBackground.color).toBe("rgb(240, 234, 225)");
  expect(htmlBackground.image).toContain("rgb(247, 243, 236)");
});

test("le profil ouvre les paramètres du compte et conserve le footer légal", async ({
  page,
}) => {
  await mockAuthenticatedProfile(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/profile");

  await expect(
    page.getByText("La répartition apparaîtra après ta première note."),
  ).toBeVisible();
  await expect(page.getByLabel("Histogramme des notes de 1 à 10")).toHaveCount(0);

  const desktopStats = await Promise.all(
    [0, 1, 2, 3].map((index) =>
      page.getByTestId(`profile-stat-${index}`).boundingBox(),
    ),
  );
  desktopStats.forEach((box) => expect(box).not.toBeNull());
  desktopStats.forEach((box) => {
    expect(box!.y).toBeCloseTo(desktopStats[0]!.y, 0);
  });

  await page.setViewportSize({ width: 375, height: 800 });
  const mobileStats = await Promise.all(
    [0, 1, 2, 3].map((index) =>
      page.getByTestId(`profile-stat-${index}`).boundingBox(),
    ),
  );
  mobileStats.forEach((box) => expect(box).not.toBeNull());
  expect(mobileStats[0]!.y).toBeCloseTo(mobileStats[1]!.y, 0);
  expect(mobileStats[2]!.y).toBeCloseTo(mobileStats[3]!.y, 0);
  expect(mobileStats[2]!.y).toBeGreaterThan(mobileStats[0]!.y);

  await page.setViewportSize({ width: 1440, height: 900 });
  const settingsButton = page.getByRole("button", {
    name: "Paramètres du compte",
  });
  await expect(settingsButton).toBeVisible();
  await expect(page.getByText("Mes données", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Zone sensible", { exact: true })).toHaveCount(0);

  await expect(
    page.getByRole("button", { name: "Conditions d'utilisation" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Politique de confidentialité" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mentions légales" })).toHaveCount(0);

  const footer = page.getByTestId("site-footer");
  await expect(
    footer.getByRole("link", { name: "Conditions d'utilisation" }),
  ).toBeVisible();
  await expect(footer.getByRole("link", { name: "Confidentialité" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Mentions légales" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Supprimer un compte" })).toBeVisible();

  await settingsButton.click();
  await expect(page).toHaveURL("/parametres-compte");
  await expect(
    page.getByRole("heading", { exact: true, name: "Paramètres du compte" }),
  ).toBeVisible();
  await expect(page.getByText("Mes données", { exact: true })).toBeVisible();
  await expect(page.getByText("Zone sensible", { exact: true })).toBeVisible();
  const deleteButton = page.getByRole("button", { name: "Supprimer mon compte" });
  await expect(deleteButton).toHaveCSS("background-color", "rgb(161, 38, 26)");
  const emailSubmitWidth = await page
    .getByRole("button", { name: "Confirmer la nouvelle adresse" })
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(emailSubmitWidth).toBeGreaterThanOrEqual(240);
  expect(emailSubmitWidth).toBeLessThan(400);

  await page.setViewportSize({ width: 375, height: 800 });
  const [hasHorizontalOverflow, exportButtonWidth, deleteButtonWidth] =
    await Promise.all([
      page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      page
        .getByRole("button", { name: "Exporter mes données" })
        .evaluate((element) => element.getBoundingClientRect().width),
      deleteButton.evaluate((element) => element.getBoundingClientRect().width),
    ]);
  expect(hasHorizontalOverflow).toBe(false);
  expect(exportButtonWidth).toBeGreaterThan(250);
  expect(deleteButtonWidth).toBeGreaterThan(250);

  await deleteButton.click();
  await expect(page).toHaveURL("/supprimer-mon-compte");
});

test("le profil affiche l'histogramme dès qu'une note existe", async ({ page }) => {
  await mockAuthenticatedProfile(page, {
    ratingDistribution: Array.from({ length: 10 }, (_, index) => ({
      value: index + 1,
      count: index === 7 ? 1 : 0,
    })),
  });
  await page.goto("/profile");

  await expect(page.getByLabel("Histogramme des notes de 1 à 10")).toBeVisible();
  await expect(
    page.getByText("La répartition apparaîtra après ta première note."),
  ).toHaveCount(0);
});

test("l'export des paramètres affiche ses états de chargement, succès et erreur", async ({
  page,
}) => {
  await mockAuthenticatedProfile(page);

  let releaseExport: (() => void) | undefined;
  const exportGate = new Promise<void>((resolve) => {
    releaseExport = resolve;
  });
  await page.route("**/v1/me/export?format=json", async (route) => {
    await exportGate;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        exportedAt: "2026-07-26T12:00:00.000Z",
        account: {
          id: "user-profile-test",
          pseudonym: "spectatrice-test",
          email: "spectatrice@example.test",
          emailVerified: true,
          createdAt: "2026-07-26T12:00:00.000Z",
          homeCity: null,
        },
        legal: {
          age15OrOlder: true,
          ageConfirmedAt: "2026-07-26T12:00:00.000Z",
          termsVersion: CURRENT_TERMS_VERSION,
          termsAcceptedAt: "2026-07-26T12:00:00.000Z",
          privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
          channel: "web",
        },
        diary: [],
        ratings: [],
        watchlist: [],
      }),
    });
  });
  await page.goto("/parametres-compte");

  const exportButton = page.getByRole("button", { name: "Exporter mes données" });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  await expect(exportButton).toBeDisabled();
  await expect(page.getByLabel("Chargement")).toBeVisible();
  releaseExport?.();
  await expect(page.getByText("L'export a été préparé.")).toBeVisible();

  await page.unroute("**/v1/me/export?format=json");
  await page.route("**/v1/me/export?format=json", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/problem+json",
      body: JSON.stringify({
        type: "about:blank",
        title: "Service indisponible",
        status: 503,
        detail: "L'export est temporairement indisponible.",
      }),
    });
  });
  await exportButton.click();
  await expect(
    page.getByText("L'export n'a pas pu être créé. Réessaie plus tard."),
  ).toBeVisible();
});

test("la recherche reste dans l'en-tête et se contrôle à la souris", async ({
  page,
}) => {
  await page.goto("/");

  const searchField = page.getByLabel("Titre, artiste ou théâtre");
  await expect(searchField).toBeVisible();
  await expect(searchField).toHaveAttribute("autocomplete", "off");
  await expect(searchField).toHaveAttribute("type", "search");
  await searchField.fill("Muses");
  await page.getByRole("button", { name: "Rechercher" }).click();

  await expect(page).toHaveURL(/\/search\?q=Muses$/);
  await expect(
    page.getByRole("heading", { name: "Résultats pour « Muses »" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Effacer la recherche" }).click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(searchField).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Quel spectacle cherchez-vous ?" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Recherchez par titre, artiste ou théâtre depuis la barre ci-dessus.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Exemples de recherches")).toBeVisible();
  await expect(page.getByRole("button", { name: "Monaco" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Théâtre des Muses" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "théâtre", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "théâtre", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=th%C3%A9%C3%A2tre$/);
  await expect(page.getByText("Une erreur réseau empêche l’affichage.")).toHaveCount(0);

  await page.goto("/sign-in");
  await expect(page.getByLabel("Titre, artiste ou théâtre")).toBeVisible();
});

test("les formulaires d'authentification déclarent leurs champs au navigateur", async ({
  page,
}) => {
  await page.goto("/sign-in");

  const identifier = page.getByLabel("Email ou nom d'utilisateur");
  const currentPassword = page.getByLabel("Mot de passe", { exact: true });
  await expect(identifier).toHaveAttribute("autocomplete", "username");
  await expect(identifier).toHaveAttribute("type", "text");
  await expect(currentPassword).toHaveAttribute("autocomplete", "current-password");
  await expect(currentPassword).toHaveAttribute("type", "password");

  await page.goto("/sign-up");

  const username = page.getByLabel("Nom d'utilisateur");
  const email = page.getByLabel("E-mail");
  const newPassword = page.getByLabel("Mot de passe (8 caractères minimum)");
  await expect(username).toHaveAttribute("autocomplete", "off");
  await expect(username).toHaveAttribute("type", "text");
  await expect(email).toHaveAttribute("autocomplete", "username");
  await expect(email).toHaveAttribute("type", "email");
  await expect(newPassword).toHaveAttribute("autocomplete", "new-password");
  await expect(newPassword).toHaveAttribute("type", "password");
});

test("un e-mail déjà inscrit reste sur le formulaire avec les recours utiles", async ({
  page,
}) => {
  await page.route("**/v1/legal/current", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        terms: {
          version: CURRENT_TERMS_VERSION,
          effectiveDate: LEGAL_EFFECTIVE_DATE,
          url: "https://todam.fr/conditions-utilisation",
          pdfUrl: "https://todam.fr/legal/cgu-todam-v1.0.0.pdf",
        },
        privacyNotice: {
          version: CURRENT_PRIVACY_NOTICE_VERSION,
          effectiveDate: LEGAL_EFFECTIVE_DATE,
          url: "https://todam.fr/confidentialite",
          pdfUrl: `https://todam.fr/legal/confidentialite-todam-v${CURRENT_PRIVACY_NOTICE_VERSION}.pdf`,
        },
      }),
    });
  });
  await page.route("**/v1/auth/sign-up/email", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/problem+json",
      body: JSON.stringify({
        type: "about:blank",
        title: "Conflit",
        status: 409,
        detail: "Un compte existe déjà avec cette adresse e-mail.",
        code: "EMAIL_ALREADY_REGISTERED",
      }),
    });
  });

  await page.goto("/sign-up");
  await page.getByLabel("E-mail").fill("spectatrice@example.test");
  await page.getByLabel("Nom d'utilisateur").fill("autre-spectatrice");
  await page.getByLabel("Mot de passe (8 caractères minimum)").fill("Todam-test-2026");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(
    page.getByText("Un compte existe déjà avec cette adresse e-mail", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "Créer ton journal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Confirme ton adresse e-mail" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mot de passe oublié" })).toBeVisible();
});

test("les paramètres exposent les bons champs et confirment les modifications", async ({
  page,
}) => {
  await mockAuthenticatedProfile(page);
  await page.route("**/v1/me/username", async (route) => {
    const payload = route.request().postDataJSON() as { username: string };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ username: payload.username }),
    });
  });
  await page.route("**/v1/me/email-change", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ verificationSent: true }),
    });
  });
  await page.route("**/v1/me/password-change", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ changed: true }),
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/parametres-compte");

  const newEmail = page.getByLabel("Nouvelle adresse e-mail");
  const currentPasswords = page.getByLabel("Mot de passe actuel");
  const username = page.getByLabel("Nom d'utilisateur Todam");
  const newPasswords = page.locator('input[autocomplete="new-password"]');

  await expect(newEmail).toHaveAttribute("autocomplete", "username");
  await expect(newEmail).toHaveAttribute("type", "email");
  await expect(currentPasswords).toHaveCount(2);
  await expect(currentPasswords.nth(0)).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(currentPasswords.nth(1)).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(username).toHaveAttribute("autocomplete", "off");
  await expect(newPasswords).toHaveCount(2);
  await expect(newPasswords.nth(0)).toHaveAttribute("type", "password");
  await expect(newPasswords.nth(1)).toHaveAttribute("type", "password");
  await newEmail.focus();
  await expect(newEmail).toHaveCSS("border-color", "rgb(196, 61, 40)");
  await expect(newEmail).toHaveCSS("outline-width", "3px");
  await newEmail.blur();
  await expect(newEmail).toHaveCSS("outline-width", "0px");

  await username.fill("nouveau-pseudonyme");
  await page.getByRole("button", { name: "Modifier le nom d'utilisateur" }).click();
  await expect(page.getByText("Ton nom d'utilisateur a été modifié.")).toBeVisible();

  await newEmail.fill("nouvelle@example.test");
  await currentPasswords.nth(0).fill("Todam-test-2026");
  await page.getByRole("button", { name: "Confirmer la nouvelle adresse" }).click();
  await expect(
    page.getByText(/Ton adresse actuelle reste active jusqu’à sa confirmation/),
  ).toBeVisible();

  await currentPasswords.nth(1).fill("Todam-test-2026");
  await newPasswords.nth(0).fill("Todam-test-2027");
  await newPasswords.nth(1).fill("Todam-test-2028");
  await page.getByRole("button", { name: "Modifier le mot de passe" }).click();
  await expect(
    page.getByText("La confirmation ne correspond pas au nouveau mot de passe."),
  ).toBeVisible();
  await newPasswords.nth(1).fill("Todam-test-2027");
  await page.getByRole("button", { name: "Modifier le mot de passe" }).click();
  await expect(
    page.getByText(
      "Ton mot de passe a été modifié. Tes autres sessions ont été déconnectées.",
    ),
  ).toBeVisible();

  await page.setViewportSize({ width: 375, height: 800 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);

  await page.goto("/email-verifie?mode=change-email");
  await expect(
    page.getByRole("heading", { name: "Nouvelle adresse confirmée" }),
  ).toBeVisible();
  await expect(page.getByText(/maintenant utilisée pour te connecter/)).toBeVisible();
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
    if (item.path === "/mentions-legales") {
      const legalText = await page.locator("body").innerText();
      expect(legalText).toContain("Nom éditeur test");
      expect(legalText).toContain("projet personnel gratuit");
      expect(legalText).toContain("à titre non professionnel");
      expect(legalText).toContain("OVH SAS");
      expect(legalText).toContain("2 rue Kellermann, 59100 Roubaix, France");
      expect(legalText).toContain("+33 9 72 10 10 07");
      expect(legalText).toContain("Cloudflare, Inc.");
      expect(legalText).toContain("101 Townsend Street, San Francisco, CA 94107, USA");
      expect(legalText).not.toMatch(/à vérifier avant publication/i);
      expect(legalText).not.toMatch(
        /entrepreneur individuel|SIREN|SIRET|RNE|code APE|forme juridique|activité principale/i,
      );
      expect(legalText).not.toMatch(/Adresse\s*:|Téléphone\s*:/i);
      await expect(page.getByText(/médiateur|médiation/i)).toHaveCount(0);
    }
  }
});

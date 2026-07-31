import { expect, test, type Page } from "@playwright/test";
import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_EFFECTIVE_DATE,
} from "@todam/contracts";

async function expectFooterBelowViewport(page: Page) {
  const footer = page.getByTestId("site-footer");
  const pageScroller = page.locator(".todam-web-page-scroll").filter({ has: footer });
  await expect(footer).toHaveCount(1);
  await pageScroller.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect
    .poll(() => pageScroller.evaluate((element) => element.scrollTop))
    .toBe(0);

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

async function scrollFooterIntoView(page: Page) {
  const footer = page.getByTestId("site-footer");
  const pageScroller = page.locator(".todam-web-page-scroll").filter({ has: footer });
  await expect(footer).toHaveCount(1);
  await pageScroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(footer).toBeVisible();
  return footer;
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
        profile: { username: "spectatrice-test" },
        counts: {
          seen: 0,
          ratings: ratingDistribution.reduce((total, item) => total + item.count, 0),
          watchlist: 0,
          lists: 0,
          reviews: 0,
        },
        recentDiary: [],
        recentRatings: [],
        ratingDistribution,
        watchlist: [],
      }),
    });
  });
  await page.route("**/v1/me/profile", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        username: "spectatrice-test",
        bio: null,
        profileVisibility: "public",
        ratingVisibility: "review_only",
        memberSince: now,
      }),
    });
  });
  await page.route("**/v1/me/shows**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        nextCursor: null,
        total: 0,
        facets: {
          disciplines: [],
          venues: [],
          years: [],
          communityRatings: [],
          myRatings: [],
          reviews: [],
          upcoming: [],
        },
      }),
    });
  });
  await page.route("**/v1/me/journal**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [], nextCursor: null }),
    });
  });
  await page.route("**/v1/me/lists", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });
  await page.route("**/v1/me/lists/*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-4000-8000-000000000001",
        slug: "ma-liste",
        name: "Ma liste",
        description: null,
        visibility: "private",
        itemCount: 0,
        updatedAt: now,
        username: "spectatrice-test",
        items: [],
      }),
    });
  });
  await page.route("**/v1/me/watchlist", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });
  await page.route("**/v1/me/reviews", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });
  await page.route("**/v1/me/home", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        profile: { username: "spectatrice-test" },
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
              minimumAge: null,
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

  await expect(page).toHaveTitle("Todam — votre journal de spectacles");
  await expect(
    page.locator('link[rel="icon"][href="/favicon.svg?v=3"][type="image/svg+xml"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      'link[rel="icon"][href="/favicon-dark.svg?v=3"][media="(prefers-color-scheme: dark)"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Todam, accueil" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Les spectacles passent. Votre journal reste.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Découvrez le théâtre, l’opéra et le ballet, gardez une trace de ce que vous avez vu, notez vos expériences et partagez vos listes.",
    ),
  ).toBeVisible();
  await expectFooterBelowViewport(page);

  await page.getByRole("link", { name: "Créer mon journal" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Créer ton journal" })).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "Créer un compte" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Todam, accueil" }).first(),
  ).toBeVisible();
});

test("l'accueil connecté place le journal au premier écran", async ({ page }) => {
  await mockAuthenticatedProfile(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { exact: true, name: "Mon journal de spectacles" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Retrouvez les spectacles que vous avez vus, notez-les et gardez-en une trace.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Journal en cours · 0/5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer mon journal" })).toHaveCount(0);
  await expect(
    page.getByText("Choisir une ville pour personnaliser l’affiche →"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Commencer mon journal" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Une pièce" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ouvrir mes spectacles" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Gérer mes listes" })).toBeVisible();

  const [journalBox, listsBox] = await Promise.all([
    page.getByRole("link", { name: "Ouvrir mes spectacles" }).boundingBox(),
    page.getByRole("link", { name: "Gérer mes listes" }).boundingBox(),
  ]);
  expect(journalBox).not.toBeNull();
  expect(listsBox).not.toBeNull();
  expect(journalBox!.y).toBeCloseTo(listsBox!.y, 0);

  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.getByText("Journal en cours · 0/5")).toBeVisible();
  const mobileHero = page.locator(".todam-connected-hero");
  const mobileHeroBox = await mobileHero.boundingBox();
  expect(mobileHeroBox).not.toBeNull();
  expect(mobileHeroBox!.x).toBeCloseTo(0, 0);
  expect(mobileHeroBox!.width).toBeCloseTo(375, 0);
  await expect(mobileHero).toHaveCSS("border-radius", "0px");
  await expect(mobileHero).toHaveCSS("border-left-width", "0px");
  await expect(mobileHero).toHaveCSS("border-right-width", "0px");
  await expect(mobileHero).toHaveCSS("box-shadow", "none");
  await expect(page.locator(".todam-web-page-scroll")).toHaveCSS(
    "background-color",
    "rgb(252, 248, 242)",
  );
  await expect(page.locator(".todam-web-page-scroll")).toHaveCSS(
    "background-image",
    "none",
  );
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("l'accueil masque la progression terminée et les listes vides restent explicites", async ({
  page,
}) => {
  await mockAuthenticatedProfile(page);
  await page.unroute("**/v1/me/home");
  await page.route("**/v1/me/home", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        profile: { username: "spectatrice-test" },
        homeCity: null,
        progress: { current: 5, target: 5, completed: true },
        radiusKm: 50,
        nearby: [],
        nationalUpcoming: [],
        recentlyAdded: [],
      }),
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { exact: true, name: "Mon journal de spectacles" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Noter un spectacle" }),
  ).toBeVisible();
  await expect(page.getByText(/Journal en cours/)).toHaveCount(0);

  await page.goto("/journal/listes");
  await expect(
    page.getByText("Vous n’avez encore créé aucune liste.", { exact: true }),
  ).toBeVisible();
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
  await expect(frame).toBeVisible();
  await expect(headerFrame).toBeVisible();
  await expect(navigation).toBeVisible();
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
  expect(headerBox.right - navigationBox.right).toBeLessThanOrEqual(33);
  expect(webBackground.color).toBe("rgb(240, 234, 225)");
  expect(webBackground.image).toContain("linear-gradient");
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
  await expect(headerFrame).toHaveCount(0);
  const mobileNavigation = page.getByTestId("web-mobile-navigation");
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole("link")).toHaveCount(4);
  await expect(
    mobileNavigation.getByRole("link", { exact: true, name: "Accueil" }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { exact: true, name: "Profil" }),
  ).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(252, 248, 242)",
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
          pdfUrl: `https://todam.fr/legal/cgu-todam-v${CURRENT_TERMS_VERSION}.pdf`,
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
  await expect(page.getByText("À savoir", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /Tes listes, ta liste « À voir » et tes notes sans avis public sont privées par défaut/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/Chaque nouvelle liste et chaque nouvel avis/),
  ).toHaveCount(0);
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
  const effectiveDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${LEGAL_EFFECTIVE_DATE}T00:00:00Z`));
  await expect(
    legalPage.getByText(
      `Version ${CURRENT_TERMS_VERSION} — Date d'effet : ${effectiveDate}`,
    ),
  ).toBeVisible();
  await expectFooterBelowViewport(legalPage);
  await expect(
    legalPage
      .getByRole("link", {
        name: "Nous contacter",
      })
      .first(),
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
  await expect(legalPage).toHaveTitle("Todam — votre journal de spectacles");
  await expect(page.getByLabel("Nom d'utilisateur")).toHaveValue("spectatrice-test");
  await expect(page.getByLabel("E-mail")).toHaveValue("spectatrice@example.test");
});

test("le footer commence sous le premier écran des pages courtes", async ({ page }) => {
  const pages = [
    { path: "/search", heading: "Résultats de recherche" },
    { path: "/page-qui-n-existe-pas", heading: "Cette page n’est pas à l’affiche." },
  ];

  for (const item of pages) {
    await page.goto(item.path);
    await expect(
      page.getByRole("heading", { exact: true, name: item.heading }),
    ).toBeVisible();
    await expectFooterBelowViewport(page);
  }
});

test("les pages d’authentification utilisent le footer minimal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sign-in");

  await expect(
    page.getByRole("heading", { exact: true, name: "Bon retour" }),
  ).toBeVisible();
  await expectFooterBelowViewport(page);

  const footer = page.getByTestId("site-footer");
  await expect(
    footer.getByRole("link", { exact: true, name: "Informations légales" }),
  ).toBeVisible();
  await expect(
    footer.getByRole("link", { exact: true, name: "Nous contacter" }),
  ).toBeVisible();
  await expect(footer.getByText("Professionnels", { exact: true })).toHaveCount(0);
});

test("le footer partagé couvre le profil, le journal et les listes", async ({
  page,
}) => {
  await mockAuthenticatedProfile(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  const pages = [
    { path: "/profile", heading: "spectatrice-test" },
    { path: "/journal", heading: "Mes spectacles" },
    { path: "/journal/a-voir", heading: "À voir" },
    { path: "/journal/vus", heading: "Vus" },
    { path: "/journal/notes", heading: "Notés" },
    { path: "/journal/avis", heading: "Mes avis" },
    { path: "/journal/listes", heading: "Mes listes" },
    {
      path: "/journal/listes/00000000-0000-4000-8000-000000000001",
      heading: "Ma liste",
    },
  ];

  for (const item of pages) {
    await page.goto(item.path);
    await expect(
      page.getByRole("heading", { exact: true, name: item.heading }).first(),
    ).toBeVisible();
    await expectFooterBelowViewport(page);
  }
});

test("la fiche de liste masque le formulaire jusqu’à la modification", async ({
  page,
}) => {
  await mockAuthenticatedProfile(page);
  await page.goto("/journal/listes/00000000-0000-4000-8000-000000000001");

  await expect(
    page.getByRole("heading", { exact: true, level: 1, name: "Ma liste" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nom *" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Description" })).toHaveCount(0);

  await page
    .getByRole("button", { exact: true, name: "Modifier le titre et la description" })
    .click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Modifier la liste" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nom *" })).toHaveValue("Ma liste");
  await expect(page.getByRole("textbox", { name: "Description" })).toBeVisible();

  await page.getByRole("button", { exact: true, name: "Annuler" }).click();
  await expect(page.getByRole("textbox", { name: "Nom *" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Description" })).toHaveCount(0);
});

test("les pages juridiques utilisent le fond Web commun", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/confidentialite");

  const pageScroller = page.locator(".todam-web-page-scroll");
  await expect(
    page.getByRole("heading", { name: "Politique de confidentialité de Todam" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      pageScroller.evaluate((element) => {
        const unexpectedColors: string[] = [];
        let ancestor: HTMLElement | null = element;
        while (ancestor && ancestor !== document.body) {
          const color = window.getComputedStyle(ancestor).backgroundColor;
          if (
            color !== "rgba(0, 0, 0, 0)" &&
            color !== "rgb(240, 234, 225)" &&
            color !== "rgb(252, 248, 242)"
          ) {
            unexpectedColors.push(color);
          }
          ancestor = ancestor.parentElement;
        }
        return unexpectedColors;
      }),
    )
    .toEqual([]);
  await expect(pageScroller).toHaveCSS("background-color", "rgb(240, 234, 225)");
  await expect(pageScroller).toHaveCSS("background-image", /linear-gradient/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const htmlBackground = await page.locator("html").evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      color: style.backgroundColor,
      image: style.backgroundImage,
    };
  });
  expect(htmlBackground.color).toBe("rgb(240, 234, 225)");
  expect(htmlBackground.image).toContain("linear-gradient");
});

test("le footer regroupe les informations légales sur une seule page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Les spectacles passent. Votre journal reste.",
    }),
  ).toBeVisible();

  const footer = await scrollFooterIntoView(page);
  await expect(footer.getByText("Mon journal de spectacles")).toBeVisible();
  await expect(
    footer.getByRole("link", { exact: true, name: "Informations légales" }),
  ).toBeVisible();
  await expect(
    footer.getByRole("link", { exact: true, name: "Conditions d’utilisation" }),
  ).toHaveCount(0);
  await expect(
    footer.getByRole("link", { exact: true, name: "Confidentialité" }),
  ).toHaveCount(0);
  await expect(
    footer.getByRole("link", { exact: true, name: "Mentions légales" }),
  ).toHaveCount(0);

  await footer.getByRole("link", { exact: true, name: "Informations légales" }).click();
  await expect(page).toHaveURL("/informations-legales");
  await expect(
    page.getByRole("heading", { exact: true, name: "Informations légales" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Informations légales — Todam");
  await expect(
    page.getByRole("heading", {
      exact: true,
      name: "Conditions générales d'utilisation de Todam",
    }),
  ).toBeVisible();

  await page.getByRole("tab", { exact: true, name: "Confidentialité" }).click();
  await expect(
    page.getByRole("heading", {
      exact: true,
      name: "Politique de confidentialité de Todam",
    }),
  ).toBeVisible();

  await page.getByRole("tab", { exact: true, name: "Mentions légales" }).click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Mentions légales de Todam" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow,noarchive,nosnippet",
  );
});

test("le profil sépare les informations, statistiques et paramètres du compte", async ({
  page,
}) => {
  await mockAuthenticatedProfile(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/profile");

  await expect(
    page.getByRole("heading", { exact: true, name: "spectatrice-test" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Informations" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Statistiques" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Paramètres" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Modifier mon profil" })).toBeVisible();

  await page.setViewportSize({ width: 375, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
  await expect(page.getByTestId("web-mobile-navigation")).toBeVisible();
  await expect(page.getByTestId("web-mobile-navigation").getByRole("link")).toHaveCount(
    4,
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("tab", { name: "Paramètres" }).click();
  const settingsButton = page.getByRole("link", {
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
  const [hasHorizontalOverflow, deleteButtonWidth] = await Promise.all([
    page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    deleteButton.evaluate((element) => element.getBoundingClientRect().width),
  ]);
  expect(hasHorizontalOverflow).toBe(false);
  expect(deleteButtonWidth).toBeGreaterThan(250);

  await deleteButton.click();
  await expect(page).toHaveURL("/supprimer-mon-compte");
});

test("Mes spectacles conserve ses filtres et tient à 320 px", async ({ page }) => {
  await mockAuthenticatedProfile(page);
  await page.unroute("**/v1/me/shows**");
  await page.route("**/v1/me/shows**", async (route) => {
    const url = new URL(route.request().url());
    const selected = url.searchParams.get("myRating");
    const item = {
      production: {
        id: "5aecf9f4-b9da-4da0-b8fa-8898e882d99f",
        slug: "une-piece",
        title: "Une pièce",
        discipline: "theatre",
        audience: "general",
        minimumAge: null,
        workTitle: null,
        primaryCredit: "Compagnie Exemple",
        company: null,
        venueNames: ["Scène Exemple"],
        nextPerformance: null,
        nextVenue: null,
        poster: null,
      },
      section: "rated",
      diaryEntryId: "400234d9-6224-4372-bca3-5d430ac5d9f0",
      seenCount: 1,
      addedAt: "2026-07-26T12:00:00.000Z",
      attendedOn: "2026-07-25",
      ratedAt: "2026-07-26T12:00:00.000Z",
      myRating: 8,
      communityRating: { average: 7.4, count: 12 },
      review: null,
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: selected && selected !== "8" ? [] : [item],
        nextCursor: null,
        total: selected && selected !== "8" ? 0 : 1,
        facets: {
          disciplines: [{ value: "theatre", count: 1 }],
          venues: [{ value: "Scène Exemple", count: 1 }],
          years: [{ value: 2026, count: 1 }],
          communityRatings: [{ value: 7, count: 1 }],
          myRatings: [{ value: 8, count: 1 }],
          reviews: [{ value: "without", count: 1 }],
          upcoming: [],
        },
      }),
    });
  });

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/journal/notes");
  await expect(page.getByTestId("web-context-header")).toBeVisible();
  await expect(page.getByTestId("web-mobile-navigation").getByRole("link")).toHaveCount(
    4,
  );
  await expect(page.getByTestId("my-shows-navigation").getByRole("link")).toHaveCount(
    5,
  );
  await expect(page.getByText("Communauté : 7,4/10 · 12 notes")).toBeVisible();
  await expect(page.getByText("Ma note : 8/10")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);

  await page.getByRole("button", { name: "Ma note" }).click();
  await expect(page.getByTestId("my-shows-filter-close-target")).toBeFocused();
  await page.getByRole("radio", { name: /8\/10/ }).click();
  await expect(page).toHaveURL(/\/journal\/notes\?myRating=8$/);
  await expect(page.getByRole("button", { name: "Ma note : 8/10" })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("button", { name: "Ma note : 8/10" })).toBeVisible();
});

test("les anciennes URL personnelles redirigent vers Mes spectacles", async ({
  page,
}) => {
  await mockAuthenticatedProfile(page);
  await page.goto("/listes");
  await expect(page).toHaveURL("/journal/listes");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mes listes" }),
  ).toBeVisible();

  await page.goto("/profile?tab=avis");
  await expect(page).toHaveURL("/journal/avis");
  await expect(page.getByRole("heading", { level: 1, name: "Mes avis" })).toBeVisible();
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
          username: "spectatrice-test",
          email: "spectatrice@example.test",
          emailVerified: true,
          createdAt: "2026-07-26T12:00:00.000Z",
          profileVisibility: "public",
          ratingVisibility: "review_only",
          bio: null,
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
        reviews: [],
        lists: [],
        contentReports: [],
        communitySubmissions: [],
        companyClaims: [],
        companyMemberships: [],
        catalogRevisions: [],
      }),
    });
  });
  await page.goto("/parametres-compte");

  const exportButton = page.getByRole("button", { name: "Exporter en JSON" });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  await expect(exportButton).toBeDisabled();
  await expect(page.getByLabel("Chargement")).toBeVisible();
  releaseExport?.();
  await expect(page.getByText("L'export JSON a été préparé.")).toBeVisible();

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
  await page.route("**/v1/search**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        type: "productions",
        total: 0,
        productions: [],
        venues: [],
        companies: [],
        members: [],
        nextCursor: null,
        suggestion: null,
      }),
    });
  });
  await page.goto("/");

  const searchField = page.getByLabel("Titre, compagnie, lieu ou membre");
  await expect(searchField).toBeVisible();
  await expect(searchField).toHaveAttribute("autocomplete", "off");
  await expect(searchField).toHaveAttribute("type", "search");
  await searchField.fill("Muses");
  await page.getByRole("button", { name: "Rechercher" }).click();

  await expect(page).toHaveURL(/\/search\?q=Muses$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Résultats de recherche" }),
  ).toBeVisible();
  await expect(searchField).toHaveCount(1);
  await expect(page.getByText("Catalogue", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Rechercher dans Todam", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("discover-filter-sidebar")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "0 résultat pour « Muses »" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Aucun résultat. Modifiez la période, la ville ou le type de contenu.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Effacer la recherche" }).click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(searchField).toHaveValue("");
  await expect(
    page.getByRole("heading", { level: 1, name: "Résultats de recherche" }),
  ).toBeVisible();
  await expect(
    page.getByText("Recherchez un spectacle, un lieu, une compagnie ou un membre."),
  ).toBeVisible();

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/search?q=Muses");
  await expect(page.getByTestId("discover-filter-sidebar")).toHaveCount(0);
  const filters = page.getByTestId("discover-advanced-filters-toggle");
  await expect(filters).toBeVisible();
  await filters.click();
  await expect(page.getByTestId("discover-advanced-filters-panel")).toBeVisible();
  await page.getByTestId("discover-advanced-filters-panel-close").click();
  await expect(page.getByTestId("discover-advanced-filters-panel")).toHaveCount(0);

  await page.goto("/sign-in");
  await expect(page.getByLabel("Titre, compagnie, lieu ou membre")).toHaveCount(0);
});

test("les formulaires d'authentification déclarent leurs champs au navigateur", async ({
  page,
}) => {
  await page.goto("/sign-in");

  const identifier = page.getByLabel("Email ou nom d'utilisateur");
  const currentPassword = page.getByLabel(/^Mot de passe \*$/);
  await expect(identifier).toHaveAttribute("autocomplete", "username");
  await expect(identifier).toHaveAttribute("type", "text");
  await expect(currentPassword).toHaveAttribute("autocomplete", "current-password");
  await expect(currentPassword).toHaveAttribute("type", "password");

  const passwordVisibility = page.getByRole("button", {
    name: "Afficher le mot de passe",
  });
  await expect(passwordVisibility).toHaveText("");
  await passwordVisibility.click();
  await expect(currentPassword).toHaveJSProperty("type", "text");
  await expect(
    page.getByRole("button", { name: "Masquer le mot de passe" }),
  ).toHaveText("");

  await page.goto("/sign-up");

  const username = page.getByLabel("Nom d'utilisateur");
  const email = page.getByLabel("E-mail");
  const newPassword = page.getByLabel("Mot de passe (8 caractères minimum)");
  await expect(username).toHaveAttribute("autocomplete", "username");
  await expect(username).toHaveAttribute("type", "text");
  await expect(email).toHaveAttribute("autocomplete", "email");
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
          pdfUrl: `https://todam.fr/legal/cgu-todam-v${CURRENT_TERMS_VERSION}.pdf`,
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

  await username.fill("nouveau-nom-utilisateur");
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
  await expect(
    page.getByText("La confirmation ne correspond pas au nouveau mot de passe."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Modifier le mot de passe" }),
  ).toBeDisabled();
  await newPasswords.nth(1).fill("Todam-test-2027");
  await expect(
    page.getByRole("button", { name: "Modifier le mot de passe" }),
  ).toBeEnabled();
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
      page.getByRole("link", { name: "Todam, accueil" }).first(),
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

test("le footer ouvre la page Contact et le formulaire confirme son envoi", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/v1/contact", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({ ok: true }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/");
  await scrollFooterIntoView(page);
  await page.getByRole("link", { name: "Nous contacter" }).click();

  await expect(page).toHaveURL("/contact");
  await expect(
    page.getByRole("heading", { exact: true, name: "Écrivez à Todam" }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:8082/contact",
  );
  await expect(
    page.getByRole("link", { name: "Écrire à contact@todam.fr" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Todam utilise ces informations uniquement pour répondre à votre message.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "En savoir plus sur vos données et vos droits" }),
  ).toBeVisible();
  await expectFooterBelowViewport(page);

  await page.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(page.getByText("Indiquez votre nom.")).toBeVisible();
  await expect(page.getByText("Indiquez une adresse e-mail valide.")).toBeVisible();

  await page.getByLabel("Nom").fill("Camille");
  await page.getByLabel("Adresse e-mail").fill("camille@example.test");
  await page.getByLabel("Objet").fill("Une question");
  await page
    .getByRole("textbox", { name: "Message *" })
    .fill("Bonjour, voici ma question à propos de Todam.");
  await page.getByRole("button", { name: "Envoyer le message" }).click();

  await expect(page.getByText("Votre message a bien été envoyé.")).toBeVisible();
  expect(submitted).toEqual({
    name: "Camille",
    email: "camille@example.test",
    subject: "Une question",
    message: "Bonjour, voici ma question à propos de Todam.",
    website: "",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await scrollFooterIntoView(page);
  await page.getByRole("link", { exact: true, name: "Nous contacter" }).click();
  await expect(page).toHaveURL("/contact");
});

test("le formulaire Contact propose l'adresse directe si l'envoi échoue", async ({
  page,
}) => {
  await page.route("**/v1/contact", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        type: "about:blank",
        title: "Service indisponible",
        status: 503,
        detail: "Le message n’a pas pu être envoyé. Réessayez dans quelques instants.",
        code: "CONTACT_DELIVERY_UNAVAILABLE",
      }),
      contentType: "application/problem+json",
      status: 503,
    });
  });
  await page.goto("/contact");
  await page.getByLabel("Nom").fill("Camille");
  await page.getByLabel("Adresse e-mail").fill("camille@example.test");
  await page.getByLabel("Objet").fill("Une question");
  await page
    .getByLabel("Message")
    .fill("Bonjour, voici ma question à propos de Todam.");
  await page.getByRole("button", { name: "Envoyer le message" }).click();

  await expect(
    page.getByText(
      /Le message n’a pas pu être envoyé.*Vous pouvez aussi écrire directement à contact@todam\.fr\./,
    ),
  ).toBeVisible();
});

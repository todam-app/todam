import { expect, test, type Page, type Route } from "@playwright/test";
import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
  type CatalogRevision,
  type CompanyClaim,
  type CompanyDetail,
  type ContentReport,
  type ProductionCard,
  type ProductionDetail,
  type UserListDetail,
  type VenueDetail,
} from "@todam/contracts";

const now = "2026-07-27T10:00:00.000Z";
const userId = "a6dfb21e-11c5-4194-8d0d-9676d0191a10";
const companyId = "5474f0ad-a40c-4324-8a03-ae59e3e33544";
const venueId = "671fa3e1-baae-4469-b07d-cbe75fcc921b";
const productionId = "b982cc50-93e9-4e54-bdc0-5f8f5a533995";
const secondProductionId = "0c4fd06a-e76f-49ee-a603-d9a2e7181a3c";
const listId = "500234d9-6224-4372-bca3-5d430ac5d9f0";
const revisionId = "700234d9-6224-4372-bca3-5d430ac5d9f0";

const venue = {
  id: venueId,
  slug: "hexagone-scene-nationale",
  name: "Hexagone Scène nationale",
  locality: "Meylan",
  countryCode: "FR",
  timezone: "Europe/Paris",
  officialUrl: "https://www.theatre-hexagone.eu/",
} as const;

const company = {
  id: companyId,
  slug: "collectif-mind-the-gap",
  name: "Collectif Mind The Gap",
  officialUrl: "https://compagnie.example.test/",
} as const;

function productionCard(
  id: string,
  slug: string,
  title: string,
  startsAt: string,
): ProductionCard {
  return {
    id,
    slug,
    title,
    discipline: "theatre",
    audience: "general",
    minimumAge: null,
    workTitle: title,
    primaryCredit: null,
    company,
    venueNames: [venue.name],
    nextPerformance: startsAt,
    nextVenue: venue,
    poster: null,
  };
}

const firstCard = productionCard(
  productionId,
  "creation-pilote",
  "Création pilote",
  "2027-01-15T19:00:00.000Z",
);
const secondCard = productionCard(
  secondProductionId,
  "deuxieme-creation",
  "Deuxième création",
  "2027-03-11T19:00:00.000Z",
);

const source = {
  title: "Billetterie officielle",
  url: "https://billetterie.example.test/",
  retrievedAt: now,
  rightsStatus: "factual_metadata_only" as const,
  license: null,
};

const productionDetail: ProductionDetail = {
  id: productionId,
  slug: firstCard.slug,
  title: firstCard.title,
  discipline: "theatre",
  audience: "general",
  minimumAge: null,
  work: null,
  company,
  durationMinutes: 80,
  language: "fr",
  officialUrl: "https://billetterie.example.test/creation-pilote",
  posters: [],
  imagePolicyMessage:
    "Todam ne publie que les visuels dont les droits d’affichage sont confirmés.",
  descriptions: [
    {
      id: "346e5b32-bbf9-4196-b204-bab73e09be7b",
      locale: "fr",
      kind: "short",
      body: "Une création théâtrale documentée pour le pilote Todam.",
      rightsStatus: "todam_original",
      license: null,
      sourceUrl: source.url,
      sourceTitle: source.title,
      retrievedAt: now,
      lastVerifiedAt: now,
    },
    {
      id: "46057704-0d9c-4376-86a0-0624b87a32bd",
      locale: "fr",
      kind: "full",
      body: "Cette description originale permet de tester une fiche complète sans reprendre le texte promotionnel d’un tiers.",
      rightsStatus: "todam_original",
      license: null,
      sourceUrl: source.url,
      sourceTitle: source.title,
      retrievedAt: now,
      lastVerifiedAt: now,
    },
  ],
  credits: [
    {
      artistId: "200234d9-6224-4372-bca3-5d430ac5d9f0",
      artistName: "Camille Martin",
      role: "director",
      label: null,
      position: 0,
    },
  ],
  performances: [
    {
      id: "100234d9-6224-4372-bca3-5d430ac5d9f0",
      startsAt: "2027-01-15T19:00:00.000Z",
      endsAt: "2027-01-15T20:20:00.000Z",
      status: "scheduled",
      officialUrl: "https://billetterie.example.test/creation-pilote",
      venue,
    },
  ],
  ratingSummary: { average: 8, count: 1 },
  reviews: [],
  relatedProductions: [secondCard],
  sources: [source],
  lastVerifiedAt: now,
  sourceUrls: [source.url],
};

const venueDetail: VenueDetail = {
  ...venue,
  addressLine1: "24 rue des Aiguinards",
  postalCode: "38240",
  coordinates: { longitude: 5.78, latitude: 45.21 },
  upcoming: [
    {
      ...firstCard,
      venuePerformances: productionDetail.performances,
    },
  ],
  archives: [
    {
      ...secondCard,
      nextPerformance: null,
      nextVenue: null,
      venuePerformances: [
        {
          id: "100234d9-6224-4372-bca3-5d430ac5d9f1",
          startsAt: "2026-01-15T19:00:00.000Z",
          endsAt: null,
          status: "completed",
          officialUrl: null,
          venue,
        },
      ],
    },
  ],
  disciplines: ["theatre"],
  sources: [source],
  lastVerifiedAt: now,
};

const companyDetail: CompanyDetail = {
  ...company,
  shortDescription: "Une compagnie de création théâtrale.",
  description: "La compagnie développe et diffuse des créations contemporaines.",
  locality: "Grenoble",
  countryCode: "FR",
  currentProductions: [firstCard],
  touringDates: [
    {
      ...productionDetail.performances[0]!,
      production: {
        id: productionId,
        slug: firstCard.slug,
        title: firstCard.title,
        discipline: "theatre",
      },
    },
  ],
  archives: [secondCard],
  principalArtists: [],
  sources: [source],
  lastVerifiedAt: now,
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  });
}

async function mockSession(page: Page, role: "member" | "editor" | "admin" = "member") {
  await page.route("**/v1/auth/get-session", (route) =>
    json(route, {
      session: {
        id: "session-pilot",
        token: "token-pilot",
        userId,
        createdAt: now,
        updatedAt: now,
        expiresAt: "2027-07-27T10:00:00.000Z",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: userId,
        name: "spectatrice-pilote",
        username: "spectatrice-pilote",
        displayUsername: "spectatrice-pilote",
        email: "spectatrice@example.test",
        emailVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
        age15OrOlder: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
        channel: "web",
        role,
      },
    }),
  );
}

async function mockPublicSession(page: Page) {
  await page.route("**/v1/auth/get-session", (route) => json(route, null));
}

test("une salle ouvre sa programmation puis une fiche spectacle alimentée par l’API", async ({
  page,
}) => {
  await mockPublicSession(page);
  await page.route("**/v1/venues/hexagone-scene-nationale", (route) =>
    json(route, venueDetail),
  );
  await page.route("**/v1/productions/creation-pilote", (route) =>
    json(route, productionDetail),
  );
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/lieu/hexagone-scene-nationale");
  await expect(page.getByRole("heading", { level: 1, name: venue.name })).toBeVisible();
  await expect(
    page
      .getByRole("img", {
        name: `Affiche indisponible pour ${firstCard.title}`,
      })
      .first(),
  ).toBeVisible();
  await expect(page.getByText("Archives")).toBeVisible();

  await page.getByRole("link", { name: firstCard.title }).first().click();
  await expect(page).toHaveURL(/\/production\/creation-pilote$/);
  await expect(
    page.getByRole("heading", { level: 1, name: firstCard.title }),
  ).toBeVisible();
  await expect(
    page.getByText(productionDetail.imagePolicyMessage, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avis des membres" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Vous représentez ce spectacle ?" }),
  ).toBeVisible();
});

test("une liste privée se réordonne au clavier", async ({ page }) => {
  await mockSession(page);
  let orderedItems = [firstCard, secondCard];
  let submittedVisibility: "private" | undefined;
  const detail = (): UserListDetail => ({
    id: listId,
    slug: "grenoble-2027",
    name: "Grenoble 2027",
    description: "Deux spectacles à suivre.",
    visibility: "private",
    itemCount: orderedItems.length,
    updatedAt: now,
    username: "spectatrice-pilote",
    items: orderedItems.map((production, position) => ({
      production,
      position,
      addedAt: now,
    })),
  });

  await page.route("**/v1/me/dashboard", (route) =>
    json(route, {
      profile: { username: "spectatrice-pilote" },
      counts: { seen: 1, ratings: 1, watchlist: 0, lists: 1, reviews: 1 },
      recentDiary: [],
      recentRatings: [
        {
          production: firstCard,
          value: 8,
          ratedAt: "2026-07-22T10:00:00.000Z",
          hasReview: true,
        },
      ],
      ratingDistribution: Array.from({ length: 10 }, (_, index) => ({
        value: index + 1,
        count: index === 7 ? 1 : 0,
      })),
      watchlist: [],
    }),
  );
  await page.route("**/v1/me/profile", (route) =>
    json(route, {
      username: "spectatrice-pilote",
      bio: null,
      profileVisibility: "public",
      ratingVisibility: "review_only",
      memberSince: now,
    }),
  );
  await page.route("**/v1/me/journal**", (route) =>
    json(route, {
      items: [
        {
          id: "400234d9-6224-4372-bca3-5d430ac5d9f0",
          production: firstCard,
          performanceId: productionDetail.performances[0]!.id,
          attendedOn: "2026-07-20",
          addedAt: "2026-07-21T10:00:00.000Z",
          ratedAt: "2026-07-22T10:00:00.000Z",
          rating: 8,
          hasReview: true,
        },
      ],
      nextCursor: null,
    }),
  );
  await page.route("**/v1/me/lists", (route) =>
    json(route, {
      items: [
        {
          id: listId,
          slug: "grenoble-2027",
          name: "Grenoble 2027",
          description: "Deux spectacles à suivre.",
          visibility: "private",
          itemCount: orderedItems.length,
          updatedAt: now,
        },
      ],
    }),
  );
  await page.route(`**/v1/me/lists/${listId}`, async (route) => {
    if (route.request().method() === "PATCH") {
      const input = route.request().postDataJSON() as {
        visibility?: "private";
      };
      submittedVisibility = input.visibility;
    }
    await json(route, detail());
  });
  await page.route(`**/v1/me/lists/${listId}/order`, async (route) => {
    const input = route.request().postDataJSON() as { productionIds: string[] };
    orderedItems = input.productionIds.map((id) =>
      [firstCard, secondCard].find((item) => item.id === id)!,
    );
    await json(route, { ok: true });
  });

  await page.goto("/journal/listes");
  await page.getByRole("link", { name: /Grenoble 2027/ }).click();
  const moveDown = page
    .getByRole("button", { name: "Descendre Création pilote" })
    .first();
  await moveDown.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("L’ordre a été enregistré.")).toBeVisible();
  expect(orderedItems.map((item) => item.id)).toEqual([
    secondProductionId,
    productionId,
  ]);

  await expect(
    page.getByText("Cette liste est privée et visible uniquement par vous."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("La liste a été mise à jour.")).toBeVisible();
  expect(submittedVisibility).toBe("private");
});

test("une compagnie revendique sa fiche avec une demande vérifiable", async ({
  page,
}) => {
  await mockSession(page);
  let claim: CompanyClaim | null = null;
  await page.route("**/v1/me/company-claims", (route) =>
    json(route, { items: claim ? [claim] : [] }),
  );
  await page.route(`**/v1/me/company-claims/${companyId}`, async (route) => {
    claim = {
      id: "600234d9-6224-4372-bca3-5d430ac5d9f0",
      companyId,
      companyName: company.name,
      companySlug: company.slug,
      representativeName: "Alice Martin",
      roleTitle: "Directrice artistique",
      professionalEmail: "alice@compagnie.example.test",
      officialWebsiteUrl: company.officialUrl!,
      evidence:
        "Je dirige la compagnie et la page équipe de notre site officiel permet de le vérifier.",
      authorityConfirmed: true,
      status: "pending",
      decisionReason: null,
      submittedAt: now,
      reviewedAt: null,
    };
    await json(route, claim);
  });

  await page.goto(`/revendiquer-compagnie?companyId=${companyId}`);
  await page.getByLabel("Votre identité").fill("Alice Martin");
  await page.getByLabel("Votre rôle dans la compagnie").fill("Directrice artistique");
  await page.getByLabel("E-mail professionnel").fill("alice@compagnie.example.test");
  await page.getByLabel("Site officiel de la compagnie").fill(company.officialUrl!);
  await page
    .getByLabel("Preuve ou explication vérifiable")
    .fill(
      "Je dirige la compagnie et la page équipe de notre site officiel permet de le vérifier.",
    );
  await page
    .getByRole("checkbox", {
      name: /Je confirme être autorisé à transmettre les informations/,
    })
    .click();
  await page.getByRole("button", { name: "Envoyer la demande" }).click();

  await expect(page.getByText("Statut : En attente")).toBeVisible();
  await expect(page.getByText(company.name)).toBeVisible();
});

test("le représentant prévisualise une révision avant de la soumettre", async ({
  page,
}) => {
  await mockSession(page, "editor");
  let draft: CatalogRevision | null = null;
  await page.route("**/v1/me/company-memberships", (route) =>
    json(route, {
      items: [
        {
          companyId,
          companyName: company.name,
          companySlug: company.slug,
          role: "editor",
          roleTitle: "Responsable de diffusion",
        },
      ],
    }),
  );
  await page.route(`**/v1/companies/${company.slug}`, (route) =>
    json(route, companyDetail),
  );
  await page.route(`**/v1/me/companies/${companyId}/productions`, (route) =>
    json(route, {
      items: [
        {
          id: productionId,
          slug: firstCard.slug,
          title: firstCard.title,
          discipline: "theatre",
          audience: "general",
          minimumAge: null,
          publicationStatus: "draft",
        },
      ],
    }),
  );
  await page.route(
    `**/v1/me/companies/${companyId}/productions/${productionId}`,
    (route) => json(route, { ...productionDetail, editableMedia: [] }),
  );
  await page.route("**/v1/me/catalog-revisions", (route) =>
    json(route, { items: draft ? [draft] : [] }),
  );
  await page.route(`**/v1/me/companies/${companyId}/revisions`, async (route) => {
    const input = route.request().postDataJSON() as {
      targetType: "company" | "production";
      targetId: string;
      changes: {
        field: string;
        newValue: unknown;
        provenanceUrl: string | null;
        rightsStatus: null;
      }[];
      justification: string | null;
    };
    draft = {
      id: revisionId,
      companyId,
      targetType: input.targetType,
      targetId: input.targetId,
      status: "draft",
      justification: input.justification,
      decisionReason: null,
      changes: input.changes.map((change, index) => ({
        ...change,
        id: `800234d9-6224-4372-bca3-5d430ac5d9f${index}`,
        oldValue: index === 0 ? company.name : null,
      })),
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
      reviewedAt: null,
    };
    await json(route, draft);
  });
  await page.route(`**/v1/me/catalog-revisions/${revisionId}/submit`, async (route) => {
    draft = {
      ...draft!,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    };
    await json(route, draft);
  });

  await page.goto("/espace-compagnie");
  await expect(
    page.getByRole("heading", { level: 1, name: "Préparer une révision" }),
  ).toBeVisible();
  await page
    .getByLabel("Nom public de la compagnie")
    .fill("Collectif Mind The Gap — Grenoble");
  await page
    .getByLabel("Justification pour l’équipe Todam")
    .fill("Mise à jour vérifiée sur le site officiel de la compagnie.");
  await page.getByRole("button", { name: "Enregistrer et prévisualiser" }).click();

  await expect(
    page.getByRole("heading", { name: "Prévisualisation avant envoi" }),
  ).toBeVisible();
  await expect(
    page.getByText("Collectif Mind The Gap — Grenoble").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Soumettre à Todam" }).click();
  await expect(page.getByText("Soumise", { exact: true }).first()).toBeVisible();
});

test("la modération prend en charge puis résout une correction", async ({ page }) => {
  await mockSession(page, "admin");
  let report: ContentReport = {
    id: "900234d9-6224-4372-bca3-5d430ac5d9f0",
    targetType: "production",
    targetId: productionId,
    category: "schedule",
    targetLabel: production.title,
    targetPath: `/production/${production.slug}`,
    canHide: true,
    canHideMedia: false,
    media: null,
    contribution: null,
    reason:
      "La date annoncée sur la fiche ne correspond pas à la billetterie officielle.",
    status: "open",
    decision: null,
    submittedAt: now,
    reviewedAt: null,
  };
  await page.route("**/v1/admin/content-reports?status=all", (route) =>
    json(route, { items: [report] }),
  );
  await page.route("**/v1/admin/company-claims?status=all", (route) =>
    json(route, { items: [] }),
  );
  await page.route("**/v1/admin/catalog-revisions?status=all", (route) =>
    json(route, { items: [] }),
  );
  await page.route(
    `**/v1/admin/content-reports/${report.id}/reviewing`,
    async (route) => {
      const input = route.request().postDataJSON() as { decision: string };
      report = { ...report, status: "reviewing", decision: input.decision };
      await json(route, report);
    },
  );
  await page.route(
    `**/v1/admin/content-reports/${report.id}/resolved`,
    async (route) => {
      const input = route.request().postDataJSON() as { decision: string };
      report = {
        ...report,
        status: "resolved",
        decision: input.decision,
        reviewedAt: now,
      };
      await json(route, report);
    },
  );

  await page.goto("/moderation");
  const decision = page.getByLabel("Note de prise en charge ou décision");
  await decision.fill("Vérification en cours auprès de la billetterie officielle.");
  await page.getByRole("button", { name: "Prendre en charge" }).click();
  await expect(page.getByText("En cours", { exact: true })).toBeVisible();

  await page
    .getByLabel("Décision finale")
    .fill("La date a été corrigée à partir de la billetterie officielle.");
  await page.getByRole("button", { name: "Marquer comme résolu" }).click();
  await page.getByRole("tab", { name: "Historique" }).click();
  await expect(page.getByText("Résolu", { exact: true })).toBeVisible();
  await expect(page.getByText(/La date a été corrigée/)).toBeVisible();
});

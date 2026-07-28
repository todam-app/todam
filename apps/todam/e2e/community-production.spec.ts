import { expect, test, type Page, type Route } from "@playwright/test";
import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
} from "@todam/contracts";

const now = "2026-07-28T12:00:00.000Z";
const productionId = "100234d9-6224-4372-bca3-5d430ac5d9f0";
const companyId = "200234d9-6224-4372-bca3-5d430ac5d9f0";
const venueId = "300234d9-6224-4372-bca3-5d430ac5d9f0";
const contributionId = "400234d9-6224-4372-bca3-5d430ac5d9f0";
const slug = "spectacle-introuvable-communaute";

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockVerifiedSession(page: Page) {
  await page.route("**/v1/auth/get-session", (route) =>
    json(route, {
      session: {
        id: "community-session",
        token: "community-token",
        userId: "community-user",
        createdAt: now,
        updatedAt: now,
        expiresAt: "2026-07-29T12:00:00.000Z",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "community-user",
        name: "contributrice",
        username: "contributrice",
        displayUsername: "contributrice",
        email: "contributrice@example.test",
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
  );
}

test("recherche vide, création communautaire, publication puis signalement unique", async ({
  page,
}) => {
  await mockVerifiedSession(page);
  await page.route("**/v1/search**", async (route) => {
    const url = new URL(route.request().url());
    const type = url.searchParams.get("type") ?? "productions";
    await json(route, {
      type,
      total: 0,
      productions: [],
      venues: [],
      companies: [],
      members: [],
      nextCursor: null,
      suggestion: null,
    });
  });

  let submittedMultipart = "";
  await page.route("**/v1/community/productions", async (route) => {
    submittedMultipart = route.request().postDataBuffer()?.toString("utf8") ?? "";
    await json(
      route,
      {
        id: productionId,
        slug,
        contributionId,
        publicationStatus: "published",
      },
      201,
    );
  });

  await page.route(`**/v1/productions/${slug}`, (route) =>
    json(route, {
      id: productionId,
      slug,
      title: "Spectacle introuvable",
      discipline: "theatre",
      audience: "general",
      minimumAge: null,
      work: null,
      company: {
        id: companyId,
        slug: "compagnie-nouvelle",
        name: "Compagnie nouvelle",
        officialUrl: null,
      },
      durationMinutes: null,
      language: null,
      officialUrl: "https://festival.example.test/spectacle-introuvable",
      posters: [],
      imagePolicyMessage: "Image non disponible",
      descriptions: [],
      credits: [],
      performances: [
        {
          id: "500234d9-6224-4372-bca3-5d430ac5d9f0",
          startsAt: "2026-08-15T18:00:00.000Z",
          endsAt: null,
          status: "scheduled",
          officialUrl: "https://festival.example.test/spectacle-introuvable",
          venue: {
            id: venueId,
            slug: "theatre-nouveau",
            name: "Théâtre nouveau",
            locality: "Avignon",
            countryCode: "FR",
            timezone: "Europe/Paris",
            officialUrl: null,
          },
        },
      ],
      ratingSummary: { average: null, count: 0 },
      reviews: [],
      relatedProductions: [],
      sources: [
        {
          title: "Contribution communautaire : Spectacle introuvable",
          url: "https://festival.example.test/spectacle-introuvable",
          retrievedAt: now,
          rightsStatus: "community_submission",
          license: null,
        },
      ],
      lastVerifiedAt: now,
      sourceUrls: ["https://festival.example.test/spectacle-introuvable"],
    }),
  );
  await page.route(`**/v1/me/productions/${productionId}/state`, (route) =>
    json(route, {
      productionId,
      seen: false,
      rating: null,
      watchlisted: false,
      review: null,
    }),
  );

  let submittedReport: Record<string, unknown> | null = null;
  await page.route("**/v1/content-reports", async (route) => {
    submittedReport = route.request().postDataJSON() as Record<string, unknown>;
    await json(route, {
      id: "600234d9-6224-4372-bca3-5d430ac5d9f0",
      status: "open",
    });
  });

  await page.goto("/search?q=Spectacle%20introuvable&type=productions");
  await expect(page.getByText("Aucun résultat.")).toBeVisible();
  await page.getByRole("button", { name: "Ajouter ce spectacle" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Ajouter un spectacle" }),
  ).toBeVisible();
  await page.getByLabel("Nom de la compagnie").fill("Compagnie nouvelle");
  await page
    .getByLabel("Lien officiel du spectacle")
    .fill("https://festival.example.test/spectacle-introuvable");
  await page.getByLabel("Date et heure de début").fill("2026-08-15T20:00");
  await page
    .getByRole("textbox", { name: "Lieu *", exact: true })
    .fill("Théâtre nouveau");
  await page
    .getByRole("textbox", { name: "Adresse *", exact: true })
    .fill("1 place du Festival");
  await page.getByRole("textbox", { name: "Code postal *", exact: true }).fill("84000");
  await page.getByRole("textbox", { name: "Ville *", exact: true }).fill("Avignon");

  await page.getByRole("button", { name: "Publier le spectacle" }).click();
  await expect(page.getByText("Le spectacle est publié.")).toBeVisible();
  expect(submittedMultipart).toContain("Spectacle introuvable");
  expect(submittedMultipart).toContain('"description":null');
  expect(submittedMultipart).toContain('"poster":null');

  await page.getByRole("button", { name: "Signaler ou corriger" }).click();
  await page.getByRole("radio", { name: "Dates, horaires ou lieu" }).click();
  await page
    .getByLabel("Correction proposée")
    .fill("L’horaire doit être vérifié sur la billetterie officielle du spectacle.");
  await page.getByRole("button", { name: "Envoyer la correction" }).click();
  await expect(page.getByText("Le signalement a bien été enregistré.")).toBeVisible();
  expect(submittedReport).toMatchObject({
    targetType: "production",
    targetId: productionId,
    category: "schedule",
    mediaId: null,
  });
});

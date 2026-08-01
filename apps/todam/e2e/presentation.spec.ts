import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_EFFECTIVE_DATE,
  type CatalogCandidate,
  type CatalogRevision,
  type CompanyDetail,
  type ContentReport,
  type ProductionCard,
  type ProductionDetail,
  type PublicMember,
  type UserListDetail,
  type VenueDetail,
} from "@todam/contracts";

const verifiedAt = "2026-07-27T10:00:00.000Z";
const venue = {
  id: "671fa3e1-baae-4469-b07d-cbe75fcc921b",
  slug: "hexagone-scene-nationale",
  name: "Hexagone Scène nationale",
  locality: "Meylan",
  countryCode: "FR",
  timezone: "Europe/Paris",
  officialUrl: "https://www.theatre-hexagone.eu/",
} as const;
const company = {
  id: "5474f0ad-a40c-4324-8a03-ae59e3e33544",
  slug: "collectif-mind-the-gap",
  name: "Collectif Mind The Gap",
  officialUrl: "https://www.collectifmindthegap.com/",
} as const;

function card(
  id: string,
  slug: string,
  title: string,
  startsAt: string,
  discipline: "theatre" | "ballet" = "theatre",
): ProductionCard {
  return {
    id,
    slug,
    title,
    discipline,
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

const primaryCard = card(
  "b982cc50-93e9-4e54-bdc0-5f8f5a533995",
  "jetais-partie-pardon-mind-the-gap",
  "J’étais parti·e, pardon (dans un autre univers)",
  "2026-12-09T13:15:00.000Z",
);
const venueCards = [
  primaryCard,
  card(
    "0c4fd06a-e76f-49ee-a603-d9a2e7181a3c",
    "faire-troupeau-cie-frag",
    "Faire troupeau",
    "2027-01-10T19:00:00.000Z",
  ),
  card(
    "b2113b16-cd55-4717-af55-85b62c52ada2",
    "azaline-se-tait-les-veilleurs",
    "Azaline se tait",
    "2027-02-18T19:00:00.000Z",
  ),
  card(
    "76d5038b-dc97-4b2a-8c0d-35daee2074bc",
    "fondre-infini-dehors",
    "Fondre",
    "2027-03-28T19:00:00.000Z",
  ),
  card(
    "1a9cf1ea-406e-43d6-a4b3-fc48a79a800d",
    "lusage-de-la-peur-passage-danimaux",
    "L’Usage de la peur",
    "2027-05-04T18:00:00.000Z",
  ),
];
const archivedCard: ProductionCard = {
  ...card(
    "4c42fc78-8ba1-43ee-a8c7-114276d78a6f",
    "archives-de-la-nuit",
    "Archives de la nuit",
    "2025-11-14T19:00:00.000Z",
  ),
  nextPerformance: null,
};

const source = {
  title: "Billetterie officielle de l’Hexagone",
  url: "https://theatre-hexagone.mapado.com/",
  retrievedAt: verifiedAt,
  rightsStatus: "factual_metadata_only",
  license: null,
} as const;

const performances = [
  "2026-12-09T13:15:00.000Z",
  "2026-12-09T19:00:00.000Z",
  "2026-12-10T13:15:00.000Z",
  "2026-12-10T19:00:00.000Z",
].map((startsAt, index) => ({
  id: `100234d9-6224-4372-bca3-5d430ac5d9f${index}`,
  startsAt,
  endsAt: null,
  status: "scheduled" as const,
  officialUrl: "https://theatre-hexagone.mapado.com/",
  venue,
}));

const productionDetail: ProductionDetail = {
  id: primaryCard.id,
  slug: primaryCard.slug,
  title: primaryCard.title,
  discipline: "theatre",
  audience: "family",
  minimumAge: 8,
  work: {
    id: "69392888-4b6e-4e23-b06b-fea076d7228f",
    slug: primaryCard.slug,
    title: primaryCard.title,
  },
  company,
  durationMinutes: 75,
  language: "fr",
  officialUrl: "https://theatre-hexagone.mapado.com/",
  posters: [],
  imagePolicyMessage:
    "Todam ne publie que les visuels dont les droits d’affichage sont confirmés.",
  descriptions: [
    {
      id: "346e5b32-bbf9-4196-b204-bab73e09be7b",
      locale: "fr",
      kind: "short",
      body: "Une traversée théâtrale destinée aux adolescents et aux adultes, entre réel et imaginaire.",
      rightsStatus: "todam_original",
      license: null,
      sourceUrl: source.url,
      sourceTitle: source.title,
      retrievedAt: verifiedAt,
      lastVerifiedAt: verifiedAt,
    },
    {
      id: "46057704-0d9c-4376-86a0-0624b87a32bd",
      locale: "fr",
      kind: "full",
      body: "Cette création observe la manière dont un groupe invente un autre univers pour se raconter. Les déplacements, les silences et les changements de point de vue composent une forme précise qui laisse une vraie place à l’imagination du public.",
      rightsStatus: "todam_original",
      license: null,
      sourceUrl: source.url,
      sourceTitle: source.title,
      retrievedAt: verifiedAt,
      lastVerifiedAt: verifiedAt,
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
    {
      artistId: "200234d9-6224-4372-bca3-5d430ac5d9f1",
      artistName: "Noémie Bernard",
      role: "performer",
      label: null,
      position: 1,
    },
  ],
  performances,
  ratingSummary: { average: 8.4, count: 17 },
  reviews: [
    {
      id: "300234d9-6224-4372-bca3-5d430ac5d9f0",
      username: "spectatrice-grenoble",
      rating: 9,
      body: "Une proposition très tenue, avec un vrai sens du rythme et de l’espace.",
      containsSpoiler: false,
      createdAt: verifiedAt,
      updatedAt: verifiedAt,
    },
  ],
  relatedProductions: venueCards.slice(1, 4),
  sources: [source],
  lastVerifiedAt: verifiedAt,
  sourceUrls: [source.url],
};

const venueDetail: VenueDetail = {
  ...venue,
  addressLine1: "24 rue des Aiguinards",
  postalCode: "38240",
  coordinates: null,
  upcoming: venueCards.map((production) => ({
    ...production,
    venuePerformances:
      production.id === primaryCard.id
        ? performances
        : [
            {
              id: `${production.id.slice(0, -1)}1`,
              startsAt: production.nextPerformance!,
              endsAt: null,
              status: "scheduled",
              officialUrl: source.url,
              venue,
            },
          ],
  })),
  archives: [
    {
      ...archivedCard,
      venuePerformances: [
        {
          id: "934ef4e6-a0ac-4272-a8d3-79bf8a96ec5e",
          startsAt: "2025-11-14T19:00:00.000Z",
          endsAt: "2025-11-14T20:30:00.000Z",
          status: "scheduled",
          officialUrl: source.url,
          venue,
        },
      ],
    },
  ],
  disciplines: ["theatre"],
  sources: [source],
  lastVerifiedAt: verifiedAt,
};

const companyDetail: CompanyDetail = {
  ...company,
  shortDescription:
    "Une compagnie de création qui fait dialoguer jeu, mouvement et objets.",
  description:
    "Le Collectif Mind The Gap développe des formes théâtrales accessibles à plusieurs générations et accompagne leur diffusion dans différents lieux.",
  locality: "Grenoble",
  countryCode: "FR",
  currentProductions: venueCards.slice(0, 3),
  touringDates: performances.map((performance) => ({
    ...performance,
    production: {
      id: primaryCard.id,
      slug: primaryCard.slug,
      title: primaryCard.title,
      discipline: primaryCard.discipline,
    },
  })),
  archives: venueCards.slice(3),
  principalArtists: [
    {
      id: "200234d9-6224-4372-bca3-5d430ac5d9f0",
      slug: "camille-martin",
      name: "Camille Martin",
      roles: ["director"],
    },
  ],
  sources: [source],
  lastVerifiedAt: verifiedAt,
};

const publicList = {
  id: "500234d9-6224-4372-bca3-5d430ac5d9f0",
  slug: "a-voir-autour-de-grenoble",
  name: "À voir autour de Grenoble",
  description:
    "Une sélection de spectacles à partager pour préparer les prochains mois.",
  visibility: "private",
  itemCount: 3,
  updatedAt: verifiedAt,
} as const;

const publicMember: PublicMember = {
  username: "spectatrice-grenoble",
  bio: "Théâtre, danse et formes contemporaines autour de Grenoble.",
  memberSince: "2025-09-12T10:00:00.000Z",
  counts: { seen: 18, lists: 0, reviews: 7 },
  recentJournal: [
    {
      id: "400234d9-6224-4372-bca3-5d430ac5d9f0",
      production: primaryCard,
      performanceId: performances[0]!.id,
      attendedOn: "2026-12-09",
      addedAt: verifiedAt,
      ratedAt: verifiedAt,
      rating: 8,
      hasReview: true,
    },
  ],
  publicLists: [],
  recentReviews: [
    {
      id: "300234d9-6224-4372-bca3-5d430ac5d9f0",
      production: primaryCard,
      rating: 8,
      body: "Une proposition précise et mémorable, qui continue à travailler après la représentation.",
      containsSpoiler: false,
      createdAt: verifiedAt,
      updatedAt: verifiedAt,
    },
  ],
};

const publicListDetail: UserListDetail = {
  ...publicList,
  username: publicMember.username,
  items: venueCards.slice(0, 3).map((production, position) => ({
    production,
    position,
    addedAt: verifiedAt,
  })),
};

type PresentationRole = false | "member" | "company-editor" | "admin";

const reviewScreenshotDirectory =
  process.env.TODAM_REVIEW_SCREENSHOT_DIR ??
  path.resolve(process.cwd(), "artifacts", "screenshots", "beta-pilote");

async function fulfillJson(
  route: Parameters<Parameters<Page["route"]>[1]>[0],
  body: unknown,
) {
  await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockPresentationApi(page: Page, role: PresentationRole) {
  await page.route("**/v1/auth/get-session", async (route) => {
    if (!role) {
      await fulfillJson(route, null);
      return;
    }
    await fulfillJson(route, {
      session: {
        id: "session-presentation",
        token: "token-presentation",
        userId: "user-presentation",
        createdAt: verifiedAt,
        updatedAt: verifiedAt,
        expiresAt: "2027-07-27T10:00:00.000Z",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "user-presentation",
        name: "spectatrice-grenoble",
        username: "spectatrice-grenoble",
        displayUsername: "spectatrice-grenoble",
        email: "spectatrice@example.test",
        emailVerified: true,
        image: null,
        createdAt: verifiedAt,
        updatedAt: verifiedAt,
        age15OrOlder: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
        channel: "web",
        role: role === "admin" ? "admin" : "member",
      },
    });
  });
  await page.route("**/v1/public/stats", (route) =>
    fulfillJson(route, {
      verifiedUsers: 24,
      activeProductions: 128,
      upcomingPerformances: 346,
      activeVenues: 346,
      generatedAt: verifiedAt,
    }),
  );
  await page.route("**/v1/search**", (route) => {
    const requestedType =
      new URL(route.request().url()).searchParams.get("type") ?? "productions";
    return fulfillJson(route, {
      type: requestedType,
      total: requestedType === "members" ? 1 : venueCards.length,
      productions: requestedType === "productions" ? venueCards : [],
      venues: requestedType === "venues" ? [venue] : [],
      companies: requestedType === "companies" ? [company] : [],
      members:
        requestedType === "members"
          ? [{ username: publicMember.username, bio: publicMember.bio }]
          : [],
      nextCursor: null,
      suggestion: null,
    });
  });
  await page.route("**/v1/venues/hexagone-scene-nationale", (route) =>
    fulfillJson(route, venueDetail),
  );
  await page.route("**/v1/productions/jetais-partie-pardon-mind-the-gap", (route) =>
    fulfillJson(route, productionDetail),
  );
  await page.route("**/v1/companies/collectif-mind-the-gap", (route) =>
    fulfillJson(route, companyDetail),
  );
  await page.route("**/v1/members/spectatrice-grenoble/journal**", (route) =>
    fulfillJson(route, {
      items: publicMember.recentJournal,
      nextCursor: null,
    }),
  );
  await page.route("**/v1/members/spectatrice-grenoble", (route) =>
    fulfillJson(route, publicMember),
  );
  await page.route(
    "**/v1/members/spectatrice-grenoble/lists/a-voir-autour-de-grenoble",
    (route) => fulfillJson(route, publicListDetail),
  );
  await page.route("**/v1/legal/current", (route) =>
    fulfillJson(route, {
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
  );

  if (!role) return;

  const discoveryItems = venueCards.map((production, index) => ({
    production,
    performance: production.nextPerformance
      ? {
          startsAt: production.nextPerformance,
          venueName: venue.name,
          locality: venue.locality,
          distanceKm: index === 0 ? 4.8 : 12.4 + index,
        }
      : null,
  }));
  await page.route("**/v1/me/home", (route) =>
    fulfillJson(route, {
      profile: { username: publicMember.username },
      homeCity: {
        locality: "Grenoble",
        countryCode: "FR",
        label: "Grenoble, France",
      },
      progress: { current: 3, target: 5, completed: false },
      radiusKm: 50,
      nearby: discoveryItems.slice(0, 4),
      nationalUpcoming: discoveryItems,
      recentlyAdded: [...discoveryItems].reverse(),
    }),
  );
  await page.route("**/v1/me/dashboard", (route) =>
    fulfillJson(route, {
      profile: { username: "spectatrice-grenoble" },
      counts: { seen: 1, ratings: 1, watchlist: 1, lists: 1, reviews: 1 },
      recentDiary: [],
      recentRatings: [
        {
          production: primaryCard,
          value: 8,
          ratedAt: verifiedAt,
          hasReview: true,
        },
      ],
      ratingDistribution: Array.from({ length: 10 }, (_, index) => ({
        value: index + 1,
        count: index === 7 ? 1 : 0,
      })),
      watchlist: [primaryCard],
    }),
  );
  await page.route("**/v1/me/profile", (route) =>
    fulfillJson(route, {
      username: "spectatrice-grenoble",
      bio: "Théâtre, danse et formes contemporaines autour de Grenoble.",
      profileVisibility: "public",
      ratingVisibility: "review_only",
      memberSince: verifiedAt,
    }),
  );
  await page.route("**/v1/me/journal**", (route) =>
    fulfillJson(route, {
      items: [
        {
          id: "400234d9-6224-4372-bca3-5d430ac5d9f0",
          production: primaryCard,
          performanceId: performances[0]!.id,
          attendedOn: "2026-12-09",
          addedAt: verifiedAt,
          ratedAt: verifiedAt,
          rating: 8,
          hasReview: true,
        },
      ],
      nextCursor: null,
    }),
  );
  await page.route("**/v1/me/shows**", (route) => {
    const section =
      new URL(route.request().url()).searchParams.get("section") ?? "seen";
    return fulfillJson(route, {
      items: [
        {
          production: primaryCard,
          section,
          diaryEntryId:
            section === "watchlist" ? null : "400234d9-6224-4372-bca3-5d430ac5d9f0",
          seenCount: section === "watchlist" ? 0 : 1,
          addedAt: verifiedAt,
          attendedOn: section === "watchlist" ? null : "2026-12-09",
          ratedAt: section === "rated" ? verifiedAt : null,
          myRating: section === "rated" ? 8 : null,
          communityRating: { average: 8.4, count: 12 },
          review:
            section === "rated"
              ? {
                  id: "300234d9-6224-4372-bca3-5d430ac5d9f0",
                  body: "Une proposition précise et mémorable.",
                  containsSpoiler: false,
                  visibility: "public",
                  status: "published",
                  createdAt: verifiedAt,
                  updatedAt: verifiedAt,
                }
              : null,
        },
      ],
      nextCursor: null,
      total: 1,
      facets: {
        disciplines: [{ value: "theatre", count: 1 }],
        venues: [{ value: venue.name, count: 1 }],
        years: [{ value: 2026, count: 1 }],
        communityRatings: [{ value: 8, count: 1 }],
        myRatings: [{ value: 8, count: 1 }],
        reviews: [{ value: "with", count: 1 }],
        upcoming: [],
      },
    });
  });
  await page.route("**/v1/me/lists", (route) =>
    fulfillJson(route, {
      items: [
        {
          ...publicList,
          createdAt: verifiedAt,
        },
      ],
    }),
  );
  await page.route(`**/v1/me/lists/${publicList.id}`, (route) =>
    fulfillJson(route, publicListDetail),
  );
  await page.route("**/v1/me/watchlist", (route) =>
    fulfillJson(route, {
      items: [{ production: primaryCard, addedAt: verifiedAt }],
    }),
  );
  await page.route(`**/v1/me/productions/${primaryCard.id}/state`, (route) =>
    fulfillJson(route, {
      productionId: primaryCard.id,
      seen: true,
      watchlisted: false,
      rating: 8,
      review: {
        id: "300234d9-6224-4372-bca3-5d430ac5d9f0",
        body: "Une proposition précise et mémorable.",
        containsSpoiler: false,
        visibility: "public",
        status: "published",
        decisionReason: null,
        createdAt: verifiedAt,
        updatedAt: verifiedAt,
      },
    }),
  );
  await page.route("**/v1/me/reviews", (route) =>
    fulfillJson(route, {
      items: [
        {
          id: "300234d9-6224-4372-bca3-5d430ac5d9f0",
          production: primaryCard,
          body: "Une proposition précise et mémorable.",
          containsSpoiler: false,
          visibility: "public",
          status: "published",
          createdAt: verifiedAt,
          updatedAt: verifiedAt,
        },
      ],
    }),
  );

  const revision: CatalogRevision = {
    id: "700234d9-6224-4372-bca3-5d430ac5d9f0",
    companyId: company.id,
    targetType: "company",
    targetId: company.id,
    status: "draft",
    justification: "Mise à jour préparée depuis le site officiel.",
    decisionReason: null,
    changes: [
      {
        id: "800234d9-6224-4372-bca3-5d430ac5d9f0",
        field: "shortDescription",
        oldValue: companyDetail.shortDescription,
        newValue:
          "Une compagnie grenobloise qui fait dialoguer jeu, mouvement et objets.",
        provenanceUrl: company.officialUrl,
        rightsStatus: null,
      },
    ],
    createdAt: verifiedAt,
    updatedAt: verifiedAt,
    submittedAt: null,
    reviewedAt: null,
  };
  await page.route("**/v1/me/company-memberships", (route) =>
    fulfillJson(route, {
      items:
        role === "company-editor" || role === "admin"
          ? [
              {
                companyId: company.id,
                companyName: company.name,
                companySlug: company.slug,
                role: "editor",
                roleTitle: "Responsable de diffusion",
              },
            ]
          : [],
    }),
  );
  await page.route(`**/v1/me/companies/${company.id}/productions`, (route) =>
    fulfillJson(route, {
      items: [
        {
          id: primaryCard.id,
          slug: primaryCard.slug,
          title: primaryCard.title,
          discipline: primaryCard.discipline,
          audience: "family",
          minimumAge: 8,
          publicationStatus: "published",
        },
      ],
    }),
  );
  await page.route(
    `**/v1/me/companies/${company.id}/productions/${primaryCard.id}`,
    (route) => fulfillJson(route, { ...productionDetail, editableMedia: [] }),
  );
  await page.route("**/v1/me/catalog-revisions", (route) =>
    fulfillJson(route, { items: [revision] }),
  );
  await page.route("**/v1/me/company-claims", (route) =>
    fulfillJson(route, {
      items: [
        {
          id: "600234d9-6224-4372-bca3-5d430ac5d9f0",
          companyId: company.id,
          companyName: company.name,
          companySlug: company.slug,
          representativeName: "Alice Martin",
          roleTitle: "Directrice artistique",
          professionalEmail: "alice@compagnie.example.test",
          officialWebsiteUrl: company.officialUrl,
          evidence:
            "L’adresse professionnelle figure sur le site officiel et permet une vérification directe.",
          authorityConfirmed: true,
          status: "pending",
          decisionReason: null,
          submittedAt: verifiedAt,
          reviewedAt: null,
        },
      ],
    }),
  );

  const report: ContentReport = {
    id: "900234d9-6224-4372-bca3-5d430ac5d9f0",
    targetType: "production",
    targetId: primaryCard.id,
    category: "schedule",
    targetLabel: primaryCard.title,
    targetPath: `/production/${primaryCard.slug}`,
    canHide: true,
    canHideMedia: false,
    media: null,
    contribution: null,
    reason:
      "La date annoncée sur la fiche ne correspond pas à la billetterie officielle.",
    status: "open",
    decision: null,
    submittedAt: verifiedAt,
    reviewedAt: null,
  };
  const catalogCandidate: CatalogCandidate = {
    id: primaryCard.id,
    targetType: "production",
    slug: primaryCard.slug,
    label: primaryCard.title,
    secondaryLabel: company.name,
    discipline: primaryCard.discipline,
    publicationStatus: "draft",
    readinessIssues: [],
    sources: [source],
    updatedAt: verifiedAt,
    reviewedAt: null,
  };
  await page.route("**/v1/admin/catalog-candidates**", (route) =>
    fulfillJson(route, {
      items: role === "admin" ? [catalogCandidate] : [],
    }),
  );
  await page.route("**/v1/admin/content-reports?status=all", (route) =>
    fulfillJson(route, { items: role === "admin" ? [report] : [] }),
  );
  await page.route("**/v1/admin/company-claims?status=all", (route) =>
    fulfillJson(route, { items: [] }),
  );
  await page.route("**/v1/admin/catalog-revisions?status=all", (route) =>
    fulfillJson(route, { items: [] }),
  );
}

async function attachViewportSlices(page: Page, testInfo: TestInfo, prefix: string) {
  const scroller = page
    .locator(".todam-web-page-scroll, .todam-web-page-static")
    .first();
  await expect(scroller).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  async function expectRenderedPage() {
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByText("Bundling...", { exact: false })).toHaveCount(0);
  }

  let previousHeight = -1;
  let stableMeasurements = 0;
  await expect
    .poll(
      async () => {
        const height = await scroller.evaluate((element) => element.scrollHeight);
        if (height === previousHeight) {
          stableMeasurements += 1;
        } else {
          previousHeight = height;
          stableMeasurements = 0;
        }
        return stableMeasurements;
      },
      { intervals: [100, 150, 250, 400], timeout: 5_000 },
    )
    .toBeGreaterThanOrEqual(2);

  for (const [position, fraction] of [
    ["haut", 0],
    ["milieu", 0.5],
    ["bas", 1],
  ] as const) {
    await expect
      .poll(
        () =>
          scroller.evaluate((element, ratio) => {
            const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
            const target = Math.round(maximum * ratio);
            element.scrollTop = target;
            return Math.abs(Math.round(element.scrollTop) - target);
          }, fraction),
        { intervals: [50, 100, 200], timeout: 5_000 },
      )
      .toBeLessThanOrEqual(1);
    if (position === "bas" && (await page.getByTestId("site-footer").count()) > 0) {
      await page.getByTestId("site-footer").scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
    }
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    await expectRenderedPage();
    const screenshot = await page.screenshot({ animations: "disabled" });
    await expectRenderedPage();
    await mkdir(reviewScreenshotDirectory, { recursive: true });
    await writeFile(
      path.join(reviewScreenshotDirectory, `${prefix}-${position}.png`),
      screenshot,
    );
    if (process.env.TODAM_CAPTURE_ONLY !== "1") {
      expect(screenshot).toMatchSnapshot(`${prefix}-${position}.png`, {
        maxDiffPixelRatio: 0.01,
      });
    }
    await testInfo.attach(`${prefix}-${position}.png`, {
      body: screenshot,
      contentType: "image/png",
    });
  }
}

const viewports = [
  { name: "320x568", width: 320, height: 568 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

const routes = [
  {
    name: "accueil",
    path: "/",
    heading: "Les spectacles passent. Votre journal reste.",
    role: false,
  },
  {
    name: "accueil-connecte",
    path: "/",
    heading: "À l’affiche près de Grenoble, France",
    role: "member",
  },
  {
    name: "recherche",
    path: "/search?q=Grenoble",
    heading: "Résultats de recherche",
    role: false,
  },
  {
    name: "recherche-lieux",
    path: "/search?q=Grenoble&type=venues",
    heading: "Résultats de recherche",
    role: false,
  },
  {
    name: "recherche-compagnies",
    path: "/search?q=Grenoble&type=companies",
    heading: "Résultats de recherche",
    role: false,
  },
  {
    name: "recherche-membres",
    path: "/search?q=Grenoble&type=members",
    heading: "Résultats de recherche",
    role: false,
  },
  {
    name: "hexagone",
    path: "/lieu/hexagone-scene-nationale",
    heading: venue.name,
    role: false,
  },
  {
    name: "hexagone-archives",
    path: "/lieu/hexagone-scene-nationale",
    heading: venue.name,
    role: false,
    afterLoad: "venue-archives",
  },
  {
    name: "spectacle-long",
    path: "/production/jetais-partie-pardon-mind-the-gap",
    heading: primaryCard.title,
    role: false,
  },
  {
    name: "spectacle-connecte",
    path: "/production/jetais-partie-pardon-mind-the-gap",
    heading: primaryCard.title,
    role: "member",
  },
  {
    name: "compagnie",
    path: "/compagnie/collectif-mind-the-gap",
    heading: company.name,
    role: false,
  },
  {
    name: "membre-public",
    path: "/membre/spectatrice-grenoble",
    heading: "@spectatrice-grenoble",
    role: false,
  },
  {
    name: "liste-publique",
    path: "/membre/spectatrice-grenoble/listes/a-voir-autour-de-grenoble",
    heading: publicList.name,
    role: false,
  },
  {
    name: "salles",
    path: "/pour-les-salles",
    heading: "Aider vos spectateurs à garder le lien après la représentation.",
    role: false,
  },
  {
    name: "compagnies",
    path: "/pour-les-compagnies",
    heading: "Une fiche fiable pour vos productions et leurs dates de tournée.",
    role: false,
  },
  {
    name: "coulisses",
    path: "/les-coulisses",
    heading: "Todam, côté coulisses",
    role: false,
  },
  {
    name: "confidentialite",
    path: "/confidentialite",
    heading: "Politique de confidentialité de Todam",
    role: false,
  },
  {
    name: "inscription",
    path: "/sign-up",
    heading: "Créer ton journal",
    role: false,
  },
  {
    name: "connexion",
    path: "/sign-in",
    heading: "Bon retour",
    role: false,
  },
  {
    name: "mot-de-passe-oublie",
    path: "/mot-de-passe-oublie",
    heading: "Mot de passe oublié",
    role: false,
  },
  {
    name: "nouveau-mot-de-passe",
    path: "/reinitialiser-mot-de-passe?token=token-presentation",
    heading: "Nouveau mot de passe",
    role: false,
  },
  {
    name: "email-verifie",
    path: "/email-verifie",
    heading: "Adresse e-mail vérifiée",
    role: false,
  },
  {
    name: "profil",
    path: "/profile",
    heading: "spectatrice-grenoble",
    role: "member",
  },
  {
    name: "mes-spectacles-a-voir",
    path: "/journal/a-voir",
    heading: "À voir",
    role: "member",
  },
  {
    name: "mes-spectacles-vus",
    path: "/journal/vus",
    heading: "Vus",
    role: "member",
  },
  {
    name: "mes-spectacles-notes",
    path: "/journal/notes",
    heading: "Notés",
    role: "member",
  },
  {
    name: "mes-avis",
    path: "/journal/avis",
    heading: "Mes avis",
    role: "member",
  },
  {
    name: "mes-spectacles",
    path: "/journal",
    heading: "Mes spectacles",
    role: "member",
  },
  {
    name: "mes-listes",
    path: "/journal/listes",
    heading: "Mes listes",
    role: "member",
  },
  {
    name: "parametres",
    path: "/parametres-compte",
    heading: "Paramètres du compte",
    role: "member",
  },
  {
    name: "supprimer-compte",
    path: "/supprimer-mon-compte",
    heading: "Supprimer mon compte",
    role: "member",
  },
  {
    name: "espace-compagnie",
    path: "/espace-compagnie",
    heading: "Préparer une révision",
    role: "company-editor",
  },
  {
    name: "revendication",
    path: `/revendiquer-compagnie?companyId=${company.id}`,
    heading: "Revendiquer cette compagnie",
    role: "member",
  },
  {
    name: "moderation",
    path: "/moderation",
    heading: "Modération éditoriale",
    role: "admin",
  },
  {
    name: "signalement",
    path: `/signaler?type=production&id=${primaryCard.id}`,
    heading: "Signaler ou corriger une information",
    role: false,
  },
  {
    name: "conditions-utilisation",
    path: "/conditions-utilisation",
    heading: "Conditions générales d'utilisation de Todam",
    role: false,
  },
  {
    name: "mentions-legales",
    path: "/mentions-legales",
    heading: "Mentions légales de Todam",
    role: false,
  },
  {
    name: "suppression-compte",
    path: "/suppression-compte",
    heading: "Suppression d'un compte Todam",
    role: false,
  },
  {
    name: "page-introuvable",
    path: "/route-inexistante",
    heading: "Cette page n’est pas à l’affiche.",
    role: false,
  },
] as const;

test("les CTA compagnies respectent la hiérarchie actuelle des boutons Todam", async ({
  page,
}) => {
  await mockPresentationApi(page, false);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/pour-les-compagnies");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Une fiche fiable pour vos productions et leurs dates de tournée.",
    }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const companyLink = page.getByRole("link", {
    exact: true,
    name: "Trouver ma compagnie",
  });
  const contactButton = page.getByRole("button", {
    exact: true,
    name: "Nous contacter",
  });

  const styles = await Promise.all(
    [companyLink, contactButton].map((control) =>
      control.evaluate((element) => {
        const controlStyle = getComputedStyle(element);
        const labelStyle = getComputedStyle(element.firstElementChild ?? element);
        return {
          backgroundColor: controlStyle.backgroundColor,
          borderColor: controlStyle.borderTopColor,
          borderRadius: controlStyle.borderRadius,
          borderWidth: controlStyle.borderTopWidth,
          boxSizing: controlStyle.boxSizing,
          fontFamily: labelStyle.fontFamily.replaceAll('"', ""),
          fontWeight: labelStyle.fontWeight,
        };
      }),
    ),
  );

  expect(styles[0]).toEqual({
    backgroundColor: "rgb(21, 21, 21)",
    borderColor: "rgb(21, 21, 21)",
    borderRadius: "10px",
    borderWidth: "1px",
    boxSizing: "border-box",
    fontFamily: "Work Sans",
    fontWeight: "600",
  });
  expect(styles[1]).toEqual({
    backgroundColor: "rgb(255, 253, 248)",
    borderColor: "rgb(21, 21, 21)",
    borderRadius: "10px",
    borderWidth: "1px",
    boxSizing: "border-box",
    fontFamily: "Work Sans",
    fontWeight: "500",
  });
  await expect(companyLink).toHaveAttribute("data-todam-cta", "standard");
  await expect(contactButton).toHaveAttribute("data-todam-cta", "quiet");

  await companyLink.hover();
  await expect(companyLink).toHaveCSS("background-color", "rgb(21, 21, 21)");
  await expect(companyLink).toHaveCSS("border-color", "rgb(243, 169, 149)");
  await expect(companyLink).toHaveCSS("filter", "none");
  await expect(companyLink).toHaveCSS("opacity", "1");
  await expect(companyLink.locator(":scope > *").first()).toHaveCSS(
    "color",
    "rgb(255, 253, 248)",
  );

  await companyLink.focus();
  await expect(companyLink).toHaveCSS("outline-width", "2px");
});

test("la recherche expose son CTA vedette, sa grille et ses filtres avancés", async ({
  page,
}) => {
  await mockPresentationApi(page, false);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Les spectacles passent. Votre journal reste.",
    }),
  ).toBeVisible();

  const featuredLink = page.getByRole("link", {
    exact: true,
    name: "Créer mon journal",
  });
  await expect(featuredLink).toHaveAttribute("data-todam-ticket-action", "orchestra");
  await expect(featuredLink.locator(".todam-ticket-action-shape")).toHaveCount(1);
  await featuredLink.hover();
  await featuredLink.focus();
  await expect(featuredLink).toBeFocused();

  const header = page.locator(".todam-web-header").first();
  const loginTicket = header.getByRole("link", {
    exact: true,
    name: "Se connecter",
  });
  await expect(loginTicket).toHaveAttribute("data-todam-ticket-action", "porcelain");
  await expect(header).toHaveCSS("backdrop-filter", "blur(16px)");
  await page
    .locator(".todam-web-page-scroll")
    .evaluate((element) => (element.scrollTop = 120));
  await expect(header).toHaveClass(/todam-web-header--scrolled/);
  await expect(header).not.toHaveCSS("box-shadow", "none");

  await page.goto("/search?q=Grenoble");
  await expect(page.getByTestId("discover-filter-sidebar")).toBeVisible();
  await page.getByLabel("Ville ou proximité").fill("Grenoble");
  await expect(page.getByRole("button", { name: "Effacer" })).toBeVisible();

  const productionGrid = page.locator(".todam-production-grid").first();
  await expect(productionGrid.locator(".todam-production-card")).toHaveCount(
    venueCards.length,
  );
  const gridColumns = await productionGrid.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean),
  );
  expect(gridColumns).toHaveLength(4);
  const posterPlaceholders = productionGrid.locator(
    '[data-todam-poster-placeholder="theatre"]',
  );
  await expect(posterPlaceholders).toHaveCount(venueCards.length);
  await expect(posterPlaceholders.first()).toHaveAttribute(
    "aria-label",
    `Affiche indisponible pour ${venueCards[0]!.title}`,
  );
  const filterBar = page.locator(".todam-discover-filter-bar");
  await expect(filterBar).toHaveCSS("position", "sticky");
  await page
    .locator(".todam-web-page-scroll")
    .evaluate((element) => (element.scrollTop = 1_000));
  await expect
    .poll(async () => (await filterBar.boundingBox())?.y ?? Number.POSITIVE_INFINITY)
    .toBeLessThanOrEqual(72);
});

test("la fiche spectacle traite son hero et sa prochaine date comme un billet", async ({
  page,
}) => {
  await mockPresentationApi(page, false);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/production/jetais-partie-pardon-mind-the-gap");
  await expect(
    page.getByRole("heading", { level: 1, name: primaryCard.title }),
  ).toBeVisible();
  await expect(page.locator(".todam-production-hero--theatre")).toBeVisible();
  await expect(page.getByText("Note des membres", { exact: true })).toBeVisible();
  await expect(page.getByText("8,4/10", { exact: true })).toBeVisible();
  await expect(page.getByText("17 notes", { exact: true })).toBeVisible();
  const reviewsLink = page.getByRole("link", {
    exact: true,
    name: "Lire les avis ↓",
  });
  await expect(reviewsLink).toBeVisible();
  const nextPerformanceTicket = page
    .locator(".todam-ticket")
    .filter({ hasText: "Prochaine représentation" });
  await expect(nextPerformanceTicket).toContainText("Prochaine représentation");
  await expect(
    nextPerformanceTicket.getByRole("link", {
      exact: true,
      name: "Billetterie officielle ↗",
    }),
  ).toHaveAttribute("data-todam-ticket-action", "porcelain");

  await reviewsLink.click();
  await expect(page).toHaveURL(/#avis-des-membres$/);
  await expect(
    page.getByRole("heading", { exact: true, name: "Avis des membres" }),
  ).toBeVisible();
});

test("la fiche spectacle masque la moyenne avant cinq notes", async ({ page }) => {
  await mockPresentationApi(page, false);
  await page.unroute("**/v1/productions/jetais-partie-pardon-mind-the-gap");
  await page.route("**/v1/productions/jetais-partie-pardon-mind-the-gap", (route) =>
    fulfillJson(route, {
      ...productionDetail,
      ratingSummary: { average: 8, count: 1 },
      reviews: [],
    }),
  );

  await page.goto("/production/jetais-partie-pardon-mind-the-gap");
  await expect(page.getByText("Note des membres", { exact: true })).toBeVisible();
  await expect(page.getByText("1 note", { exact: true })).toBeVisible();
  await expect(page.getByText("8/10", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { exact: true, name: "Écrire le premier avis ↓" }),
  ).toBeVisible();
});

test("la fiche spectacle replie la contribution personnelle jusqu’à son ouverture", async ({
  page,
}) => {
  await mockPresentationApi(page, "member");
  await page.goto("/production/jetais-partie-pardon-mind-the-gap");

  await expect(page.getByText("Ma contribution", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Ma note : 8/10 · Avis public", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { exact: true, name: "Modifier mon avis" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "Une proposition très tenue, avec un vrai sens du rythme et de l’espace.",
      { exact: true },
    ),
  ).toBeVisible();

  const editReview = page.getByRole("button", {
    exact: true,
    name: "Modifier mon avis",
  });
  await expect(editReview).toHaveAttribute("aria-expanded", "false");
  await editReview.click();
  await expect(
    page.getByRole("textbox", { exact: true, name: "Modifier mon avis" }),
  ).toBeVisible();
  const closeEditor = page.getByRole("button", { exact: true, name: "Fermer" });
  await expect(closeEditor).toHaveAttribute("aria-expanded", "true");
  await closeEditor.click();
  await expect(
    page.getByRole("textbox", { exact: true, name: "Modifier mon avis" }),
  ).toHaveCount(0);
});

test("les affiches publiées restent affichées et la fiche gère l’absence de prochaine date", async ({
  page,
}) => {
  await mockPresentationApi(page, false);
  await page.unroute("**/v1/productions/jetais-partie-pardon-mind-the-gap");
  await page.route("**/v1/productions/jetais-partie-pardon-mind-the-gap", (route) =>
    fulfillJson(route, {
      ...productionDetail,
      posters: [
        {
          id: "900234d9-6224-4372-bca3-5d430ac5d9f0",
          url: "http://localhost:8081/brand/todam-open-graph.png",
          kind: "poster",
          alt: `Affiche du spectacle ${primaryCard.title}`,
          credit: "Création originale Todam",
          copyrightHolder: "Todam",
          license: null,
          rightsStatus: "todam_original",
          sourceUrl: "https://todam.fr/",
          width: 1200,
          height: 1800,
        },
      ],
      performances: [],
    }),
  );
  await page.goto("/production/jetais-partie-pardon-mind-the-gap");
  await expect(
    page.getByRole("img", {
      name: `Affiche du spectacle ${primaryCard.title}`,
    }),
  ).toBeVisible();
  await expect(page.locator(".todam-ticket")).toHaveCount(0);
  await expect(
    page.getByText("Aucune prochaine représentation n’est confirmée."),
  ).toBeVisible();
});

test("le marque-page de grille ajoute et retire un spectacle de « À voir »", async ({
  page,
}) => {
  await mockPresentationApi(page, "member");
  const methods: string[] = [];
  await page.route(`**/v1/me/watchlist/${primaryCard.id}`, async (route) => {
    const method = route.request().method();
    methods.push(method);
    await fulfillJson(route, {
      state: {
        productionId: primaryCard.id,
        seen: true,
        rating: 8,
        watchlisted: method === "PUT",
        review: null,
      },
    });
  });

  await page.goto("/search?q=Grenoble");
  const removeBookmark = page.getByRole("button", {
    exact: true,
    name: `Retirer ${primaryCard.title} de « À voir »`,
  });
  await expect(removeBookmark).toHaveAttribute("aria-pressed", "true");
  await expect(
    removeBookmark.evaluate((element) => element.closest("a")),
  ).resolves.toBeNull();

  await removeBookmark.click();
  const addBookmark = page.getByRole("button", {
    exact: true,
    name: `Ajouter ${primaryCard.title} à « À voir »`,
  });
  await expect(addBookmark).toHaveAttribute("aria-pressed", "false");
  await addBookmark.click();
  await expect(removeBookmark).toHaveAttribute("aria-pressed", "true");
  expect(methods).toEqual(["DELETE", "PUT"]);
});

test("la pagination de la grille ajoute les résultats sans perdre les filtres", async ({
  page,
}) => {
  await mockPresentationApi(page, false);
  await page.unroute("**/v1/search**");
  await page.route("**/v1/search**", (route) => {
    const url = new URL(route.request().url());
    const cursor = url.searchParams.get("cursor");
    return fulfillJson(route, {
      type: "productions",
      total: 3,
      productions: cursor ? [venueCards[2]] : venueCards.slice(0, 2),
      venues: [],
      companies: [],
      members: [],
      nextCursor: cursor ? null : "page-2",
      suggestion: null,
    });
  });
  await page.goto("/search?q=spectacle");
  await expect(
    page.locator(".todam-production-grid .todam-production-card"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Afficher plus de résultats" }).click();
  await expect(
    page.locator(".todam-production-grid .todam-production-card"),
  ).toHaveCount(3);
  await expect(page.getByTestId("discover-filter-sidebar")).toBeVisible();
});

test("l’ancienne page Découvrir redirige vers la recherche", async ({ page }) => {
  await mockPresentationApi(page, false);
  await page.goto("/decouvrir?q=Grenoble&type=companies");
  await expect(page).toHaveURL(/\/search\?(?=.*q=Grenoble)(?=.*type=companies)/u);
});

test("le footer de l’accueil reste atteignable au scroll maximal", async ({ page }) => {
  await mockPresentationApi(page, false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Les spectacles passent. Votre journal reste.",
    }),
  ).toBeVisible();
  await expect
    .poll(
      () =>
        page.locator(".todam-web-page-scroll").evaluate((element) => {
          element.scrollTop = element.scrollHeight;
          const footer = document.querySelector('[data-testid="site-footer"]');
          const footerBounds = footer?.getBoundingClientRect();
          return Boolean(
            footerBounds &&
            footerBounds.top < element.clientHeight &&
            footerBounds.bottom > 0,
          );
        }),
      { intervals: [100, 200, 400], timeout: 15_000 },
    )
    .toBe(true);
});

test("les actions de service et destructives annoncent clairement leur rôle", async ({
  page,
}) => {
  await mockPresentationApi(page, "member");
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/parametres-compte");
  await expect(
    page.getByRole("heading", { level: 1, name: "Paramètres du compte" }),
  ).toBeVisible();

  const exportButton = page.getByRole("button", {
    exact: true,
    name: "Exporter en JSON",
  });
  const deleteButton = page.getByRole("button", {
    exact: true,
    name: "Supprimer mon compte",
  });

  await expect(exportButton).toHaveAttribute("data-todam-cta", "quiet");
  await expect(exportButton).toHaveCSS("background-color", "rgb(255, 253, 248)");
  await expect(exportButton).toHaveCSS("border-color", "rgb(151, 143, 132)");
  await exportButton.hover();
  await expect(exportButton).toHaveCSS("background-color", "rgb(252, 248, 242)");

  await expect(deleteButton).toHaveAttribute("data-todam-cta", "danger");
  await expect(deleteButton).toHaveCSS("background-color", "rgb(161, 38, 26)");
});

test("les fiches compagnie et lieu gardent leur contexte utile et de vrais liens officiels", async ({
  page,
}) => {
  await mockPresentationApi(page, false);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/compagnie/collectif-mind-the-gap");
  await expect(
    page.getByRole("heading", { level: 1, name: company.name }),
  ).toBeVisible();
  await expect(page.getByText(company.name, { exact: true })).toHaveCount(1);
  await expect(page.getByText("Grenoble · France", { exact: true })).toBeVisible();
  const companyOfficialLink = page.getByRole("link", {
    exact: true,
    name: "Site officiel de la compagnie ↗",
  });
  await expect(companyOfficialLink).toHaveAttribute("href", company.officialUrl);
  await expect(companyOfficialLink).toHaveAttribute("target", "_blank");

  await page.goto("/lieu/hexagone-scene-nationale");
  await expect(page.getByRole("heading", { level: 1, name: venue.name })).toBeVisible();
  await expect(page.getByText(venue.name, { exact: true })).toHaveCount(1);
  const venueOfficialLink = page.getByRole("link", {
    exact: true,
    name: "Site officiel du lieu ↗",
  });
  await expect(venueOfficialLink).toHaveAttribute("href", venue.officialUrl);
  await expect(venueOfficialLink).toHaveAttribute("target", "_blank");

  const periodOptions = page.getByRole("radiogroup", { name: "Période" });
  const disciplineOptions = page.getByRole("radiogroup", { name: "Discipline" });
  await expect(page.getByRole("radio", { name: "Toutes" })).toBeVisible();
  const [periodBox, disciplineBox] = await Promise.all([
    periodOptions.boundingBox(),
    disciplineOptions.boundingBox(),
  ]);
  expect(periodBox).not.toBeNull();
  expect(disciplineBox).not.toBeNull();
  expect(Math.abs(periodBox!.y - disciplineBox!.y)).toBeLessThanOrEqual(1);
  expect(disciplineBox!.x).toBeGreaterThan(periodBox!.x + periodBox!.width);
});

for (const route of routes) {
  for (const viewport of viewports) {
    test(`${route.name} reste propre en ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await mockPresentationApi(page, route.role);
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(route.path);

      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      if ("afterLoad" in route && route.afterLoad === "venue-archives") {
        await page.getByRole("radio", { exact: true, name: "Archives" }).click();
        await expect(page.getByText(archivedCard.title)).toBeVisible();
      }
      await expect(page.getByRole("progressbar")).toHaveCount(0);

      const overflow = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>("body *"))
          .filter((element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.left < -1 || bounds.right > window.innerWidth + 1;
          })
          .slice(0, 5)
          .map((element) => ({
            className: element.className,
            tagName: element.tagName,
          }));
        return {
          document:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
          elements,
        };
      });
      expect(
        overflow.document,
        `Éléments hors viewport : ${JSON.stringify(overflow.elements)}`,
      ).toBe(false);

      await attachViewportSlices(page, testInfo, `${route.name}-${viewport.name}`);
    });
  }
}

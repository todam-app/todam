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
  visibility: "public",
  itemCount: 3,
  updatedAt: verifiedAt,
} as const;

const publicMember: PublicMember = {
  username: "spectatrice-grenoble",
  bio: "Théâtre, danse et formes contemporaines autour de Grenoble.",
  memberSince: "2025-09-12T10:00:00.000Z",
  counts: { seen: 18, lists: 2, reviews: 7 },
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
  publicLists: [publicList],
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
      profile: { pseudonym: publicMember.username },
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
      profile: { pseudonym: "spectatrice-grenoble" },
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
    targetLabel: primaryCard.title,
    targetPath: `/production/${primaryCard.slug}`,
    canHide: true,
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
    const screenshot = await page.screenshot({ animations: "disabled" });
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
    heading: "Bonjour, spectatrice-grenoble",
    role: "member",
  },
  {
    name: "decouvrir",
    path: "/decouvrir",
    heading: "Découvrir les spectacles",
    role: false,
  },
  {
    name: "recherche",
    path: "/search?q=Grenoble",
    heading: "Rechercher dans Todam",
    role: false,
  },
  {
    name: "recherche-lieux",
    path: "/search?q=Grenoble&type=venues",
    heading: "Rechercher dans Todam",
    role: false,
  },
  {
    name: "recherche-compagnies",
    path: "/search?q=Grenoble&type=companies",
    heading: "Rechercher dans Todam",
    role: false,
  },
  {
    name: "recherche-membres",
    path: "/search?q=Grenoble&type=members",
    heading: "Rechercher dans Todam",
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

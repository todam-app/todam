import { createHash } from "node:crypto";

import {
  artists,
  artistSources,
  catalogSources,
  companies,
  companySources,
  importBatches,
  performanceSources,
  performances,
  productionCompanies,
  productionCredits,
  productionDescriptions,
  productionSources,
  productions,
  sourceDocuments,
  venueSources,
  venues,
  workSources,
  works,
  type TodamDatabase,
} from "@todam/database";
import { and, eq, inArray, sql } from "drizzle-orm";

export const HEXAGONE_PILOT_VERIFIED_AT = "2026-07-27T10:00:00.000Z";

type PilotProduction = {
  externalKey: string;
  slug: string;
  title: string;
  discipline: "theatre" | "ballet";
  audience: "general" | "family";
  minimumAge: number | null;
  durationMinutes: number;
  company: {
    slug: string;
    name: string;
    shortDescription: string;
    officialUrl: string | null;
    sourceUrl: string;
  };
  credits: readonly {
    artistName: string;
    role:
      | "author"
      | "director"
      | "performer"
      | "choreographer"
      | "composer"
      | "designer"
      | "other";
    label?: string;
  }[];
  creditsSourceUrl: string;
  officialUrl: string;
  originalSummary: string;
  originalDescription: string;
  performances: readonly string[];
};

export const HEXAGONE_PILOT_PRODUCTIONS: readonly PilotProduction[] = [
  {
    externalKey: "mapado-729544",
    slug: "faire-troupeau-cie-frag",
    title: "Faire troupeau",
    discipline: "theatre",
    audience: "general",
    minimumAge: null,
    durationMinutes: 80,
    company: {
      slug: "cie-frag",
      name: "Cie Frag",
      shortDescription:
        "Compagnie nantaise cofondée par Marion Thomas et Maxime Devige, au croisement du théâtre, de la performance et des écritures contemporaines.",
      officialUrl: "https://fragcie.com/",
      sourceUrl: "https://fragcie.com/",
    },
    credits: [
      {
        artistName: "Marion Thomas",
        role: "author",
        label: "Écriture",
      },
      {
        artistName: "Marion Thomas",
        role: "director",
        label: "Mise en scène",
      },
      {
        artistName: "Marion Thomas",
        role: "performer",
        label: "Interprétation",
      },
      {
        artistName: "Clémentine Dercq",
        role: "designer",
        label: "Scénographie",
      },
      {
        artistName: "Adrien Jounier",
        role: "designer",
        label: "Création lumière",
      },
      {
        artistName: "Maxime Devige",
        role: "composer",
        label: "Création sonore",
      },
    ],
    creditsSourceUrl: "https://lesarchivesduspectacle.net/s/152637-Faire-troupeau",
    officialUrl: "https://theatre-hexagone.mapado.com/event/729544-faire-troupeau",
    originalSummary:
      "Une forme théâtrale et documentaire prend la transhumance comme point de départ pour observer les mécanismes de solidarité collective.",
    originalDescription:
      "À partir du déplacement saisonnier d’un troupeau, cette proposition théâtrale et documentaire examine ce qui permet à un collectif d’avancer. Le spectacle relie une pratique pastorale concrète à des questions contemporaines d’entraide et de groupe.",
    performances: ["2026-11-10T20:00:00+01:00", "2026-11-12T20:00:00+01:00"],
  },
  {
    externalKey: "mapado-727626",
    slug: "azaline-se-tait-les-veilleurs",
    title: "Azaline se tait",
    discipline: "theatre",
    audience: "general",
    minimumAge: 10,
    durationMinutes: 70,
    company: {
      slug: "cie-les-veilleurs",
      name: "Cie Les Veilleurs",
      shortDescription:
        "Compagnie théâtrale grenobloise dirigée par Émilie Le Roux, engagée dans des créations exigeantes accessibles dès l’enfance.",
      officialUrl: "https://lesveilleurs-compagnietheatrale.fr/",
      sourceUrl: "https://lesveilleurs-compagnietheatrale.fr/",
    },
    credits: [
      { artistName: "Lise Martin", role: "author", label: "Texte" },
      {
        artistName: "Émilie Le Roux",
        role: "director",
        label: "Mise en scène",
      },
      { artistName: "Marie Champion", role: "performer" },
      { artistName: "Maïa Le Fourn", role: "performer" },
      { artistName: "Marie Rahola", role: "performer" },
      { artistName: "Alexis Tieno", role: "performer" },
      { artistName: "Sébastien Weber", role: "performer" },
      {
        artistName: "Adéli Motchan",
        role: "choreographer",
        label: "Création chorégraphique",
      },
      {
        artistName: "Roberto Negro",
        role: "composer",
        label: "Création musicale",
      },
    ],
    creditsSourceUrl:
      "https://www.g20iledefrance.fr/les-projets-accompagnes/azaline-se-tait/",
    officialUrl: "https://theatre-hexagone.mapado.com/event/727626-azaline-se-tait",
    originalSummary:
      "Une pièce aborde l’inceste et la nécessité de libérer la parole en utilisant les codes du jeu d’enfance et du conte.",
    originalDescription:
      "La pièce traite d’un sujet sensible en empruntant au jeu et au conte leurs langages indirects. Elle met au centre le silence, la parole empêchée et les conditions nécessaires pour qu’une expérience puisse enfin être nommée.",
    performances: [
      "2026-11-18T10:00:00+01:00",
      "2026-11-18T19:30:00+01:00",
      "2026-11-19T14:15:00+01:00",
      "2026-11-19T19:30:00+01:00",
    ],
  },
  {
    externalKey: "mapado-729803",
    slug: "jetais-partie-pardon-mind-the-gap",
    title: "J’étais parti·e, pardon (dans un autre univers)",
    discipline: "theatre",
    audience: "family",
    minimumAge: 8,
    durationMinutes: 55,
    company: {
      slug: "collectif-mind-the-gap",
      name: "Collectif Mind The Gap",
      shortDescription:
        "Collectif théâtral qui développe des créations contemporaines et des projets de transmission, notamment avec la jeunesse.",
      officialUrl: "https://www.collectifmindthegap.com/",
      sourceUrl: "https://www.collectifmindthegap.com/",
    },
    credits: [
      { artistName: "Théophile Dubus", role: "author", label: "Texte" },
      {
        artistName: "Collectif Mind The Gap",
        role: "director",
        label: "Mise en scène",
      },
      {
        artistName: "Thomas Cabel",
        role: "performer",
        label: "Interprétation en alternance",
      },
      {
        artistName: "Julia de Reyke",
        role: "performer",
        label: "Interprétation en alternance",
      },
      {
        artistName: "Nama Keita",
        role: "performer",
        label: "Interprétation en alternance",
      },
      {
        artistName: "Solenn Louër",
        role: "performer",
        label: "Interprétation en alternance",
      },
      {
        artistName: "Anthony Lozano",
        role: "performer",
        label: "Interprétation en alternance",
      },
      {
        artistName: "Coline Pilet",
        role: "performer",
        label: "Interprétation en alternance",
      },
      {
        artistName: "Valentine Lê",
        role: "designer",
        label: "Scénographie et costumes",
      },
      {
        artistName: "Manon Poirier",
        role: "designer",
        label: "Création lumière",
      },
      {
        artistName: "Thomas Cabel",
        role: "composer",
        label: "Création sonore",
      },
    ],
    creditsSourceUrl: "https://www.collectifmindthegap.com/jppduaupro",
    officialUrl:
      "https://theatre-hexagone.mapado.com/event/729803-jetais-parti-e-pardon-dans-un-autre-univers",
    originalSummary:
      "Une comédie de science-fiction brouille la frontière entre création théâtrale, enquête et univers parallèles après la disparition fictive d’une classe.",
    originalDescription:
      "Présentée comme une enquête autour d’une disparition impossible, cette comédie joue avec les codes de la science-fiction et ceux de la représentation. Le récit fait circuler le public entre le plateau, la fiction et plusieurs réalités possibles.",
    performances: [
      "2026-12-09T14:15:00+01:00",
      "2026-12-09T19:30:00+01:00",
      "2026-12-10T10:00:00+01:00",
      "2026-12-10T14:15:00+01:00",
    ],
  },
  {
    externalKey: "mapado-730097",
    slug: "fondre-infini-dehors",
    title: "Fondre",
    discipline: "theatre",
    audience: "general",
    minimumAge: 10,
    durationMinutes: 60,
    company: {
      slug: "cie-infini-dehors",
      name: "Cie Infini Dehors",
      shortDescription:
        "Compagnie grenobloise portée par Natacha Dubois, qui crée pour le jeune public en mêlant théâtre, objets, manipulation et musique.",
      officialUrl: "https://www.infinidehors.org/",
      sourceUrl: "https://www.infinidehors.org/",
    },
    credits: [
      { artistName: "Guillaume Poix", role: "author", label: "Texte" },
      {
        artistName: "Natacha Dubois",
        role: "director",
        label: "Conception et mise en scène",
      },
      { artistName: "Natacha Dubois", role: "performer" },
      { artistName: "Chloé Schmutz", role: "performer" },
      { artistName: "Laurent Buisson", role: "performer" },
      {
        artistName: "Tristan Dubois",
        role: "designer",
        label: "Scénographie",
      },
      {
        artistName: "Natacha Dubois",
        role: "designer",
        label: "Marionnettes",
      },
      {
        artistName: "Laurent Buisson",
        role: "composer",
        label: "Musique",
      },
    ],
    creditsSourceUrl: "https://www.lyon.fr/evenement/spectacle/fondre",
    officialUrl: "https://theatre-hexagone.mapado.com/event/730097-fondre",
    originalSummary:
      "Théâtre de papier, manipulation visible et musique en direct racontent un exil sur fond de dérèglement climatique.",
    originalDescription:
      "Le spectacle associe papier, manipulation et musique jouée en direct pour suivre un parcours d’exil. La fragilité des matériaux répond à celle d’un monde transformé par le climat et donne au récit une forme immédiatement visible.",
    performances: ["2027-01-28T14:15:00+01:00", "2027-01-28T19:30:00+01:00"],
  },
  {
    externalKey: "mapado-730790",
    slug: "nelvar-le-royaume-sans-peuple",
    title: "Nelvar, le royaume sans peuple",
    discipline: "theatre",
    audience: "general",
    minimumAge: null,
    durationMinutes: 170,
    company: {
      slug: "cie-les-grands-ecarts",
      name: "Cie Les Grands Écarts",
      shortDescription:
        "Compagnie théâtrale portée par Logan De Carvalho, qui développe des récits contemporains mêlant fiction populaire et questions politiques.",
      officialUrl: "https://www.lesgrandsecarts.com/",
      sourceUrl: "https://www.lesgrandsecarts.com/",
    },
    credits: [
      { artistName: "Logan De Carvalho", role: "author", label: "Texte" },
      {
        artistName: "Logan De Carvalho",
        role: "director",
        label: "Mise en scène",
      },
      {
        artistName: "Margaux Desailly",
        role: "director",
        label: "Mise en scène",
      },
      { artistName: "Bess Davies", role: "performer" },
      { artistName: "Hayet Darwich", role: "performer" },
      { artistName: "Logan De Carvalho", role: "performer" },
      { artistName: "Jonathan Mallard", role: "performer" },
      { artistName: "Raphaël Mars", role: "performer" },
      {
        artistName: "Heidi Folliet",
        role: "designer",
        label: "Scénographie et costumes",
      },
      {
        artistName: "Léa Gadbois-Lamer",
        role: "designer",
        label: "Scénographie et costumes",
      },
      {
        artistName: "Raphaël Mars",
        role: "composer",
        label: "Création musicale",
      },
    ],
    creditsSourceUrl: "https://www.lesgrandsecarts.com/nelvar",
    officialUrl:
      "https://theatre-hexagone.mapado.com/event/730790-nelvar-le-royaume-sans-peuple",
    originalSummary:
      "Une fresque théâtrale de fantasy met en scène différents peuples afin d’interroger le vivre-ensemble et les rapports de domination.",
    originalDescription:
      "Dans un royaume imaginaire, plusieurs peuples et systèmes de pouvoir se rencontrent. Cette longue forme utilise les codes de la fantasy pour déplacer le regard sur la domination, les récits collectifs et la possibilité de vivre ensemble.",
    performances: ["2027-03-18T19:30:00+01:00"],
  },
  {
    externalKey: "mapado-730881",
    slug: "les-galets-au-tilleul-cie-pjpp",
    title: "Les Galets au tilleul sont plus petits qu’au Havre",
    discipline: "theatre",
    audience: "general",
    minimumAge: null,
    durationMinutes: 60,
    company: {
      slug: "cie-pjpp",
      name: "Cie PJPP",
      shortDescription:
        "Compagnie fondée en 2015 par Claire Laureau et Nicolas Chaigneau, à la croisée de la danse, du théâtre et de la performance.",
      officialUrl: "https://les-pjpp.com/",
      sourceUrl: "https://les-pjpp.com/",
    },
    credits: [
      {
        artistName: "Claire Laureau",
        role: "other",
        label: "Conception",
      },
      {
        artistName: "Nicolas Chaigneau",
        role: "other",
        label: "Conception",
      },
      { artistName: "Julien Athonady", role: "performer" },
      { artistName: "Nicolas Chaigneau", role: "performer" },
      {
        artistName: "Claire Laureau",
        role: "performer",
        label: "Interprétation en alternance",
      },
      {
        artistName: "Capucine Baroni",
        role: "performer",
        label: "Interprétation en alternance",
      },
      { artistName: "Marie Rual", role: "performer" },
      {
        artistName: "Valérie Sigward",
        role: "designer",
        label: "Création lumière",
      },
    ],
    creditsSourceUrl: "https://les-pjpp.com/les-galets-au-tilleul/",
    officialUrl:
      "https://theatre-hexagone.mapado.com/event/730881-les-galets-au-tilleul",
    originalSummary:
      "Quatre interprètes observent les conversations ordinaires et l’absurdité qui peut naître des discours qui s’éternisent.",
    originalDescription:
      "Quatre interprètes s’emparent des phrases, détours et répétitions de conversations très ordinaires. Leur observation précise fait progressivement apparaître le comique et l’absurde contenus dans une parole qui ne sait plus s’arrêter.",
    performances: ["2027-03-25T20:00:00+01:00"],
  },
  {
    externalKey: "mapado-731056",
    slug: "lusage-de-la-peur-passage-danimaux",
    title: "L’Usage de la peur",
    discipline: "theatre",
    audience: "general",
    minimumAge: 13,
    durationMinutes: 95,
    company: {
      slug: "cie-passage-danimaux",
      name: "Cie Passage d’Animaux",
      shortDescription:
        "Compagnie fondée à Lille en 2023 par Rémi Fortin pour porter ses projets et les collaborations artistiques qui les accompagnent.",
      officialUrl: "https://retors-particulier.com/remi-fortin/",
      sourceUrl: "https://retors-particulier.com/remi-fortin/",
    },
    credits: [
      {
        artistName: "Rémi Fortin",
        role: "other",
        label: "Conception",
      },
      { artistName: "Rémi Fortin", role: "performer" },
      {
        artistName: "Adèle Gascuel",
        role: "author",
        label: "Co-écriture",
      },
      {
        artistName: "Simon Gauchet",
        role: "designer",
        label: "Regard extérieur et scénographie",
      },
      {
        artistName: "Romain Crivellari",
        role: "performer",
        label: "Régie plateau et jeu",
      },
      {
        artistName: "Violaine de Maupéou",
        role: "designer",
        label: "Costumes",
      },
      {
        artistName: "Auréliane Pazzaglia",
        role: "designer",
        label: "Lumière",
      },
      { artistName: "Nathan Bernat", role: "composer", label: "Son" },
    ],
    creditsSourceUrl: "https://retors-particulier.com/remi-fortin/",
    officialUrl: "https://theatre-hexagone.mapado.com/event/731056-lusage-de-la-peur",
    originalSummary:
      "Une fausse conférence théâtrale propose des expériences autour de la peur, de ses mécanismes et de sa place dans la société.",
    originalDescription:
      "Sous l’apparence d’une conférence, le spectacle organise plusieurs expériences autour de la peur. La forme théâtrale permet d’en observer les ressorts, la circulation dans un groupe et les usages sociaux sans transformer la scène en cours magistral.",
    performances: ["2027-05-04T14:15:00+02:00", "2027-05-04T20:00:00+02:00"],
  },
] as const;

const HEXAGONE_PILOT_WITHDRAWN_SLUGS = [
  "t-r-u-c-en-cie-d-eux",
  "mille-horizons-arrangement-provisoire",
] as const;
const HEXAGONE_PILOT_ORPHANABLE_COMPANY_SLUGS = [
  "en-cie-d-eux",
  "cie-arrangement-provisoire",
] as const;

export type HexagonePilotResult = {
  companies: number;
  performances: number;
  productions: number;
  venueSlug: "hexagone-scene-nationale";
};

function normalizedCatalogLabel(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, "");
}

function catalogSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function performanceSeason(value: string): string {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const firstYear = date.getUTCMonth() >= 6 ? year : year - 1;
  return `${firstYear}-${firstYear + 1}`;
}

export function validateHexagonePilotData(): void {
  const slugs = new Set<string>();
  const keys = new Set<string>();
  const editorialIdentities = new Set<string>();
  const now = new Date(HEXAGONE_PILOT_VERIFIED_AT).getTime();
  for (const production of HEXAGONE_PILOT_PRODUCTIONS) {
    if (slugs.has(production.slug) || keys.has(production.externalKey)) {
      throw new Error(`Doublon dans la cohorte Hexagone : ${production.title}`);
    }
    slugs.add(production.slug);
    keys.add(production.externalKey);
    if (
      normalizedCatalogLabel(production.title).includes(
        normalizedCatalogLabel(production.company.name),
      )
    ) {
      throw new Error(
        `Le titre contient encore le nom de la compagnie : ${production.title}`,
      );
    }
    for (const season of new Set(production.performances.map(performanceSeason))) {
      const editorialIdentity = [
        normalizedCatalogLabel(production.title),
        normalizedCatalogLabel(production.company.name),
        "hexagone-scene-nationale",
        season,
        "partner.hexagone.2026-2027",
      ].join("|");
      if (editorialIdentities.has(editorialIdentity)) {
        throw new Error(
          `Doublon éditorial titre/compagnie/lieu/saison/source : ${production.title}`,
        );
      }
      editorialIdentities.add(editorialIdentity);
    }
    if (!["theatre", "ballet"].includes(production.discipline)) {
      throw new Error(`Discipline hors périmètre : ${production.title}`);
    }
    if (
      production.minimumAge !== null &&
      (!Number.isInteger(production.minimumAge) ||
        production.minimumAge < 0 ||
        production.minimumAge > 99)
    ) {
      throw new Error(`Âge conseillé invalide : ${production.title}`);
    }
    if (!production.company.shortDescription.trim()) {
      throw new Error(`Présentation de compagnie manquante : ${production.title}`);
    }
    if (
      production.company.officialUrl !== null &&
      !production.company.officialUrl.startsWith("https://")
    ) {
      throw new Error(`Site de compagnie invalide : ${production.title}`);
    }
    if (!production.company.sourceUrl.startsWith("https://")) {
      throw new Error(`Source de compagnie invalide : ${production.title}`);
    }
    if (
      production.credits.length === 0 ||
      !production.creditsSourceUrl.startsWith("https://")
    ) {
      throw new Error(`Crédits sourcés manquants : ${production.title}`);
    }
    const creditKeys = new Set<string>();
    for (const credit of production.credits) {
      const key = `${catalogSlug(credit.artistName)}|${credit.role}|${credit.label ?? ""}`;
      if (!catalogSlug(credit.artistName) || creditKeys.has(key)) {
        throw new Error(`Crédit invalide ou dupliqué : ${production.title}`);
      }
      creditKeys.add(key);
    }
    if (!production.officialUrl.startsWith("https://theatre-hexagone.mapado.com/")) {
      throw new Error(`Source non officielle : ${production.title}`);
    }
    if (production.performances.some((date) => new Date(date).getTime() <= now)) {
      throw new Error(`Date passée dans la cohorte pilote : ${production.title}`);
    }
  }
}

export async function applyHexagonePilot(
  database: TodamDatabase,
): Promise<HexagonePilotResult> {
  validateHexagonePilotData();
  const verifiedAt = new Date(HEXAGONE_PILOT_VERIFIED_AT);
  const performanceCount = HEXAGONE_PILOT_PRODUCTIONS.reduce(
    (total, production) => total + production.performances.length,
    0,
  );

  await database.transaction(async (transaction) => {
    await transaction
      .update(productions)
      .set({
        isActive: false,
        publicationStatus: "hidden",
        reviewedAt: verifiedAt,
        updatedAt: new Date(),
      })
      .where(inArray(productions.slug, HEXAGONE_PILOT_WITHDRAWN_SLUGS));
    await transaction
      .update(companies)
      .set({
        publicationStatus: "hidden",
        reviewedAt: verifiedAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(companies.slug, HEXAGONE_PILOT_ORPHANABLE_COMPANY_SLUGS),
          sql<boolean>`not exists (
            select 1
            from ${productionCompanies}
            join ${productions}
              on ${productions.id} = ${productionCompanies.productionId}
            where ${productionCompanies.companyId} = ${companies.id}
              and ${productions.isActive} = true
              and ${productions.publicationStatus} = 'published'
          )`,
        ),
      );

    const sourceRows = await transaction
      .insert(catalogSources)
      .values({
        externalKey: "partner.hexagone.2026-2027",
        name: "Billetterie officielle de l’Hexagone",
        homepageUrl: "https://theatre-hexagone.mapado.com/",
        connectorKind: "partner",
        metadataLicense: null,
        defaultMediaPolicy: "forbidden",
      })
      .onConflictDoUpdate({
        target: catalogSources.externalKey,
        set: {
          name: "Billetterie officielle de l’Hexagone",
          homepageUrl: "https://theatre-hexagone.mapado.com/",
          connectorKind: "partner",
          defaultMediaPolicy: "forbidden",
          updatedAt: new Date(),
        },
      })
      .returning({ id: catalogSources.id });
    const sourceId = sourceRows[0]!.id;

    const editorialSourceRows = await transaction
      .insert(catalogSources)
      .values({
        externalKey: "todam.editorial.official-company-sources",
        name: "Curation Todam — sources officielles des équipes artistiques",
        homepageUrl: "https://todam.fr/les-coulisses",
        connectorKind: "file",
        metadataLicense: null,
        defaultMediaPolicy: "forbidden",
      })
      .onConflictDoUpdate({
        target: catalogSources.externalKey,
        set: {
          name: "Curation Todam — sources officielles des équipes artistiques",
          homepageUrl: "https://todam.fr/les-coulisses",
          connectorKind: "file",
          defaultMediaPolicy: "forbidden",
          updatedAt: new Date(),
        },
      })
      .returning({ id: catalogSources.id });
    const editorialSourceId = editorialSourceRows[0]!.id;

    const venueDocumentRows = await transaction
      .insert(sourceDocuments)
      .values({
        sourceId,
        externalKey: "venue-hexagone",
        title: "Hexagone Scène nationale — site officiel",
        url: "https://www.theatre-hexagone.eu/",
        retrievedAt: verifiedAt,
        rightsStatus: "factual_metadata_only",
        license: null,
      })
      .onConflictDoUpdate({
        target: [sourceDocuments.sourceId, sourceDocuments.externalKey],
        set: {
          title: "Hexagone Scène nationale — site officiel",
          url: "https://www.theatre-hexagone.eu/",
          retrievedAt: verifiedAt,
          rightsStatus: "factual_metadata_only",
          license: null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: sourceDocuments.id });
    const venueDocumentId = venueDocumentRows[0]!.id;

    const venueRows = await transaction
      .insert(venues)
      .values({
        slug: "hexagone-scene-nationale",
        name: "Hexagone Scène nationale",
        addressLine1: "24 rue des Aiguinards",
        postalCode: "38240",
        locality: "Meylan",
        countryCode: "FR",
        timezone: "Europe/Paris",
        officialUrl: "https://www.theatre-hexagone.eu/",
      })
      .onConflictDoUpdate({
        target: venues.slug,
        set: {
          name: "Hexagone Scène nationale",
          addressLine1: "24 rue des Aiguinards",
          postalCode: "38240",
          locality: "Meylan",
          countryCode: "FR",
          timezone: "Europe/Paris",
          officialUrl: "https://www.theatre-hexagone.eu/",
          updatedAt: new Date(),
        },
      })
      .returning({ id: venues.id });
    const venueId = venueRows[0]!.id;
    await transaction
      .insert(venueSources)
      .values({
        entityId: venueId,
        documentId: venueDocumentId,
        externalKey: "venue-hexagone",
        observedAt: verifiedAt,
      })
      .onConflictDoUpdate({
        target: [venueSources.entityId, venueSources.documentId],
        set: { observedAt: verifiedAt, externalKey: "venue-hexagone" },
      });

    for (const item of HEXAGONE_PILOT_PRODUCTIONS) {
      const documentRows = await transaction
        .insert(sourceDocuments)
        .values({
          sourceId,
          externalKey: item.externalKey,
          title: `${item.title} — billetterie officielle`,
          url: item.officialUrl,
          retrievedAt: verifiedAt,
          rightsStatus: "factual_metadata_only",
          license: null,
        })
        .onConflictDoUpdate({
          target: [sourceDocuments.sourceId, sourceDocuments.externalKey],
          set: {
            title: `${item.title} — billetterie officielle`,
            url: item.officialUrl,
            retrievedAt: verifiedAt,
            rightsStatus: "factual_metadata_only",
            license: null,
            updatedAt: new Date(),
          },
        })
        .returning({ id: sourceDocuments.id });
      const documentId = documentRows[0]!.id;

      const companyDocumentRows = await transaction
        .insert(sourceDocuments)
        .values({
          sourceId: editorialSourceId,
          externalKey: `company-${item.company.slug}`,
          title: `${item.company.name} — présentation de référence`,
          url: item.company.sourceUrl,
          retrievedAt: verifiedAt,
          rightsStatus: "factual_metadata_only",
          license: null,
        })
        .onConflictDoUpdate({
          target: [sourceDocuments.sourceId, sourceDocuments.externalKey],
          set: {
            title: `${item.company.name} — présentation de référence`,
            url: item.company.sourceUrl,
            retrievedAt: verifiedAt,
            rightsStatus: "factual_metadata_only",
            license: null,
            updatedAt: new Date(),
          },
        })
        .returning({ id: sourceDocuments.id });
      const companyDocumentId = companyDocumentRows[0]!.id;

      const creditsDocumentRows = await transaction
        .insert(sourceDocuments)
        .values({
          sourceId: editorialSourceId,
          externalKey: `credits-${item.externalKey}`,
          title: `${item.title} — crédits artistiques de référence`,
          url: item.creditsSourceUrl,
          retrievedAt: verifiedAt,
          rightsStatus: "factual_metadata_only",
          license: null,
        })
        .onConflictDoUpdate({
          target: [sourceDocuments.sourceId, sourceDocuments.externalKey],
          set: {
            title: `${item.title} — crédits artistiques de référence`,
            url: item.creditsSourceUrl,
            retrievedAt: verifiedAt,
            rightsStatus: "factual_metadata_only",
            license: null,
            updatedAt: new Date(),
          },
        })
        .returning({ id: sourceDocuments.id });
      const creditsDocumentId = creditsDocumentRows[0]!.id;

      const workRows = await transaction
        .insert(works)
        .values({
          slug: item.slug,
          title: item.title,
          discipline: item.discipline,
        })
        .onConflictDoUpdate({
          target: works.slug,
          set: {
            title: item.title,
            discipline: item.discipline,
            updatedAt: new Date(),
          },
        })
        .returning({ id: works.id });
      const workId = workRows[0]!.id;
      await transaction
        .insert(workSources)
        .values({
          entityId: workId,
          documentId,
          externalKey: item.externalKey,
          observedAt: verifiedAt,
        })
        .onConflictDoUpdate({
          target: [workSources.entityId, workSources.documentId],
          set: { observedAt: verifiedAt, externalKey: item.externalKey },
        });

      const companyRows = await transaction
        .insert(companies)
        .values({
          slug: item.company.slug,
          name: item.company.name,
          shortDescription: item.company.shortDescription,
          officialUrl: item.company.officialUrl,
          publicationStatus: "published",
          reviewedAt: verifiedAt,
        })
        .onConflictDoUpdate({
          target: companies.slug,
          set: {
            name: item.company.name,
            shortDescription: item.company.shortDescription,
            officialUrl: item.company.officialUrl,
            publicationStatus: "published",
            reviewedAt: verifiedAt,
            updatedAt: new Date(),
          },
        })
        .returning({ id: companies.id });
      const companyId = companyRows[0]!.id;
      await transaction
        .insert(companySources)
        .values({
          entityId: companyId,
          documentId: companyDocumentId,
          externalKey: `company-${item.company.slug}`,
          observedAt: verifiedAt,
        })
        .onConflictDoUpdate({
          target: [companySources.entityId, companySources.documentId],
          set: {
            observedAt: verifiedAt,
            externalKey: `company-${item.company.slug}`,
          },
        });

      const productionRows = await transaction
        .insert(productions)
        .values({
          workId,
          slug: item.slug,
          title: item.title,
          discipline: item.discipline,
          audience: item.audience,
          minimumAge: item.minimumAge,
          durationMinutes: item.durationMinutes,
          language: "fr",
          officialUrl: item.officialUrl,
          isActive: true,
          publicationStatus: "published",
          reviewedAt: verifiedAt,
        })
        .onConflictDoUpdate({
          target: productions.slug,
          set: {
            workId,
            title: item.title,
            discipline: item.discipline,
            audience: item.audience,
            minimumAge: item.minimumAge,
            durationMinutes: item.durationMinutes,
            language: "fr",
            officialUrl: item.officialUrl,
            isActive: true,
            publicationStatus: "published",
            reviewedAt: verifiedAt,
            updatedAt: new Date(),
          },
        })
        .returning({ id: productions.id });
      const productionId = productionRows[0]!.id;
      await transaction
        .insert(productionSources)
        .values({
          entityId: productionId,
          documentId,
          externalKey: item.externalKey,
          observedAt: verifiedAt,
        })
        .onConflictDoUpdate({
          target: [productionSources.entityId, productionSources.documentId],
          set: { observedAt: verifiedAt, externalKey: item.externalKey },
        });
      await transaction
        .insert(productionSources)
        .values({
          entityId: productionId,
          documentId: creditsDocumentId,
          externalKey: `${item.externalKey}-credits`,
          observedAt: verifiedAt,
        })
        .onConflictDoUpdate({
          target: [productionSources.entityId, productionSources.documentId],
          set: {
            observedAt: verifiedAt,
            externalKey: `${item.externalKey}-credits`,
          },
        });
      await transaction
        .insert(productionCompanies)
        .values({
          productionId,
          companyId,
          isPrimary: true,
          position: 0,
        })
        .onConflictDoUpdate({
          target: [productionCompanies.productionId, productionCompanies.companyId],
          set: { isPrimary: true, position: 0 },
        });

      const creditRows: (typeof productionCredits.$inferInsert)[] = [];
      for (const [position, credit] of item.credits.entries()) {
        const artistSlug = catalogSlug(credit.artistName);
        const artistRows = await transaction
          .insert(artists)
          .values({ slug: artistSlug, name: credit.artistName })
          .onConflictDoUpdate({
            target: artists.slug,
            set: { name: credit.artistName, updatedAt: new Date() },
          })
          .returning({ id: artists.id });
        const artistId = artistRows[0]!.id;
        await transaction
          .insert(artistSources)
          .values({
            entityId: artistId,
            documentId: creditsDocumentId,
            externalKey: `artist-${artistSlug}`,
            observedAt: verifiedAt,
          })
          .onConflictDoUpdate({
            target: [artistSources.entityId, artistSources.documentId],
            set: {
              externalKey: `artist-${artistSlug}`,
              observedAt: verifiedAt,
            },
          });
        creditRows.push({
          productionId,
          artistId,
          role: credit.role,
          label: credit.label ?? null,
          position,
        });
      }
      await transaction
        .delete(productionCredits)
        .where(eq(productionCredits.productionId, productionId));
      await transaction.insert(productionCredits).values(creditRows);

      for (const [kind, body] of [
        ["short", item.originalSummary],
        ["full", item.originalDescription],
      ] as const) {
        await transaction
          .insert(productionDescriptions)
          .values({
            productionId,
            locale: "fr",
            kind,
            body,
            sourceDocumentId: documentId,
            sourceUrl: item.officialUrl,
            rightsStatus: "todam_original",
            license: null,
            lastVerifiedAt: verifiedAt,
          })
          .onConflictDoUpdate({
            target: [
              productionDescriptions.productionId,
              productionDescriptions.locale,
              productionDescriptions.kind,
            ],
            set: {
              body,
              sourceDocumentId: documentId,
              sourceUrl: item.officialUrl,
              rightsStatus: "todam_original",
              license: null,
              lastVerifiedAt: verifiedAt,
              updatedAt: new Date(),
            },
          });
      }

      for (const [index, startsAt] of item.performances.entries()) {
        const performanceRows = await transaction
          .insert(performances)
          .values({
            productionId,
            venueId,
            startsAt: new Date(startsAt),
            status: "scheduled",
            officialUrl: item.officialUrl,
          })
          .onConflictDoUpdate({
            target: [
              performances.productionId,
              performances.venueId,
              performances.startsAt,
            ],
            set: {
              status: "scheduled",
              officialUrl: item.officialUrl,
              updatedAt: new Date(),
            },
          })
          .returning({ id: performances.id });
        const performanceId = performanceRows[0]!.id;
        await transaction
          .insert(performanceSources)
          .values({
            entityId: performanceId,
            documentId,
            externalKey: `${item.externalKey}-performance-${index + 1}`,
            observedAt: verifiedAt,
          })
          .onConflictDoUpdate({
            target: [performanceSources.entityId, performanceSources.documentId],
            set: {
              observedAt: verifiedAt,
              externalKey: `${item.externalKey}-performance-${index + 1}`,
            },
          });
      }
    }

    await transaction.insert(importBatches).values({
      sourceId,
      coverageLabel: "Hexagone — cohorte pilote théâtre 2026–2027",
      contentHash: createHash("sha256")
        .update(JSON.stringify(HEXAGONE_PILOT_PRODUCTIONS))
        .digest("hex"),
      status: "completed",
      counts: {
        documents: HEXAGONE_PILOT_PRODUCTIONS.length * 3 + 1,
        works: HEXAGONE_PILOT_PRODUCTIONS.length,
        venues: 1,
        companies: new Set(HEXAGONE_PILOT_PRODUCTIONS.map((item) => item.company.slug))
          .size,
        artists: new Set(
          HEXAGONE_PILOT_PRODUCTIONS.flatMap((item) =>
            item.credits.map((credit) => catalogSlug(credit.artistName)),
          ),
        ).size,
        credits: HEXAGONE_PILOT_PRODUCTIONS.reduce(
          (total, item) => total + item.credits.length,
          0,
        ),
        productions: HEXAGONE_PILOT_PRODUCTIONS.length,
        descriptions: HEXAGONE_PILOT_PRODUCTIONS.length * 2,
        performances: performanceCount,
        media: 0,
        withdrawnProductions: HEXAGONE_PILOT_WITHDRAWN_SLUGS.length,
      },
      completedAt: new Date(),
    });
  });

  return {
    companies: new Set(HEXAGONE_PILOT_PRODUCTIONS.map((item) => item.company.slug))
      .size,
    performances: performanceCount,
    productions: HEXAGONE_PILOT_PRODUCTIONS.length,
    venueSlug: "hexagone-scene-nationale",
  };
}

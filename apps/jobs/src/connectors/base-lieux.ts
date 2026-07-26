import { CatalogImportSchema } from "@todam/contracts";

import {
  asArray,
  asRecord,
  externalKey,
  fetchJson,
  futureDate,
  isoDate,
  localizedText,
  slug,
  type ConnectorContext,
  type ConnectorResult,
} from "./common.js";

const DEFAULT_URL =
  "https://tabular-api.data.gouv.fr/api/resources/dced78ee-0823-4b61-86e6-57717308d4e4/data/";

function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function recordsFromPayload(payload: unknown): Record<string, unknown>[] {
  const record = asRecord(payload);
  return asArray(record?.data ?? record?.results ?? record?.records ?? payload)
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null);
}

export async function pullBaseLieux(
  context: ConnectorContext,
  options: { url?: string; maxRecords?: number } = {},
): Promise<ConnectorResult> {
  const baseUrl = new URL(
    options.url ?? process.env.TODAM_BASE_LIEUX_URL ?? DEFAULT_URL,
  );
  const maxRecords = options.maxRecords ?? 20_000;
  const records: Record<string, unknown>[] = [];
  let page = Number.parseInt(context.cursor ?? "1", 10) || 1;
  const pageSize = Math.min(100, maxRecords);
  let completed = false;

  while (records.length < maxRecords) {
    const url = new URL(baseUrl);
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("page", String(page));
    if (!url.searchParams.has("Domaine__contains")) {
      url.searchParams.set("Domaine__contains", "spectacle");
    }
    const payload = await fetchJson(context.fetch, url);
    const pageRecords = recordsFromPayload(payload);
    records.push(...pageRecords.slice(0, maxRecords - records.length));
    const links = asRecord(asRecord(payload)?.links);
    if (pageRecords.length < pageSize || !localizedText(links?.next)) {
      completed = true;
      break;
    }
    page += 1;
  }

  const documentKey = externalKey("base-lieux.document", context.now.toISOString());
  const venues = records.flatMap((record) => {
    const venueCategory = [
      localizedText(record.domaine),
      localizedText(record.sous_domaine),
      localizedText(record.type_equipement_ou_lieu),
      localizedText(record.precision_equipement),
      localizedText(record.Domaine),
      localizedText(record.Sous_domaine),
      localizedText(record["Type équipement ou lieu"]),
      localizedText(record["Précision équipement"]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("fr");
    if (
      !/\b(spectacle|th[eé][aâ]tre|op[eé]ra|danse|ballet|cirque|sc[eè]ne|z[eé]nith)\b/u.test(
        venueCategory,
      )
    ) {
      return [];
    }
    const identifier =
      localizedText(
        record.identifiant ??
          record.identifiant_origine ??
          record["Identifiant origine"] ??
          record.Identifiant_deps_a_partir_de_2022 ??
          record.identifiant_deps_a_partir_de_2022 ??
          record.Ident ??
          record.id ??
          record.code,
      ) ?? "";
    const name = localizedText(
      record.nom ?? record.Nom ?? record.nom_du_lieu ?? record.name,
    );
    const locality = localizedText(
      record.commune ??
        record.libelle_commune ??
        record.libelle_geographique ??
        record["Libellé géographique"] ??
        record.ville,
    );
    const postalCode = localizedText(
      record.code_postal ?? record["Code Postal"] ?? record.code_postal_du_lieu,
    );
    if (!identifier || !name || !locality || !postalCode) return [];

    const geo = asRecord(record.geolocalisation ?? record.geo_point_2d);
    const latitude = numberValue(
      record.latitude ?? record.Latitude ?? geo?.lat ?? geo?.latitude,
    );
    const longitude = numberValue(
      record.longitude ?? record.Longitude ?? geo?.lon ?? geo?.longitude,
    );
    return [
      {
        externalKey: externalKey("base-lieux.venue", identifier),
        sourceDocumentKey: documentKey,
        name,
        slug: slug(name, identifier),
        addressLine1:
          localizedText(
            record.adresse ??
              record.Adresse ??
              record.adresse_postale ??
              record.adresse_du_lieu,
          ) ?? "Adresse à confirmer",
        postalCode,
        locality,
        countryCode: "FR" as const,
        timezone: "Europe/Paris",
        latitude,
        longitude,
      },
    ];
  });

  const catalog = CatalogImportSchema.parse({
    schemaVersion: 2,
    source: {
      externalKey: "ministere-culture.base-lieux",
      name: "Base des lieux et équipements culturels",
      homepageUrl:
        "https://www.data.gouv.fr/datasets/base-des-lieux-et-equipements-culturels-basilic",
      connectorKind: "base_lieux",
      metadataLicense: "Etalab-2.0",
      defaultMediaPolicy: "metadata_only",
    },
    coverage: {
      countryCodes: ["FR"],
      inseeTerritoryCodes: [],
      label: `France — lieux culturels au ${isoDate(context.now)}`,
      startsOn: isoDate(context.now),
      endsOn: futureDate(context.now, 1),
      expectedCompleteness: "partial",
    },
    documents: [
      {
        externalKey: documentKey,
        title: "Extraction API de la Base des lieux culturels",
        url: baseUrl.toString(),
        retrievedAt: context.now.toISOString(),
        rightsStatus: "open_license",
        license: "Etalab-2.0",
      },
    ],
    venues,
  });

  return {
    catalog,
    cursor: completed ? null : String(page),
    stats: {
      fetched: records.length,
      accepted: venues.length,
      excluded: records.length - venues.length,
      media: 0,
    },
  };
}

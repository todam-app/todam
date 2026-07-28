import { CatalogImportSchema } from "@todam/contracts";

import {
  absoluteUrl,
  asArray,
  asRecord,
  classifyDiscipline,
  externalKey,
  fetchJson,
  futureDate,
  isoDate,
  localizedText,
  slug,
  type ConnectorContext,
  type ConnectorResult,
} from "./common.js";

interface DatatourismeOptions {
  maxRecords?: number;
  url?: string;
}

function recordsFromPayload(payload: unknown): Record<string, unknown>[] {
  const record = asRecord(payload);
  return asArray(
    record?.["@graph"] ??
      record?.features ??
      record?.results ??
      record?.data ??
      payload,
  )
    .map((item) => {
      const recordItem = asRecord(item);
      return asRecord(recordItem?.properties) ?? recordItem;
    })
    .filter((item): item is Record<string, unknown> => item !== null);
}

function firstRecord(...values: unknown[]): Record<string, unknown> | null {
  for (const value of values) {
    const first = asArray(value).map(asRecord).find(Boolean);
    if (first) return first;
  }
  return null;
}

function validInstant(value: unknown): string | null {
  const text = localizedText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function pullDatatourisme(
  context: ConnectorContext,
  options: DatatourismeOptions = {},
): Promise<ConnectorResult> {
  const sourceUrl = options.url ?? process.env.TODAM_DATATOURISME_URL;
  if (!sourceUrl) {
    throw new Error(
      "TODAM_DATATOURISME_URL doit pointer vers un export JSON ou JSON-LD autorisé.",
    );
  }
  const url = new URL(sourceUrl);
  const payload = await fetchJson(context.fetch, url);
  const records = recordsFromPayload(payload).slice(0, options.maxRecords ?? 100_000);
  const documentKey = externalKey("datatourisme.document", context.now.toISOString());
  const venues = new Map<string, Record<string, unknown>>();
  const productions = new Map<string, Record<string, unknown>>();
  const performances = new Map<string, Record<string, unknown>>();
  const media = new Map<string, Record<string, unknown>>();
  let excluded = 0;

  for (const record of records) {
    const identifier = localizedText(
      record["@id"] ?? record.id ?? record.dc_identifier,
    );
    const title = localizedText(
      record["rdfs:label"] ?? record.name ?? record["schema:name"],
    );
    const description = [
      title,
      localizedText(record["rdfs:comment"] ?? record.description),
      localizedText(record["@type"]),
    ]
      .filter(Boolean)
      .join(" ");
    const discipline = classifyDiscipline(description);
    const location = firstRecord(
      record.isLocatedAt,
      record.location,
      record["schema:location"],
    );
    const address = firstRecord(
      location?.schema_address,
      location?.address,
      location?.["schema:address"],
    );
    const venueName = localizedText(
      location?.["rdfs:label"] ?? location?.name ?? address?.name,
    );
    const locality = localizedText(
      address?.schema_addressLocality ?? address?.addressLocality ?? address?.city,
    );
    const postalCode = localizedText(address?.schema_postalCode ?? address?.postalCode);
    if (
      !identifier ||
      !title ||
      !discipline ||
      !venueName ||
      !locality ||
      !postalCode
    ) {
      excluded += 1;
      continue;
    }

    const venueIdentifier =
      localizedText(location?.["@id"] ?? location?.id) ?? `${locality}.${venueName}`;
    const venueKey = externalKey("datatourisme.venue", venueIdentifier);
    const productionKey = externalKey("datatourisme.production", identifier);
    const officialUrl =
      absoluteUrl(
        record["foaf:homepage"] ?? record["schema:url"] ?? record.url ?? record.sameAs,
      ) ?? url.toString();
    const geo = firstRecord(location?.schema_geo, location?.geo, location?.coordinates);
    const latitude = Number(geo?.schema_latitude ?? geo?.latitude ?? geo?.lat);
    const longitude = Number(
      geo?.schema_longitude ?? geo?.longitude ?? geo?.lon ?? geo?.lng,
    );
    const venueOfficialUrl = absoluteUrl(
      location?.["foaf:homepage"] ??
        location?.["schema:url"] ??
        location?.url ??
        location?.sameAs,
    );
    venues.set(venueKey, {
      externalKey: venueKey,
      sourceDocumentKey: documentKey,
      name: venueName,
      slug: slug(venueName, venueIdentifier),
      addressLine1:
        localizedText(
          address?.schema_streetAddress ?? address?.streetAddress ?? address?.address,
        ) ?? "Adresse à confirmer",
      postalCode,
      locality,
      countryCode:
        localizedText(address?.schema_addressCountry ?? address?.addressCountry) ??
        "FR",
      timezone: "Europe/Paris",
      officialUrl: venueOfficialUrl,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    });
    productions.set(productionKey, {
      externalKey: productionKey,
      sourceDocumentKey: documentKey,
      workExternalKey: null,
      title,
      slug: slug(title, identifier),
      discipline,
      audience: "general",
      durationMinutes: null,
      language: "français",
      officialUrl,
      credits: [],
    });

    const schedules = asArray(
      record.takesPlaceAt ??
        record.eventSchedule ??
        record["schema:eventSchedule"] ??
        record.schedule,
    );
    for (const [index, rawSchedule] of schedules.entries()) {
      const schedule = asRecord(rawSchedule);
      const startsAt = validInstant(
        schedule?.startDate ??
          schedule?.schema_startDate ??
          schedule?.startsAt ??
          rawSchedule,
      );
      if (!startsAt) continue;
      const endsAt = validInstant(
        schedule?.endDate ?? schedule?.schema_endDate ?? schedule?.endsAt,
      );
      const performanceKey = externalKey(
        "datatourisme.performance",
        `${identifier}.${startsAt}.${index}`,
      );
      performances.set(performanceKey, {
        externalKey: performanceKey,
        sourceDocumentKey: documentKey,
        productionExternalKey: productionKey,
        venueExternalKey: venueKey,
        startsAt,
        endsAt,
        status: new Date(startsAt) < context.now ? "completed" : "scheduled",
        officialUrl,
      });
    }

    const representation = firstRecord(
      record.hasRepresentation,
      record.representation,
      record.image,
      record["schema:image"],
    );
    const imageUrl = absoluteUrl(
      representation?.ebucore_hasRelatedResource ??
        representation?.url ??
        representation?.contentUrl ??
        representation?.["@id"] ??
        record.image,
    );
    if (imageUrl) {
      const credit = localizedText(
        representation?.credits ??
          representation?.credit ??
          representation?.copyrightNotice,
      );
      const license =
        localizedText(representation?.license ?? representation?.licenseName) ?? null;
      const mediaKey = externalKey("datatourisme.media", identifier);
      media.set(mediaKey, {
        externalKey: mediaKey,
        sourceDocumentKey: documentKey,
        productionExternalKey: productionKey,
        performanceExternalKey: null,
        kind: "poster",
        url: imageUrl,
        alt: `Visuel de ${title}`,
        credit: credit ?? "Crédit à vérifier auprès du producteur de la donnée",
        copyrightHolder: localizedText(representation?.copyrightHolder),
        rightsStatus:
          credit && license
            ? "open_license"
            : credit
              ? "hotlink_only"
              : "review_required",
        license,
        termsUrl: absoluteUrl(representation?.licenseUrl),
        storagePolicy:
          credit && license ? "mirror" : credit ? "hotlink" : "metadata_only",
        width: null,
        height: null,
        mimeType: null,
        validFrom: null,
        validUntil: null,
        isPrimary: true,
        position: 0,
      });
    }
  }

  const catalog = CatalogImportSchema.parse({
    schemaVersion: 2,
    source: {
      externalKey: "datatourisme.fr",
      name: "DATAtourisme",
      homepageUrl: "https://www.datatourisme.fr",
      connectorKind: "datatourisme",
      metadataLicense: "Etalab-2.0",
      defaultMediaPolicy: "metadata_only",
    },
    coverage: {
      countryCodes: ["FR"],
      inseeTerritoryCodes: [],
      label: `DATAtourisme — France au ${isoDate(context.now)}`,
      startsOn: isoDate(context.now),
      endsOn: futureDate(context.now),
      expectedCompleteness: "partial",
    },
    documents: [
      {
        externalKey: documentKey,
        title: "Extraction nationale DATAtourisme",
        url: url.toString(),
        retrievedAt: context.now.toISOString(),
        rightsStatus: "open_license",
        license: "Etalab-2.0",
      },
    ],
    venues: [...venues.values()],
    productions: [...productions.values()],
    performances: [...performances.values()],
    media: [...media.values()],
  });

  return {
    catalog,
    cursor: context.now.toISOString(),
    stats: {
      fetched: records.length,
      accepted: productions.size,
      excluded,
      media: media.size,
    },
  };
}

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

const DEFAULT_API = "https://api.openagenda.com/v2/agendas";

interface OpenAgendaOptions {
  agendaUids?: string[];
  apiKey?: string;
  baseUrl?: string;
  maxPagesPerAgenda?: number;
}

interface OpenAgendaCursor {
  afterByAgenda?: Record<string, string[] | null>;
  since?: string | null;
}

function eventsFromPayload(payload: unknown): Record<string, unknown>[] {
  const record = asRecord(payload);
  return asArray(record?.events ?? record?.results ?? record?.data ?? payload)
    .map(asRecord)
    .filter((event): event is Record<string, unknown> => event !== null);
}

function paginationAfter(payload: unknown): string[] | null {
  const record = asRecord(payload);
  const pagination = asRecord(record?.pagination);
  const values = asArray(record?.after ?? pagination?.after ?? record?.next)
    .map(localizedText)
    .filter((value): value is string => value !== null);
  return values.length > 0 ? values : null;
}

function locationOf(event: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(event.location ?? event.locations ?? event.place ?? event.venue);
}

function timingsOf(event: Record<string, unknown>): Record<string, unknown>[] {
  const timings = asArray(
    event.timings ?? event.schedules ?? event.dates ?? event.firstTiming,
  )
    .map(asRecord)
    .filter((timing): timing is Record<string, unknown> => timing !== null);
  return timings;
}

function validInstant(value: unknown): string | null {
  const text = localizedText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function eventImage(event: Record<string, unknown>): {
  credit: string | null;
  height: number | null;
  url: string | null;
  width: number | null;
} {
  const image = asRecord(event.image ?? event.imageUrl ?? event.visual);
  const direct = absoluteUrl(event.imageUrl ?? event.thumbnail);
  const base = absoluteUrl(image?.base ?? image?.url ?? image?.original);
  const filename = localizedText(image?.filename);
  const url =
    direct ??
    (base && filename
      ? new URL(filename, base.endsWith("/") ? base : `${base}/`).toString()
      : base);
  const credit = localizedText(
    event.imageCredits ?? event.imageCredit ?? image?.credits ?? image?.credit,
  );
  const width = Number(image?.width);
  const height = Number(image?.height);
  return {
    credit,
    height: Number.isInteger(height) && height > 0 ? height : null,
    url,
    width: Number.isInteger(width) && width > 0 ? width : null,
  };
}

export async function pullOpenAgenda(
  context: ConnectorContext,
  options: OpenAgendaOptions = {},
): Promise<ConnectorResult> {
  const apiKey = options.apiKey ?? process.env.TODAM_OPENAGENDA_API_KEY;
  const agendaUids =
    options.agendaUids ??
    (process.env.TODAM_OPENAGENDA_AGENDA_UIDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  if (!apiKey) {
    throw new Error("TODAM_OPENAGENDA_API_KEY est requis pour OpenAgenda.");
  }
  if (agendaUids.length === 0) {
    throw new Error(
      "TODAM_OPENAGENDA_AGENDA_UIDS doit contenir au moins un identifiant d'agenda.",
    );
  }

  const baseUrl = (
    options.baseUrl ??
    process.env.TODAM_OPENAGENDA_API_URL ??
    DEFAULT_API
  ).replace(/\/+$/, "");
  const maxPages = options.maxPagesPerAgenda ?? 100;
  const cursorState = context.cursor
    ? (JSON.parse(context.cursor) as OpenAgendaCursor)
    : {};
  const cursors = cursorState.afterByAgenda ?? {};
  const nextCursors: Record<string, string[] | null> = {};
  const fetchedEvents: { agendaUid: string; event: Record<string, unknown> }[] = [];

  for (const agendaUid of agendaUids) {
    let after = cursors[agendaUid] ?? null;
    for (let page = 0; page < maxPages; page += 1) {
      const url = new URL(`${baseUrl}/${encodeURIComponent(agendaUid)}/events`);
      url.searchParams.set("size", "100");
      url.searchParams.set("monolingual", "fr");
      url.searchParams.set("detailed", "1");
      for (const value of after ?? []) {
        url.searchParams.append("after[]", value);
      }
      if (cursorState.since) {
        url.searchParams.set("updatedAt[gte]", cursorState.since);
        url.searchParams.set("removed", "null");
        url.searchParams.set("sort", "updatedAt.asc");
      } else {
        url.searchParams.append("relative[]", "current");
        url.searchParams.append("relative[]", "upcoming");
      }
      const payload = await fetchJson(context.fetch, url, {
        headers: { key: apiKey },
      });
      const events = eventsFromPayload(payload);
      fetchedEvents.push(...events.map((event) => ({ agendaUid, event })));
      const next = paginationAfter(payload);
      if (
        !next ||
        events.length === 0 ||
        JSON.stringify(next) === JSON.stringify(after)
      ) {
        after = null;
        break;
      }
      after = next;
    }
    nextCursors[agendaUid] = after;
  }

  const documents = new Map<string, Record<string, unknown>>();
  const venues = new Map<string, Record<string, unknown>>();
  const productions = new Map<string, Record<string, unknown>>();
  const performances = new Map<string, Record<string, unknown>>();
  const media = new Map<string, Record<string, unknown>>();
  const withdrawnProductionExternalKeys = new Set<string>();
  let excluded = 0;

  for (const { agendaUid, event } of fetchedEvents) {
    const eventId = localizedText(event.uid ?? event.id ?? event.slug);
    if (eventId && event.removed === true) {
      withdrawnProductionExternalKeys.add(
        externalKey("openagenda.production", `${agendaUid}.${eventId}`),
      );
      continue;
    }
    const title = localizedText(event.title ?? event.name);
    const description = [
      title,
      localizedText(event.description),
      localizedText(event.longDescription),
      localizedText(event.keywords),
      localizedText(event.conditions),
    ]
      .filter(Boolean)
      .join(" ");
    const discipline = classifyDiscipline(description);
    const location = locationOf(event);
    const locationId = localizedText(location?.uid ?? location?.id ?? location?.name);
    const locationName = localizedText(location?.name ?? location?.title);
    const locality = localizedText(
      location?.cityName ?? location?.city ?? location?.locality,
    );
    const postalCode = localizedText(location?.postalCode ?? location?.zipCode);
    const eventUrl =
      absoluteUrl(event.canonicalUrl ?? event.url ?? event.link) ??
      `https://openagenda.com/${encodeURIComponent(agendaUid)}/events/${encodeURIComponent(eventId ?? "inconnu")}`;
    if (
      !eventId ||
      !title ||
      !discipline ||
      !locationId ||
      !locationName ||
      !locality ||
      !postalCode
    ) {
      excluded += 1;
      continue;
    }

    const namespace = `${agendaUid}.${eventId}`;
    const documentKey = externalKey("openagenda.document", namespace);
    const venueKey = externalKey("openagenda.venue", `${agendaUid}.${locationId}`);
    const productionKey = externalKey("openagenda.production", namespace);
    documents.set(documentKey, {
      externalKey: documentKey,
      title: `Événement OpenAgenda — ${title}`,
      url: eventUrl,
      retrievedAt: context.now.toISOString(),
      rightsStatus: "factual_metadata_only",
      license: null,
    });

    const latitude = Number(location?.latitude ?? asRecord(location?.coordinates)?.lat);
    const longitude = Number(
      location?.longitude ?? asRecord(location?.coordinates)?.lng,
    );
    const venueOfficialUrl = absoluteUrl(
      location?.website ?? location?.url ?? location?.canonicalUrl ?? location?.links,
    );
    venues.set(venueKey, {
      externalKey: venueKey,
      sourceDocumentKey: documentKey,
      name: locationName,
      slug: slug(locationName, locationId),
      addressLine1:
        localizedText(location?.address ?? location?.addressLine1) ??
        "Adresse à confirmer",
      postalCode,
      locality,
      countryCode: localizedText(location?.countryCode ?? location?.country) ?? "FR",
      timezone: localizedText(location?.timezone) ?? "Europe/Paris",
      officialUrl: venueOfficialUrl,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    });
    productions.set(productionKey, {
      externalKey: productionKey,
      sourceDocumentKey: documentKey,
      workExternalKey: null,
      title,
      slug: slug(title, namespace),
      discipline,
      audience: "general",
      durationMinutes: null,
      language: "français",
      officialUrl: eventUrl,
      credits: [],
    });

    const timings = timingsOf(event);
    for (const [index, timing] of timings.entries()) {
      const startsAt = validInstant(
        timing.begin ?? timing.start ?? timing.startsAt ?? timing.date,
      );
      if (!startsAt) continue;
      const endsAt = validInstant(timing.end ?? timing.endsAt);
      const performanceKey = externalKey(
        "openagenda.performance",
        `${namespace}.${startsAt}.${index}`,
      );
      const cancelled = Boolean(
        timing.cancelled ?? event.cancelled ?? event.status === "cancelled",
      );
      performances.set(performanceKey, {
        externalKey: performanceKey,
        sourceDocumentKey: documentKey,
        productionExternalKey: productionKey,
        venueExternalKey: venueKey,
        startsAt,
        endsAt,
        status: cancelled
          ? "cancelled"
          : new Date(startsAt) < context.now
            ? "completed"
            : "scheduled",
        officialUrl: eventUrl,
      });
    }

    const image = eventImage(event);
    if (image.url) {
      const mediaKey = externalKey("openagenda.media", namespace);
      media.set(mediaKey, {
        externalKey: mediaKey,
        sourceDocumentKey: documentKey,
        productionExternalKey: productionKey,
        performanceExternalKey: null,
        kind: "poster",
        url: image.url,
        alt: `Affiche de ${title}`,
        credit: image.credit ?? "Crédit à vérifier auprès de l'organisateur",
        copyrightHolder: null,
        rightsStatus: image.credit ? "hotlink_only" : "review_required",
        license: null,
        termsUrl: "https://openagenda.com/legal",
        storagePolicy: image.credit ? "hotlink" : "metadata_only",
        width: image.width,
        height: image.height,
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
      externalKey: "openagenda.fr",
      name: "OpenAgenda",
      homepageUrl: "https://openagenda.com",
      connectorKind: "openagenda",
      metadataLicense: null,
      defaultMediaPolicy: "hotlink",
    },
    coverage: {
      countryCodes: ["FR"],
      inseeTerritoryCodes: [],
      label: `Agendas OpenAgenda — France au ${isoDate(context.now)}`,
      startsOn: isoDate(context.now),
      endsOn: futureDate(context.now),
      expectedCompleteness: "partial",
    },
    documents:
      documents.size > 0
        ? [...documents.values()]
        : [
            {
              externalKey: externalKey(
                "openagenda.document",
                context.now.toISOString(),
              ),
              title: "Synchronisation OpenAgenda sans événement accepté",
              url: "https://openagenda.com",
              retrievedAt: context.now.toISOString(),
              rightsStatus: "factual_metadata_only",
              license: null,
            },
          ],
    venues: [...venues.values()],
    productions: [...productions.values()],
    performances: [...performances.values()],
    media: [...media.values()],
    withdrawnProductionExternalKeys: [...withdrawnProductionExternalKeys],
  });

  return {
    catalog,
    cursor: JSON.stringify({
      afterByAgenda: nextCursors,
      since: Object.values(nextCursors).some(Boolean)
        ? (cursorState.since ?? null)
        : context.now.toISOString(),
    } satisfies OpenAgendaCursor),
    stats: {
      fetched: fetchedEvents.length,
      accepted: productions.size,
      excluded,
      media: media.size,
    },
  };
}

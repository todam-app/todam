import { describe, expect, it, vi } from "vitest";

import { pullBaseLieux } from "../src/connectors/base-lieux.js";
import { pullDatatourisme } from "../src/connectors/datatourisme.js";
import { discoverOpenAgenda } from "../src/connectors/openagenda-discovery.js";
import { pullOpenAgenda } from "../src/connectors/openagenda.js";
import { assertPublicMediaUrl, downloadMedia } from "../src/media-mirror.js";

const now = new Date("2026-07-25T10:00:00.000Z");

function jsonFetch(payload: unknown) {
  return vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
  );
}

describe("connecteurs du catalogue national", () => {
  it("normalise les lieux de la Base du ministère sans créer de spectacle", async () => {
    const fetchImplementation = jsonFetch({
      results: [
        {
          identifiant: "L-42",
          nom: "Théâtre National Exemple",
          adresse: "1 rue de la Scène",
          code_postal: "75001",
          commune: "Paris",
          domaine: "Spectacle vivant",
          type_equipement_ou_lieu: "Théâtre",
          geolocalisation: { lat: 48.86, lon: 2.34 },
        },
      ],
    });

    const result = await pullBaseLieux(
      { cursor: null, fetch: fetchImplementation, now },
      { maxRecords: 10, url: "https://example.test/lieux" },
    );

    expect(result.catalog.venues).toHaveLength(1);
    expect(result.catalog.productions).toHaveLength(0);
    expect(result.catalog.source.metadataLicense).toBe("Etalab-2.0");
  });

  it("importe les dates et l'affiche créditée d'un événement OpenAgenda", async () => {
    const fetchImplementation = jsonFetch({
      events: [
        {
          uid: "event-1",
          title: { fr: "Une pièce de théâtre" },
          description: { fr: "Spectacle vivant" },
          canonicalUrl: "https://openagenda.com/agenda/events/event-1",
          image: { url: "https://images.example.test/affiche.jpg" },
          imageCredits: "Compagnie Exemple",
          location: {
            uid: "venue-1",
            name: "Scène Exemple",
            address: "2 rue du Rideau",
            postalCode: "69001",
            cityName: "Lyon",
            countryCode: "FR",
          },
          timings: [
            {
              begin: "2026-09-10T20:00:00+02:00",
              end: "2026-09-10T22:00:00+02:00",
            },
          ],
        },
      ],
    });

    const result = await pullOpenAgenda(
      { cursor: null, fetch: fetchImplementation, now },
      {
        agendaUids: ["agenda"],
        apiKey: "test-key",
        baseUrl: "https://api.example.test/v2/agendas",
      },
    );

    expect(result.catalog.performances).toHaveLength(1);
    expect(result.catalog.media[0]).toMatchObject({
      credit: "Compagnie Exemple",
      rightsStatus: "hotlink_only",
      storagePolicy: "hotlink",
    });

    await pullOpenAgenda(
      { cursor: result.cursor, fetch: fetchImplementation, now },
      {
        agendaUids: ["agenda"],
        apiKey: "test-key",
        baseUrl: "https://api.example.test/v2/agendas",
      },
    );
    expect(String(fetchImplementation.mock.calls[1]?.[0])).toContain(
      "updatedAt%5Bgte%5D",
    );
  });

  it("n'expose pas un visuel DATAtourisme sans crédit", async () => {
    const fetchImplementation = jsonFetch({
      "@graph": [
        {
          "@id": "dt:event-1",
          "@type": "TheatreEvent",
          "rdfs:label": { fr: "Le théâtre des exemples" },
          isLocatedAt: {
            "@id": "dt:venue-1",
            "rdfs:label": { fr: "Salle Exemple" },
            address: {
              addressLocality: "Nantes",
              postalCode: "44000",
              streetAddress: "3 rue des Arts",
            },
          },
          takesPlaceAt: [
            {
              startDate: "2026-10-02T20:30:00+02:00",
              endDate: "2026-10-02T22:00:00+02:00",
            },
          ],
          image: {
            url: "https://images.example.test/datatourisme.jpg",
          },
        },
      ],
    });

    const result = await pullDatatourisme(
      { cursor: null, fetch: fetchImplementation, now },
      { url: "https://example.test/datatourisme.json" },
    );

    expect(result.catalog.productions).toHaveLength(1);
    expect(result.catalog.media[0]).toMatchObject({
      rightsStatus: "review_required",
      storagePolicy: "metadata_only",
    });
  });

  it("transmet les retraits incrémentaux OpenAgenda à l'importeur", async () => {
    const fetchImplementation = jsonFetch({
      after: null,
      events: [
        {
          uid: "event-retire",
          removed: true,
          updatedAt: "2026-07-25T09:30:00.000Z",
        },
      ],
    });

    const result = await pullOpenAgenda(
      {
        cursor: JSON.stringify({
          afterByAgenda: {},
          since: "2026-07-25T09:00:00.000Z",
        }),
        fetch: fetchImplementation,
        now,
      },
      {
        agendaUids: ["agenda"],
        apiKey: "test-key",
        baseUrl: "https://api.example.test/v2/agendas",
      },
    );

    expect(result.catalog.withdrawnProductionExternalKeys).toEqual([
      "openagenda.production.agenda.event-retire",
    ]);
    const requestedUrl = String(fetchImplementation.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("removed=null");
    expect(requestedUrl).toContain("updatedAt%5Bgte%5D");
  });

  it("découvre et déduplique les agendas officiels OpenAgenda", async () => {
    const fetchImplementation = jsonFetch({
      after: null,
      agendas: [
        {
          uid: 42,
          title: "Scènes de France",
          description: "Théâtre, opéra et ballet",
          official: true,
          slug: "scenes-de-france",
        },
      ],
    });

    const agendas = await discoverOpenAgenda(fetchImplementation, {
      apiKey: "test-key",
      baseUrl: "https://api.example.test/v2/agendas",
      terms: ["théâtre", "opéra"],
    });

    expect(agendas).toHaveLength(1);
    expect(agendas[0]?.uid).toBe("42");
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toContain("official=1");
    expect(fetchImplementation.mock.calls[0]?.[1]).toMatchObject({
      headers: { key: "test-key" },
    });
  });

  it("bloque le miroir d'affiches vers un réseau privé", async () => {
    await expect(
      assertPublicMediaUrl(new URL("https://127.0.0.1/affiche.jpg")),
    ).rejects.toThrow("réseau non public");
  });

  it("valide la signature d'une affiche avant son stockage", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);
    const fetchImplementation = vi.fn<typeof fetch>(
      async () =>
        new Response(jpeg, {
          headers: { "content-type": "image/jpeg" },
          status: 200,
        }),
    );

    const downloaded = await downloadMedia(
      "https://93.184.216.34/affiche.jpg",
      fetchImplementation,
    );

    expect(downloaded.extension).toBe("jpg");
    expect(downloaded.sha256).toHaveLength(64);
  });
});

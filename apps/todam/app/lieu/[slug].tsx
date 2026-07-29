import { useQuery } from "@tanstack/react-query";
import {
  TodamApiError,
  VenueResponseSchema,
  type Discipline,
  type VenueProgramProduction,
} from "@todam/contracts";
import { Button, SectionTitle } from "@todam/design-system";
import { Link, useLoaderData, useLocalSearchParams } from "expo-router";
import Head from "expo-router/head";
import { createStaticLoader } from "expo-router/server";
import { useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { AsyncState } from "../../components/AsyncState";
import { AccessibleChoiceGroup } from "../../components/AccessibleChoiceGroup";
import { CatalogSources } from "../../components/CatalogSources";
import { LegalFooter } from "../../components/LegalFooter";
import { PageScrollView } from "../../components/PageScrollView";
import { ProductionListItem } from "../../components/ProductionListItem";
import { api } from "../../lib/api";
import { API_URL, PUBLIC_WEB_URL } from "../../lib/config";
import { serializeJsonLd } from "../../lib/json-ld";
import {
  areRouteLoadersDisabled,
  getPublishedCatalogSlugs,
} from "../../lib/static-catalog-params";

const INITIAL_DATA_UPDATED_AT = Date.now();

const disciplineLabels: Record<Discipline, string> = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getPublishedCatalogSlugs("venues");
  return slugs.map((slug) => ({ slug }));
}

export const loader = createStaticLoader(async (params) => {
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  if (!slug || slug.startsWith("[") || areRouteLoadersDisabled()) {
    return null;
  }
  const response = await fetch(
    `${API_URL}/v1/venues/${encodeURIComponent(slug ?? "")}`,
  );
  if (!response.ok) {
    throw new Error(`Impossible de précharger le lieu ${slug ?? "inconnu"}.`);
  }
  return VenueResponseSchema.parse(await response.json());
});

type ProgramItem = {
  production: VenueProgramProduction;
  dates: string[];
};

type ProgramSeason = {
  label: string;
  months: { key: string; label: string; items: ProgramItem[] }[];
};

function dateParts(startsAt: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "numeric",
    timeZone: timezone,
  }).formatToParts(new Date(startsAt));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 0),
  };
}

function seasonLabel(startsAt: string, timezone: string): string {
  const { month, year } = dateParts(startsAt, timezone);
  const firstYear = month >= 7 ? year : year - 1;
  return `Saison ${firstYear}–${firstYear + 1}`;
}

function monthLabel(startsAt: string, timezone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

function compactPerformance(startsAt: string, timezone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

function groupProgram(
  productions: VenueProgramProduction[],
  timezone: string,
  period: "upcoming" | "archives",
): ProgramSeason[] {
  const occurrences = productions.flatMap((production) => {
    const dates =
      production.venuePerformances.length > 0
        ? production.venuePerformances.map((performance) => performance.startsAt)
        : production.nextPerformance
          ? [production.nextPerformance]
          : [];
    return dates.map((startsAt) => ({ production, startsAt }));
  });
  occurrences.sort((left, right) => {
    const difference =
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
    return period === "upcoming" ? difference : -difference;
  });

  const seasons = new Map<
    string,
    Map<string, { label: string; items: Map<string, ProgramItem> }>
  >();
  for (const occurrence of occurrences) {
    const { month, year } = dateParts(occurrence.startsAt, timezone);
    const season = seasonLabel(occurrence.startsAt, timezone);
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const seasonMonths =
      seasons.get(season) ??
      new Map<string, { label: string; items: Map<string, ProgramItem> }>();
    const monthGroup = seasonMonths.get(monthKey) ?? {
      label: monthLabel(occurrence.startsAt, timezone),
      items: new Map<string, ProgramItem>(),
    };
    const existing = monthGroup.items.get(occurrence.production.id);
    monthGroup.items.set(occurrence.production.id, {
      production: occurrence.production,
      dates: [...(existing?.dates ?? []), occurrence.startsAt],
    });
    seasonMonths.set(monthKey, monthGroup);
    seasons.set(season, seasonMonths);
  }

  return Array.from(seasons.entries()).map(([label, months]) => ({
    label,
    months: Array.from(months.entries()).map(([key, group]) => ({
      key,
      label: group.label,
      items: Array.from(group.items.values()),
    })),
  }));
}

export default function VenuePage() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug;
  const preloadedVenue = useLoaderData<typeof loader>();
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [period, setPeriod] = useState<"upcoming" | "archives">("upcoming");
  const venue = useQuery({
    queryKey: ["venue", slug],
    queryFn: () => api.getVenue(slug),
    enabled: Boolean(slug),
    ...(preloadedVenue
      ? {
          initialData: preloadedVenue,
          initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
        }
      : {}),
    staleTime: 60_000,
  });
  const productions =
    period === "upcoming" ? (venue.data?.upcoming ?? []) : (venue.data?.archives ?? []);
  const filtered = discipline
    ? productions.filter((production) => production.discipline === discipline)
    : productions;
  const groups = useMemo(
    () => groupProgram(filtered, venue.data?.timezone ?? "Europe/Paris", period),
    [filtered, period, venue.data?.timezone],
  );
  const canonicalUrl = `${PUBLIC_WEB_URL}/lieu/${slug}`;
  const unavailable =
    venue.error instanceof TodamApiError && venue.error.problem.status === 404;
  const jsonLd = venue.data
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Place",
            "@id": `${canonicalUrl}#place`,
            name: venue.data.name,
            url: canonicalUrl,
            sameAs: venue.data.officialUrl ?? undefined,
            address: {
              "@type": "PostalAddress",
              streetAddress: venue.data.addressLine1,
              postalCode: venue.data.postalCode,
              addressLocality: venue.data.locality,
              addressCountry: venue.data.countryCode,
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Découvrir",
                item: `${PUBLIC_WEB_URL}/decouvrir`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: venue.data.name,
                item: canonicalUrl,
              },
            ],
          },
        ],
      }
    : null;

  return (
    <>
      <Head>
        <title>
          {venue.data
            ? `${venue.data.name} — programmation | Todam`
            : "Lieu de spectacle | Todam"}
        </title>
        {unavailable ? <meta content="noindex,follow" name="robots" /> : null}
        {venue.data ? (
          <>
            <meta
              content={`Programmation, prochaines dates et archives de ${venue.data.name} à ${venue.data.locality}.`}
              name="description"
            />
            <meta content={`${venue.data.name} — programmation`} property="og:title" />
            <meta
              content={`Programmation et prochaines dates de ${venue.data.name} à ${venue.data.locality}.`}
              property="og:description"
            />
          </>
        ) : null}
        <link href={canonicalUrl} rel="canonical" />
        <meta content={canonicalUrl} property="og:url" />
        {venue.data ? (
          <>
            <meta content={`${venue.data.name} — programmation`} name="twitter:title" />
            <meta
              content={`Programmation et prochaines dates de ${venue.data.name} à ${venue.data.locality}.`}
              name="twitter:description"
            />
          </>
        ) : null}
        {jsonLd ? (
          <script
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
            type="application/ld+json"
          />
        ) : null}
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-content flex-1 px-5 py-8 md:px-8 md:py-12">
          <AsyncState
            empty={!venue.isPending && (!venue.data || unavailable)}
            emptyAction={
              <Link href="/decouvrir?type=venues" asChild>
                <Button
                  accessibilityRole="link"
                  label="Rechercher un lieu"
                  variant="secondary"
                />
              </Link>
            }
            emptyMessage="Ce lieu n’est pas encore publié."
            error={venue.isError && !unavailable}
            loading={venue.isPending}
            onRetry={() => void venue.refetch()}
          >
            {venue.data ? (
              <View className="gap-10">
                <View className="gap-6 border-b border-line pb-8">
                  <View className="flex-row flex-wrap gap-2">
                    <Link href="/decouvrir" asChild>
                      <Pressable
                        accessibilityRole="link"
                        className="min-h-11 justify-center"
                      >
                  <Text className="text-sm font-semibold text-brand-text">
                          Découvrir
                        </Text>
                      </Pressable>
                    </Link>
                    <Text className="text-sm text-muted">/</Text>
                    <Text className="text-sm text-muted">Lieux</Text>
                  </View>
                  <View className="max-w-3xl gap-3">
          <Text className="text-xs font-bold uppercase tracking-widest text-brand-text">
                      Lieu de spectacle
                    </Text>
                    <Text
                      aria-level={1}
                      accessibilityRole="header"
                      className="font-serif text-4xl font-semibold leading-[46px] text-ink md:text-5xl md:leading-[56px]"
                    >
                      {venue.data.name}
                    </Text>
                    <Text className="text-base leading-6 text-muted">
                      {venue.data.addressLine1}, {venue.data.postalCode}{" "}
                      {venue.data.locality}
                    </Text>
                    {venue.data.officialUrl ? (
                      <Pressable
                        accessibilityRole="link"
                        className="min-h-11 self-start justify-center"
                        onPress={() => void Linking.openURL(venue.data!.officialUrl!)}
                      >
            <Text className="text-base font-semibold text-brand-text">
                          Site officiel du lieu ↗
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <View className="gap-5">
                  <SectionTitle eyebrow="Programmation">
                    {period === "upcoming" ? "À venir" : "Archives"}
                  </SectionTitle>
                  <AccessibleChoiceGroup
                    label="Période"
                    onChange={setPeriod}
                    options={[
                      ["upcoming", "À venir"],
                      ["archives", "Archives"],
                    ]}
                    testIdPrefix="venue-period"
                    value={period}
                  />
                  <AccessibleChoiceGroup
                    label="Discipline"
                    onChange={(value) => setDiscipline(value === "all" ? null : value)}
                    options={[
                      ["all", "Toutes les disciplines"],
                      ...venue.data.disciplines.map(
                        (value) => [value, disciplineLabels[value]] as const,
                      ),
                    ]}
                    testIdPrefix="venue-discipline"
                    value={discipline ?? "all"}
                  />

                  {groups.length === 0 ? (
                    <View className="todam-editorial-empty justify-center p-5">
                      <Text className="text-base leading-6 text-muted">
                        Aucun spectacle ne correspond à ces filtres.
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-9">
                      {groups.map((season) => (
                        <View className="gap-7" key={season.label}>
                          <Text className="border-b-2 border-ink pb-3 font-serif text-3xl font-semibold text-ink">
                            {season.label}
                          </Text>
                          {season.months.map((month) => (
                            <View className="gap-1" key={month.key}>
                              <Text className="border-b border-line pb-3 font-serif text-2xl font-semibold capitalize text-ink">
                                {month.label}
                              </Text>
                              {month.items.map((item) => (
                                <View className="gap-1" key={item.production.id}>
                                  <ProductionListItem
                                    production={{
                                      ...item.production,
                                      nextPerformance: item.dates[0] ?? null,
                                      nextVenue: venue.data ?? null,
                                    }}
                                  />
                                  {item.dates.length > 1 ? (
                                    <Text className="pb-3 pl-[76px] text-sm leading-5 text-muted">
                                      {item.dates.length} représentations :{" "}
                                      {item.dates
                                        .map((date) =>
                                          compactPerformance(
                                            date,
                                            venue.data!.timezone,
                                          ),
                                        )
                                        .join(" · ")}
                                    </Text>
                                  ) : null}
                                </View>
                              ))}
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View className="gap-3 border-t border-line pt-8">
                  <Text className="font-serif text-2xl font-semibold text-ink">
                    Données et droits
                  </Text>
                  <Text className="max-w-3xl text-base leading-6 text-muted">
                    Todam ne publie que les visuels dont les droits d’affichage sont
                    confirmés. Les informations de programmation sont reliées à leurs
                    sources et à leur date de vérification.
                  </Text>
                  <CatalogSources
                    lastVerifiedAt={venue.data.lastVerifiedAt}
                    sources={venue.data.sources}
                  />
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <Link href="/pour-les-salles" asChild>
                      <Button
                        accessibilityRole="link"
                        label="Vous représentez ce lieu ?"
                      />
                    </Link>
                    <Link
                      href={{
                        pathname: "/signaler",
                        params: { type: "venue", id: venue.data.id },
                      }}
                      asChild
                    >
                      <Button
                        accessibilityRole="link"
                        label="Signaler ou corriger une information"
                        variant="ghost"
                      />
                    </Link>
                  </View>
                </View>
              </View>
            ) : null}
          </AsyncState>
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}

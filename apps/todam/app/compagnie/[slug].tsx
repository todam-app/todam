import { useQuery } from "@tanstack/react-query";
import {
  CompanyResponseSchema,
  TodamApiError,
  type CreditRole,
} from "@todam/contracts";
import { Button, SectionTitle } from "@todam/design-system";
import { Link, useLoaderData, useLocalSearchParams } from "expo-router";
import Head from "expo-router/head";
import { createStaticLoader } from "expo-router/server";
import { Linking, Pressable, Text, View } from "react-native";

import { AsyncState } from "../../components/AsyncState";
import { CatalogSources } from "../../components/CatalogSources";
import { LegalFooter } from "../../components/LegalFooter";
import { PageScrollView } from "../../components/PageScrollView";
import { ProductionListItem } from "../../components/ProductionListItem";
import { api } from "../../lib/api";
import { API_URL, PUBLIC_WEB_URL } from "../../lib/config";
import { serializeJsonLd } from "../../lib/json-ld";
import { formatPerformance } from "../../lib/format";
import { getPublishedCatalogSlugs } from "../../lib/static-catalog-params";

const INITIAL_DATA_UPDATED_AT = Date.now();

const creditRoleLabels: Record<CreditRole, string> = {
  author: "Auteur·ice",
  director: "Mise en scène",
  performer: "Interprétation",
  choreographer: "Chorégraphie",
  composer: "Composition",
  musical_director: "Direction musicale",
  designer: "Conception",
  other: "Autre",
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getPublishedCatalogSlugs("companies");
  return slugs.map((slug) => ({ slug }));
}

export const loader = createStaticLoader(async (params) => {
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  if (
    !slug ||
    slug.startsWith("[") ||
    process.env.TODAM_DISABLE_ROUTE_LOADERS === "1"
  ) {
    return null;
  }
  const response = await fetch(
    `${API_URL}/v1/companies/${encodeURIComponent(slug ?? "")}`,
  );
  if (!response.ok) {
    throw new Error(`Impossible de précharger la compagnie ${slug ?? "inconnue"}.`);
  }
  return CompanyResponseSchema.parse(await response.json());
});

export default function CompanyPage() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug;
  const preloadedCompany = useLoaderData<typeof loader>();
  const company = useQuery({
    queryKey: ["company", slug],
    queryFn: () => api.getCompany(slug),
    enabled: Boolean(slug),
    ...(preloadedCompany
      ? {
          initialData: preloadedCompany,
          initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
        }
      : {}),
    staleTime: 60_000,
  });
  const canonicalUrl = `${PUBLIC_WEB_URL}/compagnie/${slug}`;
  const unavailable =
    company.error instanceof TodamApiError && company.error.problem.status === 404;
  const jsonLd = company.data
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": ["Organization", "PerformingGroup"],
            "@id": `${canonicalUrl}#company`,
            name: company.data.name,
            url: canonicalUrl,
            sameAs: company.data.officialUrl ?? undefined,
            address:
              company.data.locality && company.data.countryCode
                ? {
                    "@type": "PostalAddress",
                    addressLocality: company.data.locality,
                    addressCountry: company.data.countryCode,
                  }
                : undefined,
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
                name: company.data.name,
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
          {company.data
            ? `${company.data.name} — spectacles et tournée | Todam`
            : "Compagnie | Todam"}
        </title>
        {unavailable ? <meta content="noindex,follow" name="robots" /> : null}
        {company.data ? (
          <>
            <meta
              content={`Productions, dates de tournée et crédits de ${company.data.name}.`}
              name="description"
            />
            <meta
              content={`${company.data.name} — spectacles et tournée`}
              property="og:title"
            />
            <meta
              content={`Productions et prochaines dates de ${company.data.name}.`}
              property="og:description"
            />
          </>
        ) : null}
        <link href={canonicalUrl} rel="canonical" />
        <meta content={canonicalUrl} property="og:url" />
        {company.data ? (
          <>
            <meta
              content={`${company.data.name} — spectacles et tournée`}
              name="twitter:title"
            />
            <meta
              content={`Productions et prochaines dates de ${company.data.name}.`}
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
            empty={!company.isPending && (!company.data || unavailable)}
            emptyAction={
              <Link href="/decouvrir?type=companies" asChild>
                <Button
                  accessibilityRole="link"
                  label="Rechercher une compagnie"
                  variant="secondary"
                />
              </Link>
            }
            emptyMessage="Cette compagnie n’est pas encore publiée."
            error={company.isError && !unavailable}
            loading={company.isPending}
            onRetry={() => void company.refetch()}
          >
            {company.data ? (
              <View className="gap-10">
                <View className="gap-6 border-b border-line pb-8">
                  <View className="flex-row flex-wrap gap-2">
                    <Link href="/decouvrir" asChild>
                      <Pressable
                        accessibilityRole="link"
                        className="min-h-11 justify-center"
                      >
                        <Text className="text-sm font-semibold text-accent">
                          Découvrir
                        </Text>
                      </Pressable>
                    </Link>
                    <Text className="text-sm text-muted">/ Compagnies</Text>
                  </View>
                  <View className="max-w-3xl gap-3">
                    <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                      Compagnie
                    </Text>
                    <Text
                      aria-level={1}
                      accessibilityRole="header"
                      className="font-serif text-4xl font-semibold leading-[46px] text-ink md:text-5xl md:leading-[56px]"
                    >
                      {company.data.name}
                    </Text>
                    {company.data.shortDescription ? (
                      <Text className="text-lg leading-7 text-ink">
                        {company.data.shortDescription}
                      </Text>
                    ) : null}
                    {company.data.description ? (
                      <Text className="max-w-[72ch] text-base leading-7 text-muted">
                        {company.data.description}
                      </Text>
                    ) : null}
                    {company.data.officialUrl ? (
                      <Pressable
                        accessibilityRole="link"
                        className="min-h-11 self-start justify-center"
                        onPress={() => void Linking.openURL(company.data!.officialUrl!)}
                      >
                        <Text className="text-base font-semibold text-accent">
                          Site officiel de la compagnie ↗
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <View className="gap-4">
                  <SectionTitle>Productions actuelles</SectionTitle>
                  {company.data.currentProductions.length > 0 ? (
                    company.data.currentProductions.map((production) => (
                      <ProductionListItem key={production.id} production={production} />
                    ))
                  ) : (
                    <View className="todam-editorial-empty justify-center p-5">
                      <Text className="text-base leading-6 text-muted">
                        Aucune production actuelle n’est encore référencée.
                      </Text>
                    </View>
                  )}
                </View>

                {company.data.touringDates.length > 0 ? (
                  <View className="gap-4">
                    <SectionTitle>Dates de tournée</SectionTitle>
                    <View className="border-t border-line">
                      {company.data.touringDates.map((performance) => (
                        <View
                          className="gap-2 border-b border-line py-4 md:flex-row md:items-center md:justify-between"
                          key={performance.id}
                        >
                          <View className="gap-1">
                            <Text className="text-base font-semibold text-ink">
                              {formatPerformance(
                                performance.startsAt,
                                performance.venue.timezone,
                              )}
                            </Text>
                            <Link
                              href={`/production/${performance.production.slug}`}
                              asChild
                            >
                              <Pressable
                                accessibilityRole="link"
                                className="min-h-11 justify-center"
                              >
                                <Text className="font-serif text-lg font-semibold text-accent">
                                  {performance.production.title}
                                </Text>
                              </Pressable>
                            </Link>
                          </View>
                          <Link href={`/lieu/${performance.venue.slug}`} asChild>
                            <Pressable
                              accessibilityRole="link"
                              className="min-h-11 justify-center"
                            >
                              <Text className="text-base font-semibold text-accent">
                                {performance.venue.name}, {performance.venue.locality}
                              </Text>
                            </Pressable>
                          </Link>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {company.data.principalArtists.length > 0 ? (
                  <View className="gap-4">
                    <SectionTitle>Artistes et crédits principaux</SectionTitle>
                    <View className="flex-row flex-wrap gap-x-8 gap-y-4">
                      {company.data.principalArtists.map((artist) => (
                        <View className="min-w-52" key={artist.id}>
                          <Text className="text-base font-semibold text-ink">
                            {artist.name}
                          </Text>
                          <Text className="text-sm text-muted">
                            {artist.roles
                              .map((role) => creditRoleLabels[role])
                              .join(", ")}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {company.data.archives.length > 0 ? (
                  <View className="gap-4">
                    <SectionTitle>Archives</SectionTitle>
                    {company.data.archives.map((production) => (
                      <ProductionListItem key={production.id} production={production} />
                    ))}
                  </View>
                ) : null}

                <View className="gap-3 border-t border-line pt-8">
                  <SectionTitle>Sources et vérification</SectionTitle>
                  <CatalogSources
                    lastVerifiedAt={company.data.lastVerifiedAt}
                    sources={company.data.sources}
                  />
                </View>

                <View className="gap-3 border-t border-line pt-8">
                  <Text className="font-serif text-2xl font-semibold text-ink">
                    Cette fiche vous appartient ?
                  </Text>
                  <Text className="max-w-3xl text-base leading-6 text-muted">
                    Une compagnie vérifiée peut corriger son identité, ses productions,
                    ses crédits, ses dates et les métadonnées de droits de ses visuels.
                    Les changements restent en brouillon jusqu’à validation par Todam.
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <Link
                      href={{
                        pathname: "/revendiquer-compagnie",
                        params: { companyId: company.data.id },
                      }}
                      asChild
                    >
                      <Button accessibilityRole="link" label="Revendiquer la fiche" />
                    </Link>
                    <Link
                      href={{
                        pathname: "/signaler",
                        params: { type: "company", id: company.data.id },
                      }}
                      asChild
                    >
                      <Button
                        accessibilityRole="link"
                        label="Signaler une information"
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

import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import {
  SearchResponseSchema,
  type SearchResponse,
} from "@todam/contracts";
import {
  Button,
  SectionTitle,
  tokens,
} from "@todam/design-system";
import { Link, useLoaderData } from "expo-router";
import Head from "expo-router/head";
import { createStaticLoader } from "expo-router/server";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { AsyncState } from "../../components/AsyncState";
import { HomeDiscoveryCollection } from "../../components/HomeDiscoveryCollection";
import { LegalFooter } from "../../components/LegalFooter";
import { PageScrollView } from "../../components/PageScrollView";
import { ProductionDiscoveryCard } from "../../components/ProductionDiscoveryCard";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth-client";
import { API_URL, PUBLIC_WEB_URL } from "../../lib/config";
import { serializeJsonLd } from "../../lib/json-ld";
import { getHomeProgressPercentage } from "../../lib/home";
import { loadOptionalStaticData } from "../../lib/static-catalog-params";

const INITIAL_DATA_UPDATED_AT = Date.now();

function Page({ children }: { children: React.ReactNode }) {
  return (
    <PageScrollView
      contentContainerClassName="flex-grow"
      contentInsetAdjustmentBehavior="automatic"
    >
      {children}
      <LegalFooter />
    </PageScrollView>
  );
}

function LinkedSectionTitle({
  children,
  href,
}: {
  children: React.ReactNode;
  href: "/decouvrir" | "/profile";
}) {
  return (
    <View className="flex-row flex-wrap items-end justify-between gap-3">
      <Link href={href} asChild>
        <Pressable accessibilityRole="link" className="min-h-11 justify-center">
          <SectionTitle>{children}</SectionTitle>
        </Pressable>
      </Link>
      <Link href={href} asChild>
        <Pressable accessibilityRole="link" className="min-h-11 justify-center">
          <Text className="text-base font-semibold text-accent">Voir tout →</Text>
        </Pressable>
      </Link>
    </View>
  );
}

export const loader = createStaticLoader(() =>
  loadOptionalStaticData("Accueil", async () => {
    const catalogQuery = new URLSearchParams({
      q: "",
      type: "productions",
      temporal: "upcoming",
      sort: "date",
      limit: "4",
    });
    const catalogResponse = await fetch(
      `${API_URL}/v1/search?${catalogQuery.toString()}`,
    );
    if (!catalogResponse.ok) {
      throw new Error("Impossible de précharger le catalogue de l’accueil.");
    }
    const catalog = SearchResponseSchema.parse(await catalogResponse.json());
    return { catalog };
  }),
);

function MarketingHome({
  initialCatalog,
}: {
  initialCatalog: SearchResponse | null;
}) {
  const { width } = useWindowDimensions();
  const catalog = useQuery({
    queryKey: ["public-home-catalog"],
    queryFn: () =>
      api.searchCatalog({
        q: "",
        type: "productions",
        temporal: "upcoming",
        sort: "date",
        limit: 4,
      }),
    ...(initialCatalog
      ? {
          initialData: initialCatalog,
          initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
        }
      : {}),
    staleTime: 60_000,
  });
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${PUBLIC_WEB_URL}/#organization`,
        name: "Todam",
        url: PUBLIC_WEB_URL,
        logo: `${PUBLIC_WEB_URL}/brand/todam-logo-horizontal-ivory.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${PUBLIC_WEB_URL}/#website`,
        name: "Todam",
        url: PUBLIC_WEB_URL,
        inLanguage: "fr-FR",
        publisher: { "@id": `${PUBLIC_WEB_URL}/#organization` },
      },
    ],
  };

  return (
    <>
      <Head>
        <title>Todam — votre journal de spectacles</title>
        <meta
          content="Découvrez le théâtre, l’opéra et le ballet. Gardez un journal des spectacles vus, notez-les et partagez vos listes."
          name="description"
        />
        <link href={PUBLIC_WEB_URL} rel="canonical" />
        <meta content={PUBLIC_WEB_URL} property="og:url" />
        <script
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
          type="application/ld+json"
        />
      </Head>
      <Page>
        <View className="todam-page-before-footer mx-auto w-full max-w-content flex-1 gap-16 px-5 py-10 md:px-8 md:py-16">
          <View className="todam-public-hero gap-10 py-6 md:py-10 lg:py-14">
            <View className="max-w-3xl justify-center gap-6">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-accent">
                Votre mémoire du spectacle vivant
              </Text>
              <Text
                aria-level={1}
                accessibilityRole="header"
                className="font-serif text-[44px] font-semibold leading-[50px] text-ink md:text-[64px] md:leading-[68px]"
                style={width <= 350 ? { fontSize: 38, lineHeight: 42 } : undefined}
              >
                Les spectacles passent. Votre journal reste.
              </Text>
              <Text className="max-w-[65ch] text-lg leading-8 text-muted">
                Découvrez le théâtre, l’opéra et le ballet, gardez une trace de ce que
                vous avez vu, notez vos expériences et partagez vos listes.
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <Link href="/sign-up" asChild>
                  <Button
                    accessibilityRole="link"
                    label="Créer mon journal"
                    variant="featured"
                  />
                </Link>
                <Link href="/decouvrir" asChild>
                  <Button
                    accessibilityRole="link"
                    label="Découvrir les spectacles"
                    variant="secondary"
                  />
                </Link>
              </View>
            </View>
            <View
              accessibilityLabel="Sélection de spectacles à découvrir"
              className="todam-hero-collage"
            >
              {(catalog.data?.productions ?? []).slice(0, 2).map((production) => (
                <ProductionDiscoveryCard
                  key={production.id}
                  priority
                  production={production}
                />
              ))}
              {!catalog.isPending && (catalog.data?.productions.length ?? 0) === 0 ? (
                <View className="todam-editorial-empty min-h-72 justify-end p-5">
                  <Text className="font-serif text-2xl font-semibold text-ink">
                    Aucun spectacle mis en avant pour le moment.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="gap-5">
            <LinkedSectionTitle href="/decouvrir">
              À l’affiche
            </LinkedSectionTitle>
            <AsyncState
              empty={
                !catalog.isPending && (catalog.data?.productions.length ?? 0) === 0
              }
              emptyAction={
                <Link href="/decouvrir" asChild>
                  <Button
                    accessibilityRole="link"
                    label="Explorer le catalogue"
                    variant="secondary"
                  />
                </Link>
              }
              emptyMessage="Aucun spectacle à venir n’est encore publié dans la cohorte pilote."
              error={catalog.isError}
              loading={catalog.isPending}
              onRetry={() => void catalog.refetch()}
            >
              <HomeDiscoveryCollection
                emptyMessage="La cohorte pilote vérifiée apparaîtra ici au fil de sa publication."
                items={(catalog.data?.productions ?? []).map((production) => ({
                  production,
                  performance: null,
                }))}
              />
            </AsyncState>
          </View>

          <View className="gap-7">
            <SectionTitle>Un journal en trois gestes</SectionTitle>
            <View className="gap-0 border-y border-line md:flex-row">
              {[
                {
                  number: "01",
                  title: "Découvrez",
                  body: "Cherchez un spectacle, un lieu ou une compagnie.",
                  href: "/decouvrir" as const,
                },
                {
                  number: "02",
                  title: "Gardez une trace",
                  body: "Marquez-le vu, précisez la date et attribuez une note.",
                  href: "/sign-up" as const,
                },
                {
                  number: "03",
                  title: "Partagez",
                  body: "Publiez un journal pseudonyme, un avis ou une liste.",
                  href: "/sign-up" as const,
                },
              ].map((step, index) => (
                <Link href={step.href} key={step.number} asChild>
                  <Pressable
                    accessibilityRole="link"
                    className={`min-h-48 min-w-0 flex-none justify-center gap-3 px-5 py-6 md:flex-1 md:basis-0 md:px-6 ${
                      index > 0 ? "border-t border-line md:border-l md:border-t-0" : ""
                    }`}
                  >
                    <View className="w-full flex-row items-center gap-3">
                      <Text
                        className={`font-serif text-3xl font-semibold ${
                          index === 0
                            ? "text-coral-text"
                            : index === 1
                              ? "text-lilac-text"
                              : "text-aqua-text"
                        }`}
                      >
                        {step.number}
                      </Text>
                      <Ionicons
                        accessibilityElementsHidden
                        color={
                          index === 0
                            ? tokens.color.coralText
                            : index === 1
                              ? tokens.color.lilacText
                              : tokens.color.aquaText
                        }
                        importantForAccessibility="no"
                        name={
                          index === 0
                            ? "search-outline"
                            : index === 1
                              ? "pencil-outline"
                              : "share-outline"
                        }
                        size={17}
                      />
                    </View>
                    <Text className="w-full font-serif text-2xl font-semibold text-ink">
                      {step.title}
                    </Text>
                    <Text className="w-full max-w-full text-base leading-6 text-muted">
                      {step.body}
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>

          <View className="gap-6 bg-paper p-6 md:p-8">
            <SectionTitle eyebrow="Catalogue responsable">
              Des informations reliées à leurs sources
            </SectionTitle>
            <Text className="max-w-[72ch] text-base leading-7 text-muted">
              Todam distingue les métadonnées factuelles, les descriptions et les
              visuels. Une affiche n’est publiée que lorsque ses droits d’affichage sont
              confirmés ; sinon, un placeholder neutre l’indique clairement.
            </Text>
            <Link href="/les-coulisses" asChild>
              <Pressable
                accessibilityRole="link"
                className="min-h-11 self-start justify-center"
              >
                <Text className="text-base font-semibold text-accent">
                  Découvrir les coulisses de Todam →
                </Text>
              </Pressable>
            </Link>
          </View>

          <View className="gap-7 border-t border-line pt-12">
            <SectionTitle eyebrow="Professionnels">
              Construisons le premier pilote ensemble
            </SectionTitle>
            <View className="gap-5 md:flex-row">
              <Link href="/pour-les-salles" asChild>
                <Pressable
                  accessibilityRole="link"
                  className="todam-interactive-card min-h-48 flex-1 justify-center gap-3 rounded-panel border border-line bg-paper p-6 shadow-soft"
                >
                  <Text className="font-serif text-2xl font-semibold text-ink">
                    Vous programmez un lieu{"\u00A0"}?
                  </Text>
                  <Text className="text-base leading-6 text-muted">
                    Vérifiez votre programme et testez le parcours spectateur.
                  </Text>
                  <Text className="text-base font-semibold text-accent">
                    Voir le pilote pour les salles →
                  </Text>
                </Pressable>
              </Link>
              <Link href="/pour-les-compagnies" asChild>
                <Pressable
                  accessibilityRole="link"
                  className="todam-interactive-card min-h-48 flex-1 justify-center gap-3 rounded-panel border border-line bg-paper p-6 shadow-soft"
                >
                  <Text className="font-serif text-2xl font-semibold text-ink">
                    Vous portez un spectacle{"\u00A0"}?
                  </Text>
                  <Text className="text-base leading-6 text-muted">
                    Revendiquez votre fiche et proposez des informations vérifiées.
                  </Text>
                  <Text className="text-base font-semibold text-accent">
                    Voir le parcours des compagnies →
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </Page>
    </>
  );
}

function ConnectedHome() {
  const home = useQuery({
    queryKey: ["home"],
    queryFn: () => api.getHome(),
  });

  return (
    <Page>
      <View className="todam-page-before-footer mx-auto w-full max-w-content flex-1 px-5 py-8 md:px-8 md:py-12">
        <AsyncState
          empty={!home.data}
          emptyAction={
            <Link href="/decouvrir" asChild>
              <Button accessibilityRole="link" label="Découvrir le catalogue" />
            </Link>
          }
          emptyMessage="Votre accueil est prêt, mais son contenu est encore vide."
          error={home.isError}
          loading={home.isPending}
          onRetry={() => void home.refetch()}
        >
          {home.data ? (
            <View className="gap-11">
              <View className="todam-connected-hero gap-8 p-6 md:p-9">
                <View className="justify-center gap-5">
                  <Text className="text-xs font-bold uppercase tracking-[2px] text-accent">
                    {home.data.profile.pseudonym}
                  </Text>
                  <Text
                    aria-level={1}
                    accessibilityRole="header"
                    className="font-serif text-4xl font-semibold leading-[44px] text-ink md:text-5xl md:leading-[56px]"
                  >
                    {home.data.homeCity
                      ? `À l’affiche près de ${home.data.homeCity.label}`
                      : "À l’affiche en ce moment"}
                  </Text>
                  <Text className="max-w-2xl text-base leading-6 text-muted">
                    Les prochaines dates publiées et les nouveaux spectacles à garder
                    dans votre journal.
                  </Text>
                  <View className="self-start">
                    <Link href="/ajouter-un-spectacle" asChild>
                      <Button
                        accessibilityRole="link"
                        label="Ajouter un spectacle"
                        variant="featured"
                      />
                    </Link>
                  </View>
                </View>
                <HomeDiscoveryCollection
                  emptyMessage="Aucune représentation future n’est encore référencée."
                  items={(home.data.nearby.length > 0
                    ? home.data.nearby
                    : home.data.nationalUpcoming
                  ).slice(0, 2)}
                  layout="grid"
                />
              </View>

              {!home.data.progress.completed ? (
                <View className="gap-2 rounded-panel border border-line bg-paper px-4 py-3">
                  <View className="flex-row flex-wrap items-center justify-between gap-3">
                    <Text className="text-sm font-semibold text-ink">
                      Journal en cours · {home.data.progress.current}/
                      {home.data.progress.target}
                    </Text>
                    <Link href="/decouvrir" asChild>
                      <Pressable
                        accessibilityRole="link"
                        className="min-h-11 justify-center"
                      >
                        <Text className="text-sm font-semibold text-accent">
                          Continuer →
                        </Text>
                      </Pressable>
                    </Link>
                  </View>
                  <View className="h-1.5 overflow-hidden rounded-full bg-line">
                    <View
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${getHomeProgressPercentage(
                          home.data.progress.current,
                          home.data.progress.target,
                        )}%`,
                      }}
                    />
                  </View>
                  {!home.data.homeCity ? (
                    <Link href="/parametres-compte" asChild>
                      <Pressable
                        accessibilityRole="link"
                        className="min-h-11 self-start justify-center"
                      >
                        <Text className="text-sm font-semibold text-accent">
                          Choisir une ville pour personnaliser l’affiche →
                        </Text>
                      </Pressable>
                    </Link>
                  ) : null}
                </View>
              ) : null}

              <View className="gap-5">
                <LinkedSectionTitle href="/decouvrir">
                  Nouveautés dans Todam
                </LinkedSectionTitle>
                <HomeDiscoveryCollection
                  emptyMessage="Les prochains ajouts au catalogue apparaîtront ici."
                  items={home.data.recentlyAdded}
                />
              </View>

              <View className="flex-row flex-wrap gap-3 border-t border-line pt-8">
                <Link href="/journal" asChild>
                  <Pressable
                    accessibilityRole="link"
                    className="todam-interactive-card min-h-24 min-w-56 flex-1 justify-center rounded-panel border border-line bg-paper px-5 shadow-soft"
                  >
                    <Text className="font-serif text-xl font-semibold text-ink">
                      Ouvrir mes spectacles
                    </Text>
                    <Text className="mt-1 text-sm text-accent">
                      Filtrer, dater et modifier mes entrées →
                    </Text>
                  </Pressable>
                </Link>
                <Link href="/journal/listes" asChild>
                  <Pressable
                    accessibilityRole="link"
                    className="todam-interactive-card min-h-24 min-w-56 flex-1 justify-center rounded-panel border border-line bg-paper px-5 shadow-soft"
                  >
                    <Text className="font-serif text-xl font-semibold text-ink">
                      Gérer mes listes
                    </Text>
                    <Text className="mt-1 text-sm text-accent">
                      Créer, réordonner et partager →
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          ) : null}
        </AsyncState>
      </View>
    </Page>
  );
}

export default function HomeScreen() {
  const preloaded = useLoaderData<typeof loader>();
  const session = authClient.useSession();
  return session.data ? (
    <ConnectedHome />
  ) : (
    <MarketingHome initialCatalog={preloaded?.catalog ?? null} />
  );
}

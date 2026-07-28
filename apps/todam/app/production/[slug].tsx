import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProductionResponseSchema,
  TodamApiError,
  type Performance,
  type ProductionDescription,
  type ViewerProductionState,
} from "@todam/contracts";
import { Button, SectionTitle, TextField, tokens } from "@todam/design-system";
import { Link, useLoaderData, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { createStaticLoader } from "expo-router/server";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

import { AccessibleChoiceGroup } from "../../components/AccessibleChoiceGroup";
import { AsyncState } from "../../components/AsyncState";
import { CatalogSources } from "../../components/CatalogSources";
import { LegalFooter } from "../../components/LegalFooter";
import { PageScrollView } from "../../components/PageScrollView";
import { ProductionActions } from "../../components/ProductionActions";
import { ProductionListItem } from "../../components/ProductionListItem";
import { ProductionPoster } from "../../components/ProductionPoster";
import { RatingPicker } from "../../components/RatingPicker";
import { SpoilerReviewText } from "../../components/SpoilerReviewText";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth-client";
import { API_URL, PUBLIC_WEB_URL } from "../../lib/config";
import { isIsoCalendarDate, isPastOrTodayCalendarDate } from "../../lib/dates";
import { formatPerformance } from "../../lib/format";
import { serializeJsonLd } from "../../lib/json-ld";
import { getPublishedCatalogSlugs } from "../../lib/static-catalog-params";

const INITIAL_DATA_UPDATED_AT = Date.now();

const disciplineLabels = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
} as const;
const audienceLabels = {
  general: "Tout public",
  family: "En famille",
  children: "Jeune public",
} as const;
const creditLabels = {
  author: "Texte",
  director: "Mise en scène",
  performer: "Interprétation",
  choreographer: "Chorégraphie",
  composer: "Composition",
  musical_director: "Direction musicale",
  designer: "Création",
  other: "Crédit",
} as const;
const languageLabels: Record<string, string> = {
  fr: "Français",
  "fr-FR": "Français",
  en: "Anglais",
  "en-GB": "Anglais",
  "en-US": "Anglais",
};
const performanceStatusLabels: Record<Performance["status"], string> = {
  scheduled: "Programmée",
  completed: "Terminée",
  cancelled: "Annulée",
  postponed: "Reportée",
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getPublishedCatalogSlugs("productions");
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
    `${API_URL}/v1/productions/${encodeURIComponent(slug ?? "")}`,
  );
  if (!response.ok) {
    throw new Error(`Impossible de précharger le spectacle ${slug ?? "inconnu"}.`);
  }
  return ProductionResponseSchema.parse(await response.json());
});

function languageLabel(value: string): string {
  if (languageLabels[value]) return languageLabels[value];
  try {
    return (
      new Intl.DisplayNames(["fr"], { type: "language" }).of(value) ??
      "Langue non précisée"
    );
  } catch {
    return "Langue non précisée";
  }
}

const descriptionRightsLabels = {
  contractual_display: "Texte publié par accord contractuel",
  factual_metadata_only: "Métadonnées factuelles uniquement",
  hotlink_only: "Consultation sur la source uniquement",
  open_license: "Texte sous licence ouverte",
  permission_granted: "Texte publié avec autorisation",
  review_required: "Droits en cours de vérification",
  todam_original: "Résumé original Todam",
} as const;

function DescriptionProvenance({
  description,
}: {
  description: ProductionDescription;
}) {
  const verifiedAt = description.lastVerifiedAt ?? description.retrievedAt;
  const detail = [
    descriptionRightsLabels[description.rightsStatus],
    description.license,
    verifiedAt
      ? `vérifié le ${new Intl.DateTimeFormat("fr-FR").format(new Date(verifiedAt))}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
      <Text className="text-xs leading-5 text-muted">{detail}</Text>
      {description.sourceUrl ? (
        <Pressable
          accessibilityRole="link"
          className="min-h-11 justify-center"
          onPress={() => void Linking.openURL(description.sourceUrl!)}
        >
          <Text className="text-xs font-semibold text-accent">
            {description.sourceTitle ?? "Source"} ↗
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function parameter(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function Schedule({
  performances,
  title,
}: {
  performances: Performance[];
  title: string;
}) {
  if (performances.length === 0) {
    return (
      <Text className="border-l-2 border-accent py-1 pl-4 text-base leading-6 text-muted">
        Aucune représentation {title.toLocaleLowerCase("fr")} n’est publiée.
      </Text>
    );
  }
  return (
    <View className="border-t border-line">
      {performances.map((performance) => (
        <View
          className="gap-2 border-b border-line py-4 md:flex-row md:items-center md:justify-between"
          key={performance.id}
        >
          <View className="gap-1">
            <Text className="text-base font-semibold text-ink">
              {formatPerformance(performance.startsAt, performance.venue.timezone)}
            </Text>
            {performance.status !== "scheduled" ? (
              <Text
                className={`text-sm font-semibold ${
                  performance.status === "cancelled" ? "text-error" : "text-muted"
                }`}
              >
                {performanceStatusLabels[performance.status]}
              </Text>
            ) : null}
            <Link href={`/lieu/${performance.venue.slug}`} asChild>
              <Pressable accessibilityRole="link" className="min-h-11 justify-center">
                <Text className="text-base font-semibold text-accent">
                  {performance.venue.name} · {performance.venue.locality}
                </Text>
              </Pressable>
            </Link>
          </View>
          {performance.officialUrl ? (
            <Pressable
              accessibilityRole="link"
              className="min-h-11 justify-center"
              onPress={() => void Linking.openURL(performance.officialUrl!)}
            >
              <Text className="text-base font-semibold text-accent">Billetterie ↗</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function ProductionScreen() {
  const params = useLocalSearchParams<{
    resumeAction?: string;
    resumeRating?: string;
    slug: string;
  }>();
  const slug = parameter(params.slug) ?? "";
  const preloadedProduction = useLoaderData<typeof loader>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showSeenDetails, setShowSeenDetails] = useState(false);
  const [seenDate, setSeenDate] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSpoiler, setReviewSpoiler] = useState(false);
  const [reviewVisibility, setReviewVisibility] = useState<"public" | "private">(
    "private",
  );
  const [confirmingReviewDelete, setConfirmingReviewDelete] = useState(false);
  const [showLists, setShowLists] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListVisibility, setNewListVisibility] = useState<"public" | "private">(
    "private",
  );
  const resumed = useRef(false);
  const hydratedReviewId = useRef<string | null>(null);

  const production = useQuery({
    queryKey: ["production", slug],
    queryFn: () => api.getProduction(slug),
    enabled: Boolean(slug),
    ...(preloadedProduction
      ? {
          initialData: preloadedProduction,
          initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
        }
      : {}),
    staleTime: 60_000,
  });
  const productionId = production.data?.id;
  const stateKey = ["production-state", productionId] as const;
  const viewerState = useQuery({
    queryKey: stateKey,
    queryFn: () => api.getProductionState(productionId ?? ""),
    enabled: Boolean(productionId && session.data),
  });
  const lists = useQuery({
    queryKey: ["my-lists"],
    queryFn: () => api.getLists(),
    enabled: Boolean(session.data && showLists),
  });
  const diary = useQuery({
    queryKey: ["production-diary", productionId],
    queryFn: () => api.getProductionDiary(productionId ?? ""),
    enabled: Boolean(session.data && productionId && showSeenDetails),
  });

  function updateState(next: ViewerProductionState) {
    queryClient.setQueryData(stateKey, next);
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["home"] });
    void queryClient.invalidateQueries({ queryKey: ["my-journal"] });
  }

  const seenMutation = useMutation({
    mutationFn: () =>
      api.markSeen({
        productionId: productionId ?? "",
        performanceId: null,
        attendedOn: null,
      }),
    onSuccess: (state) => {
      updateState(state);
      setFeedback(
        "Ajouté à vos spectacles vus. Vous pouvez préciser la date maintenant.",
      );
      setShowSeenDetails(true);
      void diary.refetch();
    },
    onError: () => setFeedback("L’ajout à vos spectacles a échoué. Réessayez."),
  });
  const ratingMutation = useMutation({
    mutationFn: (value: number) => api.setRating(productionId ?? "", value),
    onSuccess: (state) => {
      updateState(state);
      setFeedback(`Note enregistrée : ${state.rating} sur 10.`);
      void production.refetch();
    },
    onError: () => setFeedback("La note n’a pas été enregistrée."),
  });
  const deleteRatingMutation = useMutation({
    mutationFn: () => api.deleteRating(productionId ?? ""),
    onSuccess: (state) => {
      updateState(state);
      setFeedback("Votre note a été supprimée.");
      void production.refetch();
    },
    onError: () => setFeedback("Votre note n’a pas pu être supprimée."),
  });
  const watchlistMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled
        ? api.addToWatchlist(productionId ?? "")
        : api.removeFromWatchlist(productionId ?? ""),
    onSuccess: (state) => {
      updateState(state);
      setFeedback(state.watchlisted ? "Ajouté à « À voir »." : "Retiré de « À voir ».");
    },
    onError: () => setFeedback("La liste « À voir » n’a pas été mise à jour."),
  });
  const updateDiaryMutation = useMutation({
    mutationFn: async ({
      performanceId,
      attendedOn,
    }: {
      performanceId: string | null;
      attendedOn: string | null;
    }) => {
      const sessions = await api.getProductionDiary(productionId ?? "");
      const entryId = sessions[0]?.id;
      if (!entryId) throw new Error("Spectacle vu introuvable.");
      await api.updateDiaryEntry(entryId, { performanceId, attendedOn });
    },
    onSuccess: () => {
      setShowSeenDetails(false);
      setFeedback("La date du spectacle vu a été enregistrée.");
      void queryClient.invalidateQueries({ queryKey: ["my-journal"] });
    },
    onError: () => setFeedback("La date n’a pas été enregistrée."),
  });
  const reviewMutation = useMutation({
    mutationFn: async () => {
      await api.upsertReview(productionId ?? "", {
        body: reviewBody,
        containsSpoiler: reviewSpoiler,
        visibility: reviewVisibility,
      });
      return api.getProductionState(productionId ?? "");
    },
    onSuccess: (state) => {
      updateState(state);
      setFeedback(
        state.review?.status === "published"
          ? state.review.visibility === "public"
            ? "Votre avis public a été enregistré."
            : "Votre avis privé a été enregistré dans votre profil."
          : "Votre modification a été enregistrée. L’avis reste masqué jusqu’à une nouvelle décision de modération.",
      );
      void production.refetch();
      void queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
    onError: () =>
      setFeedback("L’avis n’a pas été enregistré. Le spectacle doit être vu."),
  });
  const deleteReviewMutation = useMutation({
    mutationFn: async () => {
      await api.deleteReview(productionId ?? "");
      return api.getProductionState(productionId ?? "");
    },
    onSuccess: (state) => {
      hydratedReviewId.current = null;
      setConfirmingReviewDelete(false);
      setReviewBody("");
      setReviewSpoiler(false);
      setReviewVisibility("private");
      updateState(state);
      setFeedback("Votre avis a été supprimé.");
      void production.refetch();
      void queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
    onError: () => setFeedback("Votre avis n’a pas pu être supprimé."),
  });
  const createListMutation = useMutation({
    mutationFn: () =>
      api.createList({
        name: newListName,
        description: null,
        visibility: newListVisibility,
        productionId: productionId ?? "",
      }),
    onSuccess: (created) => {
      setNewListName("");
      setNewListVisibility("private");
      queryClient.setQueryData(["my-lists"], [...(lists.data ?? []), created]);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowLists(false);
      setFeedback(`Spectacle ajouté à la liste « ${created.name} ».`);
    },
    onError: () =>
      setFeedback("La liste et son premier spectacle n’ont pas pu être créés."),
  });
  const addListMutation = useMutation({
    mutationFn: (listId: string) =>
      api.addListItem(listId, { productionId: productionId ?? "" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      void queryClient.invalidateQueries({ queryKey: ["my-list"] });
      setShowLists(false);
      setFeedback("Spectacle ajouté à la liste.");
    },
    onError: () => setFeedback("Le spectacle n’a pas été ajouté à la liste."),
  });

  function requireAccount(action: string, rating?: number): boolean {
    if (session.data) return true;
    router.push({
      pathname: "/sign-up",
      params: {
        action,
        ...(rating ? { rating: String(rating) } : {}),
        returnTo: `/production/${slug}`,
      },
    });
    return false;
  }

  /* eslint-disable react-hooks/set-state-in-effect -- Account-return actions and loaded reviews intentionally hydrate local UI state. */
  useEffect(() => {
    const action = parameter(params.resumeAction);
    if (
      resumed.current ||
      !action ||
      !session.data ||
      !productionId ||
      viewerState.isPending
    ) {
      return;
    }
    resumed.current = true;
    if (action === "watchlist") watchlistMutation.mutate(true);
    if (action === "seen") seenMutation.mutate();
    if (action === "list") setShowLists(true);
    if (action === "rating") {
      const value = Number.parseInt(parameter(params.resumeRating) ?? "", 10);
      if (value >= 1 && value <= 10) ratingMutation.mutate(value);
    }
    router.replace(`/production/${slug}`);
  }, [
    params.resumeAction,
    params.resumeRating,
    productionId,
    ratingMutation,
    router,
    seenMutation,
    session.data,
    slug,
    viewerState.isPending,
    watchlistMutation,
  ]);

  useEffect(() => {
    const review = viewerState.data?.review;
    if (!review || hydratedReviewId.current === review.id) return;
    hydratedReviewId.current = review.id;
    setReviewBody(review.body);
    setReviewSpoiler(review.containsSpoiler);
    setReviewVisibility(review.visibility);
  }, [viewerState.data?.review]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const now = production.dataUpdatedAt || INITIAL_DATA_UPDATED_AT;
  const futurePerformances =
    production.data?.performances.filter(
      (performance) =>
        new Date(performance.startsAt).getTime() >= now &&
        performance.status !== "completed",
    ) ?? [];
  const pastPerformances =
    production.data?.performances.filter(
      (performance) =>
        new Date(performance.startsAt).getTime() < now ||
        performance.status === "completed",
    ) ?? [];
  const nextScheduledPerformance = futurePerformances.find(
    (performance) => performance.status === "scheduled",
  );
  const structuredPerformance =
    nextScheduledPerformance ??
    [...pastPerformances]
      .reverse()
      .find((performance) => performance.status !== "cancelled");
  const shortDescription = production.data?.descriptions.find(
    (description) => description.kind === "short" && description.locale === "fr",
  );
  const fullDescription = production.data?.descriptions.find(
    (description) => description.kind === "full" && description.locale === "fr",
  );
  const canonicalUrl = `${PUBLIC_WEB_URL}/production/${slug}`;
  const unavailable =
    production.error instanceof TodamApiError &&
    production.error.problem.status === 404;
  const jsonLd = production.data
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "TheaterEvent",
            name: production.data.title,
            description: shortDescription?.body ?? fullDescription?.body,
            url: canonicalUrl,
            startDate: structuredPerformance?.startsAt,
            endDate: structuredPerformance?.endsAt ?? undefined,
            eventStatus:
              structuredPerformance?.status === "cancelled"
                ? "https://schema.org/EventCancelled"
                : structuredPerformance?.status === "postponed"
                  ? "https://schema.org/EventPostponed"
                  : "https://schema.org/EventScheduled",
            location: structuredPerformance
              ? {
                  "@type": "Place",
                  name: structuredPerformance.venue.name,
                  url: `${PUBLIC_WEB_URL}/lieu/${structuredPerformance.venue.slug}`,
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: structuredPerformance.venue.locality,
                    addressCountry: structuredPerformance.venue.countryCode,
                  },
                }
              : undefined,
            organizer: production.data.company
              ? {
                  "@type": "PerformingGroup",
                  name: production.data.company.name,
                  url: `${PUBLIC_WEB_URL}/compagnie/${production.data.company.slug}`,
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
                name: production.data.title,
                item: canonicalUrl,
              },
            ],
          },
        ],
      }
    : null;

  async function share() {
    if (Platform.OS === "web" && navigator.share) {
      try {
        await navigator.share({
          ...(production.data?.title ? { title: production.data.title } : {}),
          text: `Découvrez ${production.data?.title} sur Todam.`,
          url: canonicalUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await Linking.openURL(
      `mailto:?subject=${encodeURIComponent(
        production.data?.title ?? "Spectacle Todam",
      )}&body=${encodeURIComponent(canonicalUrl)}`,
    );
  }

  return (
    <>
      <Head>
        <title>
          {production.data
            ? `${production.data.title} — spectacle | Todam`
            : "Spectacle | Todam"}
        </title>
        {unavailable ? <meta content="noindex,follow" name="robots" /> : null}
        <link href={canonicalUrl} rel="canonical" />
        <meta
          content={
            shortDescription?.body ??
            `Dates, crédits et avis pour ${production.data?.title ?? "ce spectacle"}.`
          }
          name="description"
        />
        <meta
          content={production.data?.title ?? "Spectacle Todam"}
          property="og:title"
        />
        <meta
          content={
            shortDescription?.body ??
            `Dates, crédits et avis pour ${production.data?.title ?? "ce spectacle"}.`
          }
          property="og:description"
        />
        <meta content={canonicalUrl} property="og:url" />
        <meta content="website" property="og:type" />
        <meta
          content={production.data?.title ?? "Spectacle Todam"}
          name="twitter:title"
        />
        <meta
          content={
            shortDescription?.body ??
            `Dates, crédits et avis pour ${production.data?.title ?? "ce spectacle"}.`
          }
          name="twitter:description"
        />
        {production.data?.posters[0] ? (
          <>
            <meta content={production.data.posters[0].url} property="og:image" />
            <meta content={production.data.posters[0].url} name="twitter:image" />
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
            empty={!production.isPending && (!production.data || unavailable)}
            emptyAction={
              <Button
                label="Découvrir les spectacles"
                onPress={() => router.push("/decouvrir")}
                variant="secondary"
              />
            }
            emptyMessage="Ce spectacle est introuvable."
            error={production.isError && !unavailable}
            loading={production.isPending}
            onRetry={() => void production.refetch()}
          >
            {production.data ? (
              <View className="gap-10">
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
                  <Text className="text-sm text-muted">
                    / {disciplineLabels[production.data.discipline]} /{" "}
                    {production.data.title}
                  </Text>
                </View>

                <View className="gap-7 md:flex-row md:items-start">
                  <View className="w-[160px] max-w-[240px] md:w-full">
                    <ProductionPoster
                      discipline={production.data.discipline}
                      poster={production.data.posters[0] ?? null}
                      priority
                      title={production.data.title}
                    />
                    {production.data.posters[0] ? (
                      <View className="mt-2 gap-1">
                        <Text className="text-xs leading-5 text-muted">
                          {production.data.posters[0].credit}
                        </Text>
                        <Pressable
                          accessibilityRole="link"
                          className="min-h-11 justify-center"
                          onPress={() =>
                            void Linking.openURL(production.data!.posters[0]!.sourceUrl)
                          }
                        >
                          <Text className="text-xs font-semibold text-accent">
                            Source et droits du visuel ↗
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text className="mt-3 text-xs leading-5 text-muted">
                        {production.data.imagePolicyMessage}
                      </Text>
                    )}
                  </View>

                  <View className="min-w-0 flex-1 gap-5">
                    <View className="gap-3">
                      <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                        {disciplineLabels[production.data.discipline]} ·{" "}
                        {audienceLabels[production.data.audience]}
                        {production.data.minimumAge !== null
                          ? ` · Dès ${production.data.minimumAge} ans`
                          : ""}
                      </Text>
                      <Text
                        aria-level={1}
                        accessibilityRole="header"
                        className="font-serif text-4xl font-semibold leading-[46px] text-ink md:text-5xl md:leading-[56px]"
                      >
                        {production.data.title}
                      </Text>
                      {production.data.company ? (
                        <Link
                          href={`/compagnie/${production.data.company.slug}`}
                          asChild
                        >
                          <Pressable
                            accessibilityRole="link"
                            className="min-h-11 self-start justify-center"
                          >
                            <Text className="text-lg font-semibold text-accent">
                              {production.data.company.name}
                            </Text>
                          </Pressable>
                        </Link>
                      ) : null}
                      {shortDescription ? (
                        <View className="gap-1">
                          <Text className="max-w-[72ch] text-lg leading-7 text-ink">
                            {shortDescription.body}
                          </Text>
                          <DescriptionProvenance description={shortDescription} />
                        </View>
                      ) : null}
                      <View className="flex-row flex-wrap gap-x-5 gap-y-1">
                        {production.data.durationMinutes ? (
                          <Text className="text-sm text-muted">
                            Durée : {production.data.durationMinutes} min
                          </Text>
                        ) : null}
                        {production.data.language ? (
                          <Text className="text-sm text-muted">
                            Langue : {languageLabel(production.data.language)}
                          </Text>
                        ) : null}
                        {production.data.minimumAge !== null ? (
                          <Text className="text-sm text-muted">
                            Public conseillé : dès {production.data.minimumAge} ans
                          </Text>
                        ) : null}
                      </View>
                      {nextScheduledPerformance ? (
                        <View className="gap-2 border-l-2 border-accent bg-paper px-4 py-3">
                          <Text className="text-xs font-bold uppercase tracking-widest text-muted">
                            Prochaine représentation
                          </Text>
                          <Text className="text-base font-semibold text-ink">
                            {formatPerformance(
                              nextScheduledPerformance.startsAt,
                              nextScheduledPerformance.venue.timezone,
                            )}
                          </Text>
                          <Link
                            href={`/lieu/${nextScheduledPerformance.venue.slug}`}
                            asChild
                          >
                            <Pressable
                              accessibilityRole="link"
                              className="min-h-11 justify-center"
                            >
                              <Text className="text-base font-semibold text-accent">
                                {nextScheduledPerformance.venue.name} ·{" "}
                                {nextScheduledPerformance.venue.locality}
                              </Text>
                            </Pressable>
                          </Link>
                          {nextScheduledPerformance.officialUrl ? (
                            <Pressable
                              accessibilityRole="link"
                              className="min-h-11 self-start justify-center"
                              onPress={() =>
                                void Linking.openURL(
                                  nextScheduledPerformance.officialUrl!,
                                )
                              }
                            >
                              <Text className="text-base font-semibold text-accent">
                                Billetterie officielle ↗
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : (
                        <Text className="border-l-2 border-line pl-4 text-sm leading-5 text-muted">
                          Aucune prochaine représentation n’est confirmée.
                        </Text>
                      )}
                    </View>

                    <View className="gap-4 border-t border-line pt-5">
                      <ProductionActions
                        onSeenPress={() => {
                          if (requireAccount("seen")) seenMutation.mutate();
                        }}
                        onWatchlistPress={() => {
                          if (requireAccount("watchlist")) {
                            watchlistMutation.mutate(!viewerState.data?.watchlisted);
                          }
                        }}
                        seen={viewerState.data?.seen ?? false}
                        seenLoading={
                          seenMutation.isPending ||
                          Boolean(session.data && viewerState.isPending)
                        }
                        watchlisted={viewerState.data?.watchlisted ?? false}
                        watchlistLoading={
                          watchlistMutation.isPending ||
                          Boolean(session.data && viewerState.isPending)
                        }
                      />
                      <View className="flex-row flex-wrap gap-2">
                        <Button
                          label="Ajouter à une liste"
                          onPress={() => {
                            if (requireAccount("list")) setShowLists((value) => !value);
                          }}
                          variant="secondary"
                        />
                        <Button
                          label="Partager"
                          onPress={() => void share()}
                          variant="ghost"
                        />
                        {production.data.officialUrl ? (
                          <Button
                            label="Page officielle"
                            onPress={() =>
                              void Linking.openURL(production.data!.officialUrl!)
                            }
                            variant="ghost"
                          />
                        ) : null}
                      </View>
                      {feedback ? (
                        <Text
                          accessibilityLiveRegion="polite"
                          className="border-l-2 border-accent py-1 pl-3 text-sm text-ink"
                        >
                          {feedback}
                        </Text>
                      ) : null}
                    </View>

                    {showSeenDetails ? (
                      <View className="gap-4 border border-control bg-paper p-4">
                        <Text className="text-base font-semibold text-ink">
                          Préciser la représentation — facultatif
                        </Text>
                        <View className="gap-2">
                          {pastPerformances
                            .filter(
                              (performance) =>
                                performance.status !== "cancelled" &&
                                performance.status !== "postponed",
                            )
                            .map((performance) => (
                              <Button
                                key={performance.id}
                                label={formatPerformance(
                                  performance.startsAt,
                                  performance.venue.timezone,
                                )}
                                onPress={() =>
                                  updateDiaryMutation.mutate({
                                    performanceId: performance.id,
                                    attendedOn: null,
                                  })
                                }
                                variant="secondary"
                              />
                            ))}
                        </View>
                        <TextField
                          autoComplete="off"
                          error={
                            seenDate && !isIsoCalendarDate(seenDate)
                              ? "Saisissez une date valide au format AAAA-MM-JJ."
                              : seenDate && !isPastOrTodayCalendarDate(seenDate)
                                ? "La date vue ne peut pas être dans le futur."
                                : undefined
                          }
                          label="Ou une date libre"
                          onChangeText={setSeenDate}
                          placeholder="AAAA-MM-JJ"
                          value={seenDate}
                          webName={`production-${production.data.id}-attended-on`}
                        />
                        <View className="flex-row flex-wrap gap-2">
                          <Button
                            disabled={!isPastOrTodayCalendarDate(seenDate)}
                            label="Enregistrer la date"
                            loading={updateDiaryMutation.isPending}
                            onPress={() =>
                              updateDiaryMutation.mutate({
                                performanceId: null,
                                attendedOn: seenDate,
                              })
                            }
                          />
                          <Button
                            label="Date inconnue"
                            onPress={() => setShowSeenDetails(false)}
                            variant="ghost"
                          />
                        </View>
                      </View>
                    ) : null}

                    {showLists ? (
                      <View className="gap-3 border border-control bg-paper p-4">
                        <Text className="text-base font-semibold text-ink">
                          Choisir une liste
                        </Text>
                        {lists.isPending ? (
                          <View
                            accessibilityLiveRegion="polite"
                            className="flex-row items-center gap-3 py-2"
                          >
                            <ActivityIndicator color={tokens.color.accent} />
                            <Text className="text-sm text-muted">
                              Chargement de vos listes…
                            </Text>
                          </View>
                        ) : null}
                        {lists.isError ? (
                          <View
                            accessibilityLiveRegion="assertive"
                            className="gap-3 border-l-2 border-danger py-1 pl-3"
                          >
                            <Text className="text-sm text-danger">
                              Vos listes n’ont pas pu être chargées.
                            </Text>
                            <Button
                              label="Réessayer"
                              onPress={() => void lists.refetch()}
                              variant="secondary"
                            />
                          </View>
                        ) : null}
                        {lists.isSuccess && lists.data.length === 0 ? (
                          <Text className="text-sm leading-5 text-muted">
                            Vous n’avez pas encore de liste personnalisée. Créez la
                            première ci-dessous.
                          </Text>
                        ) : null}
                        {lists.data?.map((list) => (
                          <Button
                            key={list.id}
                            label={`${list.name} (${list.itemCount})`}
                            loading={addListMutation.isPending}
                            onPress={() => addListMutation.mutate(list.id)}
                            variant="secondary"
                          />
                        ))}
                        <TextField
                          label="Créer une nouvelle liste"
                          maxLength={80}
                          onChangeText={setNewListName}
                          required
                          value={newListName}
                          webName={`production-${production.data.id}-new-list-name`}
                        />
                        <AccessibleChoiceGroup
                          label="Visibilité de la nouvelle liste"
                          onChange={setNewListVisibility}
                          options={[
                            ["private", "Privée"],
                            ["public", "Publique"],
                          ]}
                          testIdPrefix={`production-${production.data.id}-new-list-visibility`}
                          value={newListVisibility}
                        />
                        <Text className="text-sm leading-5 text-muted">
                          Une liste publique est partageable lorsque votre profil est
                          public ; une liste privée reste visible par vous seul.
                        </Text>
                        <Button
                          disabled={!newListName.trim()}
                          label="Créer et ajouter"
                          loading={createListMutation.isPending}
                          onPress={() => createListMutation.mutate()}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>

                {fullDescription ? (
                  <View className="gap-4">
                    <SectionTitle>À propos du spectacle</SectionTitle>
                    <Text className="max-w-[72ch] text-base leading-7 text-ink">
                      {fullDescription.body}
                    </Text>
                    <DescriptionProvenance description={fullDescription} />
                  </View>
                ) : null}

                <View className="gap-4">
                  <SectionTitle>Crédits artistiques</SectionTitle>
                  {production.data.credits.length > 0 ? (
                    <View className="border-t border-line">
                      {production.data.credits.map((credit) => (
                        <View
                          className="gap-1 border-b border-line py-3 md:flex-row"
                          key={`${credit.role}-${credit.artistId}-${credit.position}`}
                        >
                          <Text className="w-52 text-sm font-semibold text-muted">
                            {credit.label ?? creditLabels[credit.role]}
                          </Text>
                          <Text className="text-base flex-1 text-ink">
                            {credit.artistName}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="border-l-2 border-accent py-1 pl-4 text-base leading-6 text-muted">
                      Les crédits détaillés n’ont pas encore été confirmés par une
                      source autorisée.
                    </Text>
                  )}
                </View>

                <View className="gap-8">
                  <View className="gap-4">
                    <SectionTitle>Prochaines représentations</SectionTitle>
                    <Schedule performances={futurePerformances} title="à venir" />
                  </View>
                  {pastPerformances.length > 0 ? (
                    <View className="gap-4">
                      <SectionTitle>Représentations passées</SectionTitle>
                      <Schedule performances={pastPerformances} title="passée" />
                    </View>
                  ) : null}
                </View>

                <View className="gap-4">
                  <View className="flex-row flex-wrap items-end justify-between gap-3">
                    <SectionTitle>Avis des membres</SectionTitle>
                    <Text className="text-sm text-muted">
                      {production.data.ratingSummary.average
                        ? `${production.data.ratingSummary.average}/10 · ${production.data.ratingSummary.count} note(s)`
                        : "Pas encore de note"}
                    </Text>
                  </View>
                  {session.data ? (
                    <View className="gap-4 border border-control bg-paper p-4">
                      <View className="gap-2">
                        <Text className="text-base font-semibold text-ink">
                          Ma note
                        </Text>
                        <RatingPicker
                          disabled={ratingMutation.isPending}
                          onChange={(value) => ratingMutation.mutate(value)}
                          value={viewerState.data?.rating ?? null}
                        />
                        {viewerState.data?.rating ? (
                          <View className="self-start">
                            <Button
                              label="Supprimer ma note"
                              onPress={() => deleteRatingMutation.mutate()}
                              variant="ghost"
                            />
                          </View>
                        ) : null}
                      </View>
                      <TextField
                        label={
                          viewerState.data?.review
                            ? "Modifier mon avis"
                            : "Écrire un avis"
                        }
                        maxLength={5000}
                        multiline
                        onChangeText={setReviewBody}
                        placeholder="Ce qui vous a marqué, convaincu ou laissé à distance…"
                        style={{ minHeight: 120, textAlignVertical: "top" }}
                        value={reviewBody}
                        webName={`production-${production.data.id}-review`}
                      />
                      <AccessibleChoiceGroup
                        label="Visibilité de l’avis"
                        onChange={setReviewVisibility}
                        options={[
                          ["private", "Privé, visible par vous seul"],
                          ["public", "Public sur votre profil"],
                        ]}
                        testIdPrefix="review-visibility"
                        value={reviewVisibility}
                      />
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: reviewSpoiler }}
                        className="min-h-11 flex-row items-center gap-3"
                        onPress={() => setReviewSpoiler((value) => !value)}
                      >
                        <View
                          className={`h-5 w-5 border ${
                            reviewSpoiler
                              ? "border-accent bg-accent"
                              : "border-control bg-paper"
                          } items-center justify-center`}
                        >
                          {reviewSpoiler ? (
                            <Text className="text-xs font-bold text-paper">✓</Text>
                          ) : null}
                        </View>
                        <Text className="text-sm text-ink">
                          Cet avis contient des éléments révélant l’intrigue
                        </Text>
                      </Pressable>
                      {!viewerState.data?.seen ? (
                        <Text className="text-sm leading-5 text-muted">
                          Ajoutez d’abord ce spectacle à vos spectacles vus pour publier
                          un avis.
                        </Text>
                      ) : null}
                      {viewerState.data?.review &&
                      viewerState.data.review.status !== "published" ? (
                        <View
                          accessibilityRole="alert"
                          className="gap-1 border-l-2 border-[#9A5A00] bg-[#FFF8E7] px-4 py-3"
                        >
                          <Text className="text-base font-semibold text-ink">
                            Avis non publié
                          </Text>
                          <Text className="text-sm leading-5 text-muted">
                            {viewerState.data?.review?.status === "rejected"
                              ? "Cet avis a été refusé par la modération. Vous pouvez le modifier ou le supprimer ; une modification ne le republie pas automatiquement."
                              : "Cet avis est masqué. Vous pouvez le modifier ou le supprimer ; une modification ne le republie pas automatiquement."}
                          </Text>
                        </View>
                      ) : null}
                      <View className="self-start">
                        <Button
                          disabled={
                            reviewBody.trim().length < 20 || !viewerState.data?.seen
                          }
                          label={
                            viewerState.data?.review
                              ? "Enregistrer les modifications"
                              : "Publier mon avis"
                          }
                          loading={reviewMutation.isPending}
                          onPress={() => reviewMutation.mutate()}
                        />
                      </View>
                      {viewerState.data?.review ? (
                        <View className="gap-3 border-t border-line pt-4">
                          {confirmingReviewDelete ? (
                            <View
                              accessibilityLiveRegion="polite"
                              className="gap-3 border-l-2 border-error bg-[#FFF4F2] p-4"
                            >
                              <Text className="text-base font-semibold text-ink">
                                Supprimer définitivement cet avis ?
                              </Text>
                              <Text className="text-sm leading-5 text-muted">
                                Le texte disparaîtra de votre profil et de cette fiche.
                                Votre note et votre historique resteront conservés.
                              </Text>
                              <View className="flex-row flex-wrap gap-2">
                                <Button
                                  label="Oui, supprimer l’avis"
                                  loading={deleteReviewMutation.isPending}
                                  onPress={() => deleteReviewMutation.mutate()}
                                  variant="danger"
                                />
                                <Button
                                  label="Annuler"
                                  onPress={() => setConfirmingReviewDelete(false)}
                                  variant="secondary"
                                />
                              </View>
                            </View>
                          ) : (
                            <View className="self-start">
                              <Button
                                label="Supprimer mon avis"
                                onPress={() => setConfirmingReviewDelete(true)}
                                variant="danger"
                              />
                            </View>
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Button
                      label="Se connecter pour noter ou écrire un avis"
                      onPress={() =>
                        router.push({
                          pathname: "/sign-in",
                          params: { returnTo: `/production/${slug}` },
                        })
                      }
                      variant="secondary"
                    />
                  )}
                  {production.data.reviews.length > 0 ? (
                    <View className="border-t border-line">
                      {production.data.reviews.map((review) => (
                        <View
                          className="gap-2 border-b border-line py-5"
                          key={review.id}
                        >
                          <View className="flex-row flex-wrap justify-between gap-3">
                            <Link href={`/membre/${review.username}`} asChild>
                              <Pressable
                                accessibilityRole="link"
                                className="min-h-11 justify-center"
                              >
                                <Text className="text-base font-semibold text-accent">
                                  @{review.username}
                                </Text>
                              </Pressable>
                            </Link>
                            {review.rating ? (
                              <Text className="text-base font-semibold text-ink">
                                {review.rating}/10
                              </Text>
                            ) : null}
                          </View>
                          <SpoilerReviewText
                            body={review.body}
                            containsSpoiler={review.containsSpoiler}
                          />
                          <View className="self-start">
                            <Button
                              label="Signaler cet avis"
                              onPress={() =>
                                router.push({
                                  pathname: "/signaler",
                                  params: { type: "review", id: review.id },
                                })
                              }
                              variant="ghost"
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="border-l-2 border-accent pl-4 text-base leading-6 text-muted">
                      Aucun avis public pour le moment.
                    </Text>
                  )}
                </View>

                {production.data.relatedProductions.length > 0 ? (
                  <View className="gap-4">
                    <SectionTitle>Spectacles liés</SectionTitle>
                    {production.data.relatedProductions.map((related) => (
                      <ProductionListItem key={related.id} production={related} />
                    ))}
                  </View>
                ) : null}

                <View className="gap-4 border-t border-line pt-8">
                  <SectionTitle>Sources et vérification</SectionTitle>
                  <CatalogSources
                    lastVerifiedAt={production.data.lastVerifiedAt}
                    sources={production.data.sources}
                  />
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      label="Signaler ou corriger"
                      onPress={() =>
                        router.push({
                          pathname: "/signaler",
                          params: {
                            type: "production",
                            id: production.data!.id,
                          },
                        })
                      }
                      variant="secondary"
                    />
                    {production.data.company ? (
                      <Button
                        label="Vous représentez ce spectacle ?"
                        onPress={() =>
                          router.push({
                            pathname: "/revendiquer-compagnie",
                            params: {
                              companyId: production.data!.company!.id,
                            },
                          })
                        }
                        variant="ghost"
                      />
                    ) : null}
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

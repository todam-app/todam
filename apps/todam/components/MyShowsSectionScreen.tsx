import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Dashboard,
  MyShowItem,
  MyShowsFacets,
  MyShowsQuery,
  MyShowsSection,
} from "@todam/contracts";
import { Button, tokens } from "@todam/design-system";
import { Link, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { AsyncState } from "./AsyncState";
import { MyShowsFilters } from "./MyShowsFilters";
import { MyShowsNavigation } from "./MyShowsNavigation";
import { PageScrollView } from "./PageScrollView";
import { PrivatePageHead } from "./PrivatePageHead";
import { PrivateSessionLoading, PrivateSessionRequired } from "./PrivateSessionState";
import { ProductionListItem } from "./ProductionListItem";

const emptyFacets: MyShowsFacets = {
  disciplines: [],
  venues: [],
  years: [],
  communityRatings: [],
  myRatings: [],
  reviews: [],
  upcoming: [],
};

const sectionCopy: Record<
  MyShowsSection,
  { empty: string; pathname: string; title: string }
> = {
  watchlist: {
    empty: "Aucun spectacle ne correspond dans À voir.",
    pathname: "/journal/a-voir",
    title: "À voir",
  },
  seen: {
    empty: "Aucun spectacle vu ne correspond à ces critères.",
    pathname: "/journal/vus",
    title: "Vus",
  },
  rated: {
    empty: "Aucun spectacle noté ne correspond à ces critères.",
    pathname: "/journal/notes",
    title: "Notés",
  },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function integer(value: string | undefined, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : undefined;
}

function queryFromParams(
  params: Record<string, string | string[] | undefined>,
  section: MyShowsSection,
): MyShowsQuery {
  const sort = first(params.sort);
  const discipline = first(params.discipline);
  const upcoming = first(params.upcoming);
  const hasReview = first(params.hasReview);

  return {
    section,
    q: first(params.q)?.trim() ?? "",
    sort:
      sort === "title" ||
      sort === "community-rating" ||
      sort === "my-rating" ||
      sort === "next-performance"
        ? sort
        : "recent",
    limit: 20,
    ...(discipline === "theatre" || discipline === "opera" || discipline === "ballet"
      ? { discipline }
      : {}),
    ...(first(params.venue) ? { venue: first(params.venue)! } : {}),
    ...(integer(first(params.year), 1900, 2200)
      ? { year: integer(first(params.year), 1900, 2200)! }
      : {}),
    ...(integer(first(params.communityRating), 1, 10)
      ? {
          communityRating: integer(first(params.communityRating), 1, 10)!,
        }
      : {}),
    ...(integer(first(params.myRating), 1, 10)
      ? { myRating: integer(first(params.myRating), 1, 10)! }
      : {}),
    ...(hasReview === "true"
      ? { hasReview: true }
      : hasReview === "false"
        ? { hasReview: false }
        : {}),
    ...(upcoming === "7d" ||
    upcoming === "30d" ||
    upcoming === "90d" ||
    upcoming === "none"
      ? { upcoming }
      : {}),
  };
}

function navigationCounts(dashboard: Dashboard | undefined) {
  return {
    watchlist: dashboard?.counts.watchlist ?? 0,
    seen: dashboard?.counts.seen ?? 0,
    ratings: dashboard?.counts.ratings ?? 0,
    lists: dashboard?.counts.lists ?? 0,
    reviews: dashboard?.counts.reviews ?? 0,
  };
}

function formatCommunityRating(item: MyShowItem) {
  if (item.communityRating.average === null) return "Pas encore de note";
  return `${item.communityRating.average.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}/10 · ${item.communityRating.count} ${
    item.communityRating.count > 1 ? "notes" : "note"
  }`;
}

function ReviewSummary({ item }: { item: MyShowItem }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const review = item.review;
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-shows"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] }),
    ]);
  };
  const visibility = useMutation({
    mutationFn: () =>
      api.upsertReview(item.production.id, {
        body: review?.body ?? "",
        containsSpoiler: review?.containsSpoiler ?? false,
        visibility: review?.visibility === "public" ? "private" : "public",
      }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteReview(item.production.id),
    onSuccess: refresh,
  });

  if (!review) return null;

  return (
    <View className="gap-3 rounded-todam border border-line bg-paper p-4">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-xs font-bold uppercase tracking-wide text-accent">
          Mon avis
        </Text>
        <Text className="text-xs text-muted">
          {review.status === "published"
            ? "Publié"
            : review.status === "hidden"
              ? "Masqué par Todam"
              : "Refusé"}
          {" · "}
          {review.visibility === "public" ? "Public" : "Privé"}
        </Text>
      </View>
      <Text className="text-sm leading-5 text-ink" numberOfLines={4}>
        {review.body}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Link href={`/production/${item.production.slug}`} asChild>
          <Button label="Modifier l’entrée" variant="quiet" />
        </Link>
        <Button
          label={review.visibility === "public" ? "Rendre privé" : "Rendre public"}
          loading={visibility.isPending}
          onPress={() => visibility.mutate()}
          variant="ghost"
        />
        {confirming ? (
          <>
            <Button
              label="Confirmer la suppression"
              loading={remove.isPending}
              onPress={() => remove.mutate()}
              variant="danger"
            />
            <Button
              label="Annuler"
              onPress={() => setConfirming(false)}
              variant="quiet"
            />
          </>
        ) : (
          <Button
            label="Supprimer l’avis"
            onPress={() => setConfirming(true)}
            variant="dangerGhost"
          />
        )}
      </View>
      {visibility.isError || remove.isError ? (
        <Text accessibilityRole="alert" className="text-sm text-danger">
          La modification de l’avis a échoué.
        </Text>
      ) : null}
    </View>
  );
}

function ShowResult({ item, showReview }: { item: MyShowItem; showReview: boolean }) {
  return (
    <View className="gap-3 border-b border-line pb-5">
      <ProductionListItem production={item.production} />
      <View className="flex-row flex-wrap gap-x-5 gap-y-2 px-1">
        <View className="rounded-full bg-canvas px-3 py-1.5">
          <Text className="text-sm font-semibold text-ink">
            Communauté : {formatCommunityRating(item)}
          </Text>
        </View>
        {item.myRating !== null ? (
          <View className="rounded-full bg-accent px-3 py-1.5">
            <Text className="text-sm font-bold text-white">
              Ma note : {item.myRating}/10
            </Text>
          </View>
        ) : null}
        {item.seenCount > 1 ? (
          <Text className="self-center text-sm text-muted">
            Vu {item.seenCount} fois
          </Text>
        ) : null}
      </View>
      {showReview ? <ReviewSummary item={item} /> : null}
    </View>
  );
}

export function MyShowsSectionScreen({ section }: { section: MyShowsSection }) {
  const copy = sectionCopy[section];
  const params = useLocalSearchParams<{
    q?: string | string[];
    discipline?: string | string[];
    venue?: string | string[];
    year?: string | string[];
    communityRating?: string | string[];
    myRating?: string | string[];
    hasReview?: string | string[];
    upcoming?: string | string[];
    sort?: string | string[];
  }>();
  const router = useRouter();
  const session = authClient.useSession();
  const query = queryFromParams(params, section);
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    enabled: Boolean(session.data),
  });
  const shows = useInfiniteQuery({
    queryKey: ["my-shows", query],
    queryFn: ({ pageParam }) => api.getMyShows({ ...query, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(session.data),
  });

  function replaceQuery(key: string, value: boolean | number | string | undefined) {
    const next: Record<string, string> = {};
    for (const [paramKey, raw] of Object.entries(params)) {
      if (
        paramKey !== key &&
        paramKey !== "cursor" &&
        first(raw) !== undefined &&
        first(raw) !== ""
      ) {
        next[paramKey] = first(raw)!;
      }
    }
    if (
      value !== undefined &&
      value !== "" &&
      !(key === "sort" && value === "recent")
    ) {
      next[key] = String(value);
    }
    router.replace({ pathname: copy.pathname, params: next } as Href);
  }

  function clearQuery() {
    router.replace(copy.pathname as Href);
  }

  if (session.isPending) {
    return (
      <>
        <PrivatePageHead title={copy.title} />
        <PrivateSessionLoading />
      </>
    );
  }
  if (!session.data) {
    return (
      <>
        <PrivatePageHead title={copy.title} />
        <PrivateSessionRequired />
      </>
    );
  }

  const items = shows.data?.pages.flatMap((page) => page.items) ?? [];
  const firstPage = shows.data?.pages[0];

  return (
    <>
      <PrivatePageHead title={`${copy.title} · Mes spectacles`} />
      <PageScrollView
        contentContainerClassName="mx-auto w-full max-w-4xl gap-6 px-4 py-6 md:px-8 md:py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text
            aria-level={1}
            accessibilityRole="header"
            className="font-serif text-4xl font-semibold text-ink"
          >
            {copy.title}
          </Text>
          <Text className="text-base leading-6 text-muted">
            Recherchez et filtrez uniquement les spectacles de cette section.
          </Text>
        </View>
        <MyShowsNavigation counts={navigationCounts(dashboard.data)} />
        <MyShowsFilters
          facets={firstPage?.facets ?? emptyFacets}
          key={query.q}
          onChange={replaceQuery}
          onClear={clearQuery}
          query={query}
          section={section}
        />
        <Text
          accessibilityLiveRegion="polite"
          className="text-base font-semibold text-ink"
        >
          {firstPage?.total ?? 0} résultat
          {(firstPage?.total ?? 0) > 1 ? "s" : ""}
        </Text>
        <AsyncState
          empty={!shows.isPending && !shows.isError && items.length === 0}
          emptyMessage={copy.empty}
          error={shows.isError}
          loading={shows.isPending}
          onRetry={() => void shows.refetch()}
        >
          <View className="gap-5">
            {items.map((item) => (
              <ShowResult
                item={item}
                key={`${section}-${item.production.id}`}
                showReview={section === "rated"}
              />
            ))}
            {shows.hasNextPage ? (
              <View className="items-center">
                <Button
                  label="Afficher plus"
                  loading={shows.isFetchingNextPage}
                  onPress={() => void shows.fetchNextPage()}
                  variant="quiet"
                />
              </View>
            ) : null}
          </View>
        </AsyncState>
        {section === "rated" ? (
          <Link href="/journal/avis" asChild>
            <Pressable
              accessibilityRole="link"
              className="todam-cta-standard min-h-12 items-center justify-center rounded-todam border border-control"
              style={Platform.OS === "web" ? styles.standardButtonWeb : undefined}
            >
              <Text
                className="font-semibold text-accent"
                style={
                  Platform.OS === "web" ? styles.standardButtonLabelWeb : undefined
                }
              >
                Voir uniquement mes avis écrits
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </PageScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  standardButtonLabelWeb: {
    color: tokens.button.standard.text,
    fontFamily: tokens.button.standard.fontFamily,
    fontWeight: tokens.button.standard.fontWeight,
  },
  standardButtonWeb: {
    backgroundColor: tokens.button.standard.background,
    borderColor: tokens.button.standard.border,
    borderRadius: tokens.button.standard.radius,
    borderWidth: tokens.button.standard.borderWidth,
    boxSizing: "border-box",
  },
});

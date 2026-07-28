import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Discipline, OwnReview } from "@todam/contracts";
import { Button } from "@todam/design-system";
import { Link, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { AsyncState } from "./AsyncState";
import { MyShowsNavigation } from "./MyShowsNavigation";
import { PageScrollView } from "./PageScrollView";
import { PrivatePageHead } from "./PrivatePageHead";
import { PrivateSessionLoading, PrivateSessionRequired } from "./PrivateSessionState";
import { ProductionListItem } from "./ProductionListItem";
import { SelectionChip } from "./SelectionChip";

type ReviewFilter = "discipline" | "visibility" | "status" | "sort";
type ReviewQuery = Partial<Record<ReviewFilter, string>>;
type Option = { count?: number; label: string; value: string };

const filterLabels: Record<ReviewFilter, string> = {
  discipline: "Discipline",
  visibility: "Visibilité",
  status: "Statut",
  sort: "Trier",
};
const disciplineLabels: Record<Discipline, string> = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
};
const visibilityLabels = { public: "Public", private: "Privé" } as const;
const statusLabels = {
  published: "Publié",
  hidden: "Masqué par Todam",
  rejected: "Refusé",
} as const;
const sortOptions: Option[] = [
  { label: "Modifiés récemment", value: "recent" },
  { label: "Plus anciens", value: "oldest" },
  { label: "Titre de A à Z", value: "title" },
];
const filterKeys: ReviewFilter[] = ["discipline", "visibility", "status", "sort"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function filterReviews(
  reviews: OwnReview[],
  query: ReviewQuery,
  omitted?: ReviewFilter,
) {
  return reviews.filter((review) => {
    if (
      omitted !== "discipline" &&
      query.discipline &&
      review.production.discipline !== query.discipline
    ) {
      return false;
    }
    if (
      omitted !== "visibility" &&
      query.visibility &&
      review.visibility !== query.visibility
    ) {
      return false;
    }
    if (omitted !== "status" && query.status && review.status !== query.status) {
      return false;
    }
    return true;
  });
}

function countOptions(
  reviews: OwnReview[],
  query: ReviewQuery,
  key: ReviewFilter,
): Option[] {
  if (key === "sort") return sortOptions;
  const counts = new Map<string, number>();
  for (const review of filterReviews(reviews, query, key)) {
    const value =
      key === "discipline"
        ? review.production.discipline
        : key === "visibility"
          ? review.visibility
          : review.status;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({
    value,
    count,
    label:
      key === "discipline"
        ? disciplineLabels[value as Discipline]
        : key === "visibility"
          ? visibilityLabels[value as keyof typeof visibilityLabels]
          : statusLabels[value as keyof typeof statusLabels],
  }));
}

function Overlay({
  children,
  onClose,
  sidePanel,
  title,
  visible,
}: {
  children: ReactNode;
  onClose: () => void;
  sidePanel: boolean;
  title: string;
  visible: boolean;
}) {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 760;
  const returnFocus = useRef<HTMLElement | null>(null);
  const returnFocusTestId = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (visible) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      returnFocusTestId.current =
        returnFocus.current?.getAttribute("data-testid") ?? null;
      const frame = window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(
            `[data-testid="review-filter-close-${sidePanel ? "all" : "target"}"]`,
          )
          ?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const timeout = window.setTimeout(() => {
      const target = returnFocus.current?.isConnected
        ? returnFocus.current
        : returnFocusTestId.current
          ? document.querySelector<HTMLElement>(
              `[data-testid="${returnFocusTestId.current}"]`,
            )
          : null;
      target?.focus();
    }, 50);
    return () => window.clearTimeout(timeout);
  }, [sidePanel, visible]);
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View
        accessibilityViewIsModal
        className={`flex-1 bg-black/45 ${
          sidePanel
            ? "items-end"
            : desktop
              ? "items-center justify-center"
              : "justify-end"
        }`}
      >
        <Pressable
          accessibilityLabel="Fermer les filtres"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          className={`max-h-[92%] w-full bg-paper ${
            sidePanel
              ? "h-full max-w-md"
              : desktop
                ? "max-w-sm rounded-todam"
                : "rounded-t-2xl"
          }`}
          style={styles.panel}
        >
          <View className="min-h-16 flex-row items-center justify-between border-b border-line px-5">
            <Text
              aria-level={2}
              accessibilityRole="header"
              className="text-xl font-bold text-ink"
            >
              {title}
            </Text>
            <Pressable
              accessibilityLabel="Fermer"
              accessibilityRole="button"
              className="todam-icon-button h-11 w-11 items-center justify-center rounded-todam border border-control bg-paper"
              onPress={onClose}
              testID={`review-filter-close-${sidePanel ? "all" : "target"}`}
            >
              <Ionicons color="#151515" name="close" size={24} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function Options({
  onSelect,
  options,
  selected,
}: {
  onSelect: (value: string | undefined) => void;
  options: Option[];
  selected: string | undefined;
}) {
  return (
    <View>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected === undefined }}
        className={`min-h-14 flex-row items-center justify-between border-b border-line px-5 ${
          selected === undefined ? "bg-selected" : ""
        }`}
        onPress={() => onSelect(undefined)}
      >
        <Text className="text-base font-semibold text-ink">Tous</Text>
        {selected === undefined ? (
          <Ionicons color="#C43D28" name="checkmark" size={21} />
        ) : null}
      </Pressable>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            className={`min-h-14 flex-row items-center justify-between gap-4 border-b border-line px-5 ${
              active ? "bg-selected" : ""
            }`}
            key={option.value}
            onPress={() => onSelect(option.value)}
          >
            <Text
              className={`min-w-0 flex-1 text-base ${
                active ? "font-bold text-accent" : "text-ink"
              }`}
            >
              {option.label}
            </Text>
            <View className="flex-row items-center gap-3">
              {option.count !== undefined ? (
                <Text className="text-base text-muted">{option.count}</Text>
              ) : null}
              {active ? <Ionicons color="#C43D28" name="checkmark" size={21} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ReviewCard({ review }: { review: OwnReview }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["my-shows"] }),
    ]);
  };
  const visibility = useMutation({
    mutationFn: () =>
      api.upsertReview(review.production.id, {
        body: review.body,
        containsSpoiler: review.containsSpoiler,
        visibility: review.visibility === "public" ? "private" : "public",
      }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteReview(review.production.id),
    onSuccess: refresh,
  });

  return (
    <View className="gap-3 border-b border-line pb-6">
      <ProductionListItem production={review.production} />
      <View className="flex-row flex-wrap gap-2">
        <Text className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-ink">
          {visibilityLabels[review.visibility]}
        </Text>
        <Text className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-ink">
          {statusLabels[review.status]}
        </Text>
      </View>
      <Text className="text-base leading-6 text-ink">{review.body}</Text>
      {review.containsSpoiler ? (
        <Text className="text-sm font-semibold text-accent">
          Contient des révélations
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        <Link href={`/production/${review.production.slug}`} asChild>
          <Button label="Modifier l’avis" variant="quiet" />
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
    </View>
  );
}

export function MyReviewsScreen() {
  const params = useLocalSearchParams<{
    discipline?: string | string[];
    visibility?: string | string[];
    status?: string | string[];
    sort?: string | string[];
  }>();
  const router = useRouter();
  const session = authClient.useSession();
  const reviews = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => api.getOwnReviews(),
    enabled: Boolean(session.data),
  });
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    enabled: Boolean(session.data),
  });
  const [active, setActive] = useState<ReviewFilter | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [expanded, setExpanded] = useState<ReviewFilter | null>("discipline");
  const lastFilterTrigger = useRef<ReviewFilter | null>(null);
  const query: ReviewQuery = {};
  const discipline = first(params.discipline);
  const visibilityParam = first(params.visibility);
  const status = first(params.status);
  const sort = first(params.sort);
  if (discipline) query.discipline = discipline;
  if (visibilityParam) query.visibility = visibilityParam;
  if (status) query.status = status;
  if (sort) query.sort = sort;
  const allReviews = reviews.data ?? [];
  const filtered = [...filterReviews(allReviews, query)];
  if (query.sort === "title") {
    filtered.sort((a, b) => a.production.title.localeCompare(b.production.title, "fr"));
  } else {
    filtered.sort((a, b) =>
      query.sort === "oldest"
        ? a.updatedAt.localeCompare(b.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const key =
      (window.sessionStorage.getItem(
        "todam-review-filter-focus",
      ) as ReviewFilter | null) ?? lastFilterTrigger.current;
    if (!key) return;
    const timeout = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-testid="review-filter-${key}"]`)
        ?.focus();
      window.sessionStorage.removeItem("todam-review-filter-focus");
      lastFilterTrigger.current = null;
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [active, query.discipline, query.sort, query.status, query.visibility]);

  function replace(key: ReviewFilter, value: string | undefined) {
    const next: Record<string, string> = {};
    for (const filter of filterKeys) {
      if (filter !== key && query[filter]) next[filter] = query[filter]!;
    }
    if (value && !(key === "sort" && value === "recent")) next[key] = value;
    router.replace({ pathname: "/journal/avis", params: next } as Href);
  }

  if (session.isPending) {
    return (
      <>
        <PrivatePageHead title="Mes avis" />
        <PrivateSessionLoading />
      </>
    );
  }
  if (!session.data) {
    return (
      <>
        <PrivatePageHead title="Mes avis" />
        <PrivateSessionRequired />
      </>
    );
  }

  const counts = {
    watchlist: dashboard.data?.counts.watchlist ?? 0,
    seen: dashboard.data?.counts.seen ?? 0,
    ratings: dashboard.data?.counts.ratings ?? 0,
    lists: dashboard.data?.counts.lists ?? 0,
    reviews: dashboard.data?.counts.reviews ?? 0,
  };

  return (
    <>
      <PrivatePageHead title="Mes avis" />
      <PageScrollView contentContainerClassName="mx-auto w-full max-w-4xl gap-6 px-4 py-6 md:px-8 md:py-10">
        <View className="gap-2">
          <Text
            aria-level={1}
            accessibilityRole="header"
            className="font-serif text-4xl font-semibold text-ink"
          >
            Mes avis
          </Text>
          <Text className="text-base leading-6 text-muted">
            Retrouvez les avis écrits sur vos spectacles notés.
          </Text>
        </View>
        <MyShowsNavigation counts={counts} />
        <ScrollView
          contentContainerStyle={styles.chips}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {filterKeys.map((key) => {
            const options = countOptions(allReviews, query, key);
            const selected = options.find(
              (option) => option.value === (query[key] ?? "recent"),
            );
            const activeLabel =
              key === "sort" && !query.sort ? sortOptions[0] : selected;
            return (
              <SelectionChip
                indicator="chevron"
                key={key}
                label={
                  query[key]
                    ? (activeLabel?.label ?? filterLabels[key])
                    : filterLabels[key]
                }
                onPress={() => {
                  lastFilterTrigger.current = key;
                  setActive(key);
                }}
                rounded
                selected={Boolean(query[key])}
                testID={`review-filter-${key}`}
              />
            );
          })}
        </ScrollView>
        <View className="flex-row items-center justify-between">
          <Text
            accessibilityLiveRegion="polite"
            className="text-base font-semibold text-ink"
          >
            {filtered.length} avis
          </Text>
          <Pressable
            accessibilityLabel="Ouvrir tous les filtres"
            accessibilityRole="button"
            className="todam-icon-button h-11 w-11 items-center justify-center rounded-todam border border-control bg-paper"
            onPress={() => setAllOpen(true)}
          >
            <Ionicons color="#151515" name="options-outline" size={22} />
          </Pressable>
        </View>
        <AsyncState
          empty={!reviews.isPending && !reviews.isError && filtered.length === 0}
          emptyMessage="Aucun avis ne correspond à ces critères."
          error={reviews.isError}
          loading={reviews.isPending}
          onRetry={() => void reviews.refetch()}
        >
          <View className="gap-6">
            {filtered.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </View>
        </AsyncState>

        <Overlay
          onClose={() => setActive(null)}
          sidePanel={false}
          title={active ? filterLabels[active] : ""}
          visible={active !== null}
        >
          <ScrollView>
            {active ? (
              <Options
                onSelect={(value) => {
                  if (Platform.OS === "web") {
                    window.sessionStorage.setItem("todam-review-filter-focus", active);
                  }
                  replace(active, value);
                  setActive(null);
                }}
                options={countOptions(allReviews, query, active)}
                selected={query[active]}
              />
            ) : null}
          </ScrollView>
        </Overlay>
        <Overlay
          onClose={() => setAllOpen(false)}
          sidePanel
          title="Tous les filtres"
          visible={allOpen}
        >
          <ScrollView>
            {filterKeys.map((key) => (
              <View className="border-b border-line" key={key}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expanded === key }}
                  className="min-h-16 flex-row items-center justify-between px-5"
                  onPress={() => setExpanded(expanded === key ? null : key)}
                >
                  <Text className="text-base font-semibold text-ink">
                    {filterLabels[key]}
                  </Text>
                  <Ionicons
                    color="#6F6B64"
                    name={expanded === key ? "chevron-up" : "chevron-down"}
                    size={22}
                  />
                </Pressable>
                {expanded === key ? (
                  <Options
                    onSelect={(value) => replace(key, value)}
                    options={countOptions(allReviews, query, key)}
                    selected={query[key]}
                  />
                ) : null}
              </View>
            ))}
          </ScrollView>
          <View className="border-t border-line p-4">
            <Button
              label="Tout effacer"
              onPress={() => {
                router.replace("/journal/avis");
                setAllOpen(false);
              }}
              variant="ghost"
            />
          </View>
        </Overlay>
      </PageScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  chips: {
    columnGap: 8,
    paddingRight: 20,
  },
  panel: {
    position: "relative",
  },
});

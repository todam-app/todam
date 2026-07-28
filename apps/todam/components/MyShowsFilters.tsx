import Ionicons from "@expo/vector-icons/Ionicons";
import type {
  Discipline,
  MyShowsFacets,
  MyShowsQuery,
  MyShowsSection,
} from "@todam/contracts";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

import { SearchBar } from "./SearchBar";
import { SelectionChip } from "./SelectionChip";

type FilterKey =
  | "communityRating"
  | "discipline"
  | "hasReview"
  | "myRating"
  | "sort"
  | "upcoming"
  | "venue"
  | "year";

type FilterValue = boolean | number | string | undefined;

type FilterOption = {
  count?: number;
  label: string;
  value: boolean | number | string;
};

const disciplineLabels: Record<Discipline, string> = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
};

const upcomingLabels = {
  "7d": "Dans les 7 prochains jours",
  "30d": "Dans les 30 prochains jours",
  "90d": "Dans les 3 prochains mois",
  none: "Sans prochaine date",
} as const;

const filterLabels: Record<FilterKey, string> = {
  communityRating: "Note de la communauté",
  discipline: "Discipline",
  hasReview: "Avis",
  myRating: "Ma note",
  sort: "Trier",
  upcoming: "Prochaine date",
  venue: "Lieu",
  year: "Année vue",
};

function filterKeys(section: MyShowsSection): FilterKey[] {
  if (section === "watchlist") {
    return ["communityRating", "discipline", "venue", "upcoming", "sort"];
  }
  if (section === "rated") {
    return ["myRating", "discipline", "venue", "year", "hasReview", "sort"];
  }
  return ["communityRating", "discipline", "venue", "year", "hasReview", "sort"];
}

function sortOptions(section: MyShowsSection): FilterOption[] {
  return [
    {
      label:
        section === "watchlist"
          ? "Ajoutés récemment"
          : section === "rated"
            ? "Notés récemment"
            : "Vus récemment",
      value: "recent",
    },
    { label: "Titre de A à Z", value: "title" },
    ...(section !== "rated"
      ? [{ label: "Meilleure note communautaire", value: "community-rating" }]
      : [{ label: "Ma meilleure note", value: "my-rating" }]),
    ...(section === "watchlist"
      ? [{ label: "Prochaine date", value: "next-performance" }]
      : []),
  ];
}

function optionsFor(
  key: FilterKey,
  section: MyShowsSection,
  facets: MyShowsFacets,
): FilterOption[] {
  switch (key) {
    case "communityRating":
      return facets.communityRatings.map((facet) => ({
        value: facet.value,
        label: facet.value === 10 ? "10/10" : `${facet.value},0 à ${facet.value},9/10`,
        count: facet.count,
      }));
    case "myRating":
      return facets.myRatings.map((facet) => ({
        value: facet.value,
        label: `${facet.value}/10`,
        count: facet.count,
      }));
    case "discipline":
      return facets.disciplines.map((facet) => ({
        value: facet.value,
        label: disciplineLabels[facet.value],
        count: facet.count,
      }));
    case "venue":
      return facets.venues.map((facet) => ({
        value: facet.value,
        label: facet.value,
        count: facet.count,
      }));
    case "year":
      return facets.years.map((facet) => ({
        value: facet.value,
        label: String(facet.value),
        count: facet.count,
      }));
    case "hasReview":
      return facets.reviews.map((facet) => ({
        value: facet.value === "with",
        label: facet.value === "with" ? "Avec avis" : "Sans avis",
        count: facet.count,
      }));
    case "upcoming":
      return facets.upcoming.map((facet) => ({
        value: facet.value,
        label: upcomingLabels[facet.value],
        count: facet.count,
      }));
    case "sort":
      return sortOptions(section);
  }
}

function selectedValue(query: Partial<MyShowsQuery>, key: FilterKey): FilterValue {
  return query[key];
}

function selectedLabel(
  query: Partial<MyShowsQuery>,
  key: FilterKey,
  options: FilterOption[],
): string | null {
  const selected = selectedValue(query, key);
  if (selected === undefined || (key === "sort" && selected === "recent")) {
    return null;
  }
  return options.find((option) => option.value === selected)?.label ?? null;
}

function FilterOptions({
  options,
  selected,
  onSelect,
}: {
  options: FilterOption[];
  selected: FilterValue;
  onSelect: (value: FilterValue) => void;
}) {
  return (
    <View className="border-t border-line">
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected === undefined }}
        className={`min-h-14 flex-row items-center justify-between border-b border-line px-5 py-3 ${
          selected === undefined ? "bg-selected" : ""
        }`}
        onPress={() => onSelect(undefined)}
      >
        <Text className="text-base font-semibold text-ink">Toutes</Text>
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
            className={`min-h-14 flex-row items-center justify-between gap-4 border-b border-line px-5 py-3 ${
              active ? "bg-selected" : ""
            }`}
            key={String(option.value)}
            onPress={() => onSelect(option.value)}
          >
            <Text
              className={`min-w-0 flex-1 text-base ${active ? "font-bold text-accent" : "text-ink"}`}
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

function FilterOverlay({
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
            `[data-testid="my-shows-filter-close-${sidePanel ? "all" : "target"}"]`,
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
          style={styles.overlayPanel}
        >
          <View className="min-h-16 flex-row items-center justify-between border-b border-line px-5 py-3">
            <Text
              accessibilityRole="header"
              aria-level={2}
              className="text-xl font-bold text-ink"
            >
              {title}
            </Text>
            <Pressable
              accessibilityLabel="Fermer"
              accessibilityRole="button"
              className="todam-icon-button h-11 w-11 items-center justify-center rounded-todam border border-control bg-paper"
              onPress={onClose}
              testID={`my-shows-filter-close-${sidePanel ? "all" : "target"}`}
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

export function MyShowsFilters({
  facets,
  onChange,
  onClear,
  query,
  section,
}: {
  facets: MyShowsFacets;
  onChange: (key: FilterKey | "q", value: FilterValue) => void;
  onClear: () => void;
  query: Partial<MyShowsQuery>;
  section: MyShowsSection;
}) {
  const keys = filterKeys(section);
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [allFiltersOpen, setAllFiltersOpen] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<FilterKey | null>(keys[0]!);
  const [search, setSearch] = useState(query.q ?? "");
  const lastFilterTrigger = useRef<FilterKey | null>(null);
  const activeOptions = useMemo(
    () => (activeFilter ? optionsFor(activeFilter, section, facets) : []),
    [activeFilter, facets, section],
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const key =
      (window.sessionStorage.getItem(
        "todam-my-shows-filter-focus",
      ) as FilterKey | null) ?? lastFilterTrigger.current;
    if (!key) return;
    const timeout = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-testid="my-shows-filter-${key}"]`)
        ?.focus();
      window.sessionStorage.removeItem("todam-my-shows-filter-focus");
      lastFilterTrigger.current = null;
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [
    activeFilter,
    query.communityRating,
    query.discipline,
    query.hasReview,
    query.myRating,
    query.sort,
    query.upcoming,
    query.venue,
    query.year,
  ]);

  function applySearch() {
    onChange("q", search.trim() || undefined);
  }

  return (
    <View className="gap-4">
      <SearchBar
        accessibilityLabel="Rechercher dans mes spectacles"
        onChangeText={setSearch}
        onClear={() => {
          setSearch("");
          onChange("q", undefined);
        }}
        onSubmit={applySearch}
        placeholder="Rechercher dans mes spectacles"
        value={search}
        webName={`my-shows-${section}-search`}
      />

      <ScrollView
        contentContainerStyle={styles.chips}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {keys.map((key) => {
          const options = optionsFor(key, section, facets);
          const selected = selectedLabel(query, key, options);
          return (
            <SelectionChip
              accessibilityLabel={
                selected ? `${filterLabels[key]} : ${selected}` : filterLabels[key]
              }
              indicator="chevron"
              key={key}
              label={selected ?? filterLabels[key]}
              onPress={() => {
                lastFilterTrigger.current = key;
                setActiveFilter(key);
              }}
              rounded
              selected={Boolean(selected)}
              testID={`my-shows-filter-${key}`}
            />
          );
        })}
      </ScrollView>

      <View className="flex-row items-center justify-between gap-4">
        <View className="min-w-0 flex-1">
          <Text className="text-sm text-muted">
            {query.sort && query.sort !== "recent"
              ? selectedLabel(query, "sort", sortOptions(section))
              : sortOptions(section)[0]!.label}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Ouvrir tous les filtres"
          accessibilityRole="button"
          className="todam-icon-button h-11 w-11 items-center justify-center rounded-todam border border-control bg-paper"
          onPress={() => setAllFiltersOpen(true)}
        >
          <Ionicons color="#151515" name="options-outline" size={22} />
        </Pressable>
      </View>

      <FilterOverlay
        onClose={() => setActiveFilter(null)}
        sidePanel={false}
        title={activeFilter ? filterLabels[activeFilter] : ""}
        visible={activeFilter !== null}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          {activeFilter ? (
            <FilterOptions
              onSelect={(value) => {
                if (Platform.OS === "web") {
                  window.sessionStorage.setItem(
                    "todam-my-shows-filter-focus",
                    activeFilter,
                  );
                }
                onChange(activeFilter, value);
                setActiveFilter(null);
              }}
              options={activeOptions}
              selected={selectedValue(query, activeFilter)}
            />
          ) : null}
        </ScrollView>
      </FilterOverlay>

      <FilterOverlay
        onClose={() => setAllFiltersOpen(false)}
        sidePanel
        title="Tous les filtres"
        visible={allFiltersOpen}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          {keys.map((key) => {
            const expanded = expandedFilter === key;
            return (
              <View className="border-b border-line" key={key}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  className="min-h-16 flex-row items-center justify-between px-5 py-3"
                  onPress={() => setExpandedFilter(expanded ? null : key)}
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm text-muted">{filterLabels[key]}</Text>
                    <Text className="text-base font-semibold text-ink">
                      {selectedLabel(query, key, optionsFor(key, section, facets)) ??
                        "Toutes"}
                    </Text>
                  </View>
                  <Ionicons
                    color="#6F6B64"
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={22}
                  />
                </Pressable>
                {expanded ? (
                  <FilterOptions
                    onSelect={(value) => onChange(key, value)}
                    options={optionsFor(key, section, facets)}
                    selected={selectedValue(query, key)}
                  />
                ) : null}
              </View>
            );
          })}
        </ScrollView>
        <View className="border-t border-line p-4">
          <Pressable
            accessibilityRole="button"
            className="min-h-11 items-center justify-center"
            onPress={() => {
              onClear();
              setAllFiltersOpen(false);
            }}
          >
            <Text className="text-base font-bold text-accent">Tout effacer</Text>
          </Pressable>
        </View>
      </FilterOverlay>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    columnGap: 8,
    paddingRight: 20,
  },
  overlayPanel: {
    position: "relative",
  },
});

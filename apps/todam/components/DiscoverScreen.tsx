import { useInfiniteQuery } from "@tanstack/react-query";
import type { Discipline } from "@todam/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, SectionTitle, TextField, tokens } from "@todam/design-system";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
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

import { api } from "../lib/api";
import { isIsoCalendarDate } from "../lib/dates";
import { AccessibleTabs } from "./AccessibleTabs";
import { AsyncState } from "./AsyncState";
import { PageScrollView } from "./PageScrollView";
import { ProductionDiscoveryCard } from "./ProductionDiscoveryCard";
import { SearchBar } from "./SearchBar";
import { SelectionChip } from "./SelectionChip";

type SearchType = "productions" | "venues" | "companies" | "members";
type SearchSort = "relevance" | "date" | "proximity" | "popularity";

const tabs: { value: SearchType; label: string }[] = [
  { value: "productions", label: "Spectacles" },
  { value: "venues", label: "Lieux" },
  { value: "companies", label: "Compagnies" },
  { value: "members", label: "Membres" },
];
const disciplineOptions: { value?: Discipline; label: string }[] = [
  { label: "Tout" },
  { value: "theatre", label: "Théâtre" },
  { value: "opera", label: "Opéra" },
  { value: "ballet", label: "Ballet" },
];
const sortOptions: { value: SearchSort; label: string }[] = [
  { value: "relevance", label: "Pertinence" },
  { value: "date", label: "Date" },
  { value: "proximity", label: "Proximité" },
  { value: "popularity", label: "Popularité" },
];
function parameter(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function FilterButton({
  active,
  disabled = false,
  label,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <SelectionChip
      disabled={disabled}
      label={label}
      onPress={onPress}
      selected={active}
    />
  );
}

function SearchModal({
  children,
  onClose,
  sidePanel = false,
  testId,
  title,
  visible,
}: {
  children: ReactNode;
  onClose: () => void;
  sidePanel?: boolean;
  testId: string;
  title: string;
  visible: boolean;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (visible) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      const frame = window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-testid="${testId}-close"]`)?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const timeout = window.setTimeout(() => returnFocus.current?.focus(), 50);
    return () => window.clearTimeout(timeout);
  }, [testId, visible]);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View
        accessibilityViewIsModal
        className={`todam-modal-scrim flex-1 bg-black/45 ${
          sidePanel ? "items-end" : "items-center justify-center px-5"
        }`}
      >
        <Pressable
          accessibilityLabel={`Fermer ${title.toLocaleLowerCase("fr-FR")}`}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          className={`todam-modal-panel max-h-full w-full bg-paper ${
            sidePanel ? "h-full max-w-md" : "max-w-sm rounded-todam"
          }`}
          testID={testId}
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
              testID={`${testId}-close`}
            >
              <Ionicons color={tokens.color.ink} name="close" size={24} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function DiscoverScreen() {
  const params = useLocalSearchParams<{
    q?: string | string[];
    type?: string | string[];
  }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const initialQuery = parameter(params.q).trim();
  const initialType = parameter(params.type) as SearchType;
  const [input, setInput] = useState(initialQuery);
  const [nativeQuery, setNativeQuery] = useState(initialQuery);
  const [type, setType] = useState<SearchType>(
    tabs.some((tab) => tab.value === initialType) ? initialType : "productions",
  );
  const [discipline, setDiscipline] = useState<Discipline | undefined>();
  const [temporal, setTemporal] = useState<"upcoming" | "past" | "all">(
    initialQuery.length >= 2 ? "all" : "upcoming",
  );
  const [sort, setSort] = useState<SearchSort>(
    initialQuery.length >= 2 ? "relevance" : "date",
  );
  const [locality, setLocality] = useState("");
  const [radiusKm, setRadiusKm] = useState<number | undefined>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const searchWeb = Platform.OS === "web";
  const desktopSearchWeb = searchWeb && width >= 960;
  const query = Platform.OS === "web" ? initialQuery : nativeQuery;
  const searchMode = query.length >= 2;
  const validFrom = isIsoCalendarDate(fromDate);
  const validTo = isIsoCalendarDate(toDate);
  const invalidDateRange = validFrom && validTo && fromDate > toDate;
  const defaultSort: SearchSort = searchMode ? "relevance" : "date";
  const defaultTemporal = searchMode ? "all" : "upcoming";
  const filterCount =
    type === "members"
      ? 0
      : type === "productions"
        ? [
            discipline !== undefined,
            temporal !== defaultTemporal,
            Boolean(locality.trim()),
            radiusKm !== undefined,
            Boolean(fromDate),
            Boolean(toDate),
          ].filter(Boolean).length
        : Number(Boolean(locality.trim()));
  const sortLabel =
    sortOptions.find((option) => option.value === sort)?.label ?? "Pertinence";

  /* eslint-disable react-hooks/set-state-in-effect -- Route parameters intentionally rehydrate controlled search fields. */
  useEffect(() => {
    setInput(initialQuery);
    if (Platform.OS !== "web") setNativeQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (tabs.some((tab) => tab.value === initialType)) {
      setType(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    setTemporal(searchMode ? "all" : "upcoming");
    setSort(searchMode ? "relevance" : "date");
  }, [searchMode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const search = useInfiniteQuery({
    queryKey: [
      "catalog-search",
      query,
      type,
      discipline,
      temporal,
      sort,
      locality,
      radiusKm,
      fromDate,
      toDate,
    ],
    queryFn: ({ pageParam }) =>
      api.searchCatalog({
        q: query,
        type,
        ...(type === "productions" && discipline ? { discipline } : {}),
        temporal: type === "productions" ? temporal : "all",
        sort: type === "productions" ? sort : "relevance",
        ...(type !== "members" && locality.trim() ? { locality: locality.trim() } : {}),
        ...(type === "productions" && locality.trim() && radiusKm ? { radiusKm } : {}),
        ...(type === "productions" && validFrom ? { from: fromDate } : {}),
        ...(type === "productions" && validTo && !invalidDateRange
          ? { to: toDate }
          : {}),
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: query.length !== 1,
    retry: false,
    staleTime: 60_000,
  });
  const pages = search.data?.pages ?? [];
  const firstPage = pages[0];
  const productions = pages.flatMap((page) => page.productions);
  const venues = pages.flatMap((page) => page.venues);
  const companies = pages.flatMap((page) => page.companies);
  const members = pages.flatMap((page) => page.members);
  const resultCount = firstPage?.total ?? 0;
  const itemCount = useMemo(
    () => productions.length + venues.length + companies.length + members.length,
    [companies.length, members.length, productions.length, venues.length],
  );

  function submit(value = input) {
    const normalized = value.trim();
    if (normalized.length < 2) return;
    if (Platform.OS === "web") {
      router.replace({
        pathname: "/search",
        params: { q: normalized, type },
      });
    } else {
      setNativeQuery(normalized);
    }
  }

  function clearSearch() {
    setInput("");
    if (Platform.OS === "web") {
      router.replace({ pathname: "/search", params: { type } });
    } else {
      setNativeQuery("");
    }
  }

  function changeType(nextType: SearchType) {
    setType(nextType);
    if (Platform.OS === "web" && query) {
      router.replace({
        pathname: "/search",
        params: { q: query, type: nextType },
      });
    }
  }

  function resetFilters() {
    setDiscipline(undefined);
    setTemporal(defaultTemporal);
    setSort(defaultSort);
    setLocality("");
    setRadiusKm(undefined);
    setFromDate("");
    setToDate("");
  }

  function renderAdvancedFilterFields(includeSort: boolean) {
    if (type === "members") return null;
    return (
      <>
        <View className="gap-2">
          <TextField
            autoComplete="off"
            label={
              type === "companies" ? "Ville de la compagnie" : "Ville ou proximité"
            }
            onChangeText={(value) => {
              setLocality(value);
              if (!value.trim() && sort === "proximity") setSort("relevance");
            }}
            placeholder="Ex. Grenoble"
            value={locality}
            webAutoComplete="address-level2"
            webName="catalog-locality"
          />
        </View>
        {type === "productions" && locality.trim() ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-ink">
              Rayon autour de la ville
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  [undefined, "Ville seulement"],
                  [25, "25 km"],
                  [50, "50 km"],
                  [100, "100 km"],
                  [200, "200 km"],
                ] as const
              ).map(([value, label]) => (
                <FilterButton
                  active={radiusKm === value}
                  key={label}
                  label={label}
                  onPress={() => setRadiusKm(value)}
                />
              ))}
            </View>
          </View>
        ) : null}
        {type === "productions" ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-ink">
              Période personnalisée
            </Text>
            <View className="gap-3">
              <TextField
                autoComplete="off"
                error={
                  fromDate && !validFrom ? "Format attendu : AAAA-MM-JJ" : undefined
                }
                label="Du"
                maxLength={10}
                onChangeText={setFromDate}
                placeholder="AAAA-MM-JJ"
                value={fromDate}
                webName="catalog-date-from"
              />
              <TextField
                autoComplete="off"
                error={
                  toDate && !validTo
                    ? "Format attendu : AAAA-MM-JJ"
                    : invalidDateRange
                      ? "La fin doit suivre le début."
                      : undefined
                }
                label="Au"
                maxLength={10}
                onChangeText={setToDate}
                placeholder="AAAA-MM-JJ"
                value={toDate}
                webName="catalog-date-to"
              />
            </View>
          </View>
        ) : null}
        {includeSort && type === "productions" ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-ink">Trier les résultats</Text>
            <View className="flex-row flex-wrap gap-2">
              {sortOptions.map((option) => (
                <FilterButton
                  active={sort === option.value}
                  disabled={option.value === "proximity" && !locality.trim()}
                  key={option.value}
                  label={option.label}
                  onPress={() => setSort(option.value)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </>
    );
  }

  function renderWebFilterSections(showHeading: boolean) {
    return (
      <View className="gap-5">
        {showHeading || filterCount > 0 ? (
          <View className="flex-row items-center justify-between gap-3">
            {showHeading ? (
              <Text
                accessibilityRole="header"
                aria-level={2}
                className="text-xl font-bold text-ink"
              >
                Filtres
              </Text>
            ) : (
              <View />
            )}
            {filterCount > 0 ? (
              <Pressable accessibilityRole="button" onPress={resetFilters}>
                <Text className="text-sm font-semibold text-brand-text">Effacer</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-muted">Type de résultat</Text>
          <View className="flex-row flex-wrap gap-2">
            {tabs.map((tab) => (
              <FilterButton
                active={type === tab.value}
                key={tab.value}
                label={tab.label}
                onPress={() => changeType(tab.value)}
              />
            ))}
          </View>
        </View>
        {type === "productions" ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted">Discipline</Text>
            <View className="flex-row flex-wrap gap-2">
              {disciplineOptions.map((option) => (
                <FilterButton
                  active={discipline === option.value}
                  key={option.label}
                  label={option.label}
                  onPress={() => setDiscipline(option.value)}
                />
              ))}
            </View>
          </View>
        ) : null}
        {type === "productions" ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted">Période</Text>
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  ["upcoming", "À venir"],
                  ["past", "Archives"],
                  ["all", "Toutes les périodes"],
                ] as const
              ).map(([value, label]) => (
                <FilterButton
                  active={temporal === value}
                  key={value}
                  label={label}
                  onPress={() => setTemporal(value)}
                />
              ))}
            </View>
          </View>
        ) : null}
        {renderAdvancedFilterFields(false)}
      </View>
    );
  }

  const resultsBody =
    query.length === 1 ? (
      <Text className="py-3 text-base text-muted">
        Recherchez un spectacle, un lieu, une compagnie ou un membre.
      </Text>
    ) : (
      <AsyncState
        empty={!search.isPending && itemCount === 0}
        emptyAction={
          <View className="items-center gap-2">
            {firstPage?.suggestion ? (
              <Button
                label={`Rechercher « ${firstPage.suggestion} »`}
                onPress={() => submit(firstPage.suggestion!)}
              />
            ) : null}
            {Platform.OS === "web" &&
            type === "productions" &&
            query.trim().length >= 2 ? (
              <Button
                label="Ajouter un spectacle manquant"
                onPress={() =>
                  router.push({
                    pathname: "/ajouter-un-spectacle",
                    params: { title: query.trim() },
                  })
                }
              />
            ) : null}
            {searchMode ? (
              <Button
                label="Effacer la recherche"
                onPress={clearSearch}
                variant="secondary"
              />
            ) : null}
          </View>
        }
        emptyMessage={
          searchMode
            ? "Aucun résultat. Modifiez la période, la ville ou le type de contenu."
            : type === "productions"
              ? "Aucun spectacle à venir n’est encore publié."
              : type === "venues"
                ? "Aucun lieu n’est encore publié."
                : type === "companies"
                  ? "Aucune compagnie n’est encore publiée."
                  : "Aucun membre n’est encore visible."
        }
        error={search.isError}
        loading={search.isPending}
        onRetry={() => void search.refetch()}
      >
        <View className="gap-5">
          {productions.length > 0 ? (
            <View className="todam-production-grid">
              {productions.map((production) => (
                <ProductionDiscoveryCard
                  headingLevel={searchWeb ? 3 : 2}
                  key={production.id}
                  production={production}
                  showWatchlistAction
                />
              ))}
            </View>
          ) : null}
          {venues.map((venue) => (
            <Link href={`/lieu/${venue.slug}`} key={venue.id} asChild>
              <Pressable
                accessibilityRole="link"
                className="todam-interactive-card todam-result-list-card min-h-24 justify-center bg-paper px-5 py-4"
              >
                <Text className="font-serif text-xl font-semibold text-ink">
                  {venue.name}
                </Text>
                <Text className="mt-1 text-sm text-muted">
                  {venue.locality} · {venue.countryCode}
                </Text>
              </Pressable>
            </Link>
          ))}
          {companies.map((company) => (
            <Link href={`/compagnie/${company.slug}`} key={company.id} asChild>
              <Pressable
                accessibilityRole="link"
                className="todam-interactive-card todam-result-list-card min-h-24 justify-center bg-paper px-5 py-4"
              >
                <Text className="font-serif text-xl font-semibold text-ink">
                  {company.name}
                </Text>
                <Text className="mt-1 text-sm font-semibold text-brand-text">
                  Voir les productions et les dates de tournée
                </Text>
              </Pressable>
            </Link>
          ))}
          {members.map((member) => (
            <Link href={`/membre/${member.username}`} key={member.username} asChild>
              <Pressable
                accessibilityRole="link"
                className="todam-interactive-card todam-result-list-card min-h-24 justify-center bg-paper px-5 py-4"
              >
                <Text className="font-serif text-xl font-semibold text-ink">
                  @{member.username}
                </Text>
                {member.bio ? (
                  <Text className="mt-1 max-w-2xl text-sm leading-5 text-muted">
                    {member.bio}
                  </Text>
                ) : null}
              </Pressable>
            </Link>
          ))}
          {search.hasNextPage ? (
            <View className="mt-2 w-full max-w-xs self-center">
              <Button
                label="Afficher plus de résultats"
                loading={search.isFetchingNextPage}
                onPress={() => void search.fetchNextPage()}
                variant="quiet"
              />
            </View>
          ) : null}
        </View>
      </AsyncState>
    );

  const resultToolbar =
    query.length !== 1 ? (
      <View className="todam-search-result-toolbar flex-row flex-wrap items-center justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text
            aria-level={2}
            accessibilityRole="header"
            className="font-serif text-2xl font-semibold text-ink"
          >
            {searchMode
              ? firstPage
                ? `${resultCount} résultat${resultCount > 1 ? "s" : ""} pour « ${query} »`
                : `Résultats pour « ${query} »`
              : type === "productions"
                ? `${resultCount} spectacle${resultCount > 1 ? "s" : ""} à venir`
                : type === "venues"
                  ? `${resultCount} lieu${resultCount > 1 ? "x" : ""}`
                  : type === "companies"
                    ? `${resultCount} compagnie${resultCount > 1 ? "s" : ""}`
                    : `${resultCount} membre${resultCount > 1 ? "s" : ""}`}
          </Text>
          {firstPage?.suggestion ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => submit(firstPage.suggestion!)}
            >
              <Text className="text-sm font-semibold text-brand-text">
                Rechercher « {firstPage.suggestion} »
              </Text>
            </Pressable>
          ) : null}
        </View>
        {searchWeb ? (
          <View className="flex-row flex-wrap items-center justify-end gap-2">
            {!desktopSearchWeb ? (
              <SelectionChip
                accessibilityLabel={`Ouvrir les filtres, ${filterCount} actif${filterCount > 1 ? "s" : ""}`}
                indicator="none"
                label={`Filtres · ${filterCount}`}
                onPress={() => setAdvancedFiltersOpen(true)}
                selected={filterCount > 0}
                testID="discover-advanced-filters-toggle"
              />
            ) : null}
            {type === "productions" ? (
              <SelectionChip
                accessibilityLabel={`Trier les résultats : ${sortLabel}`}
                indicator="chevron"
                label={`Trier : ${sortLabel}`}
                onPress={() => setSortMenuOpen(true)}
                selected={sort !== defaultSort}
                testID="discover-sort-toggle"
              />
            ) : null}
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <PageScrollView
      contentContainerClassName="flex-grow"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View
        className={`todam-page-before-footer mx-auto w-full max-w-content flex-1 px-5 md:px-8 ${
          searchWeb ? "gap-4 py-4 md:py-6" : "gap-6 py-6 md:gap-8 md:py-12"
        }`}
      >
        {searchWeb ? (
          <Text accessibilityRole="header" aria-level={1} className="sr-only">
            Résultats de recherche
          </Text>
        ) : (
          <View className="gap-4">
            {query.length < 2 ? (
              <>
                <SectionTitle eyebrow="Catalogue" level={1}>
                  Rechercher dans Todam
                </SectionTitle>
                <Text className="max-w-3xl text-base leading-6 text-muted">
                  Théâtre, opéra et ballet : retrouvez un spectacle par son titre, son
                  lieu ou sa compagnie.
                </Text>
              </>
            ) : null}
            {Platform.OS !== "web" ? (
              <View className="w-full max-w-2xl">
                <SearchBar
                  accessibilityLabel="Titre, compagnie, lieu ou membre"
                  onChangeText={setInput}
                  onClear={clearSearch}
                  onSubmit={() => submit()}
                  placeholder="Rechercher dans Todam"
                  value={input}
                  webName="catalog-search"
                />
              </View>
            ) : null}
          </View>
        )}

        {searchWeb ? (
          <View className="todam-search-layout">
            {desktopSearchWeb ? (
              <View
                className="todam-search-filter-sidebar"
                testID="discover-filter-sidebar"
              >
                {renderWebFilterSections(true)}
              </View>
            ) : null}
            <View className="todam-search-results gap-5">
              {resultToolbar}
              {resultsBody}
            </View>
          </View>
        ) : (
          <View className="gap-5">
            <AccessibleTabs
              label="Types de résultats"
              onChange={changeType}
              tabs={tabs}
              testIdPrefix="search-tab"
              value={type}
            />
            <View className="todam-discover-filter-bar gap-3 p-3 md:p-4">
              {type === "productions" ? (
                <View className="flex-row flex-wrap gap-2">
                  {disciplineOptions.map((option) => (
                    <FilterButton
                      active={discipline === option.value}
                      key={option.label}
                      label={option.label}
                      onPress={() => setDiscipline(option.value)}
                    />
                  ))}
                </View>
              ) : null}
              {type === "productions" ? (
                <View className="flex-row flex-wrap gap-2">
                  {(
                    [
                      ["upcoming", "À venir"],
                      ["past", "Archives"],
                      ["all", "Toutes les périodes"],
                    ] as const
                  ).map(([value, label]) => (
                    <FilterButton
                      active={temporal === value}
                      key={value}
                      label={label}
                      onPress={() => setTemporal(value)}
                    />
                  ))}
                </View>
              ) : null}
              {type !== "members" ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: advancedFiltersOpen }}
                    aria-expanded={advancedFiltersOpen}
                    className="min-h-11 flex-row items-center justify-between rounded-todam border border-control bg-paper px-4"
                    onPress={() => setAdvancedFiltersOpen((open) => !open)}
                    testID="discover-advanced-filters-toggle"
                  >
                    <Text className="text-sm font-bold text-ink">
                      Filtres ({filterCount})
                    </Text>
                    <Text className="text-lg font-semibold text-accent">
                      {advancedFiltersOpen ? "−" : "+"}
                    </Text>
                  </Pressable>
                  {advancedFiltersOpen ? (
                    <View
                      className="todam-filter-panel gap-4 border border-line p-4"
                      testID="discover-advanced-filters-panel"
                    >
                      {renderAdvancedFilterFields(true)}
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
            {resultToolbar}
            {resultsBody}
          </View>
        )}
      </View>

      {searchWeb && !desktopSearchWeb ? (
        <SearchModal
          onClose={() => setAdvancedFiltersOpen(false)}
          sidePanel
          testId="discover-advanced-filters-panel"
          title="Filtres"
          visible={advancedFiltersOpen}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="p-5">{renderWebFilterSections(false)}</View>
          </ScrollView>
        </SearchModal>
      ) : null}

      {searchWeb ? (
        <SearchModal
          onClose={() => setSortMenuOpen(false)}
          testId="discover-sort-panel"
          title="Trier les résultats"
          visible={sortMenuOpen}
        >
          <View className="gap-2 p-4">
            {sortOptions.map((option) => (
              <FilterButton
                active={sort === option.value}
                disabled={option.value === "proximity" && !locality.trim()}
                key={option.value}
                label={option.label}
                onPress={() => {
                  setSort(option.value);
                  setSortMenuOpen(false);
                }}
              />
            ))}
          </View>
        </SearchModal>
      ) : null}

    </PageScrollView>
  );
}

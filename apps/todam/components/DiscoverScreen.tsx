import { useInfiniteQuery } from "@tanstack/react-query";
import type { Discipline, SearchResponse } from "@todam/contracts";
import { Button, SectionTitle, TextField } from "@todam/design-system";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { api } from "../lib/api";
import { isIsoCalendarDate } from "../lib/dates";
import { AccessibleTabs } from "./AccessibleTabs";
import { AsyncState } from "./AsyncState";
import { LegalFooter } from "./LegalFooter";
import { PageScrollView } from "./PageScrollView";
import { ProductionDiscoveryCard } from "./ProductionDiscoveryCard";
import { SearchBar } from "./SearchBar";
import { SelectionChip } from "./SelectionChip";

type SearchType = "productions" | "venues" | "companies" | "members";

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
const INITIAL_DATA_UPDATED_AT = Date.now();

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

export function DiscoverScreen({
  browse = false,
  initialData = null,
}: {
  browse?: boolean;
  initialData?: SearchResponse | null;
}) {
  const params = useLocalSearchParams<{
    q?: string | string[];
    type?: string | string[];
  }>();
  const router = useRouter();
  const initialQuery = parameter(params.q).trim();
  const initialType = parameter(params.type) as SearchType;
  const [input, setInput] = useState(initialQuery);
  const [nativeQuery, setNativeQuery] = useState(initialQuery);
  const [type, setType] = useState<SearchType>(
    tabs.some((tab) => tab.value === initialType) ? initialType : "productions",
  );
  const [discipline, setDiscipline] = useState<Discipline | undefined>();
  const [temporal, setTemporal] = useState<"upcoming" | "past" | "all">(
    browse ? "upcoming" : "all",
  );
  const [sort, setSort] = useState<"relevance" | "date" | "proximity" | "popularity">(
    browse ? "date" : "relevance",
  );
  const [locality, setLocality] = useState("");
  const [radiusKm, setRadiusKm] = useState<number | undefined>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const query = Platform.OS === "web" ? initialQuery : nativeQuery;
  const canUseInitialData =
    browse && initialData !== null && initialData.type === type && query.length === 0;
  const validFrom = isIsoCalendarDate(fromDate);
  const validTo = isIsoCalendarDate(toDate);
  const invalidDateRange = validFrom && validTo && fromDate > toDate;
  const defaultSort = browse ? "date" : "relevance";
  const advancedFilterCount =
    type === "members"
      ? 0
      : type === "productions"
        ? [
            Boolean(locality.trim()),
            radiusKm !== undefined,
            Boolean(fromDate),
            Boolean(toDate),
            sort !== defaultSort,
          ].filter(Boolean).length
        : Number(Boolean(locality.trim()));

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
    ...(canUseInitialData
      ? {
          initialData: { pages: [initialData], pageParams: [null] },
          initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
        }
      : {}),
    enabled: browse || query.length >= 2,
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

  function changeType(nextType: SearchType) {
    setType(nextType);
    if (Platform.OS === "web" && query) {
      router.replace({
        pathname: "/search",
        params: { q: query, type: nextType },
      });
    }
  }

  return (
    <PageScrollView
      contentContainerClassName="flex-grow"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View className="todam-page-before-footer mx-auto w-full max-w-content flex-1 gap-6 px-5 py-6 md:gap-8 md:px-8 md:py-12">
        <View className="gap-4">
          <SectionTitle eyebrow="Catalogue" level={1}>
            {browse ? "Découvrir les spectacles" : "Rechercher dans Todam"}
          </SectionTitle>
          <Text className="max-w-3xl text-base leading-6 text-muted">
            Théâtre, opéra et ballet : explorez les spectacles publiés, leurs lieux,
            leurs compagnies et les journaux partagés par les membres.
          </Text>
          {Platform.OS !== "web" || !browse ? (
            <View className="w-full max-w-2xl">
              <SearchBar
                accessibilityLabel="Titre, compagnie, lieu ou membre"
                onChangeText={setInput}
                onClear={() => {
                  setInput("");
                  setNativeQuery("");
                  if (Platform.OS === "web") {
                    router.replace({
                      pathname: browse ? "/decouvrir" : "/search",
                      params: { type },
                    });
                  }
                }}
                onSubmit={() => submit()}
                placeholder="Rechercher dans Todam"
                value={input}
                webName="catalog-search"
              />
            </View>
          ) : null}
        </View>

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
                    Filtres ({advancedFilterCount})
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
                    <View className="max-w-sm">
                      <TextField
                        autoComplete="off"
                        label={
                          type === "companies"
                            ? "Ville de la compagnie"
                            : "Ville ou proximité"
                        }
                        onChangeText={(value) => {
                          setLocality(value);
                          if (!value.trim() && sort === "proximity") {
                            setSort("relevance");
                          }
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
                        <View className="gap-3 md:flex-row">
                          <View className="w-full md:max-w-48">
                            <TextField
                              autoComplete="off"
                              error={
                                fromDate && !validFrom
                                  ? "Format attendu : AAAA-MM-JJ"
                                  : undefined
                              }
                              label="Du"
                              maxLength={10}
                              onChangeText={setFromDate}
                              placeholder="AAAA-MM-JJ"
                              value={fromDate}
                              webName="catalog-date-from"
                            />
                          </View>
                          <View className="w-full md:max-w-48">
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
                      </View>
                    ) : null}
                    {type === "productions" ? (
                      <View className="gap-2">
                        <Text className="text-sm font-semibold text-ink">
                          Trier les résultats
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {(
                            [
                              ["relevance", "Pertinence"],
                              ["date", "Date"],
                              ["proximity", "Proximité"],
                              ["popularity", "Popularité"],
                            ] as const
                          ).map(([value, label]) => (
                            <FilterButton
                              active={sort === value}
                              disabled={value === "proximity" && !locality.trim()}
                              key={value}
                              label={label}
                              onPress={() => setSort(value)}
                            />
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
          {!browse && query.length < 2 ? (
            <View className="border-l-2 border-accent py-2 pl-4">
              <Text className="text-base leading-6 text-muted">
                Saisissez au moins deux caractères pour lancer la recherche.
              </Text>
            </View>
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
                      label="Ajouter ce spectacle"
                      onPress={() =>
                        router.push({
                          pathname: "/ajouter-un-spectacle",
                          params: { title: query.trim() },
                        })
                      }
                    />
                  ) : null}
                  <Link href="/decouvrir" asChild>
                    <Button
                      accessibilityRole="link"
                      label="Explorer tout le catalogue"
                      variant="secondary"
                    />
                  </Link>
                </View>
              }
              emptyMessage="Aucun résultat. Modifiez la période, la ville ou le type de contenu."
              error={search.isError}
              loading={search.isPending}
              onRetry={() => void search.refetch()}
            >
              <View className="gap-5">
                <View className="flex-row flex-wrap items-end justify-between gap-3">
                  <Text
                    aria-level={2}
                    accessibilityRole="header"
                    className="font-serif text-2xl font-semibold text-ink"
                  >
                    {resultCount} résultat{resultCount > 1 ? "s" : ""}
                  </Text>
                  {firstPage?.suggestion ? (
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-11 justify-center"
                      onPress={() => submit(firstPage.suggestion!)}
                    >
                      <Text className="text-base font-semibold text-accent">
                        Rechercher « {firstPage.suggestion} »
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {productions.length > 0 ? (
                  <View className="todam-production-grid">
                    {productions.map((production) => (
                      <ProductionDiscoveryCard
                        headingLevel={2}
                        key={production.id}
                        production={production}
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
                      <Text className="mt-1 text-sm font-semibold text-accent">
                        Voir les productions et les dates de tournée
                      </Text>
                    </Pressable>
                  </Link>
                ))}
                {members.map((member) => (
                  <Link
                    href={`/membre/${member.username}`}
                    key={member.username}
                    asChild
                  >
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
          )}
        </View>
      </View>
      <LegalFooter />
    </PageScrollView>
  );
}

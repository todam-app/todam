import { useQuery } from "@tanstack/react-query";
import { Button, SectionTitle } from "@todam/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Text, View } from "react-native";

import { AsyncState } from "../../components/AsyncState";
import { LegalFooter } from "../../components/LegalFooter";
import { PageScrollView } from "../../components/PageScrollView";
import { ProductionListItem } from "../../components/ProductionListItem";
import { SearchBar } from "../../components/SearchBar";
import { api } from "../../lib/api";

const suggestions = ["Théâtre des Muses", "théâtre"];

function parameter(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const router = useRouter();
  const initialQuery = parameter(params.q).trim();
  const [input, setInput] = useState(initialQuery);
  const [nativeQuery, setNativeQuery] = useState(initialQuery);
  const query = Platform.OS === "web" ? initialQuery : nativeQuery;
  const search = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search(query),
    enabled: query.length >= 2,
    refetchOnWindowFocus: false,
    retry: false,
  });

  function submit(value = input) {
    const normalized = value.trim();
    setInput(value);
    if (normalized.length < 2) return;
    if (Platform.OS === "web") {
      router.replace({ pathname: "/search", params: { q: normalized } });
    } else {
      setNativeQuery(normalized);
    }
  }

  function clearNativeSearch() {
    setInput("");
    setNativeQuery("");
  }

  return (
    <PageScrollView
      contentContainerClassName="flex-grow"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View
        className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-content flex-1 px-5 pb-10 pt-14 md:px-8 md:pb-16 md:pt-20`}
      >
        {Platform.OS !== "web" ? (
          <View className="gap-8">
            <SectionTitle eyebrow="Catalogue">Rechercher</SectionTitle>
            <View className="max-w-2xl">
              <SearchBar
                accessibilityLabel="Titre, artiste ou théâtre"
                onChangeText={setInput}
                onClear={clearNativeSearch}
                onSubmit={() => submit()}
                placeholder="Ex. Théâtre des Muses"
                value={input}
              />
            </View>
          </View>
        ) : null}

        {!query ? (
          Platform.OS === "web" ? (
            <View
              className="w-full max-w-2xl self-center rounded-todam border border-line bg-paper px-6 py-10 md:px-10 md:py-12"
              testID="search-empty-state"
            >
              <View className="items-center gap-3">
                <Text className="text-xs font-extrabold uppercase tracking-widest text-accent">
                  Catalogue
                </Text>
                <Text
                  accessibilityRole="header"
                  className="text-center font-serif text-3xl font-bold leading-9 text-ink"
                >
                  Quel spectacle cherchez-vous ?
                </Text>
                <Text className="max-w-xl text-center leading-6 text-muted">
                  Recherchez par titre, artiste ou théâtre depuis la barre ci-dessus.
                </Text>
              </View>
              <View className="mt-8 items-center gap-3">
                <Text className="font-semibold text-ink">Exemples de recherches</Text>
                <View className="flex-row flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      label={suggestion}
                      onPress={() => submit(suggestion)}
                      variant="secondary"
                    />
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View className="mt-8 gap-3">
              <Text className="font-semibold text-ink">Recherches suggérées</Text>
              <View className="flex-row flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    label={suggestion}
                    onPress={() => submit(suggestion)}
                    variant="secondary"
                  />
                ))}
              </View>
            </View>
          )
        ) : (
          <View
            className={`w-full gap-4 ${
              Platform.OS === "web" ? "mx-auto max-w-3xl" : "mt-8"
            }`}
          >
            {Platform.OS === "web" ? (
              <SectionTitle eyebrow="Catalogue">
                Résultats pour « {query} »
              </SectionTitle>
            ) : (
              <Text
                accessibilityRole="header"
                className="font-serif text-2xl font-bold text-ink"
              >
                Résultats pour « {query} »
              </Text>
            )}
            <AsyncState
              empty={(search.data?.items.length ?? 0) === 0}
              emptyMessage="Aucun spectacle ne correspond. Essaie un autre titre, artiste ou lieu."
              error={search.isError}
              loading={search.isPending}
              onRetry={() => void search.refetch()}
            >
              <View className="gap-3">
                {search.data?.items.map((production) => (
                  <ProductionListItem key={production.id} production={production} />
                ))}
              </View>
            </AsyncState>
          </View>
        )}
      </View>
      <LegalFooter />
    </PageScrollView>
  );
}

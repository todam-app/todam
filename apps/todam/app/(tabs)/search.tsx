import { useQuery } from "@tanstack/react-query";
import { Button, SectionTitle, TextField } from "@todam/design-system";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { AsyncState } from "../../components/AsyncState";
import { LegalFooter } from "../../components/LegalFooter";
import { ProductionListItem } from "../../components/ProductionListItem";
import { api } from "../../lib/api";

const suggestions = ["Théâtre des Muses", "Monaco", "théâtre"];

export default function SearchScreen() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const search = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search(query),
    enabled: query.length >= 2,
  });

  function submit(value = input) {
    const normalized = value.trim();
    setInput(value);
    if (normalized.length >= 2) setQuery(normalized);
  }

  return (
    <ScrollView
      contentContainerClassName="flex-grow"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View className="mx-auto w-full max-w-content flex-1 gap-8 px-5 py-8 md:px-8 md:py-12">
        <SectionTitle eyebrow="Catalogue">Rechercher</SectionTitle>

        <View className="max-w-2xl gap-3">
          <TextField
            autoCapitalize="none"
            enterKeyHint="search"
            label="Titre, artiste ou théâtre"
            onChangeText={setInput}
            onSubmitEditing={() => submit()}
            placeholder="Ex. Théâtre des Muses"
            returnKeyType="search"
            value={input}
          />
          <View className="self-start">
            <Button
              disabled={input.trim().length < 2}
              label="Rechercher"
              onPress={() => submit()}
            />
          </View>
        </View>

        {!query ? (
          <View className="gap-3">
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
        ) : (
          <View className="gap-4">
            <Text
              accessibilityRole="header"
              className="font-serif text-2xl font-bold text-ink"
            >
              Résultats pour « {query} »
            </Text>
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
    </ScrollView>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CityOption, CitySelection } from "@todam/contracts";
import { Button, TextField } from "@todam/design-system";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../lib/api";
import { SelectionChip } from "./SelectionChip";

export function HomeCitySelector({ city }: { city: CityOption | null }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(city === null);
  const [input, setInput] = useState(city?.locality ?? "");
  const cityQuery = useQuery({
    queryKey: ["catalog-cities", input.trim()],
    queryFn: () => api.searchCities(input.trim()),
    enabled: editing && input.trim().length >= 1,
    retry: false,
  });
  const cityMutation = useMutation({
    mutationFn: (nextCity: CitySelection | null) => api.setHomeCity(nextCity),
    onSuccess: (savedCity) => {
      setInput(savedCity?.locality ?? "");
      setEditing(savedCity === null);
      void queryClient.invalidateQueries({ queryKey: ["home"] });
    },
  });

  if (!editing && city) {
    return (
      <View
        className="todam-calm-panel gap-3 p-5 md:flex-row md:items-center md:justify-between"
        testID="home-city-selector"
      >
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-accent">
            Votre ville
          </Text>
          <Text className="text-xl font-semibold text-ink">{city.label}</Text>
          <Text className="text-sm text-muted">
            Les spectacles sont recherchés dans un rayon de 50 km.
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Button
            label="Modifier ma ville"
            onPress={() => setEditing(true)}
            variant="quiet"
          />
          <Button
            label="Supprimer ma ville"
            loading={cityMutation.isPending}
            onPress={() => cityMutation.mutate(null)}
            variant="dangerGhost"
          />
        </View>
      </View>
    );
  }

  return (
    <View
      className="todam-form-panel gap-4 p-5"
      testID="home-city-selector"
    >
      <View className="gap-1">
        <Text className="text-lg font-semibold text-ink">Choisissez votre ville</Text>
        <Text className="text-base leading-5 text-muted">
          Todam affichera les spectacles programmés dans un rayon de 50 km.
        </Text>
      </View>
      <TextField
        autoCapitalize="words"
        autoComplete="off"
        label="Ville"
        onChangeText={setInput}
        placeholder="Ex. Monaco"
        value={input}
        webAutoComplete="address-level2"
        webName="home-city"
      />
      {input.trim().length === 0 ? (
        <Text className="text-sm text-muted">
          Saisissez au moins une lettre puis choisissez une ville proposée.
        </Text>
      ) : cityQuery.isPending ? (
        <Text className="text-sm text-muted">Recherche des villes…</Text>
      ) : cityQuery.isError ? (
        <Text accessibilityRole="alert" className="text-sm text-error">
          Les villes ne peuvent pas être chargées. Réessayez.
        </Text>
      ) : cityQuery.data?.length === 0 ? (
        <Text className="text-sm text-muted">
          {"Cette ville n'est pas encore présente dans le catalogue."}
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {cityQuery.data?.map((option) => (
            <SelectionChip
              key={`${option.countryCode}-${option.locality}`}
              label={option.label}
              loading={
                cityMutation.isPending &&
                option.locality === input &&
                option.countryCode === city?.countryCode
              }
              onPress={() => cityMutation.mutate(option)}
              selected={
                option.locality === city?.locality &&
                option.countryCode === city.countryCode
              }
            />
          ))}
        </View>
      )}
      {cityMutation.isError ? (
        <Text accessibilityRole="alert" className="text-sm text-error">
          {"La ville n'a pas été enregistrée. Réessayez."}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-center gap-x-1">
        <Text className="text-sm leading-5 text-muted">
          Cette ville facultative sera enregistrée dans votre compte. Vous pourrez la
          modifier ou la supprimer à tout moment.
        </Text>
        <Link href="/confidentialite" asChild>
          <Pressable accessibilityRole="link" className="min-h-11 justify-center">
            <Text className="text-base font-semibold text-accent">En savoir plus</Text>
          </Pressable>
        </Link>
      </View>
      {city ? (
        <View className="self-start">
          <Button
            label="Annuler"
            onPress={() => {
              setInput(city.locality);
              setEditing(false);
            }}
            variant="quiet"
          />
        </View>
      ) : null}
    </View>
  );
}

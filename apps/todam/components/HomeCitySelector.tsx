import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CityOption, CitySelection } from "@todam/contracts";
import { Button, TextField } from "@todam/design-system";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../lib/api";

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
      <View className="gap-3 rounded-todam border border-line bg-paper p-5 md:flex-row md:items-center md:justify-between">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-extrabold uppercase tracking-[1.5px] text-accent">
            Votre ville
          </Text>
          <Text className="text-xl font-semibold text-ink">{city.label}</Text>
          <Text className="text-sm text-muted">
            Les spectacles sont recherchés dans un rayon de 50 km.
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Button
            label="Modifier"
            onPress={() => setEditing(true)}
            variant="secondary"
          />
          <Button
            label="Supprimer"
            loading={cityMutation.isPending}
            onPress={() => cityMutation.mutate(null)}
            variant="ghost"
          />
        </View>
      </View>
    );
  }

  return (
    <View className="gap-4 rounded-todam border border-line bg-paper p-5">
      <View className="gap-1">
        <Text className="text-lg font-semibold text-ink">Choisissez votre ville</Text>
        <Text className="leading-5 text-muted">
          Todam affichera les spectacles programmés dans un rayon de 50 km.
        </Text>
      </View>
      <TextField
        autoCapitalize="words"
        label="Ville"
        onChangeText={setInput}
        placeholder="Ex. Monaco"
        value={input}
      />
      {input.trim().length === 0 ? (
        <Text className="text-sm text-muted">
          Saisissez au moins une lettre puis choisissez une ville proposée.
        </Text>
      ) : cityQuery.isPending ? (
        <Text className="text-sm text-muted">Recherche des villes…</Text>
      ) : cityQuery.isError ? (
        <Text accessibilityRole="alert" className="text-sm text-[#A1261A]">
          Les villes ne peuvent pas être chargées. Réessayez.
        </Text>
      ) : cityQuery.data?.length === 0 ? (
        <Text className="text-sm text-muted">
          {"Cette ville n'est pas encore présente dans le catalogue."}
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {cityQuery.data?.map((option) => (
            <Button
              key={`${option.countryCode}-${option.locality}`}
              label={option.label}
              loading={
                cityMutation.isPending &&
                option.locality === input &&
                option.countryCode === city?.countryCode
              }
              onPress={() => cityMutation.mutate(option)}
              variant="secondary"
            />
          ))}
        </View>
      )}
      {cityMutation.isError ? (
        <Text accessibilityRole="alert" className="text-sm text-[#A1261A]">
          {"La ville n'a pas été enregistrée. Réessayez."}
        </Text>
      ) : null}
      <Text className="text-sm leading-5 text-muted">
        Cette ville facultative sera enregistrée dans votre compte. Vous pourrez la
        modifier ou la supprimer à tout moment.{" "}
        <Link href="/confidentialite" asChild>
          <Pressable accessibilityRole="link">
            <Text className="font-semibold text-accent">En savoir plus</Text>
          </Pressable>
        </Link>
      </Text>
      {city ? (
        <View className="self-start">
          <Button
            label="Annuler"
            onPress={() => {
              setInput(city.locality);
              setEditing(false);
            }}
            variant="ghost"
          />
        </View>
      ) : null}
    </View>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ViewerProductionState } from "@todam/contracts";
import { Button, PosterPlaceholder, SectionTitle } from "@todam/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { AsyncState } from "../../components/AsyncState";
import { RatingPicker } from "../../components/RatingPicker";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth-client";
import { formatPerformance } from "../../lib/format";

function parameter(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function ProductionScreen() {
  const params = useLocalSearchParams<{
    resumeAction?: string;
    resumeRating?: string;
    slug: string;
  }>();
  const slug = parameter(params.slug) ?? "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const [actionError, setActionError] = useState(false);
  const resumed = useRef(false);

  const production = useQuery({
    queryKey: ["production", slug],
    queryFn: () => api.getProduction(slug),
    enabled: Boolean(slug),
  });
  const productionId = production.data?.id;
  const stateKey = ["production-state", productionId] as const;
  const viewerState = useQuery({
    queryKey: stateKey,
    queryFn: () => api.getProductionState(productionId ?? ""),
    enabled: Boolean(productionId && session.data),
  });

  function updateState(next: ViewerProductionState) {
    queryClient.setQueryData(stateKey, next);
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const seenMutation = useMutation({
    mutationFn: () =>
      api.markSeen({
        productionId: productionId ?? "",
        performanceId: null,
        attendedOn: null,
      }),
    onSuccess: updateState,
    onError: () => setActionError(true),
  });
  const ratingMutation = useMutation({
    mutationFn: (value: number) => api.setRating(productionId ?? "", value),
    onMutate: async (value) => {
      setActionError(false);
      const previous = queryClient.getQueryData<ViewerProductionState>(stateKey);
      if (previous) {
        queryClient.setQueryData<ViewerProductionState>(stateKey, {
          ...previous,
          rating: value,
          seen: true,
          watchlisted: false,
        });
      }
      return { previous };
    },
    onError: (_error, _value, context) => {
      if (context?.previous) queryClient.setQueryData(stateKey, context.previous);
      setActionError(true);
    },
    onSuccess: updateState,
  });
  const deleteRatingMutation = useMutation({
    mutationFn: () => api.deleteRating(productionId ?? ""),
    onSuccess: updateState,
    onError: () => setActionError(true),
  });
  const watchlistMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled
        ? api.addToWatchlist(productionId ?? "")
        : api.removeFromWatchlist(productionId ?? ""),
    onMutate: async (enabled) => {
      setActionError(false);
      const previous = queryClient.getQueryData<ViewerProductionState>(stateKey);
      if (previous) {
        queryClient.setQueryData<ViewerProductionState>(stateKey, {
          ...previous,
          watchlisted: enabled,
        });
      }
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      if (context?.previous) queryClient.setQueryData(stateKey, context.previous);
      setActionError(true);
    },
    onSuccess: updateState,
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

  function rate(value: number) {
    if (requireAccount("rating", value)) ratingMutation.mutate(value);
  }

  function toggleWatchlist() {
    if (requireAccount("watchlist")) {
      watchlistMutation.mutate(!viewerState.data?.watchlisted);
    }
  }

  function markSeen() {
    if (requireAccount("seen")) seenMutation.mutate();
  }

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
    if (action === "rating") {
      const value = Number.parseInt(parameter(params.resumeRating) ?? "", 10);
      if (value >= 1 && value <= 10) ratingMutation.mutate(value);
    }
    router.replace(`/production/${slug}`);
  }, [
    params.resumeAction,
    params.resumeRating,
    productionId,
    router,
    session.data,
    slug,
    viewerState.isPending,
    watchlistMutation,
    seenMutation,
    ratingMutation,
  ]);

  return (
    <ScrollView
      contentContainerClassName="mx-auto w-full max-w-content gap-8 px-5 py-8 md:px-8 md:py-12"
      contentInsetAdjustmentBehavior="automatic"
    >
      <AsyncState
        empty={!production.data}
        emptyMessage="Ce spectacle est introuvable."
        error={production.isError}
        loading={production.isPending}
        onRetry={() => void production.refetch()}
      >
        {production.data ? (
          <>
            <View className="gap-6 md:flex-row md:items-start">
              <View className="w-full max-w-[220px]">
                <PosterPlaceholder
                  discipline={production.data.discipline}
                  title={production.data.title}
                />
              </View>
              <View className="min-w-0 flex-1 gap-4">
                <Text className="text-xs font-extrabold uppercase tracking-[2px] text-accent">
                  {production.data.discipline} · {production.data.audience}
                </Text>
                <Text
                  accessibilityRole="header"
                  className="font-serif text-4xl font-black leading-[44px] text-ink md:text-5xl"
                >
                  {production.data.title}
                </Text>
                {production.data.credits.length > 0 ? (
                  <View className="gap-1">
                    {production.data.credits.map((credit) => (
                      <Text
                        className="text-muted"
                        key={`${credit.role}-${credit.artistId}`}
                      >
                        {credit.label ?? credit.role} · {credit.artistName}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View className="gap-3">
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      disabled={seenMutation.isPending}
                      label={viewerState.data?.seen ? "Déjà vu" : "Marquer vu"}
                      onPress={markSeen}
                      variant={viewerState.data?.seen ? "secondary" : "primary"}
                    />
                    <Button
                      disabled={watchlistMutation.isPending}
                      label={
                        viewerState.data?.watchlisted
                          ? "Retirer de À voir"
                          : "Ajouter à À voir"
                      }
                      onPress={toggleWatchlist}
                      variant="secondary"
                    />
                  </View>
                  <Text className="font-semibold text-ink">Ma note</Text>
                  <RatingPicker
                    disabled={ratingMutation.isPending}
                    onChange={rate}
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
                  {!session.data ? (
                    <Text className="text-sm text-muted">
                      Le catalogue est public. Un compte est demandé uniquement pour
                      conserver une action personnelle.
                    </Text>
                  ) : null}
                  {actionError ? (
                    <Text accessibilityRole="alert" className="text-[#A1261A]">
                      L’action n’a pas été enregistrée. Réessaie.
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View className="gap-4">
              <SectionTitle>Représentations</SectionTitle>
              {production.data.performances.length === 0 ? (
                <Text className="text-muted">
                  Aucune représentation datée n’est actuellement publiée.
                </Text>
              ) : (
                <View className="gap-2">
                  {production.data.performances.map((performance) => (
                    <View
                      className="gap-1 rounded-todam border border-line bg-paper p-4"
                      key={performance.id}
                    >
                      <Text className="font-semibold text-ink">
                        {formatPerformance(
                          performance.startsAt,
                          performance.venue.timezone,
                        )}
                      </Text>
                      <Text className="text-muted">
                        {performance.venue.name} · {performance.venue.locality}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {production.data.sourceUrls.length > 0 ? (
              <Text className="text-xs text-muted">
                Données vérifiées à partir des sources officielles référencées par
                Todam.
              </Text>
            ) : null}
          </>
        ) : null}
      </AsyncState>
    </ScrollView>
  );
}

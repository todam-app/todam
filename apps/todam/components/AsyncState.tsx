import { Button, tokens } from "@todam/design-system";
import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export interface AsyncStateProps {
  children: ReactNode;
  empty: boolean;
  emptyAction?: ReactNode;
  emptyMessage: string;
  error: boolean;
  loading: boolean;
  onRetry?: (() => void) | undefined;
}

export function AsyncState({
  children,
  empty,
  emptyAction,
  emptyMessage,
  error,
  loading,
  onRetry,
}: AsyncStateProps) {
  if (loading) {
    return (
      <View
        accessibilityLabel="Chargement en cours"
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        className="min-h-44 items-center justify-center gap-3"
      >
        <ActivityIndicator color={tokens.color.accent} />
        <Text className="text-base leading-6 text-muted">Chargement…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View className="min-h-44 items-center justify-center gap-3 rounded-todam border border-line bg-paper p-6">
        <Text
          accessibilityRole="alert"
          className="text-center text-base leading-6 text-ink"
        >
          Une erreur réseau empêche l’affichage.
        </Text>
        {onRetry ? <Button label="Réessayer" onPress={onRetry} /> : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View
        accessibilityLiveRegion="polite"
        className="min-h-44 items-center justify-center gap-4 rounded-todam border border-line bg-paper p-6"
      >
        <Text className="text-center text-base leading-6 text-muted">
          {emptyMessage}
        </Text>
        {emptyAction}
      </View>
    );
  }
  return children;
}

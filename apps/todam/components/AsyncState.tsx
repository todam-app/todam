import { Button, tokens } from "@todam/design-system";
import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export interface AsyncStateProps {
  children: ReactNode;
  empty: boolean;
  emptyMessage: string;
  error: boolean;
  loading: boolean;
  onRetry?: (() => void) | undefined;
}

export function AsyncState({
  children,
  empty,
  emptyMessage,
  error,
  loading,
  onRetry,
}: AsyncStateProps) {
  if (loading) {
    return (
      <View
        accessibilityLabel="Chargement en cours"
        className="min-h-44 items-center justify-center gap-3"
      >
        <ActivityIndicator color={tokens.color.accent} />
        <Text className="text-muted">Chargement…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View className="min-h-44 items-center justify-center gap-3 rounded-todam border border-line bg-paper p-6">
        <Text accessibilityRole="alert" className="text-center text-ink">
          Une erreur réseau empêche l’affichage.
        </Text>
        {onRetry ? <Button label="Réessayer" onPress={onRetry} /> : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View className="min-h-44 items-center justify-center rounded-todam border border-line bg-paper p-6">
        <Text className="text-center text-muted">{emptyMessage}</Text>
      </View>
    );
  }
  return children;
}

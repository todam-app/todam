import Ionicons from "@expo/vector-icons/Ionicons";
import { tokens } from "@todam/design-system";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { getProductionActionsPresentation } from "../lib/production-actions";

type IconName = ComponentProps<typeof Ionicons>["name"];
type ActionTone = "primary" | "secondary" | "success";

interface ActionButtonProps {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: IconName;
  label: string;
  loading?: boolean;
  onPress: () => void;
  selected?: boolean;
  subtitle?: string;
  tone: ActionTone;
  trailingIcon?: IconName;
}

function ActionButton({
  accessibilityLabel,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  selected = false,
  subtitle,
  tone,
  trailingIcon,
}: ActionButtonProps) {
  const foreground =
    tone === "primary"
      ? tokens.color.surface
      : tone === "success"
        ? tokens.color.success
        : tokens.color.ink;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, selected }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        tone === "primary" && styles.actionPrimary,
        tone === "secondary" && styles.actionSecondary,
        tone === "success" && styles.actionSuccess,
        pressed && styles.actionPressed,
        (disabled || loading) && styles.actionDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator accessibilityLabel="Chargement" color={foreground} />
      ) : (
        <>
          <Ionicons
            accessibilityElementsHidden
            color={foreground}
            importantForAccessibility="no"
            name={icon}
            size={22}
          />
          <View style={styles.copy}>
            <Text style={[styles.label, { color: foreground }]}>{label}</Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      tone === "success" ? tokens.color.success : tokens.color.muted,
                  },
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {trailingIcon ? (
            <Ionicons
              accessibilityElementsHidden
              color={foreground}
              importantForAccessibility="no"
              name={trailingIcon}
              size={20}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

export interface ProductionActionsProps {
  onSeenPress: () => void;
  onWatchlistPress: () => void;
  seen: boolean;
  seenLoading?: boolean;
  watchlisted: boolean;
  watchlistLoading?: boolean;
}

export function ProductionActions({
  onSeenPress,
  onWatchlistPress,
  seen,
  seenLoading = false,
  watchlisted,
  watchlistLoading = false,
}: ProductionActionsProps) {
  const { width } = useWindowDimensions();
  const presentation = getProductionActionsPresentation({
    seen,
    seenLoading,
    watchlisted,
    watchlistLoading,
  });

  return (
    <View style={[styles.actions, width >= 768 && styles.actionsWide]}>
      <ActionButton
        accessibilityLabel={presentation.watchlist.accessibilityLabel}
        icon={presentation.watchlist.icon}
        label={presentation.watchlist.label}
        loading={presentation.watchlist.loading}
        onPress={onWatchlistPress}
        selected={presentation.watchlist.selected}
        tone={presentation.watchlist.tone}
      />
      <ActionButton
        accessibilityLabel={presentation.seen.accessibilityLabel}
        icon={presentation.seen.icon}
        label={presentation.seen.label}
        loading={presentation.seen.loading}
        onPress={onSeenPress}
        selected={presentation.seen.selected}
        tone={presentation.seen.tone}
        {...(presentation.seen.subtitle
          ? { subtitle: presentation.seen.subtitle }
          : {})}
        {...(presentation.seen.trailingIcon
          ? { trailingIcon: presentation.seen.trailingIcon }
          : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: tokens.radius.medium,
    flex: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-start",
    minHeight: 64,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 10,
    width: "100%",
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionPressed: {
    opacity: 0.76,
  },
  actionPrimary: {
    backgroundColor: tokens.color.accent,
  },
  actionSecondary: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
  },
  actionSuccess: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.success,
    borderWidth: 1,
  },
  actions: {
    gap: 12,
    width: "100%",
  },
  actionsWide: {
    flexDirection: "row",
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
});

import Ionicons from "@expo/vector-icons/Ionicons";
import { tokens } from "@todam/design-system";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type PressableProps,
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
  tone: ActionTone;
}

function ActionButton({
  accessibilityLabel,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  selected = false,
  tone,
}: ActionButtonProps) {
  const primaryWebButton = Platform.OS === "web" && tone === "primary";
  const secondaryWebButton = Platform.OS === "web" && tone === "secondary";
  const foreground = primaryWebButton
    ? tokens.button.standard.text
    : secondaryWebButton
      ? tokens.button.quiet.text
      : tone === "primary"
        ? tokens.color.surface
        : tone === "success"
          ? tokens.color.accent
          : tokens.color.ink;
  const webInteractionProps =
    primaryWebButton || secondaryWebButton
      ? ({
          dataSet: {
            todamCta: primaryWebButton ? "standard" : "quiet",
          },
        } as unknown as PressableProps)
      : {};

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, selected }}
      disabled={disabled || loading}
      onPress={onPress}
      {...webInteractionProps}
      style={({ pressed }) => [
        styles.action,
        primaryWebButton && styles.actionStandardWeb,
        secondaryWebButton && styles.actionQuietWeb,
        !primaryWebButton && tone === "primary" && styles.actionPrimary,
        !secondaryWebButton && tone === "secondary" && styles.actionSecondary,
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
            <Text
              style={[
                styles.label,
                (primaryWebButton || secondaryWebButton) &&
                  styles.labelStandardWeb,
                { color: foreground },
              ]}
            >
              {label}
            </Text>
          </View>
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
        disabled={seen}
        icon={presentation.seen.icon}
        label={presentation.seen.label}
        loading={presentation.seen.loading}
        onPress={onSeenPress}
        selected={presentation.seen.selected}
        tone={presentation.seen.tone}
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
    backgroundColor: tokens.color.disabled,
    borderColor: tokens.color.controlBorder,
  },
  actionPressed: {
    transform: [{ translateY: 1 }],
  },
  actionPrimary: {
    backgroundColor: tokens.color.accent,
  },
  actionSecondary: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.controlBorder,
    borderWidth: 1,
  },
  actionStandardWeb: {
    backgroundColor: tokens.button.standard.background,
    borderColor: tokens.button.standard.border,
    borderRadius: tokens.button.standard.radius,
    borderWidth: tokens.button.standard.borderWidth,
    boxSizing: "border-box",
  },
  actionQuietWeb: {
    backgroundColor: tokens.button.quiet.background,
    borderColor: tokens.button.quiet.border,
    borderRadius: tokens.button.quiet.radius,
    borderWidth: tokens.button.quiet.borderWidth,
    boxSizing: "border-box",
  },
  actionSuccess: {
    backgroundColor: tokens.color.selectedSurface,
    borderColor: tokens.color.selectedBorder,
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
  labelStandardWeb: {
    fontFamily: tokens.button.standard.fontFamily,
    fontWeight: tokens.button.standard.fontWeight,
  },
});

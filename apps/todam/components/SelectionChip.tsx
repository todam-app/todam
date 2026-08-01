import Ionicons from "@expo/vector-icons/Ionicons";
import { tokens } from "@todam/design-system";
import { ActivityIndicator, Pressable, Text } from "react-native";

export function SelectionChip({
  accessibilityLabel,
  disabled = false,
  indicator = "check",
  label,
  loading = false,
  onPress,
  rounded = false,
  selected,
  testID,
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  indicator?: "check" | "chevron" | "none";
  label: string;
  loading?: boolean;
  onPress: () => void;
  rounded?: boolean;
  selected: boolean;
  testID?: string;
}) {
  const icon =
    indicator === "chevron"
      ? "chevron-down"
      : indicator === "check" && selected
        ? "checkmark"
        : null;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: disabled || loading, selected }}
      className={`min-h-11 flex-row items-center justify-center gap-2 border px-4 ${
        rounded ? "rounded-full" : "rounded-todam"
      } ${
        disabled
          ? "border-control bg-disabled"
          : selected
            ? "border-selected-border bg-selected"
            : "border-control bg-paper"
      }`}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Chargement"
          color={tokens.color.accent}
          size="small"
        />
      ) : (
        <Text
          className={`text-sm font-semibold ${
            disabled ? "text-muted" : selected ? "text-accent" : "text-ink"
          }`}
        >
          {label}
        </Text>
      )}
      {!loading && icon ? (
        <Ionicons
          color={
            disabled
              ? tokens.color.muted
              : selected
                ? tokens.color.accent
                : tokens.color.muted
          }
          name={icon}
          size={16}
        />
      ) : null}
    </Pressable>
  );
}

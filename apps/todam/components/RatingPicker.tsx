import { tokens } from "@todam/design-system";
import {
  type PressableProps,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export interface RatingPickerProps {
  disabled?: boolean;
  onChange: (value: number) => void;
  value: number | null;
}

type KeyboardEventLike = {
  key?: string;
  nativeEvent?: { key?: string };
  preventDefault?: () => void;
};

export function RatingPicker({ disabled = false, onChange, value }: RatingPickerProps) {
  const { width } = useWindowDimensions();
  const compact = width < 520;

  function keyboardProps(rating: number, selected: boolean): PressableProps {
    if (Platform.OS !== "web") return {};
    return {
      onKeyDown: (event: KeyboardEventLike) => {
        if (disabled) return;
        const key = event.key ?? event.nativeEvent?.key;
        let nextRating: number | null = null;
        if (key === "ArrowRight" || key === "ArrowUp") {
          nextRating = rating === 10 ? 1 : rating + 1;
        } else if (key === "ArrowLeft" || key === "ArrowDown") {
          nextRating = rating === 1 ? 10 : rating - 1;
        } else if (key === "Home") {
          nextRating = 1;
        } else if (key === "End") {
          nextRating = 10;
        }
        if (nextRating === null) return;
        event.preventDefault?.();
        onChange(nextRating);
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(`[data-testid="rating-option-${nextRating}"]`)
            ?.focus();
        });
      },
      tabIndex: selected || value === null ? (rating === (value ?? 1) ? 0 : -1) : -1,
    } as unknown as PressableProps;
  }

  return (
    <View className="w-full gap-3">
      <Text
        accessibilityLiveRegion="polite"
        className="font-serif text-3xl font-semibold text-ink"
      >
        {value ?? "—"}
        <Text className="font-sans text-base font-medium text-muted">/10</Text>
      </Text>
      <View
        accessibilityLabel={value ? `Note actuelle : ${value} sur 10` : "Aucune note"}
        accessibilityRole="radiogroup"
        className="flex-row flex-wrap overflow-hidden rounded-panel border border-line bg-paper p-1"
      >
        {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => {
          const selected = value === rating;
          const illuminated = value !== null && rating <= value;
          return (
            <Pressable
              {...keyboardProps(rating, selected)}
              accessibilityLabel={`Noter ${rating} sur 10`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled, selected }}
              disabled={disabled}
              key={rating}
              onPress={() => onChange(rating)}
              testID={`rating-option-${rating}`}
              style={{
                alignItems: "center",
                backgroundColor: selected
                  ? tokens.color.selectedSurface
                  : disabled
                    ? tokens.color.disabled
                    : tokens.color.surface,
                borderColor: selected ? tokens.color.selectedBorder : "transparent",
                borderRadius: tokens.radius.medium,
                borderWidth: 1,
                gap: 2,
                justifyContent: "center",
                minHeight: 48,
                width: compact ? "20%" : "10%",
              }}
            >
              <View
                style={{
                  backgroundColor: illuminated
                    ? tokens.color.accent
                    : tokens.color.surface,
                  borderColor: tokens.color.selectedBorder,
                  borderRadius: tokens.radius.round,
                  borderWidth: 1,
                  height: 10,
                  width: 10,
                }}
              />
              <Text
                style={{
                  color: selected ? tokens.color.accent : tokens.color.muted,
                  fontSize: 10,
                  fontWeight: selected ? "700" : "500",
                }}
              >
                {rating}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs text-muted">Pas pour moi</Text>
        <Text className="text-xs text-muted">Inoubliable</Text>
      </View>
    </View>
  );
}

import { tokens } from "@todam/design-system";
import {
  type PressableProps,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
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
    <View className="w-full gap-2">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View
          accessibilityLabel={value ? `Note actuelle : ${value} sur 10` : "Aucune note"}
          accessibilityRole="radiogroup"
          className="flex-row overflow-hidden rounded-todam border border-control bg-paper"
          style={{ minWidth: 440, width: "100%" }}
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => {
            const selected = value === rating;
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
                    ? tokens.color.accent
                    : disabled
                      ? tokens.color.disabled
                      : tokens.color.surface,
                  borderLeftColor:
                    rating === 1 ? "transparent" : tokens.color.controlBorder,
                  borderLeftWidth: rating === 1 ? 0 : 1,
                  flex: 1,
                  justifyContent: "center",
                  minHeight: 44,
                  minWidth: 44,
                }}
              >
                <Text
                  style={{
                    color: selected ? tokens.color.surface : tokens.color.ink,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {rating}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View className="flex-row justify-between">
        <Text className="text-xs text-muted">Pas pour moi</Text>
        <Text className="text-xs text-muted">Inoubliable</Text>
      </View>
    </View>
  );
}

import { tokens } from "@todam/design-system";
import { Pressable, Text, View } from "react-native";

export interface RatingPickerProps {
  disabled?: boolean;
  onChange: (value: number) => void;
  value: number | null;
}

export function RatingPicker({ disabled = false, onChange, value }: RatingPickerProps) {
  return (
    <View
      accessibilityLabel={value ? `Note actuelle : ${value} sur 10` : "Aucune note"}
      className="flex-row flex-wrap gap-2"
    >
      {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => {
        const selected = value === rating;
        return (
          <Pressable
            accessibilityLabel={`Noter ${rating} sur 10`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={rating}
            onPress={() => onChange(rating)}
            style={{
              alignItems: "center",
              backgroundColor: selected ? tokens.color.accent : tokens.color.surface,
              borderColor: selected ? tokens.color.accent : tokens.color.border,
              borderRadius: 999,
              borderWidth: 1,
              height: 44,
              justifyContent: "center",
              width: 44,
            }}
          >
            <Text
              style={{
                color: selected ? tokens.color.surface : tokens.color.ink,
                fontWeight: "700",
              }}
            >
              {rating}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

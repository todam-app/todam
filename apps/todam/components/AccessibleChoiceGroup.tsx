import { tokens } from "@todam/design-system";
import {
  type PressableProps,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type KeyboardEventLike = {
  key?: string;
  nativeEvent?: { key?: string };
  preventDefault?: () => void;
};

export function AccessibleChoiceGroup<Value extends string>({
  compactGrid = false,
  label,
  onChange,
  options,
  testIdPrefix,
  value,
}: {
  compactGrid?: boolean;
  label: string;
  onChange: (value: Value) => void;
  options: readonly (readonly [Value, string])[];
  testIdPrefix: string;
  value: Value;
}) {
  function keyboardProps(index: number, selected: boolean): PressableProps {
    if (Platform.OS !== "web") return {};
    return {
      onKeyDown: (event: KeyboardEventLike) => {
        const key = event.key ?? event.nativeEvent?.key;
        let nextIndex: number | null = null;
        if (key === "ArrowRight" || key === "ArrowDown") {
          nextIndex = (index + 1) % options.length;
        } else if (key === "ArrowLeft" || key === "ArrowUp") {
          nextIndex = (index - 1 + options.length) % options.length;
        } else if (key === "Home") {
          nextIndex = 0;
        } else if (key === "End") {
          nextIndex = options.length - 1;
        }
        if (nextIndex === null) return;
        event.preventDefault?.();
        const next = options[nextIndex];
        if (!next) return;
        onChange(next[0]);
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(`[data-testid="${testIdPrefix}-${next[0]}"]`)
            ?.focus();
        });
      },
      tabIndex: selected ? 0 : -1,
    } as unknown as PressableProps;
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink">{label}</Text>
      <View
        {...(compactGrid ? { className: "todam-choice-group--compact-grid" } : {})}
        accessibilityLabel={label}
        accessibilityRole="radiogroup"
        style={styles.group}
      >
        {options.map(([option, optionLabel], index) => {
          const selected = option === value;
          return (
            <Pressable
              {...keyboardProps(index, selected)}
              {...(compactGrid
                ? { className: "todam-choice-option--compact-grid" }
                : {})}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, selected }}
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.option,
                selected ? styles.selected : styles.idle,
                pressed && styles.pressed,
              ]}
              testID={`${testIdPrefix}-${option}`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selected ? "text-accent" : "text-ink"
                }`}
              >
                {optionLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    columnGap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  idle: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.controlBorder,
  },
  option: {
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  selected: {
    backgroundColor: tokens.color.selectedSurface,
    borderColor: tokens.color.selectedBorder,
  },
});

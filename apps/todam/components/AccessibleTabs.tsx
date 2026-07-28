import { tokens } from "@todam/design-system";
import {
  type PressableProps,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export interface AccessibleTabItem<Value extends string> {
  label: string;
  value: Value;
}

type KeyboardEventLike = {
  key?: string;
  nativeEvent?: { key?: string };
  preventDefault?: () => void;
};

export function AccessibleTabs<Value extends string>({
  appearance = "underline",
  compactOnMobile = false,
  label,
  onChange,
  tabs,
  testIdPrefix,
  value,
}: {
  appearance?: "boxed" | "underline";
  compactOnMobile?: boolean;
  label: string;
  onChange: (value: Value) => void;
  tabs: readonly AccessibleTabItem<Value>[];
  testIdPrefix: string;
  value: Value;
}) {
  const { width } = useWindowDimensions();

  function keyboardProps(index: number, selected: boolean): PressableProps {
    if (Platform.OS !== "web") return {};
    return {
      onKeyDown: (event: KeyboardEventLike) => {
        const key = event.key ?? event.nativeEvent?.key;
        let nextIndex: number | null = null;
        if (key === "ArrowRight" || key === "ArrowDown") {
          nextIndex = (index + 1) % tabs.length;
        } else if (key === "ArrowLeft" || key === "ArrowUp") {
          nextIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (key === "Home") {
          nextIndex = 0;
        } else if (key === "End") {
          nextIndex = tabs.length - 1;
        }
        if (nextIndex === null) return;
        event.preventDefault?.();
        const next = tabs[nextIndex];
        if (!next) return;
        onChange(next.value);
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(`[data-testid="${testIdPrefix}-${next.value}"]`)
            ?.focus();
        });
      },
      tabIndex: selected ? 0 : -1,
    } as unknown as PressableProps;
  }

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="tablist"
      className={`todam-tabs-list ${
        appearance === "underline" ? "todam-tabs-underline" : "todam-tabs-boxed"
      }`}
      style={appearance === "underline" ? styles.underlineList : styles.boxedList}
    >
      {tabs.map((tab, index) => {
        const selected = value === tab.value;
        return (
          <Pressable
            {...keyboardProps(index, selected)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className="todam-tab-item"
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              styles.tab,
              appearance === "boxed" &&
                (selected ? styles.boxedSelected : styles.boxedIdle),
              appearance === "underline" && selected && styles.underlineSelected,
              appearance === "underline" &&
                width < 640 &&
                (compactOnMobile ? styles.compactMobileTab : styles.mobileUnderlineTab),
              pressed && styles.pressed,
            ]}
            testID={`${testIdPrefix}-${tab.value}`}
          >
            <Text
              adjustsFontSizeToFit={compactOnMobile}
              className={`text-base font-semibold ${
                selected
                  ? "text-accent"
                  : appearance === "boxed"
                    ? "text-ink"
                    : "text-muted"
              }`}
              minimumFontScale={compactOnMobile ? 0.78 : undefined}
              numberOfLines={compactOnMobile ? 1 : undefined}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  boxedIdle: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.controlBorder,
  },
  boxedList: {
    columnGap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  boxedSelected: {
    backgroundColor: tokens.color.selectedSurface,
    borderColor: tokens.color.accent,
  },
  compactMobileTab: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 5,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  mobileUnderlineTab: {
    alignItems: "center",
    flexBasis: "50%",
    width: "50%",
  },
  tab: {
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  underlineList: {
    borderBottomColor: tokens.color.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  underlineSelected: {
    borderBottomColor: tokens.color.accent,
    borderBottomWidth: 3,
  },
});

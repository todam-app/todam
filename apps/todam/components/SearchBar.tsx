import Ionicons from "@expo/vector-icons/Ionicons";
import { tokens } from "@todam/design-system";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

interface SearchBarProps {
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  placeholder: string;
  value: string;
  webName?: string;
}

export function SearchBar({
  accessibilityLabel,
  onChangeText,
  onClear,
  onSubmit,
  placeholder,
  value,
  webName = "search",
}: SearchBarProps) {
  const searchDisabled = value.trim().length < 2;

  function submitFromKeyboard(
    _event: Parameters<NonNullable<TextInputProps["onSubmitEditing"]>>[0],
  ) {
    if (!searchDisabled) onSubmit();
  }

  return (
    <View className="todam-search-bar" style={styles.container}>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoComplete="off"
        enterKeyHint="search"
        inputMode="search"
        onChangeText={onChangeText}
        onSubmitEditing={submitFromKeyboard}
        placeholder={placeholder}
        placeholderTextColor={tokens.color.muted}
        returnKeyType="search"
        style={styles.input}
        value={value}
        {...(Platform.OS === "web"
          ? ({ name: webName } as unknown as TextInputProps)
          : {})}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Effacer la recherche"
          accessibilityRole="button"
          hitSlop={4}
          onPress={onClear}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Ionicons
            accessibilityElementsHidden
            color={tokens.color.muted}
            importantForAccessibility="no"
            name="close"
            size={21}
          />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel="Rechercher"
        accessibilityRole="button"
        accessibilityState={{ disabled: searchDisabled }}
        disabled={searchDisabled}
        hitSlop={4}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.action,
          pressed && styles.actionPressed,
          searchDisabled && styles.actionDisabled,
        ]}
      >
        <Ionicons
          accessibilityElementsHidden
          color={searchDisabled ? tokens.color.muted : tokens.color.ink}
          importantForAccessibility="no"
          name="search"
          size={21}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    height: tokens.minimumTouchTarget,
    justifyContent: "center",
    width: tokens.minimumTouchTarget,
  },
  actionDisabled: {
    backgroundColor: tokens.color.disabled,
    borderLeftColor: tokens.color.controlBorder,
    borderLeftWidth: 1,
  },
  actionPressed: {
    opacity: 0.65,
  },
  container: {
    alignItems: "center",
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: tokens.minimumTouchTarget,
    overflow: "hidden",
    width: "100%",
  },
  input: {
    color: tokens.color.ink,
    flex: 1,
    fontSize: 16,
    minHeight: tokens.minimumTouchTarget - 2,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});

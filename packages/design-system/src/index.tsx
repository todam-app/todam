import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from "react-native";

import { tokens } from "./tokens.js";

export { tokens } from "./tokens.js";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  loading?: boolean;
  variant?: ButtonVariant;
}

export function Button({
  label,
  loading = false,
  variant = "primary",
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      style={(state) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        variant === "danger" && styles.buttonDanger,
        state.pressed && styles.buttonPressed,
        (disabled || loading) && styles.disabled,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Chargement"
          color={
            variant === "primary" || variant === "danger"
              ? tokens.color.surface
              : tokens.color.ink
          }
        />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            (variant === "primary" || variant === "danger") &&
              styles.buttonLabelPrimary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | undefined;
}

export function TextField({
  label,
  error,
  style,
  onBlur,
  onFocus,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={tokens.color.muted}
        style={[
          styles.input,
          style,
          focused && styles.inputFocused,
          error && styles.inputError,
          error && focused && styles.inputErrorFocused,
        ]}
        {...props}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export interface PosterPlaceholderProps {
  title: string;
  discipline: "theatre" | "opera" | "ballet";
  compact?: boolean;
}

const disciplineLabels = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
} as const;

export function PosterPlaceholder({
  title,
  discipline,
  compact = false,
}: PosterPlaceholderProps) {
  return (
    <View
      accessibilityLabel={`Affiche indisponible pour ${title}`}
      style={[styles.poster, compact && styles.posterCompact]}
    >
      <Text style={styles.posterMark}>T</Text>
      <Text numberOfLines={2} style={styles.posterTitle}>
        {title}
      </Text>
      <Text style={styles.posterDiscipline}>{disciplineLabels[discipline]}</Text>
    </View>
  );
}

export interface StatCardProps {
  label: string;
  value: number;
  onPress?: (() => void) | undefined;
}

export function StatCard({ label, value, onPress }: StatCardProps) {
  const content = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (!onPress) {
    return <View style={styles.stat}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityLabel={`${label} : ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && styles.buttonPressed]}
    >
      {content}
    </Pressable>
  );
}

export function SectionTitle({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.heading}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: tokens.radius.medium,
    justifyContent: "center",
    minHeight: tokens.minimumTouchTarget,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 10,
  },
  buttonGhost: {
    backgroundColor: "transparent",
  },
  buttonDanger: {
    backgroundColor: tokens.color.error,
  },
  buttonLabel: {
    color: tokens.color.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonLabelPrimary: {
    color: tokens.color.surface,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonPrimary: {
    backgroundColor: tokens.color.accent,
  },
  buttonSecondary: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    color: tokens.color.error,
    fontSize: 13,
  },
  field: {
    gap: tokens.space.sm,
  },
  fieldLabel: {
    color: tokens.color.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  heading: {
    color: tokens.color.ink,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  eyebrow: {
    color: tokens.color.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
    color: tokens.color.ink,
    fontSize: 16,
    minHeight: 48,
    outlineWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputFocused: {
    borderColor: tokens.color.accent,
    outlineColor: "rgba(196, 61, 40, 0.14)",
    outlineOffset: 0,
    outlineStyle: "solid",
    outlineWidth: 3,
  },
  inputError: {
    borderColor: tokens.color.error,
  },
  inputErrorFocused: {
    outlineColor: "rgba(161, 38, 26, 0.14)",
  },
  poster: {
    alignItems: "flex-start",
    aspectRatio: 2 / 3,
    backgroundColor: "#E6D8C8",
    borderRadius: tokens.radius.medium,
    justifyContent: "space-between",
    maxWidth: 220,
    minWidth: 150,
    overflow: "hidden",
    padding: tokens.space.md,
    width: "100%",
  },
  posterCompact: {
    minWidth: 84,
    width: 84,
  },
  posterDiscipline: {
    color: tokens.color.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  posterMark: {
    color: tokens.color.accent,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "900",
  },
  posterTitle: {
    color: tokens.color.ink,
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionTitle: {
    gap: tokens.space.xs,
  },
  stat: {
    alignItems: "center",
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 84,
    minWidth: 78,
    padding: tokens.space.sm,
  },
  statLabel: {
    color: tokens.color.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    color: tokens.color.ink,
    fontSize: 24,
    fontWeight: "800",
  },
});

import {
  createElement,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Platform,
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
  accessibilityState,
  style,
  onBlur,
  onFocus,
  ...props
}: ButtonProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        ...accessibilityState,
        busy: loading || accessibilityState?.busy,
        disabled: Boolean(disabled || loading),
      }}
      disabled={disabled || loading}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      style={(state) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        variant === "danger" && styles.buttonDanger,
        state.pressed && styles.buttonPressed,
        focused && styles.buttonFocused,
        (disabled || loading) && styles.disabled,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Chargement"
          color={
            disabled || loading
              ? tokens.color.muted
              : variant === "primary" || variant === "danger"
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
            disabled && styles.buttonLabelDisabled,
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
  required?: boolean | undefined;
  webAutoComplete?: string | undefined;
  webName?: string | undefined;
  trailingAction?:
    | {
        accessibilityLabel: string;
        label: string;
        onPress: () => void;
      }
    | undefined;
}

export function TextField({
  label,
  error,
  required = false,
  webAutoComplete,
  webName,
  trailingAction,
  style,
  onBlur,
  onFocus,
  nativeID,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const generatedId = useId().replace(/:/g, "");
  const inputId = nativeID ?? `todam-field-${generatedId}`;
  const labelId = `${inputId}-label`;
  const errorId = `${inputId}-error`;
  const webFormProps =
    Platform.OS === "web"
      ? ({
          name: webName,
          required,
          "aria-required": required,
          ...(error
            ? {
                "aria-describedby": errorId,
                "aria-invalid": true,
              }
            : {}),
          ...(webAutoComplete ? { autoComplete: webAutoComplete } : {}),
        } as unknown as TextInputProps)
      : {};

  return (
    <View style={styles.field}>
      {Platform.OS === "web" ? (
        createElement(
          "label",
          {
            htmlFor: inputId,
            id: labelId,
            style: styles.fieldLabel as CSSProperties,
          },
          label,
          required ? " *" : "",
        )
      ) : (
        <Text nativeID={labelId} style={styles.fieldLabel}>
          {label}
          {required ? " *" : ""}
        </Text>
      )}
      <View style={styles.inputFrame}>
        <TextInput
          accessibilityHint={error}
          accessibilityLabelledBy={labelId}
          nativeID={inputId}
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
            trailingAction && styles.inputWithTrailingAction,
            style,
            focused && styles.inputFocused,
            error && styles.inputError,
            error && focused && styles.inputErrorFocused,
          ]}
          {...props}
          {...webFormProps}
        />
        {trailingAction ? (
          <Pressable
            accessibilityLabel={trailingAction.accessibilityLabel}
            accessibilityRole="button"
            hitSlop={6}
            onPress={trailingAction.onPress}
            style={styles.trailingAction}
          >
            <Text style={styles.trailingActionLabel}>{trailingAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" nativeID={errorId} style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function PasswordField(props: Omit<TextFieldProps, "secureTextEntry">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      secureTextEntry={!visible}
      trailingAction={{
        accessibilityLabel: visible
          ? "Masquer le mot de passe"
          : "Afficher le mot de passe",
        label: visible ? "Masquer" : "Afficher",
        onPress: () => setVisible((value) => !value),
      }}
    />
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
      <Text
        numberOfLines={compact ? 3 : 2}
        style={[styles.posterTitle, compact && styles.posterTitleCompact]}
      >
        Visuel non publié
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
  level = 2,
}: {
  children: ReactNode;
  eyebrow?: string;
  level?: 1 | 2 | 3;
}) {
  return (
    <View style={styles.sectionTitle}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text aria-level={level} accessibilityRole="header" style={styles.heading}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: tokens.radius.medium,
    flexShrink: 1,
    justifyContent: "center",
    maxWidth: "100%",
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
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonLabelPrimary: {
    color: tokens.color.surface,
  },
  buttonLabelDisabled: {
    color: tokens.color.muted,
  },
  buttonPressed: {
    transform: [{ translateY: 1 }],
  },
  buttonFocused: {
    outlineColor: tokens.color.accent,
    outlineOffset: 2,
    outlineStyle: "solid",
    outlineWidth: 3,
  },
  buttonPrimary: {
    backgroundColor: tokens.color.accent,
  },
  buttonSecondary: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.controlBorder,
    borderWidth: 1,
  },
  disabled: {
    backgroundColor: tokens.color.disabled,
    borderColor: tokens.color.controlBorder,
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
    fontFamily: Platform.select({ web: "Source Serif 4", default: "serif" }),
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
    borderColor: tokens.color.controlBorder,
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
    color: tokens.color.ink,
    fontSize: 16,
    minHeight: 48,
    outlineWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputFrame: {
    position: "relative",
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
  inputWithTrailingAction: {
    paddingRight: 92,
  },
  trailingAction: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: tokens.space.sm,
    position: "absolute",
    right: 4,
    top: 0,
  },
  trailingActionLabel: {
    color: tokens.color.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  poster: {
    alignItems: "flex-start",
    aspectRatio: 2 / 3,
    backgroundColor: "#EEE7DC",
    borderRadius: tokens.radius.medium,
    justifyContent: "space-between",
    minWidth: 150,
    overflow: "hidden",
    padding: tokens.space.md,
    width: "100%",
  },
  posterCompact: {
    minWidth: 64,
    padding: tokens.space.sm,
    width: 64,
  },
  posterDiscipline: {
    color: tokens.color.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  posterMark: {
    color: tokens.color.accent,
    fontFamily: Platform.select({ web: "Source Serif 4", default: "serif" }),
    fontSize: 32,
    fontWeight: "900",
  },
  posterTitle: {
    color: tokens.color.ink,
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  posterTitleCompact: {
    fontSize: 11,
    lineHeight: 14,
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

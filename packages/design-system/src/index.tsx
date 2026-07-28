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

type ButtonVariant =
  "primary" | "secondary" | "featured" | "quiet" | "ghost" | "dangerGhost" | "danger";

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
  const standardWebButton =
    Platform.OS === "web" && (variant === "primary" || variant === "secondary");
  const featuredButton = variant === "featured";
  const quietWebButton = Platform.OS === "web" && variant === "quiet";
  const textAction = variant === "ghost" || variant === "dangerGhost";
  const webInteraction =
    Platform.OS !== "web"
      ? undefined
      : standardWebButton
        ? "standard"
        : featuredButton
          ? "featured"
          : quietWebButton
            ? "quiet"
            : variant === "ghost"
              ? "action-link"
              : variant === "dangerGhost"
                ? "danger-link"
                : variant === "danger"
                  ? "danger"
                  : undefined;
  const webInteractionProps = webInteraction
    ? ({
        dataSet: {
          todamCta: webInteraction,
        },
      } as unknown as PressableProps)
    : {};

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
        standardWebButton && styles.buttonStandardWeb,
        featuredButton && styles.buttonFeatured,
        quietWebButton && styles.buttonQuietWeb,
        !standardWebButton && variant === "primary" && styles.buttonPrimary,
        !standardWebButton &&
          !quietWebButton &&
          variant === "secondary" &&
          styles.buttonSecondary,
        Platform.OS !== "web" && variant === "quiet" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        variant === "dangerGhost" && styles.buttonGhost,
        variant === "danger" && styles.buttonDanger,
        state.pressed && (textAction ? styles.textActionPressed : styles.buttonPressed),
        focused && styles.buttonFocused,
        (disabled || loading) &&
          (textAction ? styles.textActionDisabled : styles.disabled),
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
      {...webInteractionProps}
    >
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Chargement"
          color={
            disabled
              ? tokens.color.muted
              : standardWebButton
                ? tokens.button.standard.text
                : featuredButton
                  ? tokens.button.featured.text
                  : quietWebButton
                    ? tokens.button.quiet.text
                    : variant === "danger"
                      ? tokens.color.surface
                      : variant === "dangerGhost"
                        ? tokens.color.error
                        : variant === "ghost"
                          ? tokens.color.accent
                          : tokens.color.ink
          }
        />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            standardWebButton && styles.buttonLabelStandardWeb,
            featuredButton && styles.buttonLabelFeatured,
            quietWebButton && styles.buttonLabelQuietWeb,
            variant === "ghost" && styles.buttonLabelGhost,
            variant === "dangerGhost" && styles.buttonLabelDangerGhost,
            !standardWebButton &&
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
  brandSymbol?: ReactNode;
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
  brandSymbol,
}: PosterPlaceholderProps) {
  const titleSeed = Array.from(title).reduce(
    (total, character) => (total + character.codePointAt(0)!) % 17,
    0,
  );
  const compositionStyle =
    discipline === "theatre"
      ? styles.posterTheatre
      : discipline === "opera"
        ? styles.posterOpera
        : styles.posterBallet;

  return (
    <View
      accessibilityLabel={`Affiche indisponible pour ${title}`}
      style={[styles.poster, compositionStyle, compact && styles.posterCompact]}
    >
      <View
        style={[
          styles.posterOrb,
          discipline === "theatre"
            ? styles.posterOrbTheatre
            : discipline === "opera"
              ? styles.posterOrbOpera
              : styles.posterOrbBallet,
          { transform: [{ translateX: titleSeed - 8 }] },
        ]}
      />
      <View
        style={[
          styles.posterRibbon,
          discipline === "theatre"
            ? styles.posterRibbonTheatre
            : discipline === "opera"
              ? styles.posterRibbonOpera
              : styles.posterRibbonBallet,
          { transform: [{ rotate: `${titleSeed - 12}deg` }] },
        ]}
      />
      <View style={styles.posterTopline}>
        <View style={[styles.posterMark, compact && styles.posterMarkCompact]}>
          {brandSymbol ?? (
            <Text
              style={[
                styles.posterMarkFallback,
                compact && styles.posterMarkTextCompact,
              ]}
            >
              T
            </Text>
          )}
        </View>
        {!compact ? (
          <Text style={styles.posterDiscipline}>{disciplineLabels[discipline]}</Text>
        ) : null}
      </View>
      <View style={styles.posterCaption}>
        <Text
          numberOfLines={compact ? 3 : 2}
          style={[styles.posterTitle, compact && styles.posterTitleCompact]}
        >
          Visuel non publié
        </Text>
        {!compact ? <View style={styles.posterRule} /> : null}
      </View>
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
  buttonFeatured: {
    backgroundColor: tokens.button.featured.background,
    borderColor: tokens.button.featured.border,
    borderRadius: tokens.button.featured.radius,
    borderWidth: tokens.button.featured.borderWidth,
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
  buttonLabelFeatured: {
    color: tokens.button.featured.text,
    fontFamily: tokens.button.featured.fontFamily,
    fontWeight: tokens.button.featured.fontWeight,
  },
  buttonLabelStandardWeb: {
    color: tokens.button.standard.text,
    fontFamily: tokens.button.standard.fontFamily,
    fontWeight: tokens.button.standard.fontWeight,
  },
  buttonLabelDisabled: {
    color: tokens.color.muted,
  },
  buttonLabelDangerGhost: {
    color: tokens.color.error,
  },
  buttonLabelGhost: {
    color: tokens.color.accent,
  },
  buttonLabelQuietWeb: {
    color: tokens.button.quiet.text,
    fontFamily: tokens.button.quiet.fontFamily,
    fontWeight: tokens.button.quiet.fontWeight,
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
  buttonQuietWeb: {
    backgroundColor: tokens.button.quiet.background,
    borderColor: tokens.button.quiet.border,
    borderRadius: tokens.button.quiet.radius,
    borderWidth: tokens.button.quiet.borderWidth,
    boxSizing: "border-box",
  },
  buttonSecondary: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.controlBorder,
    borderWidth: 1,
  },
  buttonStandardWeb: {
    backgroundColor: tokens.button.standard.background,
    borderColor: tokens.button.standard.border,
    borderRadius: tokens.button.standard.radius,
    borderWidth: tokens.button.standard.borderWidth,
    boxSizing: "border-box",
  },
  disabled: {
    backgroundColor: tokens.color.disabled,
    borderColor: tokens.color.controlBorder,
  },
  textActionDisabled: {
    backgroundColor: "transparent",
  },
  textActionPressed: {
    opacity: 0.72,
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
    fontFamily: Platform.select({ web: "Playfair Display", default: "serif" }),
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
    borderRadius: tokens.radius.media,
    justifyContent: "space-between",
    minWidth: 150,
    overflow: "hidden",
    padding: tokens.space.md,
    position: "relative",
    width: "100%",
  },
  posterTheatre: {
    backgroundColor: tokens.color.coral,
  },
  posterOpera: {
    backgroundColor: tokens.color.lilac,
  },
  posterBallet: {
    backgroundColor: tokens.color.aqua,
  },
  posterCompact: {
    minWidth: 64,
    padding: tokens.space.sm,
    width: 64,
  },
  posterCaption: {
    gap: tokens.space.sm,
    width: "100%",
    zIndex: 2,
  },
  posterDiscipline: {
    color: tokens.color.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  posterMark: {
    height: 38,
    width: 38,
    zIndex: 2,
  },
  posterMarkCompact: {
    height: 24,
    width: 24,
  },
  posterMarkFallback: {
    color: tokens.color.ink,
    fontFamily: Platform.select({ web: "Playfair Display", default: "serif" }),
    fontSize: 30,
    fontWeight: "900",
  },
  posterMarkTextCompact: {
    fontSize: 20,
  },
  posterTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    zIndex: 2,
  },
  posterOrb: {
    borderRadius: tokens.radius.round,
    height: "48%",
    opacity: 0.72,
    position: "absolute",
    right: "-16%",
    top: "18%",
    width: "72%",
  },
  posterOrbTheatre: {
    backgroundColor: tokens.color.lilac,
  },
  posterOrbOpera: {
    backgroundColor: tokens.color.aqua,
  },
  posterOrbBallet: {
    backgroundColor: tokens.color.coral,
  },
  posterRibbon: {
    borderColor: tokens.color.ink,
    borderRadius: tokens.radius.round,
    borderWidth: 2,
    height: "64%",
    left: "-36%",
    opacity: 0.76,
    position: "absolute",
    top: "4%",
    width: "112%",
  },
  posterRibbonTheatre: {
    borderBottomColor: "transparent",
  },
  posterRibbonOpera: {
    borderLeftColor: "transparent",
  },
  posterRibbonBallet: {
    borderRightColor: "transparent",
  },
  posterRule: {
    backgroundColor: tokens.color.ink,
    height: 2,
    width: 36,
  },
  posterTitle: {
    color: tokens.color.ink,
    fontFamily: Platform.select({ web: "Work Sans", default: "Inter" }),
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    maxWidth: "92%",
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

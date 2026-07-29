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
  const standardWebButton = Platform.OS === "web" && variant === "primary";
  const featuredButton = variant === "featured";
  const quietWebButton =
    Platform.OS === "web" && (variant === "secondary" || variant === "quiet");
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
                          ? tokens.color.brandText
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
}

export function PosterPlaceholder({
  title,
  discipline,
  compact = false,
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
      accessibilityRole="image"
      style={[styles.poster, compositionStyle, compact && styles.posterCompact]}
    >
      <View
        style={[
          styles.posterGlow,
          discipline === "theatre"
            ? styles.posterGlowTheatre
            : discipline === "opera"
              ? styles.posterGlowOpera
              : styles.posterGlowBallet,
          {
            transform: [
              { translateX: titleSeed - 8 },
              { translateY: titleSeed - 6 },
            ],
          },
        ]}
      />
      <View
        style={[
          styles.posterMist,
          discipline === "theatre"
            ? styles.posterMistTheatre
            : discipline === "opera"
              ? styles.posterMistOpera
              : styles.posterMistBallet,
          { transform: [{ rotate: `${titleSeed - 7}deg` }] },
        ]}
      />
      <View style={[styles.posterBeam, styles.posterBeamLeft]} />
      <View style={[styles.posterBeam, styles.posterBeamRight]} />
      <View style={styles.posterStage}>
        {Array.from({ length: compact ? 5 : 8 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.posterStageLight,
              index % 3 === 0
                ? styles.posterStageLightCoral
                : index % 3 === 1
                  ? styles.posterStageLightLilac
                  : styles.posterStageLightAqua,
            ]}
          />
        ))}
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

export function RatingLights({
  label,
  showValue = false,
  value,
}: {
  label?: string;
  showValue?: boolean;
  value: number | null;
}) {
  const normalized = value === null ? 0 : Math.max(0, Math.min(10, value));
  const fullLights = Math.floor(normalized);
  const hasPartialLight = normalized - fullLights >= 0.25;
  const accessibleLabel =
    label ?? (value === null ? "Aucune note" : `Note : ${value} sur 10`);

  return (
    <View
      accessible
      accessibilityLabel={accessibleLabel}
      style={styles.ratingLightsGroup}
    >
      {showValue ? (
        <Text style={styles.ratingLightsValue}>
          {value === null
            ? "—"
            : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
          <Text style={styles.ratingLightsScale}>/10</Text>
        </Text>
      ) : null}
      <View style={styles.ratingLightsRow}>
        {Array.from({ length: 10 }, (_, index) => {
          const light = index + 1;
          const filled = light <= fullLights;
          const partial = !filled && hasPartialLight && light === fullLights + 1;
          return (
            <View
              key={light}
              style={[
                styles.ratingLight,
                filled && styles.ratingLightFilled,
                partial && styles.ratingLightPartial,
              ]}
            />
          );
        })}
      </View>
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
    color: tokens.color.brandText,
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
    outlineColor: tokens.color.focus,
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
    borderColor: tokens.color.ink,
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
    color: tokens.color.brandText,
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
    borderColor: tokens.color.focus,
    outlineColor: "rgba(195, 78, 66, 0.18)",
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
    color: tokens.color.brandText,
    fontSize: 13,
    fontWeight: "700",
  },
  poster: {
    alignItems: "center",
    aspectRatio: 148 / 210,
    borderRadius: tokens.radius.media,
    justifyContent: "flex-end",
    minWidth: 150,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  posterTheatre: {
    backgroundColor: tokens.color.placeholderTheatre,
  },
  posterOpera: {
    backgroundColor: tokens.color.placeholderOpera,
  },
  posterBallet: {
    backgroundColor: tokens.color.placeholderBallet,
  },
  posterCompact: {
    minWidth: 68,
    width: 68,
  },
  posterGlow: {
    borderRadius: tokens.radius.round,
    height: "56%",
    opacity: 0.82,
    position: "absolute",
    right: "-18%",
    top: "20%",
    width: "84%",
  },
  posterGlowTheatre: {
    backgroundColor: tokens.color.lilac,
  },
  posterGlowOpera: {
    backgroundColor: tokens.color.aqua,
  },
  posterGlowBallet: {
    backgroundColor: tokens.color.coral,
  },
  posterMist: {
    backgroundColor: "rgba(255, 253, 248, 0.58)",
    borderRadius: tokens.radius.round,
    height: "54%",
    left: "-30%",
    opacity: 0.84,
    position: "absolute",
    top: "34%",
    width: "122%",
  },
  posterMistTheatre: {
    borderColor: "rgba(243, 169, 149, 0.44)",
    borderWidth: 1,
  },
  posterMistOpera: {
    borderColor: "rgba(200, 184, 240, 0.46)",
    borderWidth: 1,
  },
  posterMistBallet: {
    borderColor: "rgba(159, 216, 208, 0.54)",
    borderWidth: 1,
  },
  posterBeam: {
    backgroundColor: "rgba(255, 253, 248, 0.68)",
    height: "96%",
    position: "absolute",
    top: "-28%",
    width: "24%",
  },
  posterBeamLeft: {
    left: "18%",
    transform: [{ rotate: "-19deg" }],
  },
  posterBeamRight: {
    right: "18%",
    transform: [{ rotate: "19deg" }],
  },
  posterStage: {
    alignItems: "center",
    bottom: "7%",
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    position: "absolute",
    width: "100%",
  },
  posterStageLight: {
    borderRadius: tokens.radius.round,
    height: 5,
    opacity: 0.9,
    width: 5,
  },
  posterStageLightAqua: {
    backgroundColor: tokens.color.aqua,
  },
  posterStageLightCoral: {
    backgroundColor: tokens.color.coral,
  },
  posterStageLightLilac: {
    backgroundColor: tokens.color.lilac,
  },
  ratingLightsGroup: {
    alignItems: "flex-start",
    gap: tokens.space.sm,
  },
  ratingLightsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  ratingLight: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.selectedBorder,
    borderRadius: tokens.radius.round,
    borderWidth: 1,
    height: 9,
    width: 9,
  },
  ratingLightFilled: {
    backgroundColor: tokens.color.coral,
    borderColor: tokens.color.coral,
    boxShadow: "0 0 10px rgba(243, 169, 149, 0.42)",
  },
  ratingLightPartial: {
    backgroundColor: tokens.color.selectedSurface,
    borderColor: tokens.color.coral,
  },
  ratingLightsScale: {
    color: tokens.color.muted,
    fontFamily: Platform.select({ web: "Work Sans", default: "sans-serif" }),
    fontSize: 16,
    fontWeight: "500",
  },
  ratingLightsValue: {
    color: tokens.color.ink,
    fontFamily: Platform.select({ web: "Playfair Display", default: "serif" }),
    fontSize: 36,
    fontWeight: "600",
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

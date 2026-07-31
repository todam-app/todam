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

export type TicketButtonVariant = "porcelain" | "orchestra";

export interface TicketButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: TicketButtonVariant;
}

const ticketShapePath =
  "M 13 1 H 163 Q 175 1 175 13 V 21 C 169 21 165 25 165 31 C 165 37 169 41 175 41 V 49 Q 175 61 163 61 H 13 Q 1 61 1 49 V 41 C 7 41 11 37 11 31 C 11 25 7 21 1 21 V 13 Q 1 1 13 1 Z";

export function TicketButton({
  label,
  variant = "porcelain",
  accessibilityRole = "button",
  accessibilityState,
  disabled,
  onBlur,
  onFocus,
  style,
  ...props
}: TicketButtonProps) {
  const [focused, setFocused] = useState(false);
  const web = Platform.OS === "web";
  const webTicketProps = web
    ? ({
        dataSet: {
          todamTicketAction: variant,
        },
      } as unknown as PressableProps)
    : {};

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={accessibilityRole}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(disabled || accessibilityState?.disabled),
      }}
      disabled={disabled}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      style={(state) => [
        styles.ticketButton,
        web
          ? styles.ticketButtonWeb
          : variant === "orchestra"
            ? styles.ticketButtonOrchestra
            : styles.ticketButtonPorcelain,
        state.pressed && styles.buttonPressed,
        focused && !web && styles.buttonFocused,
        disabled && styles.disabled,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
      {...webTicketProps}
    >
      {web
        ? createElement(
            "svg",
            {
              "aria-hidden": true,
              className: "todam-ticket-action-shape",
              focusable: "false",
              preserveAspectRatio: "none",
              viewBox: "0 0 176 62",
            },
            createElement("path", {
              className: "todam-ticket-action-outline",
              d: ticketShapePath,
            }),
          )
        : null}
      <Text
        numberOfLines={1}
        style={[
          styles.ticketButtonLabel,
          variant === "orchestra" && styles.ticketButtonLabelOrchestra,
          disabled && styles.buttonLabelDisabled,
        ]}
      >
        {label}
      </Text>
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
        icon?: ReactNode;
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
            Boolean(trailingAction?.icon) && styles.inputWithTrailingIcon,
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
            {trailingAction.icon ?? (
              <Text style={styles.trailingActionLabel}>{trailingAction.label}</Text>
            )}
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

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <View accessible={false} style={styles.passwordEyeIcon}>
      <View style={styles.passwordEyeOutline}>
        <View style={styles.passwordEyePupil} />
      </View>
      {!visible ? (
        <>
          <View style={styles.passwordEyeSlashMask} />
          <View style={styles.passwordEyeSlash} />
        </>
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
        icon: <PasswordVisibilityIcon visible={visible} />,
        label: visible ? "Masquer" : "Afficher",
        onPress: () => setVisible((value) => !value),
      }}
    />
  );
}

type PosterDiscipline = "theatre" | "opera" | "ballet";

export interface PosterPlaceholderProps {
  title: string;
  discipline: PosterDiscipline;
  compact?: boolean;
  edgeToEdge?: boolean;
  fill?: boolean;
}

function WebPosterPlaceholder({
  accessibilityLabel,
  compact,
  discipline,
  edgeToEdge,
  fill,
}: {
  accessibilityLabel: string;
  compact: boolean;
  discipline: PosterDiscipline;
  edgeToEdge: boolean;
  fill: boolean;
}) {
  const frameStyle: CSSProperties = {
    aspectRatio: fill ? "auto" : "148 / 210",
    background:
      discipline === "theatre"
        ? `radial-gradient(circle at 23% 26%, rgba(243, 169, 149, 0.88), transparent 34%), radial-gradient(circle at 77% 76%, rgba(200, 184, 240, 0.5), transparent 39%), linear-gradient(150deg, #2B2427 0%, ${tokens.color.posterNightTheatre} 47%, #2D2930 100%)`
        : discipline === "opera"
          ? `radial-gradient(circle at 50% 20%, rgba(200, 184, 240, 0.72), transparent 35%), radial-gradient(circle at 50% 78%, rgba(243, 169, 149, 0.32), transparent 37%), linear-gradient(180deg, #232029 0%, ${tokens.color.posterNightOpera} 57%, #25202A 100%)`
          : `radial-gradient(circle at 23% 74%, rgba(159, 216, 208, 0.7), transparent 36%), radial-gradient(circle at 76% 26%, rgba(200, 184, 240, 0.5), transparent 38%), linear-gradient(145deg, #172123 0%, ${tokens.color.posterNightBallet} 48%, #25242D 100%)`,
    borderRadius: edgeToEdge ? 0 : tokens.radius.media,
    boxSizing: "border-box",
    isolation: "isolate",
    height: fill ? "100%" : undefined,
    minWidth: fill ? 0 : compact ? 68 : 150,
    overflow: "hidden",
    position: "relative",
    width: fill ? "100%" : compact ? 68 : "100%",
  };
  const hiddenShape = { "aria-hidden": true };
  const blur = (large: number, small: number) => `blur(${compact ? small : large}px)`;

  const theatreShapes = [
    createElement("span", {
      ...hiddenShape,
      key: "theatre-glow",
      style: {
        background: tokens.color.coral,
        borderRadius: "50%",
        bottom: "-17%",
        filter: blur(22, 5),
        height: "52%",
        mixBlendMode: "screen",
        opacity: 0.46,
        position: "absolute",
        right: "3%",
        width: "72%",
        zIndex: 2,
      } satisfies CSSProperties,
    }),
    createElement("span", {
      ...hiddenShape,
      key: "theatre-beam",
      style: {
        background:
          "linear-gradient(180deg, rgba(255, 253, 248, 0.8), transparent 72%)",
        clipPath: "polygon(42% 0, 70% 0, 100% 100%, 0 100%)",
        filter: blur(12, 3),
        height: "128%",
        left: "8%",
        mixBlendMode: "screen",
        position: "absolute",
        top: "-14%",
        transform: "rotate(14deg)",
        transformOrigin: "top",
        width: "31%",
        zIndex: 3,
      } satisfies CSSProperties,
    }),
    createElement("span", {
      ...hiddenShape,
      key: "theatre-veil",
      style: {
        background:
          "linear-gradient(145deg, rgba(255, 253, 248, 0.15), transparent 68%)",
        border: "1px solid rgba(255, 253, 248, 0.17)",
        borderRadius: "50% 18% 50% 24%",
        boxShadow: "inset 18px 12px 44px rgba(255, 253, 248, 0.025)",
        height: "75%",
        position: "absolute",
        right: "7%",
        top: "15%",
        transform: "rotate(-12deg)",
        width: "54%",
        zIndex: 4,
      } satisfies CSSProperties,
    }),
    createElement("span", {
      ...hiddenShape,
      key: "theatre-pin",
      style: {
        background: tokens.color.surface,
        borderRadius: "50%",
        boxShadow: compact
          ? "0 0 5px 2px rgba(255, 253, 248, 0.32)"
          : "0 0 20px 6px rgba(255, 253, 248, 0.32)",
        height: compact ? 2 : 5,
        position: "absolute",
        right: "21%",
        top: "31%",
        width: compact ? 2 : 5,
        zIndex: 5,
      } satisfies CSSProperties,
    }),
  ];

  const operaShapes = [
    createElement("span", {
      ...hiddenShape,
      key: "opera-left-beam",
      style: {
        background:
          "linear-gradient(180deg, rgba(255, 253, 248, 0.78), transparent 78%)",
        clipPath: "polygon(30% 0, 48% 0, 100% 100%, 0 100%)",
        filter: blur(8, 2),
        height: "96%",
        left: "-2%",
        mixBlendMode: "screen",
        opacity: 0.7,
        position: "absolute",
        top: "-10%",
        transform: "rotate(-9deg)",
        transformOrigin: "top",
        width: "44%",
        zIndex: 2,
      } satisfies CSSProperties,
    }),
    createElement("span", {
      ...hiddenShape,
      key: "opera-right-beam",
      style: {
        background:
          "linear-gradient(180deg, rgba(255, 253, 248, 0.78), transparent 78%)",
        clipPath: "polygon(52% 0, 70% 0, 100% 100%, 0 100%)",
        filter: blur(8, 2),
        height: "96%",
        mixBlendMode: "screen",
        opacity: 0.7,
        position: "absolute",
        right: "-2%",
        top: "-10%",
        transform: "rotate(9deg)",
        transformOrigin: "top",
        width: "44%",
        zIndex: 2,
      } satisfies CSSProperties,
    }),
    createElement("span", {
      ...hiddenShape,
      key: "opera-halo",
      style: {
        aspectRatio: "1",
        background: "rgba(200, 184, 240, 0.52)",
        borderRadius: "50%",
        filter: blur(28, 6),
        left: "27%",
        mixBlendMode: "screen",
        position: "absolute",
        top: "24%",
        width: "46%",
        zIndex: 3,
      } satisfies CSSProperties,
    }),
    createElement(
      "span",
      {
        ...hiddenShape,
        key: "opera-arch",
        style: {
          background:
            "linear-gradient(180deg, rgba(200, 184, 240, 0.11), transparent 46%), rgba(17, 18, 20, 0.18)",
          border: "1px solid rgba(255, 253, 248, 0.21)",
          borderRadius: "50% 50% 10px 10px / 27% 27% 10px 10px",
          bottom: "11%",
          boxShadow:
            "inset 0 0 44px rgba(200, 184, 240, 0.08), 0 0 34px rgba(200, 184, 240, 0.06)",
          left: "14%",
          position: "absolute",
          right: "14%",
          top: "16%",
          zIndex: 5,
        } satisfies CSSProperties,
      },
      createElement("span", {
        ...hiddenShape,
        style: {
          border: "1px solid rgba(200, 184, 240, 0.18)",
          borderRadius: "50% 50% 7px 7px / 27% 27% 7px 7px",
          bottom: "9%",
          left: "8%",
          position: "absolute",
          right: "8%",
          top: "7%",
        } satisfies CSSProperties,
      }),
    ),
    createElement(
      "span",
      {
        ...hiddenShape,
        key: "opera-footlights",
        style: {
          bottom: "10%",
          display: "flex",
          justifyContent: "space-between",
          left: "18%",
          position: "absolute",
          right: "18%",
          zIndex: 7,
        } satisfies CSSProperties,
      },
      ...Array.from({ length: compact ? 5 : 7 }, (_, index) =>
        createElement("span", {
          ...hiddenShape,
          key: index,
          style: {
            aspectRatio: "1",
            background: tokens.color.surface,
            borderRadius: "50%",
            boxShadow: compact
              ? "0 0 3px rgba(255, 253, 248, 0.66)"
              : "0 0 12px rgba(255, 253, 248, 0.66)",
            width: compact ? 2 : 5,
          } satisfies CSSProperties,
        }),
      ),
    ),
  ];

  const balletShapes = [
    createElement("span", {
      ...hiddenShape,
      key: "ballet-glow",
      style: {
        background: tokens.color.aqua,
        borderRadius: "50%",
        bottom: "-12%",
        filter: blur(27, 6),
        height: "42%",
        left: "6%",
        mixBlendMode: "screen",
        opacity: 0.56,
        position: "absolute",
        transform: "rotate(-10deg)",
        width: "78%",
        zIndex: 3,
      } satisfies CSSProperties,
    }),
    createElement("span", {
      ...hiddenShape,
      key: "ballet-left-beam",
      style: {
        background:
          "linear-gradient(180deg, rgba(255, 253, 248, 0.72), transparent 74%)",
        clipPath: "polygon(34% 0, 60% 0, 100% 100%, 0 100%)",
        filter: blur(9, 2),
        height: "129%",
        left: "1%",
        mixBlendMode: "screen",
        position: "absolute",
        top: "-15%",
        transform: "rotate(-22deg)",
        transformOrigin: "top",
        width: "29%",
        zIndex: 2,
      } satisfies CSSProperties,
    }),
    createElement("span", {
      ...hiddenShape,
      key: "ballet-right-beam",
      style: {
        background:
          "linear-gradient(180deg, rgba(255, 253, 248, 0.72), transparent 74%)",
        clipPath: "polygon(40% 0, 66% 0, 100% 100%, 0 100%)",
        filter: blur(9, 2),
        height: "129%",
        mixBlendMode: "screen",
        opacity: 0.54,
        position: "absolute",
        right: "3%",
        top: "-15%",
        transform: "rotate(18deg)",
        transformOrigin: "top",
        width: "29%",
        zIndex: 2,
      } satisfies CSSProperties,
    }),
    createElement("span", {
      ...hiddenShape,
      key: "ballet-first-ribbon",
      style: {
        background:
          "linear-gradient(145deg, rgba(159, 216, 208, 0.1), transparent 68%)",
        border: "1px solid rgba(255, 253, 248, 0.22)",
        borderRadius: "58% 22% 56% 31%",
        boxShadow: "inset 0 0 38px rgba(159, 216, 208, 0.06)",
        height: "76%",
        left: "24%",
        position: "absolute",
        top: "12%",
        transform: "rotate(24deg)",
        width: "45%",
        zIndex: 5,
      } satisfies CSSProperties,
    }),
    createElement("span", {
      ...hiddenShape,
      key: "ballet-second-ribbon",
      style: {
        background:
          "linear-gradient(145deg, rgba(200, 184, 240, 0.08), transparent 70%)",
        border: "1px solid rgba(200, 184, 240, 0.2)",
        borderRadius: "24% 64% 30% 58%",
        height: "57%",
        left: "37%",
        position: "absolute",
        top: "29%",
        transform: "rotate(-31deg)",
        width: "31%",
        zIndex: 5,
      } satisfies CSSProperties,
    }),
  ];

  return createElement(
    "div",
    {
      "aria-label": accessibilityLabel,
      "data-todam-poster-placeholder": discipline,
      role: "img",
      style: frameStyle,
    },
    ...(discipline === "theatre"
      ? theatreShapes
      : discipline === "opera"
        ? operaShapes
        : balletShapes),
  );
}

export function PosterPlaceholder({
  title,
  discipline,
  compact = false,
  edgeToEdge = false,
  fill = false,
}: PosterPlaceholderProps) {
  const accessibilityLabel = `Affiche indisponible pour ${title}`;

  if (Platform.OS === "web") {
    return (
      <WebPosterPlaceholder
        accessibilityLabel={accessibilityLabel}
        compact={compact}
        discipline={discipline}
        edgeToEdge={edgeToEdge}
        fill={fill}
      />
    );
  }

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
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[
        fill ? styles.posterFill : styles.poster,
        compositionStyle,
        compact && !fill && styles.posterCompact,
        edgeToEdge && styles.posterEdgeToEdge,
      ]}
    >
      {discipline === "theatre" ? (
        <>
          <View
            style={[
              styles.posterTheatreGlow,
              { transform: [{ translateY: titleSeed - 8 }] },
            ]}
          />
          <View style={styles.posterTheatreBeam} />
          <View style={styles.posterTheatreVeil} />
          <View style={styles.posterTheatrePin} />
        </>
      ) : discipline === "opera" ? (
        <>
          <View style={[styles.posterOperaBeam, styles.posterOperaBeamLeft]} />
          <View style={[styles.posterOperaBeam, styles.posterOperaBeamRight]} />
          <View style={styles.posterOperaHalo} />
          <View style={styles.posterOperaArch}>
            <View style={styles.posterOperaArchInner} />
          </View>
          <View style={styles.posterStage}>
            {Array.from({ length: compact ? 5 : 7 }, (_, index) => (
              <View key={index} style={styles.posterStageLight} />
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.posterBalletGlow} />
          <View style={[styles.posterBalletBeam, styles.posterBalletBeamLeft]} />
          <View style={[styles.posterBalletBeam, styles.posterBalletBeamRight]} />
          <View style={styles.posterBalletRibbonOne} />
          <View style={styles.posterBalletRibbonTwo} />
        </>
      )}
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
  ticketButton: {
    alignItems: "center",
    flexShrink: 1,
    justifyContent: "center",
    maxWidth: "100%",
    minHeight: 56,
    minWidth: 154,
    overflow: "visible",
    paddingHorizontal: 20,
    position: "relative",
  },
  ticketButtonLabel: {
    color: tokens.color.ink,
    flexShrink: 1,
    fontFamily: tokens.button.quiet.fontFamily,
    fontSize: 15,
    fontWeight: "600",
    position: "relative",
    textAlign: "center",
    zIndex: 1,
  },
  ticketButtonLabelOrchestra: {
    color: tokens.color.surface,
  },
  ticketButtonOrchestra: {
    backgroundColor: tokens.color.ink,
    borderColor: tokens.color.ink,
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
  },
  ticketButtonPorcelain: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.coral,
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
  },
  ticketButtonWeb: {
    backgroundColor: "transparent",
    borderWidth: 0,
    isolation: "isolate",
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
  inputWithTrailingIcon: {
    paddingRight: 56,
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
  passwordEyeIcon: {
    alignItems: "center",
    height: 18,
    justifyContent: "center",
    width: 24,
  },
  passwordEyeOutline: {
    alignItems: "center",
    borderColor: tokens.color.brandText,
    borderRadius: tokens.radius.round,
    borderWidth: 1.75,
    height: 14,
    justifyContent: "center",
    width: 22,
  },
  passwordEyePupil: {
    backgroundColor: tokens.color.brandText,
    borderRadius: tokens.radius.round,
    height: 5,
    width: 5,
  },
  passwordEyeSlashMask: {
    backgroundColor: tokens.color.surface,
    height: 4,
    position: "absolute",
    transform: [{ rotate: "38deg" }],
    width: 27,
  },
  passwordEyeSlash: {
    backgroundColor: tokens.color.brandText,
    height: 1.75,
    position: "absolute",
    transform: [{ rotate: "38deg" }],
    width: 27,
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
  posterFill: {
    alignItems: "center",
    borderRadius: tokens.radius.media,
    height: "100%",
    justifyContent: "flex-end",
    minWidth: 0,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  posterTheatre: {
    backgroundColor: tokens.color.posterNightTheatre,
  },
  posterOpera: {
    backgroundColor: tokens.color.posterNightOpera,
  },
  posterBallet: {
    backgroundColor: tokens.color.posterNightBallet,
  },
  posterCompact: {
    minWidth: 68,
    width: 68,
  },
  posterEdgeToEdge: {
    borderRadius: 0,
  },
  posterTheatreGlow: {
    backgroundColor: "rgba(243, 169, 149, 0.52)",
    borderRadius: tokens.radius.round,
    height: "52%",
    left: "-17%",
    opacity: 0.7,
    position: "absolute",
    top: "10%",
    width: "78%",
  },
  posterTheatreBeam: {
    backgroundColor: "rgba(255, 253, 248, 0.28)",
    height: "126%",
    left: "9%",
    opacity: 0.76,
    position: "absolute",
    top: "-15%",
    transform: [{ rotate: "14deg" }],
    width: "21%",
  },
  posterTheatreVeil: {
    backgroundColor: "rgba(255, 253, 248, 0.04)",
    borderColor: "rgba(255, 253, 248, 0.2)",
    borderRadius: tokens.radius.round,
    borderWidth: 1,
    height: "75%",
    position: "absolute",
    right: "7%",
    top: "15%",
    transform: [{ rotate: "-12deg" }],
    width: "54%",
  },
  posterTheatrePin: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.round,
    height: 5,
    position: "absolute",
    right: "21%",
    top: "31%",
    width: 5,
  },
  posterOperaBeam: {
    backgroundColor: "rgba(255, 253, 248, 0.24)",
    height: "96%",
    opacity: 0.72,
    position: "absolute",
    top: "-10%",
    width: "25%",
  },
  posterOperaBeamLeft: {
    left: "10%",
    transform: [{ rotate: "-9deg" }],
  },
  posterOperaBeamRight: {
    right: "10%",
    transform: [{ rotate: "9deg" }],
  },
  posterOperaHalo: {
    aspectRatio: 1,
    backgroundColor: "rgba(200, 184, 240, 0.34)",
    borderRadius: tokens.radius.round,
    left: "27%",
    position: "absolute",
    top: "24%",
    width: "46%",
  },
  posterOperaArch: {
    backgroundColor: "rgba(17, 18, 20, 0.18)",
    borderColor: "rgba(255, 253, 248, 0.24)",
    borderRadius: tokens.radius.round,
    borderWidth: 1,
    bottom: "11%",
    left: "14%",
    position: "absolute",
    right: "14%",
    top: "16%",
  },
  posterOperaArchInner: {
    borderColor: "rgba(200, 184, 240, 0.22)",
    borderRadius: tokens.radius.round,
    borderWidth: 1,
    bottom: "9%",
    left: "8%",
    position: "absolute",
    right: "8%",
    top: "7%",
  },
  posterStage: {
    alignItems: "center",
    bottom: "10%",
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    position: "absolute",
    width: "100%",
  },
  posterStageLight: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.round,
    height: 5,
    opacity: 0.9,
    width: 5,
  },
  posterBalletGlow: {
    backgroundColor: "rgba(159, 216, 208, 0.46)",
    borderRadius: tokens.radius.round,
    bottom: "-12%",
    height: "42%",
    left: "6%",
    position: "absolute",
    transform: [{ rotate: "-10deg" }],
    width: "78%",
  },
  posterBalletBeam: {
    backgroundColor: "rgba(255, 253, 248, 0.24)",
    height: "129%",
    position: "absolute",
    top: "-15%",
    width: "20%",
  },
  posterBalletBeamLeft: {
    left: "5%",
    transform: [{ rotate: "-22deg" }],
  },
  posterBalletBeamRight: {
    opacity: 0.62,
    right: "7%",
    transform: [{ rotate: "18deg" }],
  },
  posterBalletRibbonOne: {
    backgroundColor: "rgba(159, 216, 208, 0.05)",
    borderColor: "rgba(255, 253, 248, 0.24)",
    borderRadius: tokens.radius.round,
    borderWidth: 1,
    height: "76%",
    left: "24%",
    position: "absolute",
    top: "12%",
    transform: [{ rotate: "24deg" }],
    width: "45%",
  },
  posterBalletRibbonTwo: {
    backgroundColor: "rgba(200, 184, 240, 0.04)",
    borderColor: "rgba(200, 184, 240, 0.22)",
    borderRadius: tokens.radius.round,
    borderWidth: 1,
    height: "57%",
    left: "37%",
    position: "absolute",
    top: "29%",
    transform: [{ rotate: "-31deg" }],
    width: "31%",
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

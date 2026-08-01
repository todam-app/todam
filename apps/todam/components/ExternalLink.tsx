import type { ReactNode } from "react";
import { Linking, Platform, Pressable } from "react-native";

export function ExternalLink({
  accessibilityLabel,
  children,
  className,
  href,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  className?: string;
  href: string;
}) {
  if (Platform.OS === "web") {
    return (
      <a
        aria-label={accessibilityLabel}
        className={className}
        href={href}
        rel="noreferrer noopener"
        target="_blank"
      >
        {children}
      </a>
    );
  }

  return (
    <Pressable
      {...(className ? { className } : {})}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="link"
      onPress={() => void Linking.openURL(href)}
    >
      {children}
    </Pressable>
  );
}

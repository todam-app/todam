import { Link, type Href } from "expo-router";
import { useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { authClient } from "../lib/auth-client";

const horizontalLogo = require("../assets/brand/todam-logo-horizontal.svg");

const informationLinks = [
  { href: "/les-coulisses", label: "Les coulisses" },
  { href: "/conditions-utilisation", label: "Conditions d’utilisation" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
] as const;
const professionalLinks = [
  { href: "/pour-les-salles", label: "Pour les salles" },
  { href: "/pour-les-compagnies", label: "Pour les compagnies" },
] as const;

function FooterInternalLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" className="min-h-11 justify-center">
        <Text className="text-sm leading-5 text-muted">{label}</Text>
      </Pressable>
    </Link>
  );
}

export function LegalFooter({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const session = authClient.useSession();
  const { width } = useWindowDimensions();
  const [mobileSection, setMobileSection] = useState<
    "product" | "professional" | "information" | null
  >(null);
  if (!alwaysVisible && Platform.OS !== "web") return null;

  const compact = width < 640;
  const productLinks = session.data
    ? [
        { href: "/decouvrir" as const, label: "Découvrir" },
        { href: "/journal" as const, label: "Journal" },
        { href: "/listes" as const, label: "Listes" },
      ]
    : [
        { href: "/decouvrir" as const, label: "Découvrir" },
        { href: "/sign-in" as const, label: "Se connecter" },
        { href: "/sign-up" as const, label: "Créer un compte" },
      ];

  if (compact) {
    const sections = [
      { key: "product", label: "Todam", items: productLinks },
      {
        key: "professional",
        label: "Professionnels",
        items: professionalLinks,
      },
      {
        key: "information",
        label: "Informations",
        items: informationLinks,
      },
    ] as const;
    return (
      <View
        className="todam-web-footer mx-auto w-full max-w-content border-t border-line bg-paper px-5 py-2"
        role="contentinfo"
        testID="site-footer"
      >
        <View className="mx-auto w-full max-w-content">
          {sections.map((section) => {
            const expanded = mobileSection === section.key;
            return (
              <View className="border-b border-line" key={section.key}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  className="min-h-11 flex-row items-center justify-between"
                  onPress={() =>
                    setMobileSection((current) =>
                      current === section.key ? null : section.key,
                    )
                  }
                >
                  <Text className="text-sm font-bold text-ink">{section.label}</Text>
                  <Text
                    accessibilityElementsHidden
                    className="text-lg font-semibold text-accent"
                  >
                    {expanded ? "−" : "+"}
                  </Text>
                </Pressable>
                {expanded ? (
                  <View className="flex-row flex-wrap pb-1">
                    {section.items.map((item) => (
                      <View className="w-1/2 pr-2" key={item.href}>
                        <FooterInternalLink {...item} />
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
          <View className="min-h-11 flex-row items-center justify-between">
            <Text className="text-xs text-muted">© 2026 Todam</Text>
            <Pressable
              accessibilityLabel="Écrire à contact@todam.fr"
              accessibilityRole="link"
              className="min-h-11 justify-center"
              onPress={() => void Linking.openURL("mailto:contact@todam.fr")}
            >
              <Text className="text-xs font-semibold text-muted">Contact</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      className="todam-web-footer mx-auto w-full max-w-content border-t border-line bg-paper px-8 py-10"
      role="contentinfo"
      testID="site-footer"
    >
      <View className="mx-auto w-full max-w-content gap-8">
        <View className="flex-row flex-wrap justify-between gap-6">
          <View className="min-w-48 max-w-[260px] gap-3">
            <Link href="/" asChild>
              <Pressable
                accessibilityLabel="Todam, accueil"
                accessibilityRole="link"
                className="min-h-11 self-start justify-center"
              >
                <Image
                  accessibilityIgnoresInvertColors
                  accessible={false}
                  resizeMode="contain"
                  source={horizontalLogo}
                  style={{ height: 40, width: 132 }}
                />
              </Pressable>
            </Link>
            <Text className="text-sm leading-6 text-muted">
              Le journal culturel qui relie les spectacles, les publics et les
              professionnels.
            </Text>
          </View>
          <View className="min-w-28 gap-1">
            <Text className="text-base mb-2 font-semibold text-ink">Todam</Text>
            {productLinks.map((item) => (
              <FooterInternalLink {...item} key={item.href} />
            ))}
          </View>
          <View className="min-w-36 gap-1">
            <Text className="text-base mb-2 font-semibold text-ink">
              Professionnels
            </Text>
            {professionalLinks.map((item) => (
              <FooterInternalLink {...item} key={item.href} />
            ))}
          </View>
          <View className="min-w-40 gap-1">
            <Text className="text-base mb-2 font-semibold text-ink">Informations</Text>
            {informationLinks.map((item) => (
              <FooterInternalLink {...item} key={item.href} />
            ))}
          </View>
          <View className="min-w-36 gap-1">
            <Text className="text-base mb-2 font-semibold text-ink">Contact</Text>
            <Pressable
              accessibilityRole="link"
              className="min-h-11 justify-center"
              onPress={() => void Linking.openURL("mailto:contact@todam.fr")}
            >
              <Text className="text-sm text-muted">contact@todam.fr</Text>
            </Pressable>
          </View>
        </View>
        <View className="border-t border-line pt-5">
          <Text className="text-xs text-muted">© 2026 Todam</Text>
        </View>
      </View>
    </View>
  );
}

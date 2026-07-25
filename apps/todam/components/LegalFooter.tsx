import { Link } from "expo-router";
import { Image, Linking, Platform, Pressable, Text, View } from "react-native";

const horizontalLogo = require("../assets/brand/todam-logo-horizontal.svg");

const productLinks = [
  { href: "/", label: "Accueil" },
  { href: "/search", label: "Rechercher" },
  { href: "/sign-up", label: "Créer un compte" },
] as const;

const legalLinks = [
  { href: "/conditions-utilisation", label: "Conditions d'utilisation" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/suppression-compte", label: "Supprimer un compte" },
] as const;

function FooterInternalLink({
  href,
  label,
}: {
  href: (typeof productLinks)[number]["href"] | (typeof legalLinks)[number]["href"];
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" className="min-h-10 justify-center">
        <Text className="text-sm text-muted">{label}</Text>
      </Pressable>
    </Link>
  );
}

function FooterEmail({ address, label }: { address: string; label: string }) {
  return (
    <Pressable
      accessibilityLabel={`${label} : ${address}`}
      accessibilityRole="link"
      className="min-h-10 justify-center"
      onPress={() => void Linking.openURL(`mailto:${address}`)}
    >
      <Text className="text-sm text-muted">{address}</Text>
    </Pressable>
  );
}

export function LegalFooter({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  if (!alwaysVisible && Platform.OS !== "web") return null;

  return (
    <View className="border-t border-line bg-paper px-5 py-10 md:px-8">
      <View className="mx-auto w-full max-w-content gap-10">
        <View className="flex-row flex-wrap justify-between gap-10">
          <View className="min-w-56 max-w-xs gap-3">
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
                  style={{ height: 44, width: 145 }}
                />
              </Pressable>
            </Link>
            <Text className="text-sm leading-6 text-muted">
              Votre journal de spectacles, gratuit et sans publicité.
            </Text>
          </View>

          <View className="min-w-36 gap-1">
            <Text className="mb-2 font-semibold text-ink">Todam</Text>
            {productLinks.map((item) => (
              <FooterInternalLink {...item} key={item.href} />
            ))}
          </View>

          <View className="min-w-44 gap-1">
            <Text className="mb-2 font-semibold text-ink">Informations</Text>
            {legalLinks.map((item) => (
              <FooterInternalLink {...item} key={item.href} />
            ))}
          </View>

          <View className="min-w-52 gap-1">
            <Text className="mb-2 font-semibold text-ink">Contact</Text>
            <FooterEmail address="contact@todam.fr" label="Questions générales" />
            <FooterEmail address="donnees@todam.fr" label="Données personnelles" />
            <FooterEmail address="signalement@todam.fr" label="Signalement" />
          </View>
        </View>

        <View className="border-t border-line pt-5">
          <Text className="text-xs text-muted">© 2026 Todam</Text>
        </View>
      </View>
    </View>
  );
}

import { Link, usePathname } from "expo-router";
import {
  Image,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const horizontalLogo = require("../assets/brand/todam-logo-horizontal.svg");
const symbolLogo = require("../assets/brand/todam-symbol.svg");

const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/search", label: "Rechercher" },
  { href: "/profile", label: "Profil" },
] as const;

export function WebNavigation() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  if (Platform.OS !== "web") return null;

  const compactLogo = width < 640;

  return (
    <View className="border-b border-line bg-paper">
      <View className="mx-auto w-full max-w-content flex-row items-center justify-between px-6 py-3">
        <Link href="/" asChild>
          <Pressable
            accessibilityLabel="Todam, accueil"
            accessibilityRole="link"
            className="min-h-11 justify-center"
            testID="global-home-logo"
          >
            <Image
              accessibilityIgnoresInvertColors
              accessible={false}
              resizeMode="contain"
              source={compactLogo ? symbolLogo : horizontalLogo}
              style={
                compactLogo
                  ? { height: 44, width: 42 }
                  : { height: 44, width: 145 }
              }
            />
            <Text className="sr-only">Todam</Text>
          </Pressable>
        </Link>
        <View accessibilityRole="tablist" className="flex-row items-center gap-2">
          {navigation.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link href={item.href} key={item.href} asChild>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  className={`min-h-11 justify-center rounded-full px-4 ${
                    active ? "bg-ink" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`font-semibold ${active ? "text-paper" : "text-ink"}`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </View>
  );
}

import { Link, usePathname } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";

const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/search", label: "Rechercher" },
  { href: "/profile", label: "Profil" },
] as const;

export function WebNavigation() {
  const pathname = usePathname();
  if (Platform.OS !== "web") return null;

  return (
    <View className="border-b border-line bg-paper">
      <View className="mx-auto w-full max-w-content flex-row items-center justify-between px-6 py-3">
        <Link href="/" asChild>
          <Pressable
            accessibilityLabel="Todam, accueil"
            accessibilityRole="link"
            className="min-h-11 justify-center"
          >
            <Text className="font-serif text-2xl font-black text-ink">Todam</Text>
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

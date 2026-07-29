import { Link, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";

const items = [
  { href: "/journal/a-voir", label: "À voir", count: "watchlist" },
  { href: "/journal/vus", label: "Vus", count: "seen" },
  { href: "/journal/notes", label: "Notés", count: "ratings" },
  { href: "/journal/listes", label: "Listes", count: "lists" },
  { href: "/journal/avis", label: "Avis", count: "reviews" },
] as const;

export type MyShowsCounts = Record<(typeof items)[number]["count"], number>;

export function MyShowsNavigation({ counts }: { counts: MyShowsCounts }) {
  const pathname = usePathname();

  return (
    <View
      accessibilityLabel="Sections de Mes spectacles"
      className="flex-row border-y border-line bg-paper"
      role="navigation"
      testID="my-shows-navigation"
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link href={item.href} key={item.href} asChild>
            <Pressable
              accessibilityLabel={`${item.label}, ${counts[item.count]}`}
              accessibilityRole="link"
              aria-current={active ? "page" : undefined}
              className={`min-h-[68px] min-w-0 flex-1 items-center justify-center border-accent px-0.5 ${
                active ? "border-b-2 border-selected-border bg-selected" : ""
              }`}
            >
              <Text
                className={`text-lg font-bold ${active ? "text-accent" : "text-ink"}`}
              >
                {counts[item.count]}
              </Text>
              <Text
                adjustsFontSizeToFit
                className={`text-[10px] font-semibold ${
                  active ? "text-accent" : "text-muted"
                }`}
                minimumFontScale={0.8}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

import { Link, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";

const items = [
  { href: "/journal/a-voir", label: "À voir", count: "watchlist" },
  { href: "/journal/vus", label: "Vus", count: "seen" },
  { href: "/journal/notes", label: "Notés", count: "ratings" },
  { href: "/journal/avis", label: "Avis", count: "reviews" },
  { href: "/journal/listes", label: "Listes", count: "lists" },
] as const;

export type MyShowsCounts = Record<(typeof items)[number]["count"], number>;

export function MyShowsNavigation({
  accessibilityLabel = "Sections de Mes spectacles",
  counts,
}: {
  accessibilityLabel?: string;
  counts: MyShowsCounts;
}) {
  const pathname = usePathname();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      className="flex-row flex-wrap gap-2 rounded-panel border border-line bg-paper p-2 shadow-soft"
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
              className="todam-interactive-card min-h-16 min-w-[96px] flex-1 items-center justify-center gap-1 rounded-todam px-3 py-2"
            >
              <Text className="font-serif text-2xl font-semibold text-ink">
                {counts[item.count]}
              </Text>
              <Text className="text-center text-xs font-semibold text-muted">
                {item.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

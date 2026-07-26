import type { HomeDiscoveryItem } from "@todam/contracts";
import { Link } from "expo-router";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { ProductionPoster } from "./ProductionPoster";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function DiscoveryCard({ item, width }: { item: HomeDiscoveryItem; width: number }) {
  const { production, performance } = item;
  const startsAt = performance?.startsAt ?? production.nextPerformance;
  const venue = performance?.venueName ?? production.venueNames.slice(0, 2).join(" · ");
  const locality = performance?.locality;
  const location = [venue, locality].filter(Boolean).join(" · ");

  return (
    <Link href={`/production/${production.slug}`} asChild>
      <Pressable
        accessibilityHint="Ouvre la fiche du spectacle"
        accessibilityLabel={production.title}
        accessibilityRole="link"
        className="overflow-hidden rounded-todam border border-line bg-paper active:opacity-70"
        style={{ width }}
      >
        <ProductionPoster
          discipline={production.discipline}
          poster={production.poster}
          title={production.title}
        />
        <View className="min-h-36 gap-1 p-3">
          <Text
            className="font-serif text-lg font-bold leading-6 text-ink"
            numberOfLines={2}
          >
            {production.title}
          </Text>
          {production.primaryCredit ? (
            <Text className="text-sm text-muted" numberOfLines={1}>
              {production.primaryCredit}
            </Text>
          ) : null}
          {startsAt ? (
            <Text className="mt-1 text-sm font-semibold text-accent">
              {dateFormatter.format(new Date(startsAt))}
            </Text>
          ) : null}
          <Text className="text-sm text-muted" numberOfLines={2}>
            {location || "Lieu à confirmer"}
          </Text>
          {performance?.distanceKm !== null && performance?.distanceKm !== undefined ? (
            <Text className="text-xs text-muted">
              À {performance.distanceKm.toLocaleString("fr-FR")} km
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

export function HomeDiscoveryCollection({
  emptyMessage,
  items,
}: {
  emptyMessage: string;
  items: HomeDiscoveryItem[];
}) {
  const { width } = useWindowDimensions();
  const webGrid = Platform.OS === "web" && width >= 768;
  const cardWidth = webGrid ? (width >= 1050 ? 248 : 220) : 184;

  if (items.length === 0) {
    return (
      <Text className="rounded-todam border border-line bg-paper p-5 text-muted">
        {emptyMessage}
      </Text>
    );
  }

  if (webGrid) {
    return (
      <View className="flex-row flex-wrap gap-4">
        {items.map((item) => (
          <DiscoveryCard item={item} key={item.production.id} width={cardWidth} />
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      accessibilityLabel="Liste horizontale de spectacles"
      contentContainerStyle={{ gap: 12, paddingRight: 20 }}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {items.map((item) => (
        <DiscoveryCard item={item} key={item.production.id} width={cardWidth} />
      ))}
    </ScrollView>
  );
}

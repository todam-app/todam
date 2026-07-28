import Ionicons from "@expo/vector-icons/Ionicons";
import type { HomeDiscoveryItem } from "@todam/contracts";
import { Link } from "expo-router";
import { useRef, useState } from "react";
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
  const venue =
    performance?.venueName ??
    production.nextVenue?.name ??
    production.venueNames.slice(0, 2).join(" · ");
  const locality = performance?.locality ?? production.nextVenue?.locality;
  const location = [venue, locality].filter(Boolean).join(" · ");

  return (
    <Link href={`/production/${production.slug}`} asChild>
      <Pressable
        accessibilityHint="Ouvre la fiche du spectacle"
        accessibilityLabel={production.title}
        accessibilityRole="link"
        className="todam-interactive-card overflow-hidden rounded-todam border border-line bg-paper"
        style={{ width }}
      >
        <ProductionPoster
          discipline={production.discipline}
          poster={production.poster}
          title={production.title}
        />
        <View className="min-h-36 gap-1 bg-paper p-3">
          <Text className="font-serif text-lg font-semibold leading-6 text-ink">
            {production.title}
          </Text>
          {production.company ? (
            <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
              {production.company.name}
            </Text>
          ) : production.primaryCredit ? (
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
  const scroll = useRef<ScrollView>(null);
  const [offset, setOffset] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const web = Platform.OS === "web" && width >= 768;
  const cardWidth = web ? (width >= 1050 ? 248 : 220) : 184;
  const step = cardWidth + 16;
  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  const scrollable = maxOffset > 2;
  const atEnd = maxOffset === 0 || offset >= maxOffset - 2;

  if (items.length === 0) {
    return (
      <Text className="border-l-2 border-accent py-1 pl-4 text-base leading-6 text-muted">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <View className="gap-3">
      {web && scrollable ? (
        <View className="flex-row justify-end gap-2">
          <Pressable
            accessibilityLabel="Faire défiler vers la gauche"
            accessibilityRole="button"
            accessibilityState={{ disabled: offset <= 0 }}
            className={`todam-icon-button h-11 w-11 items-center justify-center rounded-todam border border-control ${
              offset <= 0 ? "bg-disabled" : "bg-paper"
            }`}
            disabled={offset <= 0}
            onPress={() =>
              scroll.current?.scrollTo({
                x: Math.max(0, offset - step * 2),
                animated: true,
              })
            }
          >
            <Ionicons
              color={offset <= 0 ? "#6F6B64" : "#151515"}
              name="arrow-back"
              size={20}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Faire défiler vers la droite"
            accessibilityRole="button"
            accessibilityState={{ disabled: atEnd }}
            className={`todam-icon-button h-11 w-11 items-center justify-center rounded-todam border border-control ${
              atEnd ? "bg-disabled" : "bg-paper"
            }`}
            disabled={atEnd}
            onPress={() =>
              scroll.current?.scrollTo({
                x: Math.min(maxOffset, offset + step * 2),
                animated: true,
              })
            }
          >
            <Ionicons
              color={atEnd ? "#6F6B64" : "#151515"}
              name="arrow-forward"
              size={20}
            />
          </Pressable>
        </View>
      ) : null}
      <ScrollView
        accessibilityLabel="Liste horizontale de spectacles"
        contentContainerStyle={{ gap: web ? 16 : 12, paddingRight: 20 }}
        horizontal
        onContentSizeChange={(nextWidth) => setContentWidth(nextWidth)}
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
        ref={scroll}
        scrollEventThrottle={100}
        showsHorizontalScrollIndicator={false}
      >
        {items.map((item) => (
          <DiscoveryCard item={item} key={item.production.id} width={cardWidth} />
        ))}
      </ScrollView>
      {scrollable ? (
        <View className="flex-row items-center gap-2">
          <View className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <View
              className="h-full rounded-full bg-accent"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(18, ((offset + viewportWidth) / contentWidth) * 100),
                )}%`,
              }}
            />
          </View>
          <Text className="text-xs text-muted">Faire défiler</Text>
        </View>
      ) : null}
    </View>
  );
}

import Ionicons from "@expo/vector-icons/Ionicons";
import type { HomeDiscoveryItem } from "@todam/contracts";
import { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { ProductionDiscoveryCard } from "./ProductionDiscoveryCard";

export function HomeDiscoveryCollection({
  emptyMessage,
  items,
  layout = "carousel",
}: {
  emptyMessage: string;
  items: HomeDiscoveryItem[];
  layout?: "carousel" | "grid";
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

  if (layout === "grid") {
    return (
      <View className="todam-production-grid">
        {items.map(({ performance, production }, index) => (
          <ProductionDiscoveryCard
            distanceKm={performance?.distanceKm}
            key={production.id}
            locality={performance?.locality}
            priority={index < 2}
            production={production}
            startsAt={performance?.startsAt ?? production.nextPerformance}
            venueName={
              performance?.venueName ??
              production.nextVenue?.name ??
              production.venueNames.slice(0, 2).join(" · ")
            }
          />
        ))}
      </View>
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
        {items.map(({ performance, production }, index) => (
          <ProductionDiscoveryCard
            distanceKm={performance?.distanceKm}
            key={production.id}
            locality={performance?.locality}
            priority={index === 0}
            production={production}
            startsAt={performance?.startsAt ?? production.nextPerformance}
            venueName={
              performance?.venueName ??
              production.nextVenue?.name ??
              production.venueNames.slice(0, 2).join(" · ")
            }
            width={cardWidth}
          />
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

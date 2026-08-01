import Ionicons from "@expo/vector-icons/Ionicons";
import type { ProductionCard } from "@todam/contracts";
import { tokens } from "@todam/design-system";
import { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { getRelatedProductionCardWidth } from "../lib/related-productions-carousel";
import { ProductionDiscoveryCard } from "./ProductionDiscoveryCard";

export function RelatedProductionsCarousel({
  productions,
}: {
  productions: ProductionCard[];
}) {
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [offset, setOffset] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const showDesktopControls = Platform.OS === "web" && width >= 768;
  const cardWidth = getRelatedProductionCardWidth(width);
  const gap = showDesktopControls ? 16 : 12;
  const step = cardWidth + gap;
  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  const scrollable = maxOffset > 2;
  const atStart = offset <= 2;
  const atEnd = maxOffset === 0 || offset >= maxOffset - 2;

  return (
    <View className="gap-3">
      {showDesktopControls && scrollable ? (
        <View className="flex-row justify-end gap-2">
          <Pressable
            accessibilityLabel="Afficher les spectacles liés précédents"
            accessibilityRole="button"
            accessibilityState={{ disabled: atStart }}
            className={`todam-icon-button h-11 w-11 items-center justify-center rounded-todam border border-control ${
              atStart ? "bg-disabled" : "bg-paper"
            }`}
            disabled={atStart}
            onPress={() =>
              scroll.current?.scrollTo({
                x: Math.max(0, offset - step * 2),
                animated: true,
              })
            }
          >
            <Ionicons
              color={atStart ? tokens.color.muted : tokens.color.ink}
              name="arrow-back"
              size={20}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Afficher les spectacles liés suivants"
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
              color={atEnd ? tokens.color.muted : tokens.color.ink}
              name="arrow-forward"
              size={20}
            />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        accessibilityLabel="Spectacles liés"
        contentContainerStyle={{ gap, paddingRight: 20 }}
        decelerationRate="fast"
        disableIntervalMomentum
        horizontal
        onContentSizeChange={(nextWidth) => setContentWidth(nextWidth)}
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
        ref={scroll}
        scrollEventThrottle={100}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={step}
      >
        {productions.map((production, index) => (
          <ProductionDiscoveryCard
            key={production.id}
            priority={index === 0}
            production={production}
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

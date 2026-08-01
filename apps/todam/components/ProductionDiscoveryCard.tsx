import type { ProductionCard } from "@todam/contracts";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { ProductionPoster } from "./ProductionPoster";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

const disciplineLabels: Record<ProductionCard["discipline"], string> = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
};
const disciplineClasses: Record<ProductionCard["discipline"], string> = {
  theatre: "text-coral-text",
  opera: "text-accent",
  ballet: "text-aqua-text",
};

export interface ProductionDiscoveryCardProps {
  distanceKm?: number | null | undefined;
  headingLevel?: 2 | 3;
  locality?: string | null | undefined;
  priority?: boolean;
  production: ProductionCard;
  showWatchlistAction?: boolean;
  startsAt?: string | null | undefined;
  venueName?: string | null | undefined;
  width?: number;
}

export function ProductionDiscoveryCard({
  distanceKm,
  headingLevel = 3,
  locality,
  priority = false,
  production,
  startsAt = production.nextPerformance,
  venueName = production.nextVenue?.name ?? production.venueNames[0] ?? null,
  width,
}: ProductionDiscoveryCardProps) {
  const resolvedLocality = locality ?? production.nextVenue?.locality ?? null;
  const location = [venueName, resolvedLocality].filter(Boolean).join(" · ");

  return (
    <Link href={`/production/${production.slug}`} asChild>
      <Pressable
        accessibilityHint="Ouvre la fiche du spectacle"
        accessibilityLabel={production.title}
        accessibilityRole="link"
        className="todam-interactive-card todam-production-card overflow-hidden rounded-media border border-line bg-paper shadow-soft"
        style={width ? { width } : undefined}
      >
        <View>
          <ProductionPoster
            discipline={production.discipline}
            poster={production.poster}
            priority={priority}
            title={production.title}
          />
        </View>
        <View className="min-h-48 gap-1.5 p-4">
          <Text
            className={`text-[11px] font-bold uppercase tracking-[1.2px] ${disciplineClasses[production.discipline]}`}
          >
            {disciplineLabels[production.discipline]}
          </Text>
          <Text
            aria-level={headingLevel}
            accessibilityRole="header"
            className="min-h-12 font-serif text-xl font-semibold leading-6 text-ink"
            numberOfLines={2}
          >
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
          {location ? (
            <Text
              className="mt-auto pt-2 text-sm leading-5 text-muted"
              numberOfLines={2}
            >
              {location}
            </Text>
          ) : null}
          {startsAt ? (
            <Text className={`${location ? "" : "mt-auto pt-2 "}text-xs text-muted`}>
              {dateFormatter.format(new Date(startsAt))}
            </Text>
          ) : null}
          {distanceKm !== null && distanceKm !== undefined ? (
            <Text className="text-xs font-semibold text-muted">
              À {distanceKm.toLocaleString("fr-FR")} km
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

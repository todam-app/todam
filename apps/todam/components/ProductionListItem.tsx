import type { ProductionCard } from "@todam/contracts";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { formatPerformance } from "../lib/format";
import { ProductionPoster } from "./ProductionPoster";

const disciplineLabels: Record<ProductionCard["discipline"], string> = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
};

export function ProductionListItem({
  headingLevel = 3,
  production,
}: {
  headingLevel?: 2 | 3;
  production: ProductionCard;
}) {
  return (
    <Link href={`/production/${production.slug}`} asChild>
      <Pressable
        accessibilityHint="Ouvre la fiche du spectacle"
        accessibilityLabel={production.title}
        accessibilityRole="link"
        className="todam-interactive-card min-h-28 flex-row gap-4 border-b border-line bg-transparent py-4"
      >
        <ProductionPoster
          compact
          discipline={production.discipline}
          poster={production.poster}
          title={production.title}
        />
        <View className="min-w-0 flex-1 justify-center gap-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-accent">
            {disciplineLabels[production.discipline]}
            {production.minimumAge !== null
              ? ` · Dès ${production.minimumAge} ans`
              : ""}
          </Text>
          <Text
            aria-level={headingLevel}
            accessibilityRole="header"
            className="font-serif text-xl font-semibold leading-6 text-ink"
          >
            {production.title}
          </Text>
          {production.company ? (
            <Text className="text-sm font-semibold text-ink">
              {production.company.name}
            </Text>
          ) : production.primaryCredit ? (
            <Text className="text-sm text-muted">{production.primaryCredit}</Text>
          ) : null}
          {production.nextPerformance && production.nextVenue ? (
            <Text className="text-sm leading-5 text-muted">
              {formatPerformance(
                production.nextPerformance,
                production.nextVenue.timezone,
              )}
              {" · "}
              {production.nextVenue.name}, {production.nextVenue.locality}
            </Text>
          ) : (
            <Text className="text-sm text-muted">
              {production.venueNames.join(" · ") || "Prochaine date à confirmer"}
            </Text>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

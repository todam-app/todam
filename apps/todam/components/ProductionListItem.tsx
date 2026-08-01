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
const disciplineClasses: Record<ProductionCard["discipline"], string> = {
  theatre: "text-coral-text",
  opera: "text-accent",
  ballet: "text-aqua-text",
};

export function ProductionListItem({
  headingLevel = 3,
  production,
  showCompany = true,
  showVenue = true,
}: {
  headingLevel?: 2 | 3;
  production: ProductionCard;
  showCompany?: boolean;
  showVenue?: boolean;
}) {
  return (
    <Link href={`/production/${production.slug}`} asChild>
      <Pressable
        accessibilityHint="Ouvre la fiche du spectacle"
        accessibilityLabel={production.title}
        accessibilityRole="link"
        className="todam-interactive-card min-h-32 flex-row gap-4 rounded-todam border border-transparent bg-transparent p-3"
      >
        <ProductionPoster
          compact
          discipline={production.discipline}
          poster={production.poster}
          title={production.title}
        />
        <View className="min-w-0 flex-1 justify-center gap-1">
          <Text
            className={`text-xs font-bold uppercase tracking-wide ${disciplineClasses[production.discipline]}`}
          >
            {disciplineLabels[production.discipline]}
            {production.minimumAge !== null
              ? ` · Dès ${production.minimumAge} ans`
              : ""}
          </Text>
          <Text
            aria-level={headingLevel}
            accessibilityRole="header"
            className="font-serif text-xl font-semibold leading-6 text-ink"
            numberOfLines={2}
          >
            {production.title}
          </Text>
          {showCompany && production.company ? (
            <Text className="text-sm font-semibold text-ink">
              {production.company.name}
            </Text>
          ) : !production.company && production.primaryCredit ? (
            <Text className="text-sm text-muted">{production.primaryCredit}</Text>
          ) : null}
          {production.nextPerformance && production.nextVenue ? (
            <Text className="text-sm leading-5 text-muted">
              {formatPerformance(
                production.nextPerformance,
                production.nextVenue.timezone,
              )}
              {showVenue
                ? ` · ${production.nextVenue.name}, ${production.nextVenue.locality}`
                : ""}
            </Text>
          ) : showVenue && production.venueNames.length > 0 ? (
            <Text className="text-sm text-muted">
              {production.venueNames.join(" · ")}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

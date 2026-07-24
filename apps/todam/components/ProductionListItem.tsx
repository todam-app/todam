import type { ProductionCard } from "@todam/contracts";
import { PosterPlaceholder } from "@todam/design-system";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export function ProductionListItem({ production }: { production: ProductionCard }) {
  return (
    <Link href={`/production/${production.slug}`} asChild>
      <Pressable
        accessibilityHint="Ouvre la fiche du spectacle"
        accessibilityLabel={production.title}
        accessibilityRole="link"
        className="min-h-28 flex-row gap-4 rounded-todam border border-line bg-paper p-3 active:opacity-70"
      >
        <PosterPlaceholder
          compact
          discipline={production.discipline}
          title={production.title}
        />
        <View className="min-w-0 flex-1 justify-center gap-1">
          <Text
            accessibilityRole="header"
            className="font-serif text-xl font-bold text-ink"
          >
            {production.title}
          </Text>
          {production.primaryCredit ? (
            <Text className="text-sm text-muted">{production.primaryCredit}</Text>
          ) : null}
          <Text className="text-sm text-muted">
            {production.venueNames.join(" · ") || "Lieu à confirmer"}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

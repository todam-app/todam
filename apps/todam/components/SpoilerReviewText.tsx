import { Button } from "@todam/design-system";
import { useState } from "react";
import { Text, View } from "react-native";

export function SpoilerReviewText({
  body,
  containsSpoiler,
}: {
  body: string;
  containsSpoiler: boolean;
}) {
  const [revealed, setRevealed] = useState(!containsSpoiler);

  if (!revealed) {
    return (
      <View className="max-w-[72ch] gap-3 border-l-2 border-accent bg-canvas p-4">
        <Text className="text-base leading-6 text-ink">
          Cet avis peut révéler des éléments de l’intrigue.
        </Text>
        <View className="self-start">
          <Button
            label="Afficher quand même"
            onPress={() => setRevealed(true)}
            variant="quiet"
          />
        </View>
      </View>
    );
  }

  return <Text className="max-w-[72ch] text-base leading-7 text-ink">{body}</Text>;
}

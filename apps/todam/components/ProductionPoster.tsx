import type { Discipline, Poster } from "@todam/contracts";
import { PosterPlaceholder } from "@todam/design-system";
import { useState } from "react";
import { Image } from "react-native";

interface ProductionPosterProps {
  compact?: boolean;
  discipline: Discipline;
  poster: Poster | null;
  title: string;
}

export function ProductionPoster({
  compact = false,
  discipline,
  poster,
  title,
}: ProductionPosterProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = poster?.url === failedUrl;

  if (!poster || failed) {
    return (
      <PosterPlaceholder compact={compact} discipline={discipline} title={title} />
    );
  }

  return (
    <Image
      accessibilityLabel={poster.alt ?? `Affiche du spectacle ${title}`}
      className={
        compact
          ? "h-24 w-16 rounded-lg bg-canvas"
          : "aspect-[2/3] w-full rounded-todam bg-canvas"
      }
      onError={() => setFailedUrl(poster.url)}
      resizeMode="cover"
      source={{ uri: poster.url }}
    />
  );
}

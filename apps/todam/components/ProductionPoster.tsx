import type { Discipline, Poster } from "@todam/contracts";
import { PosterPlaceholder } from "@todam/design-system";
import { createElement, useState } from "react";
import { Image, Platform } from "react-native";

interface ProductionPosterProps {
  compact?: boolean;
  discipline: Discipline;
  poster: Poster | null;
  priority?: boolean;
  title: string;
}

export function ProductionPoster({
  compact = false,
  discipline,
  poster,
  priority = false,
  title,
}: ProductionPosterProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = poster?.url === failedUrl;

  if (!poster || failed) {
    return (
      <PosterPlaceholder compact={compact} discipline={discipline} title={title} />
    );
  }

  const accessibilityLabel = poster.alt ?? `Affiche du spectacle ${title}`;
  const className = compact
    ? "h-24 w-16 rounded bg-canvas object-cover"
    : "aspect-[2/3] w-full rounded-todam bg-canvas object-cover";

  if (Platform.OS === "web") {
    const hasDimensions = poster.width !== null && poster.height !== null;
    return createElement("img", {
      alt: accessibilityLabel,
      className,
      decoding: "async",
      fetchPriority: priority ? "high" : "auto",
      height: hasDimensions ? poster.height : 1200,
      loading: priority ? "eager" : "lazy",
      onError: () => setFailedUrl(poster.url),
      src: poster.url,
      width: hasDimensions ? poster.width : 800,
    });
  }

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      className={className}
      onError={() => setFailedUrl(poster.url)}
      resizeMode="cover"
      source={{ uri: poster.url }}
    />
  );
}

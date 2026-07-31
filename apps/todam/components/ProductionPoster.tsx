import type { Discipline, Poster } from "@todam/contracts";
import { PosterPlaceholder } from "@todam/design-system";
import { createElement, useState } from "react";
import { Image, Platform, View } from "react-native";

interface ProductionPosterProps {
  bleed?: boolean;
  compact?: boolean;
  discipline: Discipline;
  fill?: boolean;
  poster: Poster | null;
  priority?: boolean;
  title: string;
}

export function ProductionPoster({
  bleed = false,
  compact = false,
  discipline,
  fill = false,
  poster,
  priority = false,
  title,
}: ProductionPosterProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = poster?.url === failedUrl;

  if (!poster || failed) {
    return (
      <PosterPlaceholder
        compact={compact}
        discipline={discipline}
        edgeToEdge={bleed}
        fill={fill}
        title={title}
      />
    );
  }

  const accessibilityLabel = poster.alt ?? `Affiche du spectacle ${title}`;
  const frameClassName = fill
    ? `h-full w-full overflow-hidden bg-placeholder ${bleed ? "" : "rounded-media"}`
    : compact
      ? "aspect-[148/210] w-[68px] overflow-hidden rounded-media bg-placeholder"
      : `aspect-[148/210] w-full overflow-hidden bg-placeholder ${
          bleed ? "" : "rounded-media"
        }`;

  if (Platform.OS === "web") {
    const hasDimensions = poster.width !== null && poster.height !== null;
    return (
      <View className={frameClassName}>
        {createElement("img", {
          alt: accessibilityLabel,
          className: "h-full w-full object-cover",
          decoding: "async",
          fetchPriority: priority ? "high" : "auto",
          height: hasDimensions ? poster.height : 2100,
          loading: priority ? "eager" : "lazy",
          onError: () => setFailedUrl(poster.url),
          src: poster.url,
          width: hasDimensions ? poster.width : 1480,
        })}
      </View>
    );
  }

  return (
    <View className={frameClassName}>
      <Image
        accessibilityLabel={accessibilityLabel}
        className="h-full w-full"
        onError={() => setFailedUrl(poster.url)}
        resizeMode="cover"
        source={{ uri: poster.url }}
      />
    </View>
  );
}

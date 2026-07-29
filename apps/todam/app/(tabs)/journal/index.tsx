import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import type { Dashboard, ProductionCard } from "@todam/contracts";
import { tokens } from "@todam/design-system";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AsyncState } from "../../../components/AsyncState";
import {
  MyShowsNavigation,
  type MyShowsCounts,
} from "../../../components/MyShowsNavigation";
import { PageScrollView } from "../../../components/PageScrollView";
import { PrivatePageHead } from "../../../components/PrivatePageHead";
import {
  PrivateSessionLoading,
  PrivateSessionRequired,
} from "../../../components/PrivateSessionState";
import { ProductionPoster } from "../../../components/ProductionPoster";
import { api } from "../../../lib/api";
import { authClient } from "../../../lib/auth-client";

function counts(dashboard: Dashboard): MyShowsCounts {
  return {
    watchlist: dashboard.counts.watchlist,
    seen: dashboard.counts.seen,
    ratings: dashboard.counts.ratings,
    lists: dashboard.counts.lists,
    reviews: dashboard.counts.reviews,
  };
}

function PreviewSection({
  count,
  href,
  items,
  title,
}: {
  count: number;
  href: "/journal/a-voir" | "/journal/vus" | "/journal/notes";
  items: ProductionCard[];
  title: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityHint={`Ouvre tous les spectacles ${title.toLocaleLowerCase("fr-FR")}`}
        accessibilityLabel={`${title}, ${count} spectacle${count > 1 ? "s" : ""}`}
        accessibilityRole="link"
        className="todam-interactive-card gap-4 rounded-panel border border-line bg-paper p-5 shadow-soft"
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-baseline gap-2">
            <Text
              aria-level={2}
              accessibilityRole="header"
              className="font-serif text-2xl font-semibold text-ink"
            >
              {title}
            </Text>
            <Text className="text-sm text-muted">{count}</Text>
          </View>
          <Ionicons
            color={tokens.color.muted}
            name="chevron-forward"
            size={22}
          />
        </View>
        {items.length > 0 ? (
          <View className="flex-row gap-3">
            {items.slice(0, 3).map((production) => (
              <View className="min-w-0 flex-1 gap-2" key={production.id}>
                <ProductionPoster
                  compact
                  discipline={production.discipline}
                  poster={production.poster}
                  title={production.title}
                />
                <Text className="text-xs font-semibold text-ink" numberOfLines={2}>
                  {production.title}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-muted">Cette section est encore vide.</Text>
        )}
      </Pressable>
    </Link>
  );
}

export default function MyShowsOverviewRoute() {
  const session = authClient.useSession();
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    enabled: Boolean(session.data),
  });

  if (session.isPending) {
    return (
      <>
        <PrivatePageHead title="Mes spectacles" />
        <PrivateSessionLoading />
      </>
    );
  }
  if (!session.data) {
    return (
      <>
        <PrivatePageHead title="Mes spectacles" />
        <PrivateSessionRequired />
      </>
    );
  }

  return (
    <>
      <PrivatePageHead title="Mes spectacles" />
      <PageScrollView contentContainerClassName="mx-auto w-full max-w-4xl gap-5 px-4 py-6 md:px-8 md:py-10">
        <View className="gap-2">
          <Text
            aria-level={1}
            accessibilityRole="header"
            className="font-serif text-4xl font-semibold text-ink"
          >
            Mes spectacles
          </Text>
          <Text className="text-base leading-6 text-muted">
            Retrouvez en un coup d’œil ce que vous voulez voir, avez vu et avez noté.
          </Text>
        </View>
        <AsyncState
          empty={false}
          emptyMessage=""
          error={dashboard.isError}
          loading={dashboard.isPending}
          onRetry={() => void dashboard.refetch()}
        >
          {dashboard.data ? (
            <View className="gap-4">
              <MyShowsNavigation counts={counts(dashboard.data)} />
              <PreviewSection
                count={dashboard.data.counts.watchlist}
                href="/journal/a-voir"
                items={dashboard.data.watchlist}
                title="À voir"
              />
              <PreviewSection
                count={dashboard.data.counts.seen}
                href="/journal/vus"
                items={dashboard.data.recentDiary.map((entry) => entry.production)}
                title="Vus"
              />
              <PreviewSection
                count={dashboard.data.counts.ratings}
                href="/journal/notes"
                items={dashboard.data.recentRatings.map((rating) => rating.production)}
                title="Notés"
              />
            </View>
          ) : null}
        </AsyncState>
      </PageScrollView>
    </>
  );
}

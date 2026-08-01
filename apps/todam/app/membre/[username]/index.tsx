import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Button, RatingLights, SectionTitle } from "@todam/design-system";
import { TodamApiError } from "@todam/contracts";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { Linking, Platform, Pressable, Text, View } from "react-native";

import { AsyncState } from "../../../components/AsyncState";
import { PageScrollView } from "../../../components/PageScrollView";
import { ProductionListItem } from "../../../components/ProductionListItem";
import { SpoilerReviewText } from "../../../components/SpoilerReviewText";
import { api } from "../../../lib/api";
import { PUBLIC_WEB_URL } from "../../../lib/config";

export default function PublicMemberPage() {
  const params = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const profile = useQuery({
    queryKey: ["member", params.username],
    queryFn: () => api.getMember(params.username),
    enabled: Boolean(params.username),
  });
  const journal = useInfiniteQuery({
    queryKey: ["member-journal", params.username],
    queryFn: ({ pageParam }) =>
      api.getMemberJournal(params.username, {
        cursor: pageParam,
        limit: 20,
        sort: "attended",
        order: "desc",
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(params.username && profile.data),
  });
  const entries = journal.data?.pages.flatMap((page) => page.items) ?? [];
  const unavailable =
    profile.error instanceof TodamApiError && profile.error.problem.status === 404;
  const canonicalUrl = `${PUBLIC_WEB_URL}/membre/${encodeURIComponent(
    params.username ?? "",
  )}`;
  const pageTitle = profile.data
    ? `Journal de @${profile.data.username}`
    : "Journal public Todam";
  const pageDescription = profile.data
    ? `Journal de @${profile.data.username} : ${profile.data.counts.seen} spectacles vus, ${profile.data.counts.lists} listes publiques et ${profile.data.counts.reviews} avis.`
    : "Journal public d’un membre Todam.";

  async function share() {
    if (!profile.data) return;
    if (Platform.OS === "web" && navigator.share) {
      try {
        await navigator.share({
          title: `Journal de ${profile.data.username}`,
          text: `Découvrez le journal de @${profile.data.username} sur Todam.`,
          url: canonicalUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await Linking.openURL(
      `mailto:?subject=${encodeURIComponent(
        `Journal de @${profile.data.username} — Todam`,
      )}&body=${encodeURIComponent(canonicalUrl)}`,
    );
  }

  return (
    <>
      <Head>
        <title>{profile.data ? `${pageTitle} | Todam` : "Membre | Todam"}</title>
        <meta content="noindex,follow" name="robots" />
        <link href={canonicalUrl} rel="canonical" />
        <meta content={pageDescription} name="description" />
        <meta content={pageTitle} property="og:title" />
        <meta content={pageDescription} property="og:description" />
        <meta content={canonicalUrl} property="og:url" />
        <meta content="profile" property="og:type" />
        <meta content={pageTitle} name="twitter:title" />
        <meta content={pageDescription} name="twitter:description" />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-content flex-1 px-5 py-8 md:px-8 md:py-12">
          <AsyncState
            empty={!profile.isPending && (!profile.data || unavailable)}
            emptyAction={
              <Button
                label="Rechercher un spectacle"
                onPress={() => router.push("/search")}
                variant="secondary"
              />
            }
            emptyMessage="Ce profil n’existe pas ou son journal est privé."
            error={profile.isError && !unavailable}
            loading={profile.isPending}
            onRetry={() => void profile.refetch()}
          >
            {profile.data ? (
              <View className="gap-9">
                <View className="max-w-3xl gap-3 border-b border-line pb-8">
                  <Text className="text-xs font-bold uppercase tracking-widest text-brand-text">
                    Journal public
                  </Text>
                  <Text
                    aria-level={1}
                    accessibilityRole="header"
                    className="font-serif text-4xl font-semibold text-ink md:text-5xl"
                  >
                    @{profile.data.username}
                  </Text>
                  {profile.data.bio ? (
                    <Text className="max-w-[72ch] text-base leading-7 text-muted">
                      {profile.data.bio}
                    </Text>
                  ) : null}
                  <View className="flex-row flex-wrap gap-5 pt-2">
                    <Text className="text-base font-semibold text-ink">
                      {profile.data.counts.seen} vus
                    </Text>
                    <Text className="text-base font-semibold text-ink">
                      {profile.data.counts.lists} listes
                    </Text>
                    <Text className="text-base font-semibold text-ink">
                      {profile.data.counts.reviews} avis
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2 pt-1">
                    <Button
                      label="Partager ce journal"
                      onPress={() => void share()}
                      variant="ghost"
                    />
                    <Button
                      label="Signaler ce profil"
                      onPress={() =>
                        router.push({
                          pathname: "/signaler",
                          params: {
                            type: "member",
                            id: profile.data!.username,
                          },
                        })
                      }
                      variant="ghost"
                    />
                  </View>
                </View>

                {profile.data.publicLists.length > 0 ? (
                  <View className="gap-4">
                    <SectionTitle>Listes publiques</SectionTitle>
                    <View className="flex-row flex-wrap gap-4">
                      {profile.data.publicLists.map((list) => (
                        <Link
                          href={`/membre/${profile.data!.username}/listes/${list.slug}`}
                          key={list.id}
                          asChild
                        >
                          <Pressable
                            accessibilityRole="link"
                            className="todam-interactive-card min-h-28 w-full max-w-sm justify-center rounded-panel border border-line bg-paper p-4 shadow-soft"
                          >
                            <Text className="font-serif text-xl font-semibold text-ink">
                              {list.name}
                            </Text>
                            <Text className="mt-1 text-sm text-muted">
                              {list.itemCount} spectacle{list.itemCount > 1 ? "s" : ""}
                            </Text>
                          </Pressable>
                        </Link>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View className="gap-4">
                  <SectionTitle>Journal</SectionTitle>
                  <AsyncState
                    empty={!journal.isPending && entries.length === 0}
                    emptyAction={
                      <Button
                        label="Rechercher un spectacle"
                        onPress={() => router.push("/search")}
                        variant="secondary"
                      />
                    }
                    emptyMessage="Ce journal ne contient encore aucun spectacle public."
                    error={journal.isError}
                    loading={journal.isPending}
                    onRetry={() => void journal.refetch()}
                  >
                    <View className="gap-1">
                      {entries.map((entry) => (
                        <View className="gap-1" key={entry.id}>
                          <ProductionListItem production={entry.production} />
                          <Text className="text-sm text-muted">
                            {entry.attendedOn
                              ? `Vu le ${new Intl.DateTimeFormat("fr-FR").format(
                                  new Date(`${entry.attendedOn}T12:00:00Z`),
                                )}`
                              : `Ajouté le ${new Intl.DateTimeFormat("fr-FR").format(
                                  new Date(entry.addedAt),
                                )}`}
                          </Text>
                          {entry.rating ? (
                            <View className="pb-2">
                              <RatingLights value={entry.rating} />
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                    {journal.hasNextPage ? (
                      <View className="mt-4 w-full max-w-xs self-center">
                        <Button
                          label="Charger la suite"
                          loading={journal.isFetchingNextPage}
                          onPress={() => void journal.fetchNextPage()}
                          variant="quiet"
                        />
                      </View>
                    ) : null}
                  </AsyncState>
                </View>

                {profile.data.recentReviews.length > 0 ? (
                  <View className="gap-4">
                    <SectionTitle>Avis publics</SectionTitle>
                    <View className="border-t border-line">
                      {profile.data.recentReviews.map((review) => (
                        <View
                          className="gap-3 border-b border-line py-5"
                          key={review.id}
                        >
                          <ProductionListItem production={review.production} />
                          <View className="flex-row flex-wrap items-center gap-3">
                            {review.rating ? (
                              <RatingLights value={review.rating} />
                            ) : null}
                            {review.containsSpoiler ? (
                              <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Contient des éléments révélant l’intrigue
                              </Text>
                            ) : null}
                          </View>
                          <SpoilerReviewText
                            body={review.body}
                            containsSpoiler={review.containsSpoiler}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </AsyncState>
        </View>
      </PageScrollView>
    </>
  );
}

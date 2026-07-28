import { useQuery } from "@tanstack/react-query";
import { TodamApiError } from "@todam/contracts";
import { Button, SectionTitle } from "@todam/design-system";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { Linking, Platform, Pressable, Text, View } from "react-native";

import { AsyncState } from "../../../../components/AsyncState";
import { LegalFooter } from "../../../../components/LegalFooter";
import { PageScrollView } from "../../../../components/PageScrollView";
import { ProductionListItem } from "../../../../components/ProductionListItem";
import { api } from "../../../../lib/api";
import { PUBLIC_WEB_URL } from "../../../../lib/config";

export default function PublicListPage() {
  const params = useLocalSearchParams<{ username: string; slug: string }>();
  const router = useRouter();
  const list = useQuery({
    queryKey: ["member-list", params.username, params.slug],
    queryFn: () => api.getMemberList(params.username, params.slug),
    enabled: Boolean(params.username && params.slug),
  });
  const canonicalUrl = `${PUBLIC_WEB_URL}/membre/${encodeURIComponent(
    params.username ?? "",
  )}/listes/${encodeURIComponent(params.slug ?? "")}`;
  const unavailable =
    list.error instanceof TodamApiError && list.error.problem.status === 404;
  const pageTitle = list.data
    ? `${list.data.name}, par @${list.data.username}`
    : "Liste de spectacles Todam";
  const pageDescription = list.data
    ? `${list.data.name}, une liste de ${list.data.itemCount} spectacles partagée par @${list.data.username} sur Todam.`
    : "Liste publique de spectacles partagée sur Todam.";

  async function share() {
    if (!list.data) return;
    if (Platform.OS === "web" && navigator.share) {
      try {
        await navigator.share({
          title: `${list.data.name}, par ${list.data.username}`,
          text: `Découvrez la liste « ${list.data.name} » sur Todam.`,
          url: canonicalUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await Linking.openURL(
      `mailto:?subject=${encodeURIComponent(
        `${list.data.name} — Todam`,
      )}&body=${encodeURIComponent(canonicalUrl)}`,
    );
  }

  return (
    <>
      <Head>
        <title>
          {list.data ? `${pageTitle} | Todam` : "Liste de spectacles | Todam"}
        </title>
        <meta content="noindex,follow" name="robots" />
        <link href={canonicalUrl} rel="canonical" />
        <meta content={pageDescription} name="description" />
        <meta content={pageTitle} property="og:title" />
        <meta content={pageDescription} property="og:description" />
        <meta content={canonicalUrl} property="og:url" />
        <meta content={pageTitle} name="twitter:title" />
        <meta content={pageDescription} name="twitter:description" />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-3xl flex-1 px-5 py-8 md:px-8 md:py-12">
          <AsyncState
            empty={!list.isPending && (!list.data || unavailable)}
            emptyAction={
              <Button
                label="Découvrir les spectacles"
                onPress={() => router.push("/decouvrir")}
                variant="secondary"
              />
            }
            emptyMessage="Cette liste n’existe pas ou n’est pas publique."
            error={list.isError && !unavailable}
            loading={list.isPending}
            onRetry={() => void list.refetch()}
          >
            {list.data ? (
              <View className="gap-8">
                <View className="gap-4 border-b border-line pb-7">
                  <Link href={`/membre/${list.data.username}`} asChild>
                    <Pressable
                      accessibilityRole="link"
                      className="min-h-11 justify-center"
                    >
                      <Text className="text-sm font-semibold text-accent">
                        Journal de @{list.data.username}
                      </Text>
                    </Pressable>
                  </Link>
                  <SectionTitle eyebrow="Liste publique" level={1}>
                    {list.data.name}
                  </SectionTitle>
                  {list.data.description ? (
                    <Text className="max-w-[72ch] text-base leading-6 text-muted">
                      {list.data.description}
                    </Text>
                  ) : null}
                  <Text className="text-sm text-muted">
                    {list.data.itemCount} spectacle
                    {list.data.itemCount > 1 ? "s" : ""}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      label="Partager cette liste"
                      onPress={() => void share()}
                      variant="ghost"
                    />
                    <Button
                      label="Signaler cette liste"
                      onPress={() =>
                        router.push({
                          pathname: "/signaler",
                          params: { type: "list", id: list.data!.id },
                        })
                      }
                      variant="ghost"
                    />
                  </View>
                </View>
                {list.data.items.length > 0 ? (
                  <View className="gap-1">
                    {list.data.items.map((item) => (
                      <ProductionListItem
                        headingLevel={2}
                        key={item.production.id}
                        production={item.production}
                      />
                    ))}
                  </View>
                ) : (
                  <View className="items-start gap-3 border-l-2 border-accent pl-4">
                    <Text className="text-base text-muted">
                      Cette liste est encore vide.
                    </Text>
                    <Button
                      label="Découvrir les spectacles"
                      onPress={() => router.push("/decouvrir")}
                      variant="secondary"
                    />
                  </View>
                )}
              </View>
            ) : null}
          </AsyncState>
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}

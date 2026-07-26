import { useQuery } from "@tanstack/react-query";
import { Button, SectionTitle } from "@todam/design-system";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Text, View } from "react-native";

import { AsyncState } from "../../components/AsyncState";
import { HomeCitySelector } from "../../components/HomeCitySelector";
import { HomeDiscoveryCollection } from "../../components/HomeDiscoveryCollection";
import { LegalFooter } from "../../components/LegalFooter";
import { PageScrollView } from "../../components/PageScrollView";
import { SearchBar } from "../../components/SearchBar";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth-client";
import { getHomeGreeting, getHomeProgressPercentage } from "../../lib/home";

function Page({ children }: { children: React.ReactNode }) {
  return (
    <PageScrollView
      contentContainerClassName="flex-grow"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {children}
      <LegalFooter />
    </PageScrollView>
  );
}

function MarketingHome() {
  const router = useRouter();

  return (
    <Page>
      <View
        className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-content flex-1 items-center justify-center px-5 py-10 md:px-8 md:py-16`}
      >
        <View className="w-full max-w-5xl min-w-0 items-center gap-6">
          <Text
            accessibilityRole="header"
            className="text-center font-serif text-[34px] font-semibold leading-[40px] text-ink md:text-[36px] md:leading-[44px]"
          >
            Gardez une trace des spectacles que vous avez vus.{"\n"}
            Notez-les et partagez votre avis.{"\n"}
            Trouvez votre prochain spectacle.
          </Text>
          <View className="w-full max-w-xs">
            <Button
              label="Commencez — c'est gratuit"
              onPress={() => router.push("/sign-up")}
            />
          </View>
          <Text className="text-center text-sm leading-5 text-muted">
            Mon journal de spectacles.
            {Platform.OS === "web" ? " Bientôt sur iOS et Android." : ""}
          </Text>
        </View>
      </View>
    </Page>
  );
}

function ConnectedHome() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const home = useQuery({
    queryKey: ["home"],
    queryFn: () => api.getHome(),
  });

  function submitSearch() {
    const query = searchInput.trim();
    if (query.length < 2) return;
    router.push({ pathname: "/search", params: { q: query } });
  }

  return (
    <Page>
      <View
        className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-content flex-1 px-5 py-8 md:px-8 md:py-12`}
      >
        <AsyncState
          empty={!home.data}
          emptyMessage="Votre accueil est prêt, mais son contenu est encore vide."
          error={home.isError}
          loading={home.isPending}
          onRetry={() => void home.refetch()}
        >
          {home.data ? (
            <View className="gap-10">
              <View className="w-full gap-5">
                <View className="min-w-0 gap-2">
                  <Text
                    accessibilityRole="header"
                    className="font-serif text-4xl font-black leading-[44px] text-ink md:text-5xl md:leading-[56px]"
                  >
                    {getHomeGreeting(home.data.profile.pseudonym)}
                  </Text>
                  <Text className="max-w-3xl text-base leading-6 text-muted">
                    {home.data.progress.completed
                      ? "Découvrez les spectacles programmés près de vous et les derniers ajouts à Todam."
                      : "Ajoutez cinq spectacles pour commencer à construire votre journal et personnaliser votre accueil."}
                  </Text>
                </View>

                {!home.data.progress.completed ? (
                  <View
                    className="gap-4 rounded-todam border border-line bg-paper p-5"
                    testID="home-progress-card"
                  >
                    <View
                      accessibilityLabel={`${home.data.progress.current} spectacles sur ${home.data.progress.target}`}
                      accessibilityRole="progressbar"
                      accessibilityValue={{
                        max: home.data.progress.target,
                        min: 0,
                        now: home.data.progress.current,
                      }}
                      className="gap-2"
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="font-semibold text-ink">
                          Construisez votre journal
                        </Text>
                        <Text className="text-sm font-semibold text-accent">
                          {home.data.progress.current} sur {home.data.progress.target}
                        </Text>
                      </View>
                      <View className="h-2 overflow-hidden rounded-full bg-line">
                        <View
                          className="h-full rounded-full bg-accent"
                          style={{
                            width: `${getHomeProgressPercentage(
                              home.data.progress.current,
                              home.data.progress.target,
                            )}%`,
                          }}
                        />
                      </View>
                    </View>
                    <View className="md:flex-row">
                      {[
                        ["Vu", "Gardez une trace d'un spectacle."],
                        ["Noter", "Attribuez simplement une note sur 10."],
                        ["À voir", "Retrouvez les spectacles qui vous tentent."],
                      ].map(([label, description], index) => (
                        <View
                          className={`flex-1 gap-2 ${
                            index === 0
                              ? "pb-4 md:pb-0 md:pr-5"
                              : index === 1
                                ? "border-t border-line py-4 md:border-l md:border-t-0 md:px-5 md:py-0"
                                : "border-t border-line pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0"
                          }`}
                          key={label}
                          testID={`home-progress-step-${index}`}
                        >
                          <View className="h-0.5 w-6 rounded-full bg-accent" />
                          <View>
                            <Text className="font-semibold text-ink">{label}</Text>
                            <Text className="text-sm leading-5 text-muted">
                              {description}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View className="gap-2" testID="home-recent-search">
                  <Text className="font-semibold text-ink">
                    {"Qu'avez-vous vu récemment ?"}
                  </Text>
                  <SearchBar
                    accessibilityLabel="Rechercher un spectacle depuis l'accueil"
                    onChangeText={setSearchInput}
                    onClear={() => setSearchInput("")}
                    onSubmit={submitSearch}
                    placeholder="Titre, artiste ou théâtre"
                    value={searchInput}
                  />
                </View>
              </View>

              <HomeCitySelector city={home.data.homeCity} />

              {home.data.homeCity ? (
                <View className="gap-4" testID="home-discovery-section">
                  <SectionTitle>
                    {"À l'affiche près de "}
                    {home.data.homeCity.label}
                  </SectionTitle>
                  {home.data.nearby.length === 0 ? (
                    <>
                      <Text className="rounded-todam border border-line bg-paper p-5 text-muted">
                        {
                          "Aucun spectacle à venir n'est actuellement référencé dans un rayon de "
                        }
                        {home.data.radiusKm} km autour de {home.data.homeCity.label}.
                        Voici les prochaines dates ailleurs.
                      </Text>
                      <SectionTitle>{"À l'affiche ailleurs"}</SectionTitle>
                      <HomeDiscoveryCollection
                        emptyMessage="Aucune représentation future n'est encore référencée."
                        items={home.data.nationalUpcoming}
                      />
                    </>
                  ) : (
                    <HomeDiscoveryCollection
                      emptyMessage="Aucun spectacle à venir n'est encore référencé près de cette ville."
                      items={home.data.nearby}
                    />
                  )}
                </View>
              ) : (
                <View className="gap-4" testID="home-discovery-section">
                  <SectionTitle>{"À l'affiche en ce moment"}</SectionTitle>
                  <HomeDiscoveryCollection
                    emptyMessage="Aucune représentation future n'est encore référencée."
                    items={home.data.nationalUpcoming}
                  />
                </View>
              )}

              <View className="gap-4">
                <SectionTitle>Nouveautés dans Todam</SectionTitle>
                <HomeDiscoveryCollection
                  emptyMessage="Les prochains ajouts au catalogue apparaîtront ici."
                  items={home.data.recentlyAdded}
                />
              </View>
            </View>
          ) : null}
        </AsyncState>
      </View>
    </Page>
  );
}

export default function HomeScreen() {
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <Page>
        <View
          className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-content flex-1 px-5 py-8 md:px-8 md:py-12`}
        >
          <AsyncState empty={false} emptyMessage="" error={false} loading>
            {null}
          </AsyncState>
        </View>
      </Page>
    );
  }

  return session.data ? <ConnectedHome /> : <MarketingHome />;
}

import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, SectionTitle, StatCard, tokens } from "@todam/design-system";
import { useRouter } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";

import { AsyncState } from "../../components/AsyncState";
import { LegalFooter } from "../../components/LegalFooter";
import { PageScrollView } from "../../components/PageScrollView";
import { ProductionListItem } from "../../components/ProductionListItem";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth-client";

const legalLinks = [
  { href: "/conditions-utilisation", label: "Conditions d'utilisation" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    enabled: Boolean(session.data),
  });
  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
  }

  if (session.isPending) {
    return (
      <AsyncState empty={false} emptyMessage="" error={false} loading>
        {null}
      </AsyncState>
    );
  }

  if (!session.data) {
    return (
      <PageScrollView contentContainerClassName="flex-grow">
        <View
          className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-xl flex-1 items-center justify-center gap-5 px-5 py-12`}
        >
          <Text
            accessibilityRole="header"
            className="text-center font-serif text-4xl font-black text-ink"
          >
            Ton journal t’attend
          </Text>
          <Text className="text-center leading-6 text-muted">
            Crée un compte pour retrouver tes spectacles vus, tes notes et ta liste à
            voir.
          </Text>
          <View className="w-full max-w-xs gap-2">
            <Button label="Créer un compte" onPress={() => router.push("/sign-up")} />
            <Button
              label="Se connecter"
              onPress={() => router.push("/sign-in")}
              variant="secondary"
            />
          </View>
        </View>
        <LegalFooter />
      </PageScrollView>
    );
  }

  const maxRatingCount = Math.max(
    1,
    ...(dashboard.data?.ratingDistribution.map((item) => item.count) ?? [1]),
  );
  const recentProductions = dashboard.data
    ? Array.from(
        new Map(
          dashboard.data.recentDiary.map((entry) => [
            entry.production.id,
            entry.production,
          ]),
        ).values(),
      )
    : [];

  return (
    <PageScrollView
      contentContainerClassName="flex-grow"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View
        className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-content flex-1 gap-10 px-5 py-8 md:px-8 md:py-12`}
      >
        <AsyncState
          empty={!dashboard.data}
          emptyMessage="Ton profil est prêt, mais son contenu est encore vide."
          error={dashboard.isError}
          loading={dashboard.isPending}
          onRetry={() => void dashboard.refetch()}
        >
          {dashboard.data ? (
            <>
              <View className="flex-row flex-wrap items-center justify-between gap-4">
                <View className="gap-1">
                  <Text className="text-sm text-muted">Mon profil</Text>
                  <Text
                    accessibilityRole="header"
                    className="font-serif text-4xl font-black text-ink"
                  >
                    {dashboard.data.profile.pseudonym}
                  </Text>
                </View>
                <View className="flex-row flex-wrap items-center justify-end gap-2">
                  <Button
                    label="Paramètres du compte"
                    onPress={() => router.push("/parametres-compte")}
                    variant="secondary"
                  />
                  <Button
                    label="Se déconnecter"
                    onPress={() => void signOut()}
                    variant="ghost"
                  />
                </View>
              </View>

              <View className="flex-row flex-wrap gap-2">
                <StatCard label="Notes" value={dashboard.data.counts.ratings} />
                <StatCard label="Vus" value={dashboard.data.counts.seen} />
                <StatCard label="À voir" value={dashboard.data.counts.watchlist} />
                <StatCard label="Listes" value={dashboard.data.counts.lists} />
              </View>

              <View className="gap-4">
                <SectionTitle>Mon journal récent</SectionTitle>
                {recentProductions.length === 0 ? (
                  <Text className="rounded-todam border border-line bg-paper p-5 text-muted">
                    Aucun spectacle vu pour le moment.
                  </Text>
                ) : (
                  <View className="gap-3">
                    {recentProductions.map((production) => (
                      <ProductionListItem key={production.id} production={production} />
                    ))}
                  </View>
                )}
              </View>

              <View className="gap-4">
                <SectionTitle>Répartition de mes notes</SectionTitle>
                <View
                  accessibilityLabel="Histogramme des notes de 1 à 10"
                  className="h-56 flex-row items-end gap-2 rounded-todam border border-line bg-paper p-4"
                >
                  {dashboard.data.ratingDistribution.map((item) => (
                    <View
                      accessibilityLabel={`${item.count} notes à ${item.value} sur 10`}
                      className="flex-1 items-center justify-end gap-2"
                      key={item.value}
                    >
                      <Text className="text-xs text-muted">{item.count}</Text>
                      <View
                        className="w-full min-w-2 rounded-t bg-accent"
                        style={{
                          height: Math.max(3, (item.count / maxRatingCount) * 150),
                        }}
                      />
                      <Text className="text-xs font-semibold text-ink">
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className="text-sm text-muted">
                  Chaque barre indique le nombre de spectacles associés à la note
                  affichée.
                </Text>
              </View>

              <View className="gap-4">
                <SectionTitle>À voir</SectionTitle>
                {dashboard.data.watchlist.length === 0 ? (
                  <Text className="rounded-todam border border-line bg-paper p-5 text-muted">
                    Ta liste est vide. Recherche un spectacle pour l’ajouter.
                  </Text>
                ) : (
                  <View className="gap-3">
                    {dashboard.data.watchlist.map((production) => (
                      <ProductionListItem key={production.id} production={production} />
                    ))}
                  </View>
                )}
              </View>
              {Platform.OS !== "web" ? (
                <View className="w-full max-w-3xl gap-4">
                  <SectionTitle>Informations légales</SectionTitle>
                  <View className="overflow-hidden rounded-todam border border-line bg-paper">
                    {legalLinks.map((item, index) => (
                      <Pressable
                        accessibilityRole="link"
                        className={`min-h-14 flex-row items-center justify-between gap-4 px-4 ${
                          index < legalLinks.length - 1 ? "border-b border-line" : ""
                        }`}
                        key={item.href}
                        onPress={() => router.push(item.href)}
                      >
                        <Text className="flex-1 font-semibold text-ink">
                          {item.label}
                        </Text>
                        <Ionicons
                          accessibilityElementsHidden
                          color={tokens.color.muted}
                          importantForAccessibility="no"
                          name="chevron-forward"
                          size={20}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </AsyncState>
      </View>
      <LegalFooter />
    </PageScrollView>
  );
}

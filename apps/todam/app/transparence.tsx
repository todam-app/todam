import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import Head from "expo-router/head";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView } from "../components/PageScrollView";
import { api } from "../lib/api";
import { resolveBuildInfo } from "../lib/build-info";

const REPOSITORY_URL = "https://github.com/todam-app/todam";
const CONTRIBUTING_URL = `${REPOSITORY_URL}/blob/main/CONTRIBUTING.md`;

const stack = [
  {
    label: "Application universelle",
    value: "Expo · React Native Web",
  },
  {
    label: "API",
    value: "TypeScript · Fastify",
  },
  {
    label: "Données",
    value: "PostgreSQL · PostGIS · Drizzle",
  },
  {
    label: "Contrats",
    value: "Zod · OpenAPI",
  },
  {
    label: "Livraison",
    value: "Docker · GitHub Actions · Coolify",
  },
] as const;

function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatTicket({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="min-w-52 flex-1 gap-3 rounded-todam border-2 border-line bg-paper p-5"
      style={styles.ticket}
    >
      <View className="h-1 w-10 rounded-full bg-accent" />
      <Text
        accessibilityLabel={`${label} : ${value}`}
        className="font-serif text-5xl font-black leading-[54px] text-ink"
        selectable
      >
        {value}
      </Text>
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
    </View>
  );
}

function ExternalLink({
  href,
  label,
  secondary = false,
}: {
  href: string;
  label: string;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      className={`min-h-11 items-center justify-center rounded-full border px-5 py-3 ${
        secondary ? "border-line bg-paper" : "border-accent bg-accent"
      }`}
      onPress={() => void Linking.openURL(href)}
    >
      <Text className={`font-semibold ${secondary ? "text-ink" : "text-paper"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TransparencyScreen() {
  const stats = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => api.getPublicStats(),
  });
  const buildInfo = resolveBuildInfo(
    Constants.expoConfig?.version,
    process.env.EXPO_PUBLIC_BUILD_SHA,
  );
  const statValue = (value: number | undefined) =>
    stats.isPending
      ? "…"
      : stats.isError || value === undefined
        ? "—"
        : formatCount(value);

  const buildStamp = (
    <View
      className="self-start rounded-todam border-2 border-accent bg-paper px-5 py-4"
      style={styles.stamp}
    >
      <Text className="text-xs font-bold uppercase tracking-widest text-accent">
        Version publique
      </Text>
      <Text className="mt-1 font-semibold text-ink">
        v{buildInfo.version} · {buildInfo.label}
      </Text>
    </View>
  );

  return (
    <>
      <Head>
        <title>Todam, projet open source - Chiffres et transparence</title>
        <meta
          content="Découvrez Todam, un projet open source : ses chiffres clés, ses coûts, ses technologies et tout son code source."
          name="description"
        />
      </Head>
      <PageScrollView
        contentContainerClassName="flex-grow"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View
          className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-content gap-16 px-5 py-10 md:px-8 md:py-16`}
        >
          <View className="gap-8 rounded-todam border-2 border-ink bg-paper p-6 md:p-10">
            <View className="self-start rounded-full bg-ink px-4 py-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-paper">
                Projet open source · chiffres réels · build public
              </Text>
            </View>
            <View className="max-w-4xl gap-5">
              <Text
                accessibilityRole="header"
                className="font-serif text-[44px] font-black leading-[48px] text-ink md:text-[64px] md:leading-[68px]"
              >
                Todam, côté coulisses
              </Text>
              <Text className="max-w-3xl text-lg leading-8 text-ink">
                Todam est un jeune projet open source. Nous préférons montrer ce qui
                existe vraiment : le catalogue, la communauté, la technologie, le coût
                et le code qui fait fonctionner Todam.
              </Text>
            </View>
            {buildInfo.commitUrl ? (
              <Pressable
                accessibilityLabel={`Version ${buildInfo.version}, ${buildInfo.label}, voir le commit`}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(buildInfo.commitUrl!)}
              >
                {buildStamp}
              </Pressable>
            ) : (
              buildStamp
            )}
          </View>

          <View className="gap-6">
            <View className="gap-2">
              <Text
                accessibilityRole="header"
                className="font-serif text-3xl font-black text-ink"
              >
                Chiffres clés
              </Text>
              <Text className="text-base leading-7 text-muted">
                Des comptes vérifiés et un catalogue réellement visible dans Todam.
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-4">
              <StatTicket
                label="Comptes vérifiés"
                value={statValue(stats.data?.verifiedUsers)}
              />
              <StatTicket
                label="Spectacles actifs"
                value={statValue(stats.data?.activeProductions)}
              />
              <StatTicket
                label="Représentations à venir"
                value={statValue(stats.data?.upcomingPerformances)}
              />
            </View>
            {stats.isError ? (
              <View
                accessibilityLiveRegion="polite"
                className="flex-row flex-wrap items-center gap-3"
              >
                <Text accessibilityRole="alert" className="text-sm text-muted">
                  Les chiffres sont temporairement indisponibles.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  className="min-h-11 justify-center"
                  onPress={() => void stats.refetch()}
                >
                  <Text className="font-semibold text-accent">Réessayer</Text>
                </Pressable>
              </View>
            ) : stats.data ? (
              <Text className="text-xs text-muted">
                Générés le {formatGeneratedAt(stats.data.generatedAt)}.
              </Text>
            ) : null}
          </View>

          <View className="gap-6 rounded-todam border-2 border-ink bg-paper p-6 md:p-8">
            <View className="max-w-4xl gap-4">
              <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                Projet open source
              </Text>
              <Text
                accessibilityRole="header"
                className="font-serif text-3xl font-black text-ink"
              >
                Le code de Todam est public
              </Text>
              <Text className="text-base leading-7 text-ink">
                Le code de Todam est disponible sur GitHub. Vous pouvez le consulter,
                suivre son évolution et proposer des améliorations ou de nouvelles
                fonctionnalités.
              </Text>
              <Text className="text-base leading-7 text-ink">
                L’application, les contrats et le design system sont sous licence
                Apache-2.0. L’API, les tâches serveur, le domaine et la base de données
                sont sous licence AGPL-3.0. Les contributions sont signées avec le DCO,
                sans CLA.
              </Text>
              <Text className="text-base leading-7 text-muted">
                L’ouverture du code concerne uniquement le logiciel. Vos données
                personnelles ne sont pas publiées avec le code et sont protégées par des
                mesures de sécurité adaptées. Les affiches et les contenus tiers restent
                soumis à leurs propres droits.
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              <ExternalLink href={REPOSITORY_URL} label="Voir le code sur GitHub" />
              <ExternalLink
                href={CONTRIBUTING_URL}
                label="Contribuer au projet"
                secondary
              />
            </View>
          </View>

          <View className="flex-row flex-wrap gap-8 rounded-todam border-2 border-accent bg-paper p-6 md:p-8">
            <View className="min-w-64 flex-1 gap-3">
              <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                Le coût du projet
              </Text>
              <Text
                accessibilityRole="header"
                className="font-serif text-5xl font-black leading-[54px] text-ink"
                selectable
              >
                10,71 €
              </Text>
              <Text className="font-semibold text-ink">
                TTC par mois, en équivalent
              </Text>
              <Text className="text-sm text-muted">Référence : 25 juillet 2026</Text>
            </View>
            <View className="min-w-64 flex-1 gap-4">
              <View className="gap-1 border-b border-line pb-4">
                <Text className="font-semibold text-ink">VPS et sauvegarde</Text>
                <Text className="text-muted">10,19 € TTC par mois</Text>
              </View>
              <View className="gap-1">
                <Text className="font-semibold text-ink">Nom de domaine</Text>
                <Text className="text-muted">
                  18,70 € TTC pour trois ans, soit environ 0,52 € par mois
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-6">
            <View className="gap-2">
              <Text
                accessibilityRole="header"
                className="font-serif text-3xl font-black text-ink"
              >
                Sous le capot
              </Text>
              <Text className="text-base leading-7 text-muted">
                Une architecture documentée, sans console propriétaire cachée.
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-4">
              {stack.map((item, index) => (
                <View
                  className="min-w-56 flex-1 gap-2 rounded-todam border border-line bg-paper p-5"
                  key={item.label}
                >
                  <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                    {String(index + 1).padStart(2, "0")} · {item.label}
                  </Text>
                  <Text className="text-lg font-semibold leading-7 text-ink">
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-4 rounded-todam bg-ink p-6 md:p-8">
            <Text
              accessibilityRole="header"
              className="font-serif text-3xl font-black text-paper"
            >
              Développé avec Codex
            </Text>
            <Text className="max-w-4xl text-base leading-7 text-paper">
              Todam a été développé avec Codex, l’assistant de code d’OpenAI. Codex
              intervient pour développer, relire et tester le projet. Le code et son
              historique restent publics et vérifiables sur GitHub.
            </Text>
            <Text className="text-lg font-semibold leading-7 text-paper">
              Je vous le recommande : ça fait gagner un temps fou !
            </Text>
          </View>
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  stamp: {
    transform: [{ rotate: "-2deg" }],
  },
  ticket: {
    borderStyle: "dashed",
  },
});

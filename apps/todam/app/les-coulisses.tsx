import { useQuery } from "@tanstack/react-query";
import { tokens } from "@todam/design-system";
import Constants from "expo-constants";
import Head from "expo-router/head";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView } from "../components/PageScrollView";
import { api } from "../lib/api";
import { resolveBuildInfo } from "../lib/build-info";
import { PUBLIC_WEB_URL } from "../lib/config";

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
      className="todam-ticket min-w-52 flex-1 gap-3 p-5"
    >
      <View className="h-1 w-10 rounded-full bg-accent" />
      <Text
        accessibilityLabel={`${label} : ${value}`}
        className="font-serif text-5xl font-bold leading-[54px] text-ink"
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
      className="min-h-11 items-center justify-center rounded-todam border px-5 py-3"
      onPress={() => void Linking.openURL(href)}
      style={
        Platform.OS === "web"
          ? secondary
            ? styles.quietButtonWeb
            : styles.standardButtonWeb
          : undefined
      }
    >
      <Text
        className={`text-base font-semibold ${secondary ? "text-ink" : "text-paper"}`}
        style={
          Platform.OS === "web"
            ? secondary
              ? styles.quietButtonLabelWeb
              : styles.standardButtonLabelWeb
            : undefined
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function BehindTheScenesScreen() {
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
      className="todam-ticket self-start px-5 py-4"
    >
      <Text className="text-xs font-bold uppercase tracking-widest text-accent">
        Version publique
      </Text>
      <Text className="text-base mt-1 font-semibold text-ink">
        v{buildInfo.version} · {buildInfo.label}
      </Text>
    </View>
  );

  return (
    <>
      <Head>
        <title>Les coulisses de Todam | Coût, code et fonctionnement</title>
        <meta
          content="Les coulisses de Todam : coût mensuel, code open source, licences, stack Docker, version publique, sauvegardes, supervision et limites actuelles."
          name="description"
        />
        <link href={`${PUBLIC_WEB_URL}/les-coulisses`} rel="canonical" />
        <meta content="Les coulisses de Todam" property="og:title" />
        <meta
          content="Coût mensuel, code open source, licences, stack technique et état opérationnel du projet."
          property="og:description"
        />
        <meta content={`${PUBLIC_WEB_URL}/les-coulisses`} property="og:url" />
        <meta content="Les coulisses de Todam" name="twitter:title" />
        <meta
          content="Coût mensuel, code open source, licences, stack technique et état opérationnel du projet."
          name="twitter:description"
        />
      </Head>
      <PageScrollView
        contentContainerClassName="flex-grow"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View
          className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-content gap-16 px-5 py-10 md:px-8 md:py-16`}
        >
          <View className="todam-calm-panel gap-8 p-6 md:p-10">
            <View className="self-start rounded-full bg-ink px-4 py-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-paper">
                Projet open source · chiffres réels · build public
              </Text>
            </View>
            <View className="max-w-4xl gap-5">
              <Text
                aria-level={1}
                accessibilityRole="header"
                className="font-serif text-[44px] font-bold leading-[48px] text-ink md:text-[64px] md:leading-[68px]"
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
                className="min-h-11 justify-center"
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
                aria-level={2}
                accessibilityRole="header"
                className="font-serif text-3xl font-bold text-ink"
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
                  <Text className="text-base font-semibold text-accent">Réessayer</Text>
                </Pressable>
              </View>
            ) : stats.data ? (
              <Text className="text-xs text-muted">
                Générés le {formatGeneratedAt(stats.data.generatedAt)}.
              </Text>
            ) : null}
          </View>

          <View className="todam-calm-panel gap-6 p-6 md:p-8">
            <View className="max-w-4xl gap-4">
              <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                Projet open source
              </Text>
              <Text
                aria-level={2}
                accessibilityRole="header"
                className="font-serif text-3xl font-bold text-ink"
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

          <View className="todam-calm-panel flex-row flex-wrap gap-8 p-6 md:p-8">
            <View className="min-w-64 flex-1 gap-3">
              <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                Le coût du projet
              </Text>
              <Text
                className="font-serif text-5xl font-bold leading-[54px] text-ink"
                selectable
              >
                10,71 €
              </Text>
              <Text className="text-base font-semibold text-ink">
                TTC par mois, en équivalent
              </Text>
              <Text className="max-w-sm text-base leading-6 text-muted">
                Un budget d’infrastructure volontairement maîtrisé pour ce premier
                pilote, sans confondre sobriété et garanties encore non vérifiées.
              </Text>
              <Text className="text-sm text-muted">Référence : 25 juillet 2026</Text>
            </View>
            <View className="min-w-64 flex-1 gap-4">
              <View className="gap-1 border-b border-line pb-4">
                <Text className="text-base font-semibold text-ink">
                  VPS et sauvegarde
                </Text>
                <Text className="text-base text-muted">10,19 € TTC par mois</Text>
              </View>
              <View className="gap-1">
                <Text className="text-base font-semibold text-ink">Nom de domaine</Text>
                <Text className="text-base text-muted">
                  18,70 € TTC pour trois ans, soit environ 0,52 € par mois
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-6">
            <View className="gap-2">
              <Text
                aria-level={2}
                accessibilityRole="header"
                className="font-serif text-3xl font-bold text-ink"
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
                  className="min-w-56 flex-1 gap-2 rounded-panel border border-line bg-paper p-5 shadow-soft md:min-w-[190px]"
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

          <View className="gap-7 border-y border-line py-8">
            <View className="max-w-4xl gap-3">
              <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                Fiabilité opérationnelle
              </Text>
              <Text
                aria-level={2}
                accessibilityRole="header"
                className="font-serif text-3xl font-bold text-ink"
              >
                Ce qui est disponible, et ce qui reste à prouver
              </Text>
              <Text className="max-w-[72ch] text-base leading-7 text-muted">
                Todam distingue volontairement les mécanismes présents dans le code des
                protections effectivement vérifiées en production.
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-4">
              <View className="todam-calm-panel min-w-64 flex-1 gap-3 p-5">
                <Text className="text-base font-semibold text-ink">Sauvegardes</Text>
                <Text className="text-base leading-6 text-muted">
                  La sauvegarde automatisée de la machine est comprise dans le budget.
                  Une sauvegarde PostgreSQL quotidienne externalisée vers R2, avec au
                  moins 14 jours de rétention, reste un prérequis du lancement public.
                  Elle ne sera annoncée comme opérationnelle qu’après un exercice de
                  restauration documenté.
                </Text>
              </View>
              <View className="todam-calm-panel min-w-64 flex-1 gap-3 p-5">
                <Text className="text-base font-semibold text-ink">Supervision</Text>
                <Text className="text-base leading-6 text-muted">
                  Le Web et l’API exposent des contrôles de disponibilité et de
                  connexion à la base. La surveillance extérieure au serveur et les
                  alertes CPU, mémoire et disque font partie de la checklist de mise en
                  production ; leur état doit rester explicitement vérifiable.
                </Text>
              </View>
            </View>
          </View>

          <View className="todam-calm-panel flex-row flex-wrap gap-8 p-6 md:p-8">
            <View className="min-w-64 flex-1 gap-4">
              <Text
                aria-level={2}
                accessibilityRole="header"
                className="font-serif text-3xl font-bold text-ink"
              >
                Corriger une information
              </Text>
              <Text className="text-base leading-7 text-muted">
                Chaque fiche de spectacle, lieu ou compagnie propose un formulaire de
                signalement. La correction est vérifiée avec sa source avant
                publication. Les compagnies validées passent par un brouillon relu par
                Todam : la version publique ne change pas tant que la révision n’est pas
                approuvée.
              </Text>
            </View>
            <View className="min-w-64 flex-1 gap-4">
              <Text
                aria-level={2}
                accessibilityRole="header"
                className="font-serif text-3xl font-bold text-ink"
              >
                Limites actuelles
              </Text>
              <Text className="text-base leading-7 text-muted">
                Todam est une bêta en construction. Le catalogue pilote se limite au
                théâtre, à l’opéra et au ballet. Les visuels ne sont publiés que lorsque
                les droits sont documentés. La couverture géographique et l’historique
                peuvent être incomplets, et aucune disponibilité continue n’est encore
                garantie.
              </Text>
            </View>
          </View>

          <View className="gap-4 rounded-todam bg-ink p-6 md:p-8">
            <Text
              aria-level={2}
              accessibilityRole="header"
              className="font-serif text-3xl font-bold text-paper"
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

          <Text className="text-sm leading-6 text-muted">
            Informations techniques mises à jour le 27 juillet 2026.
          </Text>
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  standardButtonLabelWeb: {
    color: tokens.button.standard.text,
    fontFamily: tokens.button.standard.fontFamily,
    fontWeight: tokens.button.standard.fontWeight,
  },
  standardButtonWeb: {
    backgroundColor: tokens.button.standard.background,
    borderColor: tokens.button.standard.border,
    borderRadius: tokens.button.standard.radius,
    borderWidth: tokens.button.standard.borderWidth,
    boxSizing: "border-box",
  },
  quietButtonLabelWeb: {
    color: tokens.button.quiet.text,
    fontFamily: tokens.button.quiet.fontFamily,
    fontWeight: tokens.button.quiet.fontWeight,
  },
  quietButtonWeb: {
    backgroundColor: tokens.button.quiet.background,
    borderColor: tokens.button.quiet.border,
    borderRadius: tokens.button.quiet.radius,
    borderWidth: tokens.button.quiet.borderWidth,
    boxSizing: "border-box",
  },
});

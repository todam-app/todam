import { Button, SectionTitle } from "@todam/design-system";
import { Link } from "expo-router";
import Head from "expo-router/head";
import { Linking, Text, View } from "react-native";

import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView } from "../components/PageScrollView";
import { PUBLIC_WEB_URL } from "../lib/config";

export default function ForCompaniesPage() {
  return (
    <>
      <Head>
        <title>Todam pour les compagnies | Todam</title>
        <meta
          content="Revendiquer une compagnie, corriger ses productions, ses dates, ses crédits et documenter les droits des visuels."
          name="description"
        />
        <link href={`${PUBLIC_WEB_URL}/pour-les-compagnies`} rel="canonical" />
        <meta content="Todam pour les compagnies" property="og:title" />
        <meta
          content="Revendiquer une compagnie, corriger ses productions, ses dates, ses crédits et documenter les droits des visuels."
          property="og:description"
        />
        <meta content={`${PUBLIC_WEB_URL}/pour-les-compagnies`} property="og:url" />
        <meta content="Todam pour les compagnies" name="twitter:title" />
        <meta
          content="Revendiquer une compagnie, corriger ses productions, ses dates, ses crédits et documenter les droits des visuels."
          name="twitter:description"
        />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-content flex-1 gap-14 px-5 py-10 md:px-8 md:py-16">
          <View className="max-w-4xl gap-6 border-b border-line pb-12">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-accent">
              Pour les compagnies
            </Text>
            <Text
              aria-level={1}
              accessibilityRole="header"
              className="font-serif text-[42px] font-semibold leading-[48px] text-ink md:text-[60px] md:leading-[66px]"
            >
              Une fiche fiable pour vos productions et leurs dates de tournée.
            </Text>
            <Text className="max-w-[68ch] text-lg leading-8 text-muted">
              Revendiquez l’identité de votre compagnie, proposez des corrections
              sourcées et prévisualisez chaque changement avant sa validation par Todam.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <Link href="/decouvrir?type=companies" asChild>
                <Button accessibilityRole="link" label="Trouver ma compagnie" />
              </Link>
              <Button
                label="Nous contacter"
                onPress={() =>
                  void Linking.openURL(
                    "mailto:contact@todam.fr?subject=Compagnie%20sur%20Todam",
                  )
                }
                variant="secondary"
              />
            </View>
          </View>

          <View className="gap-6 md:flex-row">
            {[
              [
                "Identité maîtrisée",
                "Nom, présentation, site officiel et rattachements sont vérifiés avant l’ouverture de l’éditeur.",
              ],
              [
                "Productions structurées",
                "Descriptions, crédits, dates, lieux et liens de billetterie deviennent des champs distincts.",
              ],
              [
                "Droits documentés",
                "Chaque visuel conserve détenteur, crédit, source, autorisation, mode de stockage et expiration.",
              ],
            ].map(([title, body], index) => (
              <View
                className={`flex-1 gap-3 py-5 ${
                  index > 0
                    ? "border-t border-line md:border-l md:border-t-0 md:pl-6"
                    : ""
                }`}
                key={title}
              >
                <Text className="font-serif text-2xl font-semibold text-ink">
                  {title}
                </Text>
                <Text className="text-base leading-6 text-muted">{body}</Text>
              </View>
            ))}
          </View>

          <View className="gap-5 bg-paper p-6 md:p-8">
            <SectionTitle>Comment fonctionne la revendication ?</SectionTitle>
            {[
              "Vous indiquez votre rôle, votre identité, un e-mail professionnel et le site officiel.",
              "Vous fournissez une preuve ou une explication vérifiable et confirmez votre autorité à transmettre les contenus.",
              "Todam contrôle manuellement la demande et rattache le compte à une seule compagnie avec un rôle explicite.",
              "Plusieurs représentants distincts peuvent être autorisés pour la même compagnie et chaque accès peut être révoqué.",
            ].map((item, index) => (
              <View className="flex-row gap-4" key={item}>
                <Text className="text-base w-7 font-bold text-accent">
                  0{index + 1}
                </Text>
                <Text className="max-w-[70ch] flex-1 text-base leading-6 text-ink">
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <View className="gap-5">
            <SectionTitle>Un éditeur réel, une publication contrôlée</SectionTitle>
            <View className="border-t border-line">
              {[
                [
                  "Brouillon",
                  "La compagnie prépare une révision sans modifier la fiche publique.",
                ],
                [
                  "Prévisualisation",
                  "Elle relit les nouvelles valeurs et leur provenance.",
                ],
                ["Soumission", "La révision est verrouillée et envoyée à Todam."],
                ["Validation", "Todam contrôle cohérence, provenance et droits."],
                [
                  "Publication",
                  "La version approuvée remplace la version publique ; l’ancienne reste restaurable.",
                ],
              ].map(([title, body]) => (
                <View
                  className="gap-1 border-b border-line py-4 md:flex-row md:gap-8"
                  key={title}
                >
                  <Text className="text-base w-44 font-semibold text-ink">{title}</Text>
                  <Text className="max-w-[68ch] flex-1 text-base leading-6 text-muted">
                    {body}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-5 border-y border-line py-10">
            <SectionTitle>Ce qui peut être modifié</SectionTitle>
            <Text className="max-w-[72ch] text-base leading-7 text-muted">
              Présentation, site officiel, productions, descriptions, crédits,
              représentations, liens de billetterie et visuels avec leurs métadonnées de
              droits. Pendant le premier pilote, aucun représentant ne publie
              instantanément : la validation Todam reste obligatoire.
            </Text>
            <View className="self-start">
              <Link href="/decouvrir?type=companies" asChild>
                <Button
                  accessibilityRole="link"
                  label="Commencer par rechercher ma compagnie"
                />
              </Link>
            </View>
          </View>
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}

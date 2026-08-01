import { SectionTitle } from "@todam/design-system";
import Head from "expo-router/head";
import { Text, View } from "react-native";

import { PageScrollView } from "../components/PageScrollView";

const rules = [
  {
    title: "Rechercher avant d’ajouter",
    body: "Vérifiez les spectacles, compagnies et lieux similaires afin de ne pas créer de doublon.",
  },
  {
    title: "Recopier uniquement un texte promotionnel publié",
    body: "Une description doit déjà avoir été publiée par la compagnie, le lieu, le festival ou un autre diffuseur officiel. Ne rédigez pas de résumé collectif dans ce formulaire.",
  },
  {
    title: "Utiliser l’affiche officielle du spectacle",
    body: "Ajoutez le visuel promotionnel officiel correspondant à la fiche et conservez sa provenance. Une image trouvée sans source identifiable ne doit pas être publiée.",
  },
  {
    title: "Ne pas altérer les crédits",
    body: "Recopiez fidèlement le crédit indiqué avec l’affiche lorsqu’il est disponible.",
  },
  {
    title: "Éviter les données personnelles",
    body: "N’ajoutez pas de coordonnées privées ni d’informations personnelles qui ne sont pas destinées à être publiées.",
  },
  {
    title: "Ne pas vandaliser le catalogue",
    body: "Les ajouts délibérément faux, trompeurs ou destructeurs peuvent être retirés et le compte concerné peut perdre son droit de contribuer.",
  },
] as const;

export default function EditorialPolicyPage() {
  return (
    <>
      <Head>
        <title>Politique éditoriale | Todam</title>
        <meta
          content="Règles applicables aux contributions communautaires du catalogue Todam."
          name="description"
        />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-3xl flex-1 gap-8 px-5 py-10 md:px-8 md:py-14">
          <View className="gap-4">
            <SectionTitle eyebrow="Catalogue communautaire" level={1}>
              Politique éditoriale
            </SectionTitle>
            <Text className="max-w-[70ch] text-base leading-7 text-muted">
              Les contributions sont publiées immédiatement. Ces quelques règles
              permettent de garder des fiches utiles, vérifiables et respectueuses des
              droits.
            </Text>
          </View>
          <View className="gap-6">
            {rules.map((rule, index) => (
              <View className="gap-2 border-t border-line pt-5" key={rule.title}>
                <Text className="font-serif text-xl font-semibold text-ink">
                  {index + 1}. {rule.title}
                </Text>
                <Text className="text-base leading-7 text-muted">{rule.body}</Text>
              </View>
            ))}
          </View>
          <Text className="rounded-todam border border-selected-border bg-selected p-4 text-base leading-7 text-muted">
            Une erreur ou un problème de droits peut être transmis depuis le bouton «
            Signaler ou corriger » de chaque fiche.
          </Text>
        </View>
      </PageScrollView>
    </>
  );
}

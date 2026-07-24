import { Button, SectionTitle } from "@todam/design-system";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

const actions = [
  {
    label: "Vu",
    description: "Garde la mémoire des spectacles que tu as vus.",
  },
  {
    label: "Noter",
    description: "Donne une note sur 10, sans commentaire obligatoire.",
  },
  {
    label: "À voir",
    description: "Mets de côté les productions qui te font envie.",
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      contentContainerClassName="mx-auto w-full max-w-content gap-12 px-5 py-10 md:px-8 md:py-16"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="max-w-3xl gap-6">
        <Text className="text-xs font-extrabold uppercase tracking-[2px] text-accent">
          Le journal du spectacle vivant
        </Text>
        <Text
          accessibilityRole="header"
          className="font-serif text-5xl font-black leading-[54px] text-ink md:text-6xl"
        >
          Les spectacles restent avec vous.
        </Text>
        <Text className="max-w-2xl text-lg leading-7 text-muted">
          Retrouve, conserve et note les pièces de théâtre, opéras et ballets qui
          comptent pour toi. Todam commence à Monaco, au Théâtre des Muses.
        </Text>
        <View className="max-w-xs">
          <Button
            label="Rechercher un spectacle"
            onPress={() => router.push("/search")}
          />
        </View>
      </View>

      <View className="gap-5">
        <SectionTitle eyebrow="En trois gestes">Ton carnet, à ton rythme</SectionTitle>
        <View className="gap-3 md:flex-row">
          {actions.map((action, index) => (
            <View
              className="flex-1 gap-3 rounded-todam border border-line bg-paper p-5"
              key={action.label}
            >
              <Text className="text-sm font-extrabold text-accent">0{index + 1}</Text>
              <Text className="font-serif text-2xl font-bold text-ink">
                {action.label}
              </Text>
              <Text className="leading-6 text-muted">{action.description}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-5 rounded-todam bg-ink p-6 md:p-8">
        <Text className="text-xs font-extrabold uppercase tracking-[2px] text-[#E8A999]">
          Premier catalogue
        </Text>
        <Text className="font-serif text-3xl font-bold text-paper">
          Monaco ouvre le bal
        </Text>
        <Text className="max-w-2xl leading-6 text-[#DED9D0]">
          La première couverture porte sur la saison 2025–2026 du Théâtre des Muses,
          adultes et enfants. Le Théâtre Princesse Grace, l’Opéra, les Ballets puis
          Avignon suivront.
        </Text>
      </View>
    </ScrollView>
  );
}

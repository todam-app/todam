import { Button } from "@todam/design-system";
import { useRouter } from "expo-router";
import { Platform, ScrollView, Text, View } from "react-native";

import { LegalFooter } from "../../components/LegalFooter";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      contentContainerClassName="flex-grow"
      contentInsetAdjustmentBehavior="automatic"
    >
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
              label="Commencez — c’est gratuit"
              onPress={() => router.push("/sign-up")}
            />
          </View>
          <Text className="text-center text-sm leading-5 text-muted">
            Mon journal de spectacles.
            {Platform.OS === "web" ? " Bientôt sur iOS et Android." : ""}
          </Text>
        </View>
      </View>
      <LegalFooter />
    </ScrollView>
  );
}

import { Button } from "@todam/design-system";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function EmailVerifiedScreen() {
  const router = useRouter();
  return (
    <View className="mx-auto w-full max-w-lg flex-1 items-center justify-center gap-5 px-5 py-12">
      <Text
        accessibilityRole="header"
        className="text-center font-serif text-4xl font-black text-ink"
      >
        Adresse e-mail vérifiée
      </Text>
      <Text className="text-center leading-6 text-muted">
        Ton compte est maintenant activé. Tu peux ouvrir ton journal.
      </Text>
      <Button label="Ouvrir mon profil" onPress={() => router.replace("/profile")} />
    </View>
  );
}

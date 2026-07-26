import { Button } from "@todam/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";

import { PageStaticView } from "../components/PageScrollView";
import { authClient } from "../lib/auth-client";

export default function EmailVerifiedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const emailChanged = mode === "change-email";

  useEffect(() => {
    if (emailChanged) {
      void authClient.getSession({
        query: { disableCookieCache: true },
      });
    }
  }, [emailChanged]);

  return (
    <PageStaticView className="mx-auto w-full max-w-lg flex-1 items-center justify-center gap-5 px-5 py-12">
      <Text
        accessibilityRole="header"
        className="text-center font-serif text-4xl font-black text-ink"
      >
        {emailChanged ? "Nouvelle adresse confirmée" : "Adresse e-mail vérifiée"}
      </Text>
      <Text className="text-center leading-6 text-muted">
        {emailChanged
          ? "Ta nouvelle adresse e-mail est maintenant utilisée pour te connecter à Todam."
          : "Ton compte est maintenant activé. Tu peux ouvrir ton journal."}
      </Text>
      <Button
        label={emailChanged ? "Revenir aux paramètres" : "Ouvrir mon profil"}
        onPress={() => router.replace(emailChanged ? "/parametres-compte" : "/profile")}
      />
    </PageStaticView>
  );
}

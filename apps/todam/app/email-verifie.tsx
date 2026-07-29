import { Button } from "@todam/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";

import { PageStaticView } from "../components/PageScrollView";
import { PrivatePageHead } from "../components/PrivatePageHead";
import { authClient } from "../lib/auth-client";
import { internalDestination } from "../lib/navigation";

function parameter(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function EmailVerifiedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    action?: string | string[];
    mode?: string | string[];
    rating?: string | string[];
    returnTo?: string | string[];
  }>();
  const mode = parameter(params.mode);
  const emailChanged = mode === "change-email";
  const destination = internalDestination(parameter(params.returnTo));

  function continueAfterVerification() {
    if (emailChanged) {
      router.replace({
        pathname: "/profile",
        params: { section: "settings" },
      });
      return;
    }
    router.replace({
      pathname: destination.pathname,
      params: {
        ...destination.params,
        ...(params.action ? { resumeAction: parameter(params.action) } : {}),
        ...(params.rating ? { resumeRating: parameter(params.rating) } : {}),
      },
    });
  }

  useEffect(() => {
    if (emailChanged) {
      void authClient.getSession({
        query: { disableCookieCache: true },
      });
    }
  }, [emailChanged]);

  return (
    <>
      <PrivatePageHead title="Adresse e-mail vérifiée" />
      <PageStaticView className="todam-auth-panel mx-auto my-8 w-[calc(100%_-_2.5rem)] max-w-lg flex-1 items-center justify-center gap-5 p-6 md:my-12 md:p-8">
        <Text
          aria-level={1}
          accessibilityRole="header"
          className="text-center font-serif text-4xl font-bold text-ink"
        >
          {emailChanged ? "Nouvelle adresse confirmée" : "Adresse e-mail vérifiée"}
        </Text>
        <Text className="text-center text-base leading-6 text-muted">
          {emailChanged
            ? "Ta nouvelle adresse e-mail est maintenant utilisée pour te connecter à Todam."
            : "Ton compte est maintenant activé. Tu peux ouvrir ton journal."}
        </Text>
        <Button
          label={
            emailChanged
              ? "Revenir aux paramètres"
              : parameter(params.returnTo)
                ? "Continuer"
                : "Ouvrir mon profil"
          }
          onPress={continueAfterVerification}
        />
      </PageStaticView>
    </>
  );
}

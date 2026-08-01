import { Button } from "@todam/design-system";
import { Link, useRouter } from "expo-router";
import { Text, View } from "react-native";

import { AsyncState } from "./AsyncState";
import { PageScrollView, PageStaticView } from "./PageScrollView";

export function PrivateSessionLoading() {
  return (
    <PageStaticView className="flex-1">
      <AsyncState empty={false} emptyMessage="" error={false} loading>
        {null}
      </AsyncState>
    </PageStaticView>
  );
}

export function PrivateSessionRequired({
  description = "Connectez-vous pour retrouver vos spectacles, vos listes et vos avis.",
}: {
  description?: string;
}) {
  const router = useRouter();

  return (
    <PageScrollView contentContainerClassName="flex-grow" footer="minimal">
      <View className="todam-page-before-footer mx-auto w-full max-w-xl flex-1 items-center justify-center px-5 py-12">
        <View className="todam-auth-panel w-full items-center gap-5 p-6 md:p-8">
          <Text
            aria-level={1}
            accessibilityRole="header"
            className="text-center font-serif text-4xl font-semibold text-ink"
          >
            Votre espace personnel
          </Text>
          <Text className="text-center text-base leading-6 text-muted">
            {description}
          </Text>
          <View className="w-full max-w-xs gap-3">
            <Button label="Se connecter" onPress={() => router.push("/sign-in")} />
            <Link href="/sign-up" asChild>
              <Button label="Créer un compte" variant="secondary" />
            </Link>
          </View>
        </View>
      </View>
    </PageScrollView>
  );
}

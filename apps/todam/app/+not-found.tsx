import { Button } from "@todam/design-system";
import { Link } from "expo-router";
import Head from "expo-router/head";
import { Text, View } from "react-native";

import { PageScrollView } from "../components/PageScrollView";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page introuvable | Todam</title>
        <meta content="noindex,follow" name="robots" />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-2xl flex-1 justify-center px-5 py-16 md:px-8">
          <View className="todam-editorial-empty items-start gap-6 p-6 md:p-9">
            <Text className="text-xs font-bold uppercase tracking-widest text-coral-text">
              Erreur 404
            </Text>
            <Text
              aria-level={1}
              accessibilityRole="header"
              className="font-serif text-4xl font-semibold leading-[44px] text-ink md:text-5xl md:leading-[56px]"
            >
              Cette page n’est pas à l’affiche.
            </Text>
            <Text className="max-w-[65ch] text-lg leading-8 text-muted">
              L’adresse est peut-être incomplète, ou la fiche n’est plus publiée. Vous
              pouvez reprendre votre exploration depuis le catalogue.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <Link href="/search" asChild>
                <Button accessibilityRole="link" label="Rechercher un spectacle" />
              </Link>
              <Link href="/" asChild>
                <Button
                  accessibilityRole="link"
                  label="Revenir à l’accueil"
                  variant="quiet"
                />
              </Link>
            </View>
          </View>
        </View>
      </PageScrollView>
    </>
  );
}

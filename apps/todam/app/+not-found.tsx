import { Button } from "@todam/design-system";
import { Link } from "expo-router";
import Head from "expo-router/head";
import { Text, View } from "react-native";

import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView } from "../components/PageScrollView";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page introuvable | Todam</title>
        <meta content="noindex,follow" name="robots" />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-2xl flex-1 items-start justify-center gap-6 px-5 py-16 md:px-8">
          <Text className="text-xs font-bold uppercase tracking-widest text-accent">
            Erreur 404
          </Text>
          <Text
            aria-level={1}
            accessibilityRole="header"
            className="font-serif text-5xl font-semibold leading-[56px] text-ink"
          >
            Cette page n’est pas à l’affiche.
          </Text>
          <Text className="max-w-[65ch] text-lg leading-8 text-muted">
            L’adresse est peut-être incomplète, ou la fiche n’est plus publiée. Vous
            pouvez reprendre votre exploration depuis le catalogue.
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <Link href="/decouvrir" asChild>
              <Button accessibilityRole="link" label="Découvrir les spectacles" />
            </Link>
            <Link href="/" asChild>
              <Button
                accessibilityRole="link"
                label="Revenir à l’accueil"
                variant="secondary"
              />
            </Link>
          </View>
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}

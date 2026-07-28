import "../global.css";

import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";

import { Providers } from "../components/Providers";
import { WebPageScrollProvider } from "../components/PageScrollView";
import { WebNavigation } from "../components/WebNavigation";
import { PUBLIC_WEB_URL } from "../lib/config";

const DEFAULT_WEB_TITLE = "Todam - Journal de spectacles";
const TODAM_PAGE_BACKGROUND = "#FCF8F2";
const TODAM_NAVIGATION_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: TODAM_PAGE_BACKGROUND,
  },
};

export default function RootLayout() {
  return (
    <Providers>
      <Head>
        <title>{DEFAULT_WEB_TITLE}</title>
        <link href="/favicon.svg?v=2" rel="icon" type="image/svg+xml" />
        <meta
          content="Découvrez le théâtre, l’opéra et le ballet, puis gardez la mémoire de chaque spectacle dans votre journal Todam."
          name="description"
        />
        <meta content="Todam — votre journal du spectacle vivant" property="og:title" />
        <meta
          content="Découvrez les spectacles, notez ce que vous avez vu et partagez vos listes."
          property="og:description"
        />
        <meta
          content={`${PUBLIC_WEB_URL}/og/todam-open-graph.png`}
          property="og:image"
        />
        <meta content="1200" property="og:image:width" />
        <meta content="630" property="og:image:height" />
        <meta content="fr_FR" property="og:locale" />
        <meta content="website" property="og:type" />
        <meta content="summary_large_image" name="twitter:card" />
        <meta
          content="Todam — votre journal du spectacle vivant"
          name="twitter:title"
        />
        <meta
          content="Découvrez les spectacles, notez ce que vous avez vu et partagez vos listes."
          name="twitter:description"
        />
        <meta
          content={`${PUBLIC_WEB_URL}/og/todam-open-graph.png`}
          name="twitter:image"
        />
      </Head>
      <StatusBar style="dark" />
      <ThemeProvider value={TODAM_NAVIGATION_THEME}>
        <WebPageScrollProvider>
          <View
            className={`flex-1 ${Platform.OS === "web" ? "todam-web-root" : "bg-canvas"}`}
            testID={Platform.OS === "web" ? "web-root-frame" : undefined}
          >
            <View
              className={`flex-1 ${
                Platform.OS === "web" ? "todam-web-shell w-full" : "bg-canvas"
              }`}
              testID={Platform.OS === "web" ? "web-content-frame" : undefined}
            >
              <WebNavigation />
              <Stack
                screenOptions={{
                  contentStyle: { backgroundColor: TODAM_PAGE_BACKGROUND },
                  headerShown: Platform.OS !== "web",
                  headerShadowVisible: false,
                  headerStyle: { backgroundColor: "#FFFDF8" },
                  headerTintColor: "#151515",
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="production/[slug]"
                  options={{ headerTitle: "Spectacle" }}
                />
                <Stack.Screen
                  name="les-coulisses"
                  options={{ headerTitle: "Les coulisses" }}
                />
                <Stack.Screen
                  name="signaler"
                  options={{ headerTitle: "Signaler une information" }}
                />
                <Stack.Screen
                  name="ajouter-un-spectacle"
                  options={{ headerTitle: "Ajouter un spectacle" }}
                />
                <Stack.Screen
                  name="politique-editoriale"
                  options={{ headerTitle: "Politique éditoriale" }}
                />
                <Stack.Screen
                  name="sign-in"
                  options={{ headerTitle: "Connexion", presentation: "modal" }}
                />
                <Stack.Screen
                  name="sign-up"
                  options={{
                    headerTitle: "Créer un compte",
                    presentation: "modal",
                  }}
                />
                <Stack.Screen
                  name="conditions-utilisation"
                  options={{ headerTitle: "Conditions d'utilisation" }}
                />
                <Stack.Screen
                  name="email-verifie"
                  options={{ headerTitle: "Adresse vérifiée" }}
                />
                <Stack.Screen
                  name="parametres-compte"
                  options={{ headerTitle: "Paramètres du compte" }}
                />
                <Stack.Screen
                  name="mot-de-passe-oublie"
                  options={{ headerTitle: "Mot de passe oublié" }}
                />
                <Stack.Screen
                  name="reinitialiser-mot-de-passe"
                  options={{ headerTitle: "Nouveau mot de passe" }}
                />
                <Stack.Screen
                  name="supprimer-mon-compte"
                  options={{ headerTitle: "Supprimer mon compte" }}
                />
                <Stack.Screen
                  name="confidentialite"
                  options={{ headerTitle: "Confidentialité" }}
                />
                <Stack.Screen
                  name="mentions-legales"
                  options={{ headerTitle: "Mentions légales" }}
                />
                <Stack.Screen
                  name="suppression-compte"
                  options={{ headerTitle: "Supprimer un compte" }}
                />
              </Stack>
            </View>
          </View>
        </WebPageScrollProvider>
      </ThemeProvider>
    </Providers>
  );
}

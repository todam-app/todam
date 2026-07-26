import "../global.css";

import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";

import { Providers } from "../components/Providers";
import { WebPageScrollProvider } from "../components/PageScrollView";
import { WebNavigation } from "../components/WebNavigation";

const DEFAULT_WEB_TITLE = "Todam - Journal de spectacles";
const TODAM_PAGE_BACKGROUND = "#F7F3EC";
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
        <link href="/favicon.ico?v=1" rel="icon" />
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

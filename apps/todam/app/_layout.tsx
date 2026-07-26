import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";

import { Providers } from "../components/Providers";
import { WebNavigation } from "../components/WebNavigation";

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="dark" />
      <View className="flex-1 bg-canvas">
        <WebNavigation />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: "#F7F3EC" },
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
            options={{ headerTitle: "Créer un compte", presentation: "modal" }}
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
    </Providers>
  );
}

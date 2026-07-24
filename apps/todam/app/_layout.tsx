import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Providers } from "../components/Providers";

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: "#F7F3EC" },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#FFFDF8" },
          headerTintColor: "#151515",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="production/[slug]" options={{ headerTitle: "Spectacle" }} />
        <Stack.Screen
          name="sign-in"
          options={{ headerTitle: "Connexion", presentation: "modal" }}
        />
        <Stack.Screen
          name="sign-up"
          options={{ headerTitle: "Créer un compte", presentation: "modal" }}
        />
      </Stack>
    </Providers>
  );
}

import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function JournalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: Platform.OS !== "web",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FFFDF8" },
        headerTintColor: "#151515",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="a-voir" options={{ headerTitle: "À voir" }} />
      <Stack.Screen name="vus" options={{ headerTitle: "Vus" }} />
      <Stack.Screen name="notes" options={{ headerTitle: "Notés" }} />
      <Stack.Screen name="avis" options={{ headerTitle: "Mes avis" }} />
      <Stack.Screen name="listes/index" options={{ headerTitle: "Mes listes" }} />
      <Stack.Screen name="listes/[id]" options={{ headerTitle: "Liste" }} />
    </Stack>
  );
}

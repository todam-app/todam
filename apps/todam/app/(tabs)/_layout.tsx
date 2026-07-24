import { Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";

import { WebNavigation } from "../../components/WebNavigation";

const icons = {
  index: "⌂",
  profile: "◯",
  search: "⌕",
} as const;

export default function TabLayout() {
  return (
    <View className="flex-1 bg-canvas">
      <WebNavigation />
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#C43D28",
          tabBarInactiveTintColor: "#6F6B64",
          tabBarStyle:
            Platform.OS === "web"
              ? { display: "none" }
              : {
                  backgroundColor: "#FFFDF8",
                  borderTopColor: "#D8D1C6",
                  height: 68,
                  paddingBottom: 8,
                  paddingTop: 6,
                },
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22 }}>
              {icons[route.name as keyof typeof icons] ?? "·"}
            </Text>
          ),
        })}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Accueil", tabBarAccessibilityLabel: "Accueil" }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Rechercher",
            tabBarAccessibilityLabel: "Rechercher",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Profil", tabBarAccessibilityLabel: "Profil" }}
        />
      </Tabs>
    </View>
  );
}

import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";

const PAGE_BACKGROUND = "#F7F3EC";

const icons = {
  index: "compass-outline",
  journal: "book-outline",
  listes: "list-outline",
  search: "search-outline",
} as const;

export default function TabLayout() {
  return (
    <View className="flex-1 bg-canvas">
      <Tabs
        screenOptions={({ route }) => ({
          animation: "none",
          headerShown: false,
          sceneStyle: { backgroundColor: PAGE_BACKGROUND },
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
          tabBarIcon: ({ color, focused, size }) => {
            const icon = icons[route.name as keyof typeof icons] ?? "ellipse-outline";
            return (
              <Ionicons
                color={color}
                name={focused ? (icon.replace("-outline", "") as typeof icon) : icon}
                size={size}
              />
            );
          },
        })}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Découvrir",
            tabBarAccessibilityLabel: "Découvrir",
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Rechercher",
            tabBarAccessibilityLabel: "Rechercher",
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{ title: "Journal", tabBarAccessibilityLabel: "Journal" }}
        />
        <Tabs.Screen
          name="listes"
          options={{ title: "Listes", tabBarAccessibilityLabel: "Listes" }}
        />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

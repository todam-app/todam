import Ionicons from "@expo/vector-icons/Ionicons";
import { tokens } from "@todam/design-system";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";

const PAGE_BACKGROUND = tokens.color.background;

const icons = {
  index: "home-outline",
  journal: "albums-outline",
  profile: "person-outline",
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
          tabBarActiveTintColor: tokens.color.accent,
          tabBarInactiveTintColor: tokens.color.muted,
          tabBarStyle:
            Platform.OS === "web"
              ? { display: "none" }
              : {
                  backgroundColor: tokens.color.surface,
                  borderTopColor: tokens.color.border,
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
            tabBarAccessibilityLabel: "Accueil",
            title: "Accueil",
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: "Mes spectacles",
            tabBarAccessibilityLabel: "Mes spectacles",
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
          name="profile"
          options={{ title: "Profil", tabBarAccessibilityLabel: "Profil" }}
        />
        <Tabs.Screen name="listes" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

import { Link, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { SearchBar } from "./SearchBar";
import { useWebPageScrolled } from "./PageScrollView";

const horizontalLogo = require("../assets/brand/todam-logo-horizontal.svg");
const symbolLogo = require("../assets/brand/todam-symbol.svg");

const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/profile", label: "Profil" },
] as const;

function parameter(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function HeaderSearch({
  initialValue,
  pathname,
}: {
  initialValue: string;
  pathname: string;
}) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialValue);

  function submitSearch() {
    const query = searchInput.trim();
    if (query.length < 2) return;
    const destination = { pathname: "/search" as const, params: { q: query } };
    if (pathname.startsWith("/search")) {
      router.replace(destination);
    } else {
      router.push(destination);
    }
  }

  function clearSearch() {
    setSearchInput("");
    if (pathname.startsWith("/search")) router.replace("/search");
  }

  return (
    <SearchBar
      accessibilityLabel="Titre, artiste ou théâtre"
      onChangeText={setSearchInput}
      onClear={clearSearch}
      onSubmit={submitSearch}
      placeholder="Rechercher un spectacle"
      value={searchInput}
    />
  );
}

export function WebNavigation() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ q?: string | string[] }>();
  const { width } = useWindowDimensions();
  const isScrolled = useWebPageScrolled();

  if (Platform.OS !== "web") return null;

  const searchParameter = pathname.startsWith("/search") ? parameter(params.q) : "";
  const compactLogo = width < 760;

  return (
    <View
      className={`todam-web-header bg-paper ${
        isScrolled ? "todam-web-header--scrolled" : ""
      }`}
      style={styles.header}
    >
      <View
        className={`w-full flex-row items-center ${
          width < 640 ? "gap-2 px-3 py-3" : "gap-4 px-6 py-3"
        }`}
        testID="web-header-frame"
      >
        <Link href="/" asChild>
          <Pressable
            accessibilityLabel="Todam, accueil"
            accessibilityRole="link"
            className="min-h-11 justify-center"
            testID="global-home-logo"
          >
            <Image
              accessibilityIgnoresInvertColors
              accessible={false}
              resizeMode="contain"
              source={compactLogo ? symbolLogo : horizontalLogo}
              style={
                compactLogo ? { height: 44, width: 42 } : { height: 44, width: 145 }
              }
            />
            <Text className="sr-only">Todam</Text>
          </Pressable>
        </Link>
        <View style={styles.search}>
          <HeaderSearch
            initialValue={searchParameter}
            key={`${pathname}?q=${searchParameter}`}
            pathname={pathname}
          />
        </View>
        <View
          accessibilityRole="tablist"
          className="flex-row items-center gap-2"
          style={styles.navigation}
          testID="web-primary-navigation"
        >
          {navigation.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link href={item.href} key={item.href} asChild>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  className={`min-h-11 justify-center rounded-full ${
                    width < 640 ? "px-2" : "px-4"
                  } ${active ? "bg-ink" : "bg-transparent"}`}
                >
                  <Text
                    className={`font-semibold ${active ? "text-paper" : "text-ink"}`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomColor: "rgba(216, 209, 198, 0.72)",
    borderBottomWidth: 1,
  },
  search: {
    flex: 1,
    minWidth: 100,
  },
  navigation: {
    flexShrink: 0,
    marginLeft: "auto",
  },
});

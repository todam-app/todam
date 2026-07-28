import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Link,
  type Href,
  useGlobalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
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

import { authClient } from "../lib/auth-client";
import { useWebPageScrolled } from "./PageScrollView";
import { SearchBar } from "./SearchBar";

const horizontalLogo = require("../assets/brand/todam-logo-horizontal.svg");
const symbolLogo = require("../assets/brand/todam-symbol.svg");

const publicNavigation = [{ href: "/decouvrir", label: "Découvrir" }] as const;
const memberNavigation = [
  { href: "/decouvrir", label: "Découvrir" },
  { href: "/journal", label: "Journal" },
  { href: "/listes", label: "Listes" },
] as const;
const mobileNavigation = [
  { href: "/decouvrir", label: "Découvrir", icon: "compass-outline" },
  { href: "/search", label: "Rechercher", icon: "search-outline" },
  { href: "/journal", label: "Journal", icon: "book-outline" },
  { href: "/listes", label: "Listes", icon: "list-outline" },
] as const;

function parameter(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function HeaderSearch({
  initialValue,
}: {
  initialValue: string;
}) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialValue);

  function submitSearch() {
    const query = searchInput.trim();
    if (query.length < 2) return;
    router.push({ pathname: "/search", params: { q: query } });
  }

  return (
    <SearchBar
      accessibilityLabel="Titre, compagnie, lieu ou membre"
      onChangeText={setSearchInput}
      onClear={() => setSearchInput("")}
      onSubmit={submitSearch}
      placeholder="Rechercher"
      value={searchInput}
      webName="global-search"
    />
  );
}

export function WebNavigation() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ q?: string | string[] }>();
  const session = authClient.useSession();
  const { width } = useWindowDimensions();
  const isScrolled = useWebPageScrolled();

  if (Platform.OS !== "web") return null;

  const mobile = width < 760;
  const authShell = [
    "/sign-in",
    "/sign-up",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/email-verifie",
  ].some((route) => pathname.startsWith(route));
  const searchParameter = pathname.startsWith("/search") ? parameter(params.q) : "";
  const navigation = session.data ? memberNavigation : publicNavigation;

  if (authShell) {
    return (
      <>
        <Link href={"#contenu-principal" as Href} asChild>
          <Pressable accessibilityRole="link" className="todam-skip-link">
            <Text className="text-base font-semibold text-paper">Aller au contenu</Text>
          </Pressable>
        </Link>
        <View
          className={`todam-web-header bg-paper ${
            isScrolled ? "todam-web-header--scrolled" : ""
          }`}
          role="banner"
          style={styles.header}
        >
          <View
            className="mx-auto w-full max-w-content items-start justify-center px-5 md:px-8"
            style={[styles.headerInner, !mobile && styles.headerInnerDesktop]}
          >
            <Link href="/" asChild>
              <Pressable
                accessibilityLabel="Todam, accueil"
                accessibilityRole="link"
                className="min-h-11 justify-center"
              >
                <Image
                  accessibilityIgnoresInvertColors
                  accessible={false}
                  resizeMode="contain"
                  source={horizontalLogo}
                  style={styles.logo}
                />
              </Pressable>
            </Link>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Link href={"#contenu-principal" as Href} asChild>
        <Pressable
          accessibilityRole="link"
          className="todam-skip-link"
        >
          <Text className="text-base font-semibold text-paper">Aller au contenu</Text>
        </Pressable>
      </Link>
      <View
        className={`todam-web-header bg-paper ${
          isScrolled ? "todam-web-header--scrolled" : ""
        }`}
        role="banner"
        style={styles.header}
      >
        <View
          accessibilityLabel="Navigation principale"
          className="mx-auto w-full max-w-content flex-row items-center gap-3 px-4 md:px-8"
          role="navigation"
          style={[styles.headerInner, !mobile && styles.headerInnerDesktop]}
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
                source={mobile ? symbolLogo : horizontalLogo}
                style={mobile ? styles.symbol : styles.logo}
              />
              <Text className="sr-only">Todam</Text>
            </Pressable>
          </Link>

          {mobile ? (
            <View className="ml-auto flex-row items-center gap-1">
              <Link href="/search" asChild>
                <Pressable
                  accessibilityLabel="Rechercher"
                  accessibilityRole="link"
                  className="h-11 w-11 items-center justify-center"
                >
                  <Ionicons color="#151515" name="search-outline" size={23} />
                </Pressable>
              </Link>
              <Link href={session.data ? "/profile" : "/sign-in"} asChild>
                <Pressable
                  accessibilityLabel={session.data ? "Mon profil" : "Se connecter"}
                  accessibilityRole="link"
                  className="h-11 w-11 items-center justify-center rounded-full border border-control"
                >
                  <Ionicons
                    color="#151515"
                    name={session.data ? "person-outline" : "log-in-outline"}
                    size={21}
                  />
                </Pressable>
              </Link>
            </View>
          ) : (
            <>
              <View style={styles.search}>
                {!pathname.startsWith("/search") ? (
                  <HeaderSearch
                    initialValue={searchParameter}
                    key={`${pathname}?q=${searchParameter}`}
                  />
                ) : null}
              </View>
              <View
                accessibilityLabel="Navigation du compte"
                className="flex-row items-center gap-1"
                role="navigation"
                testID="web-primary-navigation"
              >
                {navigation.map((item) => {
                  const baseHref = item.href.split("?")[0]!;
                  const active = pathname.startsWith(baseHref);
                  return (
                    <Link href={item.href} key={item.href} asChild>
                      <Pressable
                        accessibilityRole="link"
                        aria-current={active ? "page" : undefined}
                        className="min-h-11 justify-center px-3"
                        style={active ? styles.activeNavigation : undefined}
                      >
                        <Text
                          className={`text-base font-semibold ${
                            active ? "text-accent" : "text-ink"
                          }`}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    </Link>
                  );
                })}
                <Link href={session.data ? "/profile" : "/sign-in"} asChild>
                  <Pressable
                    accessibilityLabel={session.data ? "Mon profil" : "Se connecter"}
                    accessibilityRole="link"
                    className="ml-1 h-11 min-w-11 items-center justify-center rounded-full border border-control px-3"
                  >
                    {session.data ? (
                      <Ionicons color="#151515" name="person-outline" size={20} />
                    ) : (
                      <Text className="text-base font-semibold text-ink">Connexion</Text>
                    )}
                  </Pressable>
                </Link>
              </View>
            </>
          )}
        </View>
      </View>

      {mobile ? (
        <View
          accessibilityLabel="Navigation mobile"
          className="fixed bottom-0 left-0 right-0 z-[110] flex-row border-t border-line bg-paper"
          role="navigation"
          style={styles.bottomNavigation}
          testID="web-mobile-navigation"
        >
          {mobileNavigation.map((item) => {
            const baseHref = item.href.split("?")[0]!;
            const active = pathname.startsWith(baseHref);
            return (
              <Link href={item.href} key={item.href} asChild>
                <Pressable
                  accessibilityRole="link"
                  aria-current={active ? "page" : undefined}
                  className="min-h-16 flex-1 items-center justify-center gap-1"
                >
                  <Ionicons
                    color={active ? "#C43D28" : "#6F6B64"}
                    name={item.icon}
                    size={21}
                  />
                  <Text
                    className={`text-[11px] font-semibold ${
                      active ? "text-accent" : "text-muted"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  activeNavigation: {
    borderBottomColor: "#C43D28",
    borderBottomWidth: 3,
  },
  bottomNavigation: {
    minHeight: 66,
  },
  header: {
    borderBottomColor: "rgba(216, 209, 198, 0.9)",
    borderBottomWidth: 1,
  },
  headerInner: {
    height: "100%",
    minHeight: 62,
  },
  headerInnerDesktop: {
    minHeight: 70,
  },
  logo: {
    height: 40,
    width: 132,
  },
  search: {
    flex: 1,
    minWidth: 180,
  },
  symbol: {
    height: 38,
    width: 38,
  },
});

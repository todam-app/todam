import Ionicons from "@expo/vector-icons/Ionicons";
import { TicketButton, tokens } from "@todam/design-system";
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
import {
  isAuthPath,
  isPrimaryMobilePath,
  mobileContextForPath,
} from "../lib/navigation";
import { useWebPageScrolled } from "./PageScrollView";
import { SearchBar } from "./SearchBar";

const horizontalLogo = require("../assets/brand/todam-logo-horizontal.svg");
const symbolLogo = require("../assets/brand/todam-symbol.svg");

const memberNavigation = [{ href: "/journal", label: "Mes spectacles" }] as const;
const mobileNavigation = [
  { href: "/", label: "Accueil", icon: "home-outline" },
  { href: "/journal", label: "Mes spectacles", icon: "albums-outline" },
  { href: "/search", label: "Rechercher", icon: "search-outline" },
  { href: "/profile", label: "Profil", icon: "person-outline" },
] as const;

function parameter(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function HeaderSearch({
  initialValue,
  searchType,
  syncSearchRoute = false,
}: {
  initialValue: string;
  searchType?: string;
  syncSearchRoute?: boolean;
}) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialValue);

  function submitSearch() {
    const query = searchInput.trim();
    if (query.length < 2) return;
    router.push({
      pathname: "/search",
      params: {
        q: query,
        ...(searchType ? { type: searchType } : {}),
      },
    });
  }

  function clearSearch() {
    setSearchInput("");
    if (syncSearchRoute) {
      router.replace({
        pathname: "/search",
        params: searchType ? { type: searchType } : {},
      });
    }
  }

  return (
    <SearchBar
      accessibilityLabel="Titre, compagnie, lieu ou membre"
      onChangeText={setSearchInput}
      onClear={clearSearch}
      onSubmit={submitSearch}
      placeholder="Rechercher un spectacle, une compagnie…"
      value={searchInput}
      webName="global-search"
    />
  );
}

export function WebNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useGlobalSearchParams<{
    q?: string | string[];
    type?: string | string[];
  }>();
  const session = authClient.useSession();
  const { width } = useWindowDimensions();
  const isScrolled = useWebPageScrolled();

  if (Platform.OS !== "web") return null;

  const mobile = width < 760;
  const authShell = isAuthPath(pathname);
  const searchParameter = pathname.startsWith("/search") ? parameter(params.q) : "";
  const searchType = pathname.startsWith("/search") ? parameter(params.type) : "";
  const sessionData = session.data as unknown as
    | {
        user?: {
          displayUsername?: string | null;
          name?: string | null;
          username?: string | null;
        };
      }
    | null
    | undefined;
  const navigation = sessionData ? memberNavigation : [];
  const sessionUser = sessionData?.user as
    | {
        displayUsername?: string | null;
        name?: string | null;
        username?: string | null;
      }
    | undefined;
  const username = (
    sessionUser?.username ??
    sessionUser?.displayUsername ??
    sessionUser?.name ??
    ""
  ).trim();
  const profileInitial = Array.from(username)[0]?.toLocaleUpperCase("fr-FR");
  const primaryMobilePath = isPrimaryMobilePath(pathname);
  const mobileContext = mobileContextForPath(pathname);

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
        <Pressable accessibilityRole="link" className="todam-skip-link">
          <Text className="text-base font-semibold text-paper">Aller au contenu</Text>
        </Pressable>
      </Link>

      {!mobile ? (
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
            style={[styles.headerInner, styles.headerInnerDesktop]}
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
                  source={horizontalLogo}
                  style={styles.logo}
                />
                <Text className="sr-only">Todam</Text>
              </Pressable>
            </Link>

            <View style={styles.search}>
              <HeaderSearch
                initialValue={searchParameter}
                key={`${pathname}?q=${searchParameter}&type=${searchType}`}
                searchType={searchType}
                syncSearchRoute={pathname.startsWith("/search")}
              />
            </View>
            <View
              accessibilityLabel="Navigation du compte"
              className="flex-row items-center gap-1"
              role="navigation"
              testID="web-primary-navigation"
            >
              {navigation.map((item) => {
                const active = pathname.startsWith(item.href);
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
              {sessionData ? (
                <Link href="/profile" asChild>
                  <Pressable
                    accessibilityLabel={
                      username
                        ? `Ouvrir mon profil — @${username}`
                        : "Ouvrir mon profil"
                    }
                    accessibilityRole="link"
                    className="todam-profile-button ml-1 h-11 w-11 min-w-11 items-center justify-center rounded-full"
                  >
                    {profileInitial ? (
                      <Text className="todam-profile-initial text-lg font-semibold text-paper">
                        {profileInitial}
                      </Text>
                    ) : (
                      <Ionicons
                        color={tokens.color.surface}
                        name="person-outline"
                        size={20}
                      />
                    )}
                  </Pressable>
                </Link>
              ) : (
                <Link href="/sign-in" asChild>
                  <TicketButton
                    accessibilityRole="link"
                    label="Se connecter"
                    style={styles.loginTicket}
                  />
                </Link>
              )}
            </View>
          </View>
        </View>
      ) : primaryMobilePath ? (
        <View
          className={`todam-web-header bg-paper ${
            isScrolled ? "todam-web-header--scrolled" : ""
          }`}
          role="banner"
          style={styles.header}
        >
          <View
            accessibilityLabel="Navigation principale"
            className="mx-auto w-full max-w-content flex-row items-center gap-2 px-3"
            role="navigation"
            style={styles.headerInner}
            testID="web-mobile-header-frame"
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
                  source={symbolLogo}
                  style={styles.symbol}
                />
                <Text className="sr-only">Todam</Text>
              </Pressable>
            </Link>

            <View style={styles.mobileSearch}>
              <HeaderSearch
                initialValue={searchParameter}
                key={`${pathname}?q=${searchParameter}&type=${searchType}`}
                searchType={searchType}
                syncSearchRoute={pathname.startsWith("/search")}
              />
            </View>

            <Link href={sessionData ? "/profile" : "/sign-in"} asChild>
              <Pressable
                accessibilityLabel={
                  sessionData
                    ? username
                      ? `Ouvrir mon profil — @${username}`
                      : "Ouvrir mon profil"
                    : "Se connecter"
                }
                accessibilityRole="link"
                className={`h-11 w-11 items-center justify-center rounded-full ${
                  sessionData
                    ? "todam-profile-button"
                    : "todam-icon-button border border-control bg-paper"
                }`}
              >
                {sessionData ? (
                  profileInitial ? (
                    <Text className="todam-profile-initial text-lg font-semibold text-paper">
                      {profileInitial}
                    </Text>
                  ) : (
                    <Ionicons
                      color={tokens.color.surface}
                      name="person-outline"
                      size={20}
                    />
                  )
                ) : (
                  <Ionicons color={tokens.color.ink} name="log-in-outline" size={21} />
                )}
              </Pressable>
            </Link>
          </View>
        </View>
      ) : (
        <View
          className={`todam-web-header bg-paper ${
            isScrolled ? "todam-web-header--scrolled" : ""
          }`}
          role="banner"
          style={styles.header}
        >
          <View
            accessibilityLabel="Navigation contextuelle"
            className="mx-auto w-full max-w-content flex-row items-center gap-2 px-3"
            role="navigation"
            style={styles.headerInner}
            testID="web-context-header"
          >
            <Pressable
              accessibilityLabel="Retour"
              accessibilityRole="button"
              className="todam-icon-button h-11 w-11 items-center justify-center rounded-full border border-line bg-paper"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(mobileContext.fallback as Href);
                }
              }}
            >
              <Ionicons color={tokens.color.ink} name="arrow-back" size={24} />
            </Pressable>
            <Text
              className="min-w-0 flex-1 text-lg font-semibold text-ink"
              numberOfLines={1}
            >
              {mobileContext.title}
            </Text>
          </View>
        </View>
      )}

      {mobile ? (
        <View
          accessibilityLabel="Navigation mobile"
          className="todam-mobile-nav fixed bottom-0 left-0 right-0 z-[110] flex-row border-t border-line bg-paper"
          role="navigation"
          style={styles.bottomNavigation}
          testID="web-mobile-navigation"
        >
          {mobileNavigation.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link href={item.href} key={item.href} asChild>
                <Pressable
                  accessibilityLabel={item.label}
                  accessibilityRole="link"
                  aria-current={active ? "page" : undefined}
                  className="relative min-h-16 flex-1 items-center justify-center gap-1 px-0.5"
                >
                  {active ? (
                    <View
                      accessibilityElementsHidden
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-accent"
                    />
                  ) : null}
                  <Ionicons
                    accessibilityElementsHidden
                    color={active ? tokens.color.accent : tokens.color.muted}
                    importantForAccessibility="no"
                    name={item.icon}
                    size={21}
                  />
                  <Text
                    className={`text-[10px] font-semibold ${
                      active ? "text-accent" : "text-muted"
                    }`}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
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
    borderBottomColor: tokens.color.accent,
    borderBottomWidth: 3,
  },
  bottomNavigation: {
    minHeight: 66,
  },
  header: {
    borderBottomColor: "rgba(226, 217, 205, 0.9)",
    borderBottomWidth: 1,
  },
  headerInner: {
    height: "100%",
    minHeight: 62,
  },
  headerInnerDesktop: {
    minHeight: 78,
  },
  logo: {
    height: 42,
    width: 140,
  },
  mobileSearch: {
    flex: 1,
    minWidth: 0,
  },
  search: {
    flex: 1,
    minWidth: 180,
  },
  symbol: {
    height: 38,
    width: 38,
  },
  loginTicket: {
    marginLeft: 4,
    minWidth: 120,
  },
});

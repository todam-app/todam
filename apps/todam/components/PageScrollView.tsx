import { usePathname } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";

import { isPrimaryMobilePath } from "../lib/navigation";

type WebPageScrollContextValue = {
  isScrolled: boolean;
  setIsScrolled: (value: boolean) => void;
};

const WebPageScrollContext = createContext<WebPageScrollContextValue>({
  isScrolled: false,
  setIsScrolled: () => undefined,
});

export function WebPageScrollProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const resetFrame = window.requestAnimationFrame(() => setIsScrolled(false));
    return () => window.cancelAnimationFrame(resetFrame);
  }, [pathname]);

  const value = useMemo(() => ({ isScrolled, setIsScrolled }), [isScrolled]);

  return (
    <WebPageScrollContext.Provider value={value}>
      {children}
    </WebPageScrollContext.Provider>
  );
}

export function useWebPageScrolled(): boolean {
  return useContext(WebPageScrollContext).isScrolled;
}

export function PageScrollView({
  className,
  nativeID,
  onScroll,
  scrollEventThrottle,
  ...props
}: ScrollViewProps) {
  const pathname = usePathname();
  const scrollViewRef = useRef<ScrollView>(null);
  const { setIsScrolled } = useContext(WebPageScrollContext);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const resetFrame = window.requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: 0 });
    });
    return () => window.cancelAnimationFrame(resetFrame);
  }, [pathname]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (Platform.OS === "web") {
      setIsScrolled(event.nativeEvent.contentOffset.y > 1);
    }
    onScroll?.(event);
  }

  const webClassName =
    Platform.OS === "web"
      ? `todam-web-page-scroll${
          isPrimaryMobilePath(pathname) ? " todam-web-page-scroll--primary-mobile" : ""
        }${className ? ` ${className}` : ""}`
      : className;
  const scrollHandler = Platform.OS === "web" || onScroll ? handleScroll : undefined;

  return (
    <ScrollView
      {...props}
      {...(webClassName ? { className: webClassName } : {})}
      {...(scrollHandler ? { onScroll: scrollHandler } : {})}
      {...(Platform.OS === "web" ? { role: "main" as const } : {})}
      nativeID={nativeID ?? "contenu-principal"}
      ref={scrollViewRef}
      scrollEventThrottle={scrollEventThrottle ?? 16}
    />
  );
}

export function PageStaticView({ className, nativeID, ...props }: ViewProps) {
  const pathname = usePathname();
  const webClassName =
    Platform.OS === "web"
      ? `todam-web-page-static${
          isPrimaryMobilePath(pathname) ? " todam-web-page-static--primary-mobile" : ""
        }${className ? ` ${className}` : ""}`
      : className;

  return (
    <View
      {...props}
      {...(webClassName ? { className: webClassName } : {})}
      {...(Platform.OS === "web" ? { role: "main" as const } : {})}
      nativeID={nativeID ?? "contenu-principal"}
    />
  );
}

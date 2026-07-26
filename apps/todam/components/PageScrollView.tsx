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

  const value = useMemo(
    () => ({ isScrolled, setIsScrolled }),
    [isScrolled],
  );

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
      ? `todam-web-page-scroll${className ? ` ${className}` : ""}`
      : className;
  const scrollHandler =
    Platform.OS === "web" || onScroll ? handleScroll : undefined;

  return (
    <ScrollView
      {...props}
      {...(webClassName ? { className: webClassName } : {})}
      {...(scrollHandler ? { onScroll: scrollHandler } : {})}
      ref={scrollViewRef}
      scrollEventThrottle={scrollEventThrottle ?? 16}
    />
  );
}

export function PageStaticView({ className, ...props }: ViewProps) {
  const webClassName =
    Platform.OS === "web"
      ? `todam-web-page-static${className ? ` ${className}` : ""}`
      : className;

  return <View {...props} {...(webClassName ? { className: webClassName } : {})} />;
}

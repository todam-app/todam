import { Redirect, useLocalSearchParams } from "expo-router";

function parameter(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default function LegacyDiscoverRoute() {
  const params = useLocalSearchParams<{
    q?: string | string[];
    type?: string | string[];
  }>();
  const query = parameter(params.q).trim();
  const type = parameter(params.type).trim();

  return (
    <Redirect
      href={{
        pathname: "/search",
        params: {
          ...(query ? { q: query } : {}),
          ...(type ? { type } : {}),
        },
      }}
    />
  );
}

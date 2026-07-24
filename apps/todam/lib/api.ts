import { createTodamApiClient } from "@todam/contracts";
import { Platform } from "react-native";

import { authClient } from "./auth-client";
import { API_URL } from "./config";

const authenticatedFetch: typeof globalThis.fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  const cookie = Platform.OS === "web" ? null : authClient.getCookie();
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  return globalThis.fetch(input, {
    ...init,
    headers,
    credentials: Platform.OS === "web" ? "include" : "omit",
  });
};

export const api = createTodamApiClient({
  baseUrl: API_URL,
  fetch: authenticatedFetch,
});

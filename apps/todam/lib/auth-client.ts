import { expoClient } from "@better-auth/expo/client";
import type { BetterAuthClientPlugin } from "better-auth";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { API_URL } from "./config";

const client = createAuthClient({
  baseURL: `${API_URL}/v1/auth`,
  plugins: [
    expoClient({
      scheme: "todam",
      storagePrefix: "todam",
      storage: SecureStore,
    }) as unknown as BetterAuthClientPlugin,
  ],
});

export const authClient = client as typeof client & {
  getCookie(): string;
};

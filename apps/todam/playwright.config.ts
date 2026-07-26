import { defineConfig } from "@playwright/test";

const e2ePort = 8082;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm dev --port ${e2ePort}`,
    env: {
      ...process.env,
      EXPO_PUBLIC_LEGAL_OPERATOR_NAME: "Nom éditeur test",
      EXPO_PUBLIC_WEB_URL: `http://localhost:${e2ePort}`,
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://localhost:${e2ePort}`,
  },
});

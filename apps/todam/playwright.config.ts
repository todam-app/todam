import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const e2ePort = 8082;

export default defineConfig({
  expect: {
    timeout: 15_000,
  },
  timeout: 60_000,
  outputDir: join(tmpdir(), "todam-playwright-results"),
  retries: 1,
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm dev --port ${e2ePort}`,
    env: {
      ...process.env,
      EXPO_NO_METRO_LAZY: "1",
      EXPO_PUBLIC_LEGAL_OPERATOR_NAME: "Nom éditeur test",
      EXPO_PUBLIC_WEB_URL: `http://localhost:${e2ePort}`,
      TODAM_DISABLE_ROUTE_LOADERS: "1",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    url: `http://localhost:${e2ePort}`,
  },
});

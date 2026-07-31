import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    "src/account-report.ts",
    "src/catalog-discover-openagenda.ts",
    "src/index.ts",
    "src/catalog-import.ts",
    "src/catalog-replace.ts",
    "src/catalog-media-mirror.ts",
    "src/catalog-status.ts",
    "src/catalog-sync.ts",
    "src/purge-unverified-users.ts",
  ],
  external: ["pg"],
  format: ["esm"],
  noExternal: ["@todam/contracts", "@todam/database", "@todam/domain"],
  skipNodeModulesBundle: true,
});

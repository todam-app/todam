import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  external: ["pg"],
  format: ["esm"],
  noExternal: ["@todam/contracts", "@todam/database", "@todam/domain"],
  skipNodeModulesBundle: true,
});

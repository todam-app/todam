import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/.expo/**",
    "**/coverage/**",
    "**/node_modules/**",
    "packages/contracts/src/generated/**",
  ]),
  ...expoConfig,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    settings: {
      react: {
        version: "19.2.3",
      },
    },
    rules: {
      "no-console": ["error", { allow: ["error", "info", "log", "warn"] }],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@todam/api", "@todam/jobs", "@todam/domain", "@todam/database"],
              message:
                "Le code Apache doit communiquer avec le serveur via les contrats HTTP.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
      },
      sourceType: "commonjs",
    },
  },
  {
    files: [
      "apps/api/**/*.{ts,tsx}",
      "apps/jobs/**/*.{ts,tsx}",
      "packages/domain/**/*.{ts,tsx}",
      "packages/database/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

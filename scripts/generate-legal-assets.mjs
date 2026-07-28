import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";

const root = process.cwd();
const documents = {
  terms: "docs/legal/conditions-utilisation-v1.0.1.md",
  privacy: "docs/legal/confidentialite-v1.0.2.md",
  notices: "docs/legal/mentions-legales-v1.0.0.md",
  deletion: "docs/legal/suppression-compte-v1.0.1.md",
};
const outputPath = path.join(root, "apps/todam/lib/legal-generated.ts");

const entries = await Promise.all(
  Object.entries(documents).map(async ([key, relativePath]) => [
    key,
    (await readFile(path.join(root, relativePath), "utf8"))
      .replaceAll("\r\n", "\n")
      .trim(),
  ]),
);
const output = await format(
  "/* Ce fichier est généré par scripts/generate-legal-assets.mjs. */\n" +
    `export const legalMarkdown = ${JSON.stringify(Object.fromEntries(entries), null, 2)} as const;\n`,
  { parser: "typescript" },
);

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current.replaceAll("\r\n", "\n") !== output) {
    console.error(
      "Les pages juridiques générées sont obsolètes. Exécutez pnpm legal:generate.",
    );
    process.exitCode = 1;
  }
} else {
  await writeFile(outputPath, output, "utf8");
}

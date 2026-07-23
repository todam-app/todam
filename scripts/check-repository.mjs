import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { extname, join, relative, sep } from "node:path";

const requiredPaths = [
  "README.md",
  "LICENSE.md",
  "LICENSES/Apache-2.0.txt",
  "LICENSES/AGPL-3.0.txt",
  "TRADEMARKS.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "AGENTS.md",
  "docs/FICHE_PRODUIT.md",
  "docs/ARCHITECTURE_TECHNIQUE.md",
  "apps/todam/package.json",
  "apps/api/package.json",
  "apps/jobs/package.json",
  "packages/contracts/package.json",
  "packages/design-system/package.json",
  "packages/domain/package.json",
  "packages/database/package.json",
];

const errors = requiredPaths
  .filter((path) => !existsSync(path))
  .map((path) => `Chemin requis absent : ${path}`);

const apacheRoots = [
  "apps/todam",
  "packages/contracts",
  "packages/design-system",
];
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const forbiddenImports = [
  "@todam/api",
  "@todam/jobs",
  "@todam/domain",
  "@todam/database",
  "apps/api",
  "apps/jobs",
  "packages/domain",
  "packages/database",
];

function walk(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

for (const root of apacheRoots) {
  for (const file of walk(root).filter((path) =>
    sourceExtensions.has(extname(path)),
  )) {
    const source = readFileSync(file, "utf8");
    for (const forbidden of forbiddenImports) {
      if (source.includes(forbidden)) {
        errors.push(
          `${relative(".", file).split(sep).join("/")} référence la zone ` +
            `AGPL interdite : ${forbidden}`,
        );
      }
    }
  }
}

for (const markdown of walk(".").filter(
  (path) =>
    extname(path) === ".md" &&
    !path.includes(`${sep}.git${sep}`) &&
    !path.includes(`${sep}node_modules${sep}`),
)) {
  const content = readFileSync(markdown, "utf8");
  if (!content.startsWith("# ")) {
    errors.push(`${relative(".", markdown)} doit commencer par un titre H1.`);
  }
  if (content.includes("\uFFFD")) {
    errors.push(`${relative(".", markdown)} contient un caractère UTF-8 invalide.`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  "Dépôt : structure, Markdown UTF-8 et frontière Apache/AGPL cohérents.",
);

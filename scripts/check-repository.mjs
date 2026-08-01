import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
  "docs/MVP_VALIDATION.md",
  "deploy/nginx.conf",
  "docker-compose.yml",
  ".env.example",
  "data/README.md",
  "data/fixtures/theatre-des-muses.sample.json",
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

const apacheRoots = ["apps/todam", "packages/contracts", "packages/design-system"];
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
    if (
      entry === "node_modules" ||
      entry === ".git" ||
      entry === "dist" ||
      entry === ".expo"
    ) {
      return [];
    }
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

for (const root of apacheRoots) {
  for (const file of walk(root).filter((path) => sourceExtensions.has(extname(path)))) {
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

for (const markdown of walk(".").filter((path) => extname(path) === ".md")) {
  const content = readFileSync(markdown, "utf8");
  if (!content.startsWith("# ")) {
    errors.push(`${relative(".", markdown)} doit commencer par un titre H1.`);
  }
  if (content.includes("\uFFFD")) {
    errors.push(`${relative(".", markdown)} contient un caractère UTF-8 invalide.`);
  }
}

const nginxConfig = readFileSync("deploy/nginx.conf", "utf8");
const legalRobotsHeader =
  'add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet" always;';
const protectedLegalLocations = [
  "location ~* ^/legal/.+\\.pdf$ {",
  "location ~ ^/(?:conditions-utilisation|confidentialite|informations-legales|mentions-legales|suppression-compte)/?$ {",
];
const legalLocationsProtected = protectedLegalLocations.every((location) => {
  const locationStart = nginxConfig.indexOf(location);
  if (locationStart === -1) return false;

  const locationEnd = nginxConfig.indexOf("\n    }", locationStart);
  return (
    locationEnd !== -1 &&
    nginxConfig.slice(locationStart, locationEnd).includes(legalRobotsHeader)
  );
});
if (!legalLocationsProtected) {
  errors.push(
    "deploy/nginx.conf doit protéger les pages juridiques et leurs PDF avec X-Robots-Tag.",
  );
}

const publicLegalPipelineFiles = [
  ".env.example",
  ".github/workflows/publish-images.yml",
  "Dockerfile.web",
  "apps/todam/lib/legal-documents.ts",
  "scripts/generate-legal-pdfs.py",
];
const retiredPublisherVariables = [
  "LEGAL_SIREN",
  "LEGAL_SIRET",
  "LEGAL_RNE_REGISTRATION_DATE",
  "LEGAL_ACTIVITY_START_DATE",
  "LEGAL_LEGAL_FORM",
  "LEGAL_ACTIVITY",
  "LEGAL_APE",
  "LEGAL_ADDRESS",
  "LEGAL_PHONE",
];
for (const file of publicLegalPipelineFiles) {
  const content = readFileSync(file, "utf8");
  for (const variable of retiredPublisherVariables) {
    if (content.includes(variable)) {
      errors.push(
        `${file} réintroduit la variable d'éditeur professionnel retirée : ${variable}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Dépôt : structure, Markdown UTF-8 et frontière Apache/AGPL cohérents.");

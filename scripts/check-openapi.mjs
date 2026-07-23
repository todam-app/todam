import { existsSync } from "node:fs";

const openApiCandidates = [
  "packages/contracts/openapi.yaml",
  "packages/contracts/openapi.yml",
  "packages/contracts/openapi.json",
];

const existing = openApiCandidates.filter(existsSync);

if (existing.length > 1) {
  console.error(`Plusieurs sources OpenAPI détectées : ${existing.join(", ")}`);
  process.exit(1);
}

if (existing.length === 0) {
  console.log(
    "OpenAPI : aucune spécification n'existe encore ; validation non applicable.",
  );
  process.exit(0);
}

const extension = existing[0].split(".").at(-1);
if (extension === "json") {
  const { readFileSync } = await import("node:fs");
  const document = JSON.parse(readFileSync(existing[0], "utf8"));
  if (!document.openapi || !document.info || !document.paths) {
    console.error("La spécification OpenAPI JSON est incomplète.");
    process.exit(1);
  }
}

console.log(`OpenAPI : source détectée (${existing[0]}).`);

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createOpenApiDocument } from "./document.js";

const target = resolve(process.cwd(), "../../packages/contracts/openapi.json");
const expected = JSON.parse(await readFile(target, "utf8")) as unknown;
const actual = await createOpenApiDocument();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(
    "Le contrat OpenAPI n'est pas à jour. Exécute pnpm --filter @todam/api openapi:write.",
  );
}

console.info("Le contrat OpenAPI est à jour.");

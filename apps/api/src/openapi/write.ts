import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createOpenApiDocument } from "./document.js";

const target = resolve(process.cwd(), "../../packages/contracts/openapi.json");
const document = await createOpenApiDocument();
await writeFile(target, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.info(`Contrat OpenAPI écrit dans ${target}`);

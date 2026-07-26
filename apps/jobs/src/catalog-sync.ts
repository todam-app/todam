import { fileURLToPath } from "node:url";

import { config } from "dotenv";

import { runCatalogSyncFromEnvironment, type ConnectorName } from "./sync.js";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const connector = argument("--source") as ConnectorName | undefined;
const apply = process.argv.includes("--apply");
const supported = new Set<ConnectorName>(["base-lieux", "datatourisme", "openagenda"]);

if (!connector || !supported.has(connector)) {
  console.error(
    "Usage : pnpm catalog:sync -- --source <base-lieux|datatourisme|openagenda> [--apply]",
  );
  process.exit(1);
}

try {
  const result = await runCatalogSyncFromEnvironment(connector, apply);
  console.info(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

import { fileURLToPath } from "node:url";

import { config } from "dotenv";

import { discoverOpenAgenda } from "./connectors/openagenda-discovery.js";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

try {
  const agendas = await discoverOpenAgenda();
  console.info(
    JSON.stringify(
      {
        agendaUids: agendas.map(({ uid }) => uid).join(","),
        agendas,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

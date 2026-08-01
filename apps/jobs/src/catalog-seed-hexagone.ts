import { fileURLToPath } from "node:url";

import { createDatabase } from "@todam/database";
import { config } from "dotenv";

import {
  applyHexagonePilot,
  HEXAGONE_PILOT_PRODUCTIONS,
  validateHexagonePilotData,
} from "./hexagone-pilot.js";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

validateHexagonePilotData();

if (!process.argv.includes("--apply")) {
  console.info(
    JSON.stringify(
      {
        mode: "dry-run",
        source: "Billetterie officielle de l’Hexagone",
        productions: HEXAGONE_PILOT_PRODUCTIONS.length,
        performances: HEXAGONE_PILOT_PRODUCTIONS.reduce(
          (total, item) => total + item.performances.length,
          0,
        ),
        credits: HEXAGONE_PILOT_PRODUCTIONS.reduce(
          (total, item) => total + item.credits.length,
          0,
        ),
        media: 0,
        rights:
          "Résumés et présentations Todam originaux, crédits factuels sourcés, aucun visuel tiers",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const { db, pool } = createDatabase();
try {
  const result = await applyHexagonePilot(db);
  console.info(JSON.stringify({ mode: "apply", ...result }, null, 2));
} finally {
  await pool.end();
}

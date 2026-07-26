import { fileURLToPath } from "node:url";

import { S3Client } from "@aws-sdk/client-s3";
import { createDatabase } from "@todam/database";
import { config } from "dotenv";

import { mirrorPendingMedia } from "./media-mirror.js";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} est obligatoire pour le miroir d'affiches.`);
  return value;
}

const endpoint = required("TODAM_OBJECT_ENDPOINT", process.env.TODAM_OBJECT_ENDPOINT);
const bucket = required("TODAM_OBJECT_BUCKET", process.env.TODAM_OBJECT_BUCKET);
const accessKeyId = required(
  "TODAM_OBJECT_ACCESS_KEY_ID",
  process.env.TODAM_OBJECT_ACCESS_KEY_ID,
);
const secretAccessKey = required(
  "TODAM_OBJECT_SECRET_ACCESS_KEY",
  process.env.TODAM_OBJECT_SECRET_ACCESS_KEY,
);
const { db, pool } = createDatabase();
const client = new S3Client({
  endpoint,
  forcePathStyle: true,
  region: process.env.TODAM_OBJECT_REGION ?? "auto",
  credentials: { accessKeyId, secretAccessKey },
});

try {
  const result = await mirrorPendingMedia(db, { bucket, client });
  console.info(JSON.stringify(result, null, 2));
  if (result.failed > 0) process.exitCode = 1;
} finally {
  client.destroy();
  await pool.end();
}

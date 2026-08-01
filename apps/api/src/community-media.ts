import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { COMMUNITY_POSTER_ERROR } from "@todam/contracts";
import sharp, { type Metadata, type OutputInfo } from "sharp";

import { HttpProblem } from "./errors.js";

const MAX_POSTER_BYTES = 2 * 1024 * 1024;
const MIN_POSTER_WIDTH = 300;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface CommunityPosterFile {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface PreparedCommunityPoster {
  remoteUrl: string;
  storageKey: string | null;
  storagePolicy: "mirror" | "hotlink";
  mimeType: string;
  width: number;
  height: number;
  sha256: string | null;
  credit: string | null;
  cleanup(): Promise<void>;
}

function invalidPoster(): never {
  throw new HttpProblem(400, "INVALID_COMMUNITY_POSTER", COMMUNITY_POSTER_ERROR);
}

function isPublicIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b] = parts as [number, number, number, number];
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  ) {
    return false;
  }
  return true;
}

function isPublicIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version !== 6) return false;

  const normalized = address.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe") ||
    normalized.startsWith("ff")
  ) {
    return false;
  }
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isPublicIpv4(mapped);
  return !normalized.startsWith("::ffff:");
}

async function assertSafeHttpsUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    invalidPoster();
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    invalidPoster();
  }
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true }).catch(() => []);
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIp(address))) {
    invalidPoster();
  }
  return url;
}

async function readLimitedBody(response: Response): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_POSTER_BYTES) {
    invalidPoster();
  }
  const reader = response.body?.getReader();
  if (!reader) invalidPoster();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > MAX_POSTER_BYTES) {
      await reader.cancel();
      invalidPoster();
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks, size);
}

async function inspectPoster(buffer: Buffer) {
  if (buffer.byteLength > MAX_POSTER_BYTES) invalidPoster();
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, {
      failOn: "warning",
      limitInputPixels: 30_000_000,
    }).metadata();
  } catch {
    invalidPoster();
  }
  if (
    !metadata.format ||
    !ACCEPTED_FORMATS.has(metadata.format) ||
    !metadata.width ||
    !metadata.height ||
    metadata.width < MIN_POSTER_WIDTH
  ) {
    invalidPoster();
  }
  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
  };
}

export async function optimizeCommunityPoster(
  buffer: Buffer,
  mimeType: string,
): Promise<{ data: Buffer; info: OutputInfo }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType.toLowerCase())) {
    invalidPoster();
  }
  await inspectPoster(buffer);
  try {
    return await sharp(buffer, {
      failOn: "warning",
      limitInputPixels: 30_000_000,
    })
      .rotate()
      .resize({
        width: 1200,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    invalidPoster();
  }
}

async function validateRemotePoster(
  initialUrl: string,
  credit: string | null,
): Promise<PreparedCommunityPoster> {
  let url = await assertSafeHttpsUrl(initialUrl);
  let response: Response | undefined;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: "image/jpeg,image/png,image/webp",
        "User-Agent": "Todam/0.1 community-poster-validator",
      },
    }).catch(() => undefined);
    if (!response) invalidPoster();
    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirect === 3) invalidPoster();
      url = await assertSafeHttpsUrl(new URL(location, url).toString());
      continue;
    }
    break;
  }
  if (!response?.ok) invalidPoster();
  const buffer = await readLimitedBody(response);
  const metadata = await inspectPoster(buffer);
  const mimeType =
    metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
  return {
    remoteUrl: url.toString(),
    storageKey: null,
    storagePolicy: "hotlink",
    mimeType,
    width: metadata.width,
    height: metadata.height,
    sha256: null,
    credit,
    cleanup: async () => undefined,
  };
}

function storageConfiguration() {
  const endpoint = process.env.TODAM_OBJECT_ENDPOINT;
  const region = process.env.TODAM_OBJECT_REGION ?? "auto";
  const accessKeyId = process.env.TODAM_OBJECT_ACCESS_KEY_ID;
  const secretAccessKey = process.env.TODAM_OBJECT_SECRET_ACCESS_KEY;
  const bucket = process.env.TODAM_OBJECT_BUCKET;
  const publicBaseUrl = process.env.TODAM_OBJECT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new HttpProblem(
      503,
      "COMMUNITY_MEDIA_STORAGE_UNAVAILABLE",
      "Le chargement d’une affiche est temporairement indisponible.",
    );
  }
  return {
    bucket,
    publicBaseUrl,
    client: new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

async function prepareUploadedPoster(
  file: CommunityPosterFile,
): Promise<PreparedCommunityPoster> {
  const optimized = await optimizeCommunityPoster(file.buffer, file.mimeType);
  const storage = storageConfiguration();
  const storageKey = `community/posters/${randomUUID()}.webp`;
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: storageKey,
      Body: optimized.data,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: {},
    }),
  );
  return {
    remoteUrl: `${storage.publicBaseUrl}/${storageKey}`,
    storageKey,
    storagePolicy: "mirror",
    mimeType: "image/webp",
    width: optimized.info.width,
    height: optimized.info.height,
    sha256: createHash("sha256").update(optimized.data).digest("hex"),
    credit: null,
    cleanup: async () => {
      await storage.client
        .send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: storageKey }))
        .catch(() => undefined);
    },
  };
}

export function createCommunityMediaService() {
  return {
    prepareRemotePoster: validateRemotePoster,
    prepareUploadedPoster,
  };
}

export type CommunityMediaService = ReturnType<typeof createCommunityMediaService>;

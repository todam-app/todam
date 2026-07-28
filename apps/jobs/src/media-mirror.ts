import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { mediaAssets, type TodamDatabase } from "@todam/database";
import { and, eq, isNull, sql } from "drizzle-orm";

const MAX_MEDIA_BYTES = 15 * 1024 * 1024;
const MAX_REDIRECTS = 5;

interface DownloadedMedia {
  body: Uint8Array;
  contentType: string;
  extension: string;
  sha256: string;
}

export interface MediaMirrorConfig {
  bucket: string;
  client: S3Client;
  limit?: number;
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mapped ?? (isIP(normalized) === 4 ? normalized : null);
  if (!ipv4) return false;
  const [a = 0, b = 0] = ipv4.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export async function assertPublicMediaUrl(url: URL): Promise<void> {
  if (url.protocol !== "https:") {
    throw new Error("Une affiche distante doit utiliser HTTPS.");
  }
  if (url.username || url.password || url.port) {
    throw new Error("Une URL d'affiche ne peut contenir ni identifiants ni port.");
  }
  const directIp = isIP(url.hostname);
  const addresses = directIp
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("L'adresse de l'affiche cible un réseau non public.");
  }
}

function mediaFormat(
  contentType: string,
  body: Uint8Array,
): {
  contentType: string;
  extension: string;
} {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase();
  if (normalized === "image/jpeg" && body[0] === 0xff && body[1] === 0xd8) {
    return { contentType: normalized, extension: "jpg" };
  }
  if (
    normalized === "image/png" &&
    body[0] === 0x89 &&
    body[1] === 0x50 &&
    body[2] === 0x4e &&
    body[3] === 0x47
  ) {
    return { contentType: normalized, extension: "png" };
  }
  if (
    normalized === "image/webp" &&
    String.fromCharCode(...body.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...body.slice(8, 12)) === "WEBP"
  ) {
    return { contentType: normalized, extension: "webp" };
  }
  if (
    normalized === "image/avif" &&
    String.fromCharCode(...body.slice(4, 12)).includes("ftyp")
  ) {
    return { contentType: normalized, extension: "avif" };
  }
  throw new Error("Le contenu reçu n'est pas une image JPEG, PNG, WebP ou AVIF.");
}

export async function downloadMedia(
  initialUrl: string,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
): Promise<DownloadedMedia> {
  let url = new URL(initialUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicMediaUrl(url);
    const response = await fetchImplementation(url, {
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg",
        "user-agent": "TodamMediaMirror/0.1 (+https://todam.fr)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) {
        throw new Error("La source de l'affiche a produit trop de redirections.");
      }
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      throw new Error(`Le téléchargement de l'affiche a répondu ${response.status}.`);
    }
    const announcedLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(announcedLength) && announcedLength > MAX_MEDIA_BYTES) {
      throw new Error("L'affiche dépasse la taille maximale de 15 Mo.");
    }
    const body = new Uint8Array(await response.arrayBuffer());
    if (body.byteLength === 0 || body.byteLength > MAX_MEDIA_BYTES) {
      throw new Error("L'affiche est vide ou dépasse la taille maximale de 15 Mo.");
    }
    const format = mediaFormat(response.headers.get("content-type") ?? "", body);
    return {
      body,
      ...format,
      sha256: createHash("sha256").update(body).digest("hex"),
    };
  }
  throw new Error("La source de l'affiche a produit trop de redirections.");
}

export async function mirrorPendingMedia(
  database: TodamDatabase,
  config: MediaMirrorConfig,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
): Promise<{ failed: number; mirrored: number; skipped: number }> {
  const rows = await database
    .select({
      id: mediaAssets.id,
      remoteUrl: mediaAssets.remoteUrl,
      sourceId: mediaAssets.sourceId,
    })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.isActive, true),
        eq(mediaAssets.storagePolicy, "mirror"),
        isNull(mediaAssets.storageKey),
        sql<boolean>`${mediaAssets.rightsStatus} in ('open_license', 'permission_granted', 'todam_original')`,
        sql<boolean>`(${mediaAssets.validUntil} is null or ${mediaAssets.validUntil} > now())`,
      ),
    )
    .limit(config.limit ?? 100);

  let mirrored = 0;
  let failed = 0;
  let skipped = 0;
  for (const media of rows) {
    try {
      const downloaded = await downloadMedia(media.remoteUrl, fetchImplementation);
      const storageKey = [
        "posters",
        media.sourceId,
        media.id,
        `${downloaded.sha256}.${downloaded.extension}`,
      ].join("/");
      await config.client.send(
        new PutObjectCommand({
          Body: downloaded.body,
          Bucket: config.bucket,
          CacheControl: "public, max-age=31536000, immutable",
          ContentType: downloaded.contentType,
          Key: storageKey,
        }),
      );
      const updated = await database
        .update(mediaAssets)
        .set({
          mirroredAt: new Date(),
          mimeType: downloaded.contentType,
          sha256: downloaded.sha256,
          storageKey,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mediaAssets.id, media.id),
            eq(mediaAssets.remoteUrl, media.remoteUrl),
            isNull(mediaAssets.storageKey),
          ),
        )
        .returning({ id: mediaAssets.id });
      if (updated.length === 1) mirrored += 1;
      else skipped += 1;
    } catch {
      failed += 1;
    }
  }
  return { failed, mirrored, skipped };
}

import { COMMUNITY_POSTER_ERROR } from "@todam/contracts";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  createCommunityMediaService,
  optimizeCommunityPoster,
} from "../src/community-media.js";

describe("affiches communautaires", () => {
  it("convertit en WebP, limite les dimensions et retire les métadonnées", async () => {
    const jpeg = await sharp({
      create: {
        width: 1800,
        height: 2400,
        channels: 3,
        background: "#C43D28",
      },
    })
      .withMetadata({
        exif: {
          IFD0: {
            Artist: "Crédit de test qui ne doit pas rester dans le fichier",
          },
        },
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    const optimized = await optimizeCommunityPoster(jpeg, "image/jpeg");
    const metadata = await sharp(optimized.data).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(1200);
    expect(metadata.height).toBeLessThanOrEqual(1800);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it("applique le message unique aux formats et dimensions refusés", async () => {
    const tooNarrow = await sharp({
      create: {
        width: 299,
        height: 600,
        channels: 3,
        background: "#FFFFFF",
      },
    })
      .png()
      .toBuffer();

    await expect(optimizeCommunityPoster(tooNarrow, "image/png")).rejects.toMatchObject(
      { message: COMMUNITY_POSTER_ERROR },
    );
    await expect(
      optimizeCommunityPoster(Buffer.alloc(2 * 1024 * 1024 + 1), "image/png"),
    ).rejects.toMatchObject({ message: COMMUNITY_POSTER_ERROR });
  });

  it("refuse une URL HTTPS qui pointe vers une adresse privée", async () => {
    const service = createCommunityMediaService();
    await expect(
      service.prepareRemotePoster("https://127.0.0.1/affiche.jpg", null),
    ).rejects.toMatchObject({
      message: COMMUNITY_POSTER_ERROR,
      code: "INVALID_COMMUNITY_POSTER",
    });
  });
});

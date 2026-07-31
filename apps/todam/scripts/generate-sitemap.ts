import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PUBLIC_WEB_URL } from "../lib/config";
import { getPublishedCatalogSlugs } from "../lib/static-catalog-params";

const publicDirectory = join(process.cwd(), "public");
const sitemapPath = join(publicDirectory, "sitemap.xml");

const staticPaths = [
  "/",
  "/pour-les-salles",
  "/pour-les-compagnies",
  "/les-coulisses",
  "/contact",
] as const;

async function main() {
  const generatedOn = new Date().toISOString().slice(0, 10);
  const [productionSlugs, venueSlugs, companySlugs] = await Promise.all([
    getPublishedCatalogSlugs("productions"),
    getPublishedCatalogSlugs("venues"),
    getPublishedCatalogSlugs("companies"),
  ]);

  const paths = [
    ...staticPaths,
    ...venueSlugs.map((slug) => `/lieu/${encodeURIComponent(slug)}`),
    ...productionSlugs.map((slug) => `/production/${encodeURIComponent(slug)}`),
    ...companySlugs.map((slug) => `/compagnie/${encodeURIComponent(slug)}`),
  ];

  const urls = Array.from(new Set(paths))
    .sort((left, right) => left.localeCompare(right, "fr"))
    .map(
      (path) =>
        `  <url><loc>${PUBLIC_WEB_URL}${path}</loc><lastmod>${generatedOn}</lastmod></url>`,
    )
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Généré depuis les contenus publiés de l’API Todam. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  await mkdir(publicDirectory, { recursive: true });
  await writeFile(sitemapPath, sitemap, "utf8");

  console.log(`Sitemap généré : ${paths.length} routes publiques (${sitemapPath}).`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

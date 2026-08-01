import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { join } from "node:path";

const repositoryRoot = process.cwd();
const webDist = join(repositoryRoot, "apps", "todam", "dist");
const canonicalOrigin = new URL(
  process.env.EXPO_PUBLIC_WEB_URL ?? process.env.PUBLIC_WEB_URL ?? "https://todam.fr",
).origin;
const requireCatalog = process.env.TODAM_REQUIRE_STATIC_CATALOG === "1";
const baseUrlArgument = process.argv.find((argument) =>
  argument.startsWith("--base-url="),
);
const runtimeBaseUrl = baseUrlArgument?.slice("--base-url=".length).replace(/\/$/, "");
const runtimeOnly = process.argv.includes("--runtime-only");
const liveMode = process.argv.includes("--live");

const staticPages = [
  { file: "index.html", path: "/" },
  { file: "contact.html", path: "/contact" },
  { file: "les-coulisses.html", path: "/les-coulisses" },
  { file: "pour-les-compagnies.html", path: "/pour-les-compagnies" },
  { file: "pour-les-salles.html", path: "/pour-les-salles" },
];

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}

function metaContent(html, name) {
  const tag = html
    .match(/<meta\b[^>]*>/gi)
    ?.find((candidate) => attribute(candidate, "name")?.toLowerCase() === name);
  return tag ? attribute(tag, "content") : null;
}

function canonicalHref(html) {
  const tag = html
    .match(/<link\b[^>]*>/gi)
    ?.find((candidate) => attribute(candidate, "rel")?.toLowerCase() === "canonical");
  return tag ? attribute(tag, "href") : null;
}

function pageTitle(html) {
  return html.match(/<title\b[^>]*>([^<]+)<\/title>/i)?.[1].trim() ?? null;
}

function assertSeoHtml(html, expectedCanonical, label, { requireJsonLd = false } = {}) {
  assert.match(html, /<html\b[^>]*\blang=["']fr["']/i, `${label}: lang="fr" manque.`);
  assert.ok(pageTitle(html), `${label}: title vide ou absent.`);
  assert.ok(metaContent(html, "description"), `${label}: meta description absente.`);
  assert.equal(
    canonicalHref(html),
    expectedCanonical,
    `${label}: URL canonique incorrecte.`,
  );
  assert.match(
    html,
    /<(?:h1\b|[^>]+\brole=["']heading["'][^>]*\baria-level=["']1["'])/i,
    `${label}: H1 statique absent.`,
  );
  assert.ok(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim().length > 200,
    `${label}: contenu HTML statique insuffisant.`,
  );

  if (requireJsonLd) {
    assert.match(
      html,
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/i,
      `${label}: données structurées JSON-LD absentes.`,
    );
  }
}

function decodeXml(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function htmlFileForPath(pathname) {
  if (pathname === "/") return "index.html";
  return `${decodeURIComponent(pathname.slice(1))}.html`;
}

async function checkBuildArtifact() {
  const titles = new Set();
  const descriptions = new Set();
  const canonicals = new Set();

  for (const page of staticPages) {
    const html = await readFile(join(webDist, page.file), "utf8");
    const expectedCanonical = `${canonicalOrigin}${page.path === "/" ? "" : page.path}`;
    assertSeoHtml(html, expectedCanonical, page.path);

    const title = pageTitle(html);
    const description = metaContent(html, "description");
    const canonical = canonicalHref(html);
    assert.ok(!titles.has(title), `${page.path}: title dupliqué.`);
    assert.ok(!descriptions.has(description), `${page.path}: description dupliquée.`);
    assert.ok(!canonicals.has(canonical), `${page.path}: URL canonique dupliquée.`);
    titles.add(title);
    descriptions.add(description);
    canonicals.add(canonical);
  }

  const sitemap = await readFile(join(webDist, "sitemap.xml"), "utf8");
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(
    sitemap,
    /<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/,
  );
  assert.doesNotMatch(
    sitemap,
    /<lastmod>/,
    "Le sitemap ne doit pas inventer de date de modification.",
  );

  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    decodeXml(match[1]),
  );
  assert.ok(
    locations.length >= staticPages.length,
    "Le sitemap est vide ou incomplet.",
  );
  assert.equal(
    new Set(locations).size,
    locations.length,
    "Le sitemap contient des doublons.",
  );

  const privatePrefixes = [
    "/email-verifie",
    "/espace-compagnie",
    "/journal",
    "/listes",
    "/moderation",
    "/mot-de-passe-oublie",
    "/parametres-compte",
    "/profile",
    "/reinitialiser-mot-de-passe",
    "/revendiquer-compagnie",
    "/search",
    "/sign-in",
    "/sign-up",
    "/signaler",
    "/supprimer-mon-compte",
  ];

  const catalogCounts = { compagnie: 0, lieu: 0, production: 0 };

  for (const location of locations) {
    const url = new URL(location);
    assert.equal(url.origin, canonicalOrigin, `${location}: origine non canonique.`);
    assert.ok(
      !privatePrefixes.some(
        (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
      ),
      `${location}: route privée présente dans le sitemap.`,
    );

    const catalogType = Object.keys(catalogCounts).find((type) =>
      url.pathname.startsWith(`/${type}/`),
    );
    if (catalogType) catalogCounts[catalogType] += 1;

    const file = htmlFileForPath(url.pathname);
    await access(join(webDist, file));

    if (catalogType) {
      const html = await readFile(join(webDist, file), "utf8");
      assertSeoHtml(html, location, url.pathname, { requireJsonLd: true });
    }
  }

  if (requireCatalog) {
    for (const [type, count] of Object.entries(catalogCounts)) {
      assert.ok(
        count > 0,
        `Le sitemap de production ne contient aucune route ${type}.`,
      );
    }
  }

  const robots = await readFile(join(webDist, "robots.txt"), "utf8");
  assert.match(robots, /^User-agent:\s*\*$/m);
  assert.match(robots, /^Sitemap:\s*https:\/\/todam\.fr\/sitemap\.xml$/m);

  console.log(`SEO statique valide : ${locations.length} URL publiques contrôlées.`);
}

async function fetchWithoutRedirect(path, options = {}) {
  return fetch(`${runtimeBaseUrl}${path}`, { ...options, redirect: "manual" });
}

function requestWithHostHeader(path, host) {
  const target = new URL(path, runtimeBaseUrl);
  assert.equal(
    target.protocol,
    "http:",
    "Le contrôle local du Host Nginx exige une URL HTTP.",
  );

  return new Promise((resolve, reject) => {
    const request = httpRequest(
      target,
      { headers: { host }, method: "GET" },
      (response) => {
        response.resume();
        resolve({
          status: response.statusCode ?? 0,
          headers: {
            get(name) {
              const value = response.headers[name.toLowerCase()];
              return Array.isArray(value) ? value.join(", ") : (value ?? null);
            },
          },
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}

async function checkRuntime() {
  const homeResponse = await fetchWithoutRedirect("/");
  assert.equal(homeResponse.status, 200, "La page d’accueil ne répond pas 200.");
  assert.match(homeResponse.headers.get("content-type") ?? "", /text\/html/);
  assertSeoHtml(await homeResponse.text(), canonicalOrigin, "Accueil servi par Nginx");

  const sitemapResponse = await fetchWithoutRedirect("/sitemap.xml");
  assert.equal(sitemapResponse.status, 200, "Le sitemap ne répond pas 200.");
  assert.match(
    sitemapResponse.headers.get("content-type") ?? "",
    /(?:application|text)\/xml/,
    "Le sitemap n’est pas servi comme du XML.",
  );
  assert.match(await sitemapResponse.text(), /<urlset\b/);

  const missingResponse = await fetchWithoutRedirect("/__seo-route-inexistante__");
  assert.equal(missingResponse.status, 404, "Une route inconnue doit répondre 404.");
  assert.match(missingResponse.headers.get("x-robots-tag") ?? "", /noindex/i);

  const privateResponse = await fetchWithoutRedirect("/profile");
  assert.equal(
    privateResponse.status,
    200,
    "La page privée de contrôle ne répond pas 200.",
  );
  assert.match(privateResponse.headers.get("x-robots-tag") ?? "", /noindex/i);

  const wwwResponse = liveMode
    ? await fetch("https://www.todam.fr/contact?source=seo", { redirect: "manual" })
    : await requestWithHostHeader("/contact?source=seo", "www.todam.fr");
  assert.equal(
    wwwResponse.status,
    308,
    "www doit utiliser une redirection permanente 308.",
  );
  assert.equal(
    wwwResponse.headers.get("location"),
    "https://todam.fr/contact?source=seo",
  );

  const httpResponse = liveMode
    ? await fetch("http://todam.fr/les-coulisses?source=seo", { redirect: "manual" })
    : await fetchWithoutRedirect("/les-coulisses?source=seo", {
        headers: { host: "todam.fr", "x-forwarded-proto": "http" },
      });
  assert.equal(
    httpResponse.status,
    308,
    "HTTP doit utiliser une redirection permanente 308.",
  );
  assert.equal(
    httpResponse.headers.get("location"),
    "https://todam.fr/les-coulisses?source=seo",
  );

  console.log("SEO Nginx valide : statuts, noindex et redirections contrôlés.");
}

if (!runtimeOnly) await checkBuildArtifact();
if (runtimeBaseUrl) {
  await checkRuntime();
} else if (runtimeOnly) {
  throw new Error("--runtime-only exige --base-url.");
}

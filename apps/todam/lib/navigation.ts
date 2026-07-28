export const primaryMobilePaths = ["/", "/journal", "/search", "/profile"] as const;

export function isPrimaryMobilePath(pathname: string): boolean {
  return primaryMobilePaths.some((path) => pathname === path);
}

export function isAuthPath(pathname: string): boolean {
  return [
    "/sign-in",
    "/sign-up",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/email-verifie",
  ].some((path) => pathname.startsWith(path));
}

export function mobileContextForPath(pathname: string): {
  fallback: string;
  title: string;
} {
  if (pathname.startsWith("/journal/a-voir")) {
    return { fallback: "/journal", title: "À voir" };
  }
  if (pathname.startsWith("/journal/vus")) {
    return { fallback: "/journal", title: "Vus" };
  }
  if (pathname.startsWith("/journal/notes")) {
    return { fallback: "/journal", title: "Notés" };
  }
  if (pathname.startsWith("/journal/avis")) {
    return { fallback: "/journal", title: "Mes avis" };
  }
  if (/^\/journal\/listes\/[^/]+/u.test(pathname)) {
    return { fallback: "/journal/listes", title: "Liste" };
  }
  if (pathname.startsWith("/journal/listes")) {
    return { fallback: "/journal", title: "Mes listes" };
  }
  if (pathname.startsWith("/production/")) {
    return { fallback: "/search", title: "Spectacle" };
  }
  if (pathname.startsWith("/lieu/")) {
    return { fallback: "/search", title: "Lieu" };
  }
  if (pathname.startsWith("/compagnie/")) {
    return { fallback: "/search", title: "Compagnie" };
  }
  if (pathname.startsWith("/membre/")) {
    return { fallback: "/search", title: "Profil" };
  }
  if (pathname.startsWith("/parametres-compte")) {
    return { fallback: "/profile", title: "Paramètres" };
  }
  if (pathname.startsWith("/supprimer-mon-compte")) {
    return { fallback: "/parametres-compte", title: "Supprimer mon compte" };
  }
  if (pathname.startsWith("/confidentialite")) {
    return { fallback: "/", title: "Confidentialité" };
  }
  if (pathname.startsWith("/mentions-legales")) {
    return { fallback: "/", title: "Mentions légales" };
  }
  if (pathname.startsWith("/conditions-utilisation")) {
    return { fallback: "/", title: "Conditions d’utilisation" };
  }
  if (pathname.startsWith("/decouvrir")) {
    return { fallback: "/", title: "Découvrir" };
  }
  return { fallback: "/", title: "Todam" };
}

export function safeInternalPath(
  value: string | undefined,
  fallback = "/profile",
): string {
  const candidate = value?.trim();
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(candidate)
  ) {
    return fallback;
  }
  return candidate;
}

export function internalDestination(
  value: string | undefined,
  fallback = "/profile",
): { pathname: string; params: Record<string, string> } {
  const safePath = safeInternalPath(value, fallback);
  const parsed = new URL(safePath, "https://todam.invalid");
  return {
    pathname: parsed.pathname,
    params: Object.fromEntries(parsed.searchParams.entries()),
  };
}

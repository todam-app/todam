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

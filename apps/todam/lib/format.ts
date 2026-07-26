export function formatPerformance(startsAt: string, timezone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

export type AsyncPresentation = "loading" | "error" | "empty" | "content";

export function getAsyncPresentation(
  loading: boolean,
  hasError: boolean,
  itemCount: number,
): AsyncPresentation {
  if (loading) return "loading";
  if (hasError) return "error";
  if (itemCount === 0) return "empty";
  return "content";
}

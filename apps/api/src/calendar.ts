export function currentFrenchCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric",
  }).format(now);
}

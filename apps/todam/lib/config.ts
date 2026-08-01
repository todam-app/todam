export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const PUBLIC_WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, "") ??
  process.env.PUBLIC_WEB_URL?.replace(/\/$/, "") ??
  "https://todam.fr";

const requiredProductionVariables = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "WEB_APP_URL",
  "PUBLIC_WEB_URL",
  "BREVO_API_KEY",
  "EMAIL_FROM",
] as const;

export function assertProductionConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = requiredProductionVariables.filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(`Configuration de production incomplète : ${missing.join(", ")}.`);
  }

  const secret = process.env.BETTER_AUTH_SECRET!;
  if (secret.length < 32 || secret.includes("development-only")) {
    throw new Error(
      "BETTER_AUTH_SECRET doit être un secret aléatoire d'au moins 32 caractères.",
    );
  }
  for (const name of ["BETTER_AUTH_URL", "WEB_APP_URL", "PUBLIC_WEB_URL"] as const) {
    if (!process.env[name]!.startsWith("https://")) {
      throw new Error(`${name} doit utiliser HTTPS en production.`);
    }
  }
  if (
    process.env.WEB_APP_URL!.replace(/\/$/, "") !==
    process.env.PUBLIC_WEB_URL!.replace(/\/$/, "")
  ) {
    throw new Error("WEB_APP_URL et PUBLIC_WEB_URL doivent désigner la même origine.");
  }
}

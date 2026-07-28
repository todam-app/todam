import { readFile } from "node:fs/promises";

const requiredProductionVariables = [
  "LEGAL_OPERATOR_NAME",
  "PRIMARY_HOST_NAME",
  "PRIMARY_HOST_ADDRESS",
  "PRIMARY_HOST_PHONE",
  "PRIMARY_HOST_URL",
  "OBJECT_HOST_NAME",
  "OBJECT_HOST_ADDRESS",
  "OBJECT_HOST_URL",
  "PUBLIC_WEB_URL",
  "BREVO_API_KEY",
  "EMAIL_FROM",
  "EXPO_PUBLIC_WEB_URL",
  "EXPO_PUBLIC_API_URL",
  "EXPO_PUBLIC_LEGAL_OPERATOR_NAME",
  "EXPO_PUBLIC_PRIMARY_HOST_NAME",
  "EXPO_PUBLIC_PRIMARY_HOST_ADDRESS",
  "EXPO_PUBLIC_PRIMARY_HOST_PHONE",
  "EXPO_PUBLIC_PRIMARY_HOST_URL",
  "EXPO_PUBLIC_OBJECT_HOST_NAME",
  "EXPO_PUBLIC_OBJECT_HOST_ADDRESS",
  "EXPO_PUBLIC_OBJECT_HOST_URL",
];

const documents = [
  ["docs/legal/conditions-utilisation-v1.0.2.md", "1.0.2", "28 juillet 2026"],
  ["docs/legal/confidentialite-v1.0.3.md", "1.0.3", "28 juillet 2026"],
  ["docs/legal/mentions-legales-v1.0.0.md", "1.0.0", "26 juillet 2026"],
  ["docs/legal/suppression-compte-v1.0.2.md", "1.0.2", "28 juillet 2026"],
];

const forbiddenPublisherMarkers = [
  "{{LEGAL_SIREN}}",
  "{{LEGAL_SIRET}}",
  "{{LEGAL_RNE_REGISTRATION_DATE}}",
  "{{LEGAL_ACTIVITY_START_DATE}}",
  "{{LEGAL_LEGAL_FORM}}",
  "{{LEGAL_ACTIVITY}}",
  "{{LEGAL_APE}}",
  "{{LEGAL_ADDRESS}}",
  "{{LEGAL_PHONE}}",
  "entrepreneur individuel",
  "entreprise individuelle",
  "SIREN",
  "SIRET",
  "forme juridique",
  "activité principale",
  "Adresse :",
  "Téléphone :",
];

for (const [document, version, effectiveDate] of documents) {
  const contents = await readFile(document, "utf8");
  if (!contents.includes(`Version ${version}`)) {
    throw new Error(`${document} ne contient pas sa version attendue.`);
  }
  if (!contents.includes(`Date d'effet : ${effectiveDate}`)) {
    throw new Error(`${document} ne contient pas la date d'effet attendue.`);
  }
  const forbidden = forbiddenPublisherMarkers.find((marker) =>
    contents.toLocaleLowerCase("fr").includes(marker.toLocaleLowerCase("fr")),
  );
  if (forbidden) {
    throw new Error(
      `${document} réintroduit une information professionnelle ou personnelle interdite : ${forbidden}.`,
    );
  }
  for (const abbreviation of ["RNE", "APE"]) {
    const pattern = new RegExp(`\\b${abbreviation}\\b`, "iu");
    if (pattern.test(contents)) {
      throw new Error(
        `${document} réintroduit une information professionnelle interdite : ${abbreviation}.`,
      );
    }
  }
  if (/\b\d{5}\b/u.test(contents)) {
    throw new Error(
      `${document} contient un code postal en clair susceptible de publier une adresse personnelle.`,
    );
  }
  if (/(?:\+33|0)[ .-]?[1-9](?:[ .-]?\d{2}){4}/u.test(contents)) {
    throw new Error(
      `${document} contient un numéro en clair susceptible de publier un téléphone personnel.`,
    );
  }
}

const notices = await readFile("docs/legal/mentions-legales-v1.0.0.md", "utf8");
for (const marker of [
  "{{LEGAL_OPERATOR_NAME}}",
  "à titre non professionnel",
  "{{PRIMARY_HOST_NAME}}",
  "{{PRIMARY_HOST_ADDRESS}}",
  "{{PRIMARY_HOST_PHONE}}",
  "{{PRIMARY_HOST_URL}}",
  "{{OBJECT_HOST_NAME}}",
  "{{OBJECT_HOST_ADDRESS}}",
  "{{OBJECT_HOST_URL}}",
]) {
  if (!notices.includes(marker)) {
    throw new Error(`Les mentions légales doivent contenir ${marker}.`);
  }
}

if (process.env.LEGAL_RELEASE_READY === "true") {
  const missing = requiredProductionVariables.filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `Publication juridique bloquée. Variables manquantes : ${missing.join(", ")}.`,
    );
  }
  if (process.env.PUBLIC_WEB_URL?.replace(/\/$/, "") !== "https://todam.fr") {
    throw new Error("PUBLIC_WEB_URL doit être https://todam.fr pour le lancement.");
  }
  if (
    process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, "") !==
    process.env.PUBLIC_WEB_URL?.replace(/\/$/, "")
  ) {
    throw new Error("EXPO_PUBLIC_WEB_URL et PUBLIC_WEB_URL doivent être identiques.");
  }

  const matchingValues = [
    ["LEGAL_OPERATOR_NAME", "EXPO_PUBLIC_LEGAL_OPERATOR_NAME"],
    ["PRIMARY_HOST_NAME", "EXPO_PUBLIC_PRIMARY_HOST_NAME"],
    ["PRIMARY_HOST_ADDRESS", "EXPO_PUBLIC_PRIMARY_HOST_ADDRESS"],
    ["PRIMARY_HOST_PHONE", "EXPO_PUBLIC_PRIMARY_HOST_PHONE"],
    ["PRIMARY_HOST_URL", "EXPO_PUBLIC_PRIMARY_HOST_URL"],
    ["OBJECT_HOST_NAME", "EXPO_PUBLIC_OBJECT_HOST_NAME"],
    ["OBJECT_HOST_ADDRESS", "EXPO_PUBLIC_OBJECT_HOST_ADDRESS"],
    ["OBJECT_HOST_URL", "EXPO_PUBLIC_OBJECT_HOST_URL"],
  ];
  for (const [serverName, publicName] of matchingValues) {
    if (process.env[serverName] !== process.env[publicName]) {
      throw new Error(`${serverName} et ${publicName} doivent être identiques.`);
    }
  }
}

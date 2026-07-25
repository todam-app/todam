import { readFile } from "node:fs/promises";

const requiredProductionVariables = [
  "LEGAL_OPERATOR_NAME",
  "LEGAL_SIREN",
  "LEGAL_SIRET",
  "LEGAL_RNE_REGISTRATION_DATE",
  "LEGAL_ACTIVITY_START_DATE",
  "LEGAL_LEGAL_FORM",
  "LEGAL_ACTIVITY",
  "LEGAL_APE",
  "LEGAL_ADDRESS",
  "LEGAL_PHONE",
  "MEDIATOR_NAME",
  "MEDIATOR_ADDRESS",
  "MEDIATOR_URL",
  "PRIMARY_HOST_NAME",
  "PRIMARY_HOST_ADDRESS",
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
  "EXPO_PUBLIC_LEGAL_SIREN",
  "EXPO_PUBLIC_LEGAL_SIRET",
  "EXPO_PUBLIC_LEGAL_RNE_REGISTRATION_DATE",
  "EXPO_PUBLIC_LEGAL_ACTIVITY_START_DATE",
  "EXPO_PUBLIC_LEGAL_LEGAL_FORM",
  "EXPO_PUBLIC_LEGAL_ACTIVITY",
  "EXPO_PUBLIC_LEGAL_APE",
  "EXPO_PUBLIC_LEGAL_ADDRESS",
  "EXPO_PUBLIC_LEGAL_PHONE",
  "EXPO_PUBLIC_MEDIATOR_NAME",
  "EXPO_PUBLIC_MEDIATOR_ADDRESS",
  "EXPO_PUBLIC_MEDIATOR_URL",
  "EXPO_PUBLIC_PRIMARY_HOST_NAME",
  "EXPO_PUBLIC_PRIMARY_HOST_ADDRESS",
  "EXPO_PUBLIC_PRIMARY_HOST_URL",
  "EXPO_PUBLIC_OBJECT_HOST_NAME",
  "EXPO_PUBLIC_OBJECT_HOST_ADDRESS",
  "EXPO_PUBLIC_OBJECT_HOST_URL",
];

const documents = [
  "docs/legal/conditions-utilisation-v1.0.0.md",
  "docs/legal/confidentialite-v1.0.0.md",
  "docs/legal/mentions-legales-v1.0.0.md",
  "docs/legal/suppression-compte-v1.0.0.md",
];

for (const document of documents) {
  const contents = await readFile(document, "utf8");
  if (!contents.includes("Version 1.0.0")) {
    throw new Error(`${document} ne contient pas sa version attendue.`);
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
    ["LEGAL_SIREN", "EXPO_PUBLIC_LEGAL_SIREN"],
    ["LEGAL_SIRET", "EXPO_PUBLIC_LEGAL_SIRET"],
    ["LEGAL_RNE_REGISTRATION_DATE", "EXPO_PUBLIC_LEGAL_RNE_REGISTRATION_DATE"],
    ["LEGAL_ACTIVITY_START_DATE", "EXPO_PUBLIC_LEGAL_ACTIVITY_START_DATE"],
    ["LEGAL_LEGAL_FORM", "EXPO_PUBLIC_LEGAL_LEGAL_FORM"],
    ["LEGAL_ACTIVITY", "EXPO_PUBLIC_LEGAL_ACTIVITY"],
    ["LEGAL_APE", "EXPO_PUBLIC_LEGAL_APE"],
    ["LEGAL_ADDRESS", "EXPO_PUBLIC_LEGAL_ADDRESS"],
    ["LEGAL_PHONE", "EXPO_PUBLIC_LEGAL_PHONE"],
    ["MEDIATOR_NAME", "EXPO_PUBLIC_MEDIATOR_NAME"],
    ["MEDIATOR_ADDRESS", "EXPO_PUBLIC_MEDIATOR_ADDRESS"],
    ["MEDIATOR_URL", "EXPO_PUBLIC_MEDIATOR_URL"],
    ["PRIMARY_HOST_NAME", "EXPO_PUBLIC_PRIMARY_HOST_NAME"],
    ["PRIMARY_HOST_ADDRESS", "EXPO_PUBLIC_PRIMARY_HOST_ADDRESS"],
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

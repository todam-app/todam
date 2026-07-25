import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
} from "@todam/contracts";

import { legalMarkdown } from "./legal-generated";

export type LegalDocumentId = keyof typeof legalMarkdown;

const placeholderValues: Record<string, string> = {
  "{{LEGAL_OPERATOR_NAME}}":
    process.env.EXPO_PUBLIC_LEGAL_OPERATOR_NAME ??
    "[identité de l'entrepreneur à configurer avant publication]",
  "{{LEGAL_SIREN}}":
    process.env.EXPO_PUBLIC_LEGAL_SIREN ?? "[SIREN à configurer avant publication]",
  "{{LEGAL_SIRET}}":
    process.env.EXPO_PUBLIC_LEGAL_SIRET ?? "[SIRET à configurer avant publication]",
  "{{LEGAL_RNE_REGISTRATION_DATE}}":
    process.env.EXPO_PUBLIC_LEGAL_RNE_REGISTRATION_DATE ??
    "[date d'immatriculation au RNE à configurer avant publication]",
  "{{LEGAL_ACTIVITY_START_DATE}}":
    process.env.EXPO_PUBLIC_LEGAL_ACTIVITY_START_DATE ??
    "[date de début d'activité à configurer avant publication]",
  "{{LEGAL_LEGAL_FORM}}":
    process.env.EXPO_PUBLIC_LEGAL_LEGAL_FORM ??
    "[forme juridique à configurer avant publication]",
  "{{LEGAL_ACTIVITY}}":
    process.env.EXPO_PUBLIC_LEGAL_ACTIVITY ??
    "[activité principale à configurer avant publication]",
  "{{LEGAL_APE}}":
    process.env.EXPO_PUBLIC_LEGAL_APE ?? "[code APE à configurer avant publication]",
  "{{LEGAL_ADDRESS}}":
    process.env.EXPO_PUBLIC_LEGAL_ADDRESS ?? "[adresse à configurer avant publication]",
  "{{LEGAL_PHONE}}":
    process.env.EXPO_PUBLIC_LEGAL_PHONE ?? "[téléphone à configurer avant publication]",
  "{{MEDIATOR_NAME}}":
    process.env.EXPO_PUBLIC_MEDIATOR_NAME ??
    "[médiateur à configurer avant publication]",
  "{{MEDIATOR_ADDRESS}}":
    process.env.EXPO_PUBLIC_MEDIATOR_ADDRESS ??
    "[adresse du médiateur à configurer avant publication]",
  "{{MEDIATOR_URL}}":
    process.env.EXPO_PUBLIC_MEDIATOR_URL ??
    "[site du médiateur à configurer avant publication]",
  "{{PRIMARY_HOST_NAME}}": process.env.EXPO_PUBLIC_PRIMARY_HOST_NAME ?? "OVH SAS",
  "{{PRIMARY_HOST_ADDRESS}}":
    process.env.EXPO_PUBLIC_PRIMARY_HOST_ADDRESS ??
    "2 rue Kellermann, 59100 Roubaix, France",
  "{{PRIMARY_HOST_URL}}":
    process.env.EXPO_PUBLIC_PRIMARY_HOST_URL ?? "https://www.ovhcloud.com",
  "{{OBJECT_HOST_NAME}}":
    process.env.EXPO_PUBLIC_OBJECT_HOST_NAME ?? "Cloudflare, Inc.",
  "{{OBJECT_HOST_ADDRESS}}":
    process.env.EXPO_PUBLIC_OBJECT_HOST_ADDRESS ??
    "[adresse contractuelle Cloudflare à vérifier avant publication]",
  "{{OBJECT_HOST_URL}}":
    process.env.EXPO_PUBLIC_OBJECT_HOST_URL ?? "https://www.cloudflare.com",
};

export function legalDocumentMarkdown(id: LegalDocumentId): string {
  let document: string = legalMarkdown[id];
  for (const [placeholder, value] of Object.entries(placeholderValues)) {
    document = document.replaceAll(placeholder, value);
  }
  return document;
}

export function legalPdfUrl(id: LegalDocumentId): string {
  const base = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://todam.fr").replace(
    /\/$/,
    "",
  );
  const filenames: Record<LegalDocumentId, string> = {
    terms: `cgu-todam-v${CURRENT_TERMS_VERSION}.pdf`,
    privacy: `confidentialite-todam-v${CURRENT_PRIVACY_NOTICE_VERSION}.pdf`,
    notices: "mentions-legales-todam-v1.0.0.pdf",
    deletion: "suppression-compte-todam-v1.0.0.pdf",
  };
  return `${base}/legal/${filenames[id]}`;
}

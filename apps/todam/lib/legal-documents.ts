import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
} from "@todam/contracts";

import { legalMarkdown } from "./legal-generated";

export type LegalDocumentId = keyof typeof legalMarkdown;

const placeholderValues: Record<string, string> = {
  "{{LEGAL_OPERATOR_NAME}}":
    process.env.EXPO_PUBLIC_LEGAL_OPERATOR_NAME ??
    "[nom de l'éditeur à configurer avant publication]",
  "{{PRIMARY_HOST_NAME}}": process.env.EXPO_PUBLIC_PRIMARY_HOST_NAME ?? "OVH SAS",
  "{{PRIMARY_HOST_ADDRESS}}":
    process.env.EXPO_PUBLIC_PRIMARY_HOST_ADDRESS ??
    "2 rue Kellermann, 59100 Roubaix, France",
  "{{PRIMARY_HOST_PHONE}}":
    process.env.EXPO_PUBLIC_PRIMARY_HOST_PHONE ??
    "[téléphone de l'hébergeur à vérifier avant publication]",
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

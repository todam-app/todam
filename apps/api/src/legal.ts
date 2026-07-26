import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_EFFECTIVE_DATE,
  type LegalCurrentResponse,
} from "@todam/contracts";

export function publicWebUrl(): string {
  return (process.env.PUBLIC_WEB_URL ?? "https://todam.fr").replace(/\/$/, "");
}

export function currentLegalDocuments(): LegalCurrentResponse {
  const baseUrl = publicWebUrl();
  return {
    terms: {
      version: CURRENT_TERMS_VERSION,
      effectiveDate: LEGAL_EFFECTIVE_DATE,
      url: `${baseUrl}/conditions-utilisation`,
      pdfUrl: `${baseUrl}/legal/cgu-todam-v${CURRENT_TERMS_VERSION}.pdf`,
    },
    privacyNotice: {
      version: CURRENT_PRIVACY_NOTICE_VERSION,
      effectiveDate: LEGAL_EFFECTIVE_DATE,
      url: `${baseUrl}/confidentialite`,
      pdfUrl: `${baseUrl}/legal/confidentialite-todam-v${CURRENT_PRIVACY_NOTICE_VERSION}.pdf`,
    },
  };
}

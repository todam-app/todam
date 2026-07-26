import type { TransactionalEmail } from "@todam/domain";

const color = {
  accent: "#C43D28",
  background: "#F7F3EC",
  border: "#D8D1C6",
  ink: "#151515",
  muted: "#6F6B64",
  surface: "#FFFDF8",
} as const;

interface EmailFrame {
  content: string;
  eyebrow: string;
  preheader: string;
  publicWebUrl: string;
  title: string;
}

export interface VerificationEmailInput {
  displayName: string;
  publicWebUrl: string;
  verificationUrl: string;
}

export interface WelcomeEmailInput {
  displayName: string;
  privacyNotice: {
    pdfUrl: string;
    version: string;
  };
  profileUrl: string;
  publicWebUrl: string;
  terms: {
    acceptedAt: Date;
    pdfUrl: string;
    version: string;
  };
}

type AuthEmailContent = Omit<TransactionalEmail, "to">;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeDisplayName(value: string): string {
  return value.replace(/\s+/gu, " ").trim() || "toi";
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/u, "")}/${path.replace(/^\/+/u, "")}`;
}

function formatLegalDate(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    timeZone: "UTC",
    timeZoneName: "short",
    year: "numeric",
  }).format(value);
}

function renderButton(label: string, url: string): string {
  const safeLabel = escapeHtml(label);
  const safeUrl = escapeHtml(url);

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="button-table" style="border-collapse:separate;margin:0;">
      <tr>
        <td align="center" bgcolor="${color.accent}" style="border-radius:12px;background:${color.accent};">
          <a href="${safeUrl}" class="button-link" style="border:1px solid ${color.accent};border-radius:12px;color:${color.surface};display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:20px;padding:14px 24px;text-align:center;text-decoration:none;">${safeLabel}</a>
        </td>
      </tr>
    </table>`;
}

function renderEmailFrame({
  content,
  eyebrow,
  preheader,
  publicWebUrl,
  title,
}: EmailFrame): string {
  const logoUrl = joinUrl(publicWebUrl, "/email/todam-logo.png");
  const safeLogoUrl = escapeHtml(logoUrl);
  const safePreheader = escapeHtml(preheader);
  const safePublicWebUrl = escapeHtml(publicWebUrl);

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(title)}</title>
    <style>
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; }
      table { border-collapse: collapse !important; }
      body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
      @media screen and (max-width: 620px) {
        .outer-cell { padding: 12px 8px !important; }
        .content-cell { padding: 30px 22px 26px !important; }
        .email-title { font-size: 32px !important; line-height: 37px !important; }
        .button-table { width: 100% !important; }
        .button-link { box-sizing: border-box !important; display: block !important; width: 100% !important; }
      }
    </style>
    <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
    <![endif]-->
  </head>
  <body style="background:${color.background};margin:0;padding:0;">
    <div style="display:none;font-size:1px;color:${color.background};line-height:1px;font-family:Arial,Helvetica,sans-serif;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePreheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${color.background};width:100%;">
      <tr>
        <td align="center" class="outer-cell" style="padding:28px 12px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background:${color.surface};border:1px solid ${color.border};border-collapse:separate !important;border-radius:14px;max-width:600px;overflow:hidden;width:100%;">
            <tr>
              <td class="content-cell" style="padding:42px 48px 36px;">
                <a href="${safePublicWebUrl}" style="display:inline-block;text-decoration:none;">
                  <img src="${safeLogoUrl}" width="152" height="46" alt="Todam" style="border:0;color:${color.ink};display:block;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;height:auto;line-height:46px;max-width:152px;outline:none;text-decoration:none;width:152px;">
                </a>
                <div style="background:${color.accent};border-radius:999px;height:4px;margin:32px 0 22px;width:46px;"></div>
                <p style="color:${color.accent};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:1.4px;line-height:18px;margin:0 0 10px;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 class="email-title" style="color:${color.ink};font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:700;letter-spacing:-0.6px;line-height:44px;margin:0 0 26px;">${escapeHtml(title)}</h1>
                ${content}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid ${color.border};padding:22px 48px 24px;">
                <p style="color:${color.muted};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;margin:0;">
                  <strong style="color:${color.ink};">Todam</strong> — Mon journal de spectacles<br>
                  E-mail transactionnel envoyé par <a href="${safePublicWebUrl}" style="color:${color.accent};text-decoration:underline;">todam.fr</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function createVerificationEmail(
  input: VerificationEmailInput,
): AuthEmailContent {
  const displayName = normalizeDisplayName(input.displayName);
  const safeDisplayName = escapeHtml(displayName);
  const safeVerificationUrl = escapeHtml(input.verificationUrl);
  const preheader = "Active ton compte en un clic. Ce lien est valable 24 heures.";
  const subject = "Confirme ton adresse e-mail — Todam";

  const content = `
    <p style="color:${color.ink};font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:27px;margin:0 0 14px;">Bonjour <strong>${safeDisplayName}</strong>,</p>
    <p style="color:${color.ink};font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:27px;margin:0 0 24px;">Plus qu’une étape pour rejoindre Todam : confirme ton adresse e-mail et commence ton journal de spectacles.</p>
    ${renderButton("Confirmer mon adresse", input.verificationUrl)}
    <p style="color:${color.muted};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;margin:16px 0 0;">Ce lien est valable pendant 24 heures.</p>
    <div style="border-top:1px solid ${color.border};margin:30px 0 0;padding:24px 0 0;">
      <p style="color:${color.muted};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;margin:0 0 10px;">Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :</p>
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;margin:0;overflow-wrap:anywhere;word-break:break-all;"><a href="${safeVerificationUrl}" style="color:${color.accent};text-decoration:underline;">${safeVerificationUrl}</a></p>
    </div>
    <p style="color:${color.muted};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;margin:24px 0 0;">Tu n’as pas créé de compte Todam ? Tu peux ignorer cet e-mail en toute sécurité.</p>`;

  return {
    html: renderEmailFrame({
      content,
      eyebrow: "Plus qu’une étape",
      preheader,
      publicWebUrl: input.publicWebUrl,
      title: "Ton journal t’attend.",
    }),
    subject,
    text:
      `Bonjour ${displayName},\n\n` +
      "Plus qu'une étape pour rejoindre Todam : confirme ton adresse e-mail et commence ton journal de spectacles.\n\n" +
      `Confirmer mon adresse : ${input.verificationUrl}\n\n` +
      "Ce lien est valable pendant 24 heures.\n\n" +
      "Tu n'as pas créé de compte Todam ? Tu peux ignorer cet e-mail en toute sécurité.",
  };
}

export function createWelcomeEmail(input: WelcomeEmailInput): AuthEmailContent {
  const displayName = normalizeDisplayName(input.displayName);
  const safeDisplayName = escapeHtml(displayName);
  const acceptedAt = formatLegalDate(input.terms.acceptedAt);
  const preheader = "Ton compte est actif. Ton journal de spectacles peut commencer.";
  const subject = `Bienvenue sur Todam, ${displayName} !`;

  const steps = [
    ["01", "Choisis ta ville", "Découvre les spectacles qui se jouent près de toi."],
    ["02", "Garde tes envies", "Ajoute les spectacles qui t’attirent à « À voir »."],
    ["03", "Construis ton journal", "Note tes sorties et retrouve ton histoire."],
  ]
    .map(
      ([number, title, description]) => `
        <tr>
          <td valign="top" style="color:${color.accent};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;line-height:20px;padding:0 14px 16px 0;width:28px;">${number}</td>
          <td valign="top" style="padding:0 0 16px;">
            <p style="color:${color.ink};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:21px;margin:0 0 2px;">${title}</p>
            <p style="color:${color.muted};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;margin:0;">${description}</p>
          </td>
        </tr>`,
    )
    .join("");

  const content = `
    <p style="color:${color.ink};font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:27px;margin:0 0 14px;">Bonjour <strong>${safeDisplayName}</strong>,</p>
    <p style="color:${color.ink};font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:27px;margin:0 0 24px;">Ton compte est actif. À toi de garder une trace des spectacles vus, de ceux qui t’attendent et de toutes tes envies de scène.</p>
    ${renderButton("Ouvrir mon journal", input.profileUrl)}
    <div style="border-top:1px solid ${color.border};margin:34px 0 0;padding:30px 0 8px;">
      <p style="color:${color.accent};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:1.4px;line-height:18px;margin:0 0 18px;text-transform:uppercase;">Pour commencer</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
        ${steps}
      </table>
    </div>
    <div style="background:${color.background};border:1px solid ${color.border};border-radius:12px;margin:24px 0 0;padding:22px;">
      <p style="color:${color.ink};font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;line-height:26px;margin:0 0 13px;">Tes documents d’inscription</p>
      <p style="color:${color.muted};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;margin:0 0 7px;">CGU version ${escapeHtml(input.terms.version)} acceptées le ${escapeHtml(acceptedAt)}.</p>
      <p style="color:${color.muted};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;margin:0 0 14px;">Politique de confidentialité version ${escapeHtml(input.privacyNotice.version)} présentée lors de l’inscription.</p>
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;margin:0;">
        <a href="${escapeHtml(input.terms.pdfUrl)}" style="color:${color.accent};font-weight:700;text-decoration:underline;">Télécharger les CGU</a>
        <span style="color:${color.border};padding:0 7px;">•</span>
        <a href="${escapeHtml(input.privacyNotice.pdfUrl)}" style="color:${color.accent};font-weight:700;text-decoration:underline;">Consulter la politique</a>
      </p>
    </div>`;

  return {
    html: renderEmailFrame({
      content,
      eyebrow: "Compte activé",
      preheader,
      publicWebUrl: input.publicWebUrl,
      title: "Bienvenue dans ton journal de spectacles.",
    }),
    subject,
    text:
      `Bonjour ${displayName},\n\n` +
      "Ton compte est actif. À toi de garder une trace des spectacles vus, de ceux qui t'attendent et de toutes tes envies de scène.\n\n" +
      `Ouvrir mon journal : ${input.profileUrl}\n\n` +
      "Pour commencer :\n" +
      "1. Choisis ta ville pour découvrir les spectacles près de toi.\n" +
      "2. Ajoute les spectacles qui t'attirent à « À voir ».\n" +
      "3. Note tes sorties et construis ton journal.\n\n" +
      "Tes documents d'inscription :\n" +
      `CGU version ${input.terms.version} acceptées le ${acceptedAt}.\n` +
      `Archive des CGU : ${input.terms.pdfUrl}\n` +
      `Politique de confidentialité version ${input.privacyNotice.version} présentée lors de l'inscription.\n` +
      `Archive de la politique : ${input.privacyNotice.pdfUrl}`,
  };
}

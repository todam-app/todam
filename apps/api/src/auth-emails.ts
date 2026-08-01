import type { TransactionalEmail } from "@todam/domain";

const color = {
  aquaText: "#176C68",
  background: "#FCF8F2",
  border: "#E2D9CD",
  brandSignal: "#ED2215",
  brandText: "#D9271A",
  error: "#A1261A",
  ink: "#151515",
  lilacText: "#6651B8",
  muted: "#6F6B64",
  surface: "#FFFDF8",
} as const;

const emailFont = {
  sans: "'Work Sans',Arial,Helvetica,sans-serif",
  serif: "'Playfair Display',Georgia,'Times New Roman',serif",
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

export type EmailChangeVerificationInput = VerificationEmailInput;

export interface PasswordResetEmailInput {
  displayName: string;
  publicWebUrl: string;
  resetUrl: string;
}

export interface AccountDeletionEmailInput {
  deletionUrl: string;
  displayName: string;
  publicWebUrl: string;
}

export interface EmailChangeRequestedInput {
  displayName: string;
  newEmail: string;
  publicWebUrl: string;
  securityUrl: string;
}

export interface WelcomeEmailInput {
  displayName: string;
  journalUrl: string;
  privacyNotice: {
    pdfUrl: string;
    version: string;
  };
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

function renderButton(
  label: string,
  url: string,
  variant: "danger" | "primary" = "primary",
): string {
  const safeLabel = escapeHtml(label);
  const safeUrl = escapeHtml(url);
  const background = variant === "danger" ? color.error : color.ink;

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="button-table" style="border-collapse:separate;margin:0;">
      <tr>
        <td align="center" bgcolor="${background}" style="border-radius:10px;background:${background};">
          <a href="${safeUrl}" class="button-link" style="border:1px solid ${background};border-radius:10px;color:${color.surface};display:inline-block;font-family:${emailFont.sans};font-size:16px;font-weight:600;line-height:20px;padding:14px 24px;text-align:center;text-decoration:none;">${safeLabel}</a>
        </td>
      </tr>
    </table>`;
}

function renderFallbackLink(url: string): string {
  const safeUrl = escapeHtml(url);

  return `
    <div style="border-top:1px solid ${color.border};margin:30px 0 0;padding:24px 0 0;">
      <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:0 0 10px;">Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :</p>
      <p style="font-family:${emailFont.sans};font-size:12px;line-height:19px;margin:0;overflow-wrap:anywhere;word-break:break-all;"><a href="${safeUrl}" style="color:${color.brandText};text-decoration:underline;">${safeUrl}</a></p>
    </div>`;
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
  const fontUrl = {
    playfairDisplay700: escapeHtml(
      joinUrl(publicWebUrl, "/fonts/playfair-display-latin-700-normal.woff2"),
    ),
    workSans400: escapeHtml(
      joinUrl(publicWebUrl, "/fonts/work-sans-latin-400-normal.woff2"),
    ),
    workSans600: escapeHtml(
      joinUrl(publicWebUrl, "/fonts/work-sans-latin-600-normal.woff2"),
    ),
    workSans700: escapeHtml(
      joinUrl(publicWebUrl, "/fonts/work-sans-latin-700-normal.woff2"),
    ),
    workSans800: escapeHtml(
      joinUrl(publicWebUrl, "/fonts/work-sans-latin-800-normal.woff2"),
    ),
  } as const;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(title)}</title>
    <style>
      @font-face {
        font-display: swap;
        font-family: 'Work Sans';
        font-style: normal;
        font-weight: 400;
        mso-font-alt: Arial;
        src: url('${fontUrl.workSans400}') format('woff2');
      }
      @font-face {
        font-display: swap;
        font-family: 'Work Sans';
        font-style: normal;
        font-weight: 600;
        mso-font-alt: Arial;
        src: url('${fontUrl.workSans600}') format('woff2');
      }
      @font-face {
        font-display: swap;
        font-family: 'Work Sans';
        font-style: normal;
        font-weight: 700;
        mso-font-alt: Arial;
        src: url('${fontUrl.workSans700}') format('woff2');
      }
      @font-face {
        font-display: swap;
        font-family: 'Work Sans';
        font-style: normal;
        font-weight: 800;
        mso-font-alt: Arial;
        src: url('${fontUrl.workSans800}') format('woff2');
      }
      @font-face {
        font-display: swap;
        font-family: 'Playfair Display';
        font-style: normal;
        font-weight: 700;
        mso-font-alt: Georgia;
        src: url('${fontUrl.playfairDisplay700}') format('woff2');
      }
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
      <style type="text/css">
        body, table, td, a, p, span {
          font-family: Arial, Helvetica, sans-serif !important;
        }
        .email-title, .email-serif {
          font-family: Georgia, 'Times New Roman', serif !important;
        }
      </style>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
    <![endif]-->
  </head>
  <body style="background:${color.background};font-family:${emailFont.sans};margin:0;padding:0;">
    <div style="display:none;font-size:1px;color:${color.background};line-height:1px;font-family:${emailFont.sans};max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePreheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${color.background};width:100%;">
      <tr>
        <td align="center" class="outer-cell" style="padding:28px 12px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background:${color.surface};border:1px solid ${color.border};border-collapse:separate !important;border-radius:18px;max-width:600px;overflow:hidden;width:100%;">
            <tr>
              <td class="content-cell" style="padding:42px 48px 36px;">
                <a href="${safePublicWebUrl}" style="display:inline-block;text-decoration:none;">
                  <img src="${safeLogoUrl}" width="152" height="46" alt="Todam" style="border:0;color:${color.ink};display:block;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;height:auto;line-height:46px;max-width:152px;outline:none;text-decoration:none;width:152px;">
                </a>
                <div style="background:${color.brandSignal};border-radius:999px;height:4px;margin:32px 0 22px;width:46px;"></div>
                <p style="color:${color.brandText};font-family:${emailFont.sans};font-size:12px;font-weight:800;letter-spacing:1.4px;line-height:18px;margin:0 0 10px;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 class="email-title" style="color:${color.ink};font-family:${emailFont.serif};font-size:38px;font-weight:700;letter-spacing:-0.6px;line-height:44px;margin:0 0 26px;">${escapeHtml(title)}</h1>
                ${content}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid ${color.border};padding:22px 48px 24px;">
                <p style="color:${color.muted};font-family:${emailFont.sans};font-size:12px;line-height:19px;margin:0;">
                  <strong style="color:${color.ink};">Todam</strong> — Ton journal de spectacles<br>
                  E-mail transactionnel envoyé par <a href="${safePublicWebUrl}" style="color:${color.brandText};text-decoration:underline;">todam.fr</a>
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
  const preheader = "Active ton compte en un clic. Ce lien est valable 24 heures.";
  const subject = "Confirme ton adresse e-mail — Todam";

  const content = `
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 14px;">Bonjour <strong>${safeDisplayName}</strong>,</p>
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 24px;">Plus qu’une étape pour rejoindre Todam : confirme ton adresse e-mail et commence ton journal de spectacles.</p>
    ${renderButton("Confirmer mon adresse", input.verificationUrl)}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:16px 0 0;">Ce lien est valable pendant 24 heures.</p>
    ${renderFallbackLink(input.verificationUrl)}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:24px 0 0;">Tu n’as pas créé de compte Todam ? Tu peux ignorer cet e-mail en toute sécurité.</p>`;

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

export function createEmailChangeVerificationEmail(
  input: EmailChangeVerificationInput,
): AuthEmailContent {
  const displayName = normalizeDisplayName(input.displayName);
  const safeDisplayName = escapeHtml(displayName);
  const securityUrl = joinUrl(input.publicWebUrl, "/mot-de-passe-oublie");
  const preheader =
    "Confirme cette nouvelle adresse pour l’utiliser sur ton compte Todam.";

  const content = `
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 14px;">Bonjour <strong>${safeDisplayName}</strong>,</p>
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 24px;">Confirme cette adresse pour terminer la modification de ton compte Todam. Ton ancienne adresse reste active jusqu’à cette confirmation.</p>
    ${renderButton("Confirmer ma nouvelle adresse", input.verificationUrl)}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:16px 0 0;">Ce lien est valable pendant 24 heures.</p>
    ${renderFallbackLink(input.verificationUrl)}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:24px 0 0;">Tu n’as pas demandé ce changement ? N’utilise pas ce lien et <a href="${escapeHtml(securityUrl)}" style="color:${color.brandText};font-weight:700;text-decoration:underline;">réinitialise ton mot de passe</a>.</p>`;

  return {
    html: renderEmailFrame({
      content,
      eyebrow: "Sécurité du compte",
      preheader,
      publicWebUrl: input.publicWebUrl,
      title: "Confirme ta nouvelle adresse e-mail.",
    }),
    subject: "Confirme ta nouvelle adresse e-mail — Todam",
    text:
      `Bonjour ${displayName},\n\n` +
      "Confirme cette adresse pour terminer la modification de ton compte Todam. Ton ancienne adresse reste active jusqu’à cette confirmation.\n\n" +
      `Confirmer ma nouvelle adresse : ${input.verificationUrl}\n\n` +
      "Ce lien est valable pendant 24 heures.\n\n" +
      `Tu n’as pas demandé ce changement ? N’utilise pas ce lien et réinitialise ton mot de passe : ${securityUrl}`,
  };
}

export function createPasswordResetEmail(
  input: PasswordResetEmailInput,
): AuthEmailContent {
  const displayName = normalizeDisplayName(input.displayName);
  const safeDisplayName = escapeHtml(displayName);
  const preheader =
    "Choisis un nouveau mot de passe. Ce lien est valable pendant une heure.";

  const content = `
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 14px;">Bonjour <strong>${safeDisplayName}</strong>,</p>
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 24px;">Une demande de réinitialisation a été faite pour ton compte Todam. Utilise ce lien pour choisir un nouveau mot de passe.</p>
    ${renderButton("Réinitialiser mon mot de passe", input.resetUrl)}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:16px 0 0;">Ce lien est valable pendant une heure.</p>
    ${renderFallbackLink(input.resetUrl)}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:24px 0 0;">Tu n’es pas à l’origine de cette demande ? Tu peux ignorer cet e-mail en toute sécurité.</p>`;

  return {
    html: renderEmailFrame({
      content,
      eyebrow: "Sécurité du compte",
      preheader,
      publicWebUrl: input.publicWebUrl,
      title: "Choisis un nouveau mot de passe.",
    }),
    subject: "Réinitialise ton mot de passe — Todam",
    text:
      `Bonjour ${displayName},\n\n` +
      "Une demande de réinitialisation a été faite pour ton compte Todam.\n\n" +
      `Réinitialiser mon mot de passe : ${input.resetUrl}\n\n` +
      "Ce lien est valable pendant une heure.\n\n" +
      "Tu n’es pas à l’origine de cette demande ? Tu peux ignorer cet e-mail en toute sécurité.",
  };
}

export function createAccountDeletionEmail(
  input: AccountDeletionEmailInput,
): AuthEmailContent {
  const displayName = normalizeDisplayName(input.displayName);
  const safeDisplayName = escapeHtml(displayName);
  const preheader = "Confirme la suppression de ton compte Todam dans les 24 heures.";

  const content = `
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 14px;">Bonjour <strong>${safeDisplayName}</strong>,</p>
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 24px;">Une demande de suppression a été faite pour ton compte Todam. Confirme-la uniquement si tu souhaites bien supprimer définitivement ton compte.</p>
    ${renderButton("Supprimer définitivement mon compte", input.deletionUrl, "danger")}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:16px 0 0;">Ce lien est valable pendant 24 heures.</p>
    ${renderFallbackLink(input.deletionUrl)}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:24px 0 0;">Tu n’es pas à l’origine de cette demande ? N’utilise pas ce lien : ton compte restera actif.</p>`;

  return {
    html: renderEmailFrame({
      content,
      eyebrow: "Suppression du compte",
      preheader,
      publicWebUrl: input.publicWebUrl,
      title: "Confirme ta demande de suppression.",
    }),
    subject: "Confirme la suppression de ton compte — Todam",
    text:
      `Bonjour ${displayName},\n\n` +
      "Une demande de suppression a été faite pour ton compte Todam. Confirme-la uniquement si tu souhaites bien supprimer définitivement ton compte.\n\n" +
      `Supprimer définitivement mon compte : ${input.deletionUrl}\n\n` +
      "Ce lien est valable pendant 24 heures.\n\n" +
      "Tu n’es pas à l’origine de cette demande ? N’utilise pas ce lien : ton compte restera actif.",
  };
}

export function createEmailChangeRequestedEmail(
  input: EmailChangeRequestedInput,
): AuthEmailContent {
  const displayName = normalizeDisplayName(input.displayName);
  const safeDisplayName = escapeHtml(displayName);
  const safeNewEmail = escapeHtml(input.newEmail.trim());
  const preheader =
    "Une demande de changement concerne l’adresse e-mail de ton compte Todam.";

  const content = `
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 14px;">Bonjour <strong>${safeDisplayName}</strong>,</p>
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 14px;">Une demande a été faite pour remplacer l’adresse e-mail de ton compte Todam par <strong>${safeNewEmail}</strong>.</p>
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 24px;">Ton adresse actuelle reste active tant que la nouvelle n’a pas été confirmée.</p>
    ${renderButton("Sécuriser mon compte", input.securityUrl)}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:16px 0 0;">Tu es à l’origine de cette demande ? Aucune action n’est nécessaire sur cette adresse.</p>
    ${renderFallbackLink(input.securityUrl)}
    <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:24px 0 0;">Tu n’as pas demandé ce changement ? Réinitialise immédiatement ton mot de passe.</p>`;

  return {
    html: renderEmailFrame({
      content,
      eyebrow: "Sécurité du compte",
      preheader,
      publicWebUrl: input.publicWebUrl,
      title: "Une nouvelle adresse a été demandée.",
    }),
    subject: "Demande de changement d’adresse e-mail — Todam",
    text:
      `Bonjour ${displayName},\n\n` +
      `Une demande a été faite pour remplacer l’adresse e-mail de ton compte Todam par ${input.newEmail.trim()}.\n\n` +
      "Ton adresse actuelle reste active tant que la nouvelle n’a pas été confirmée.\n\n" +
      `Sécuriser mon compte : ${input.securityUrl}\n\n` +
      "Tu es à l’origine de cette demande ? Aucune action n’est nécessaire sur cette adresse.\n\n" +
      "Tu n’as pas demandé ce changement ? Réinitialise immédiatement ton mot de passe.",
  };
}

export function createWelcomeEmail(input: WelcomeEmailInput): AuthEmailContent {
  const displayName = normalizeDisplayName(input.displayName);
  const safeDisplayName = escapeHtml(displayName);
  const acceptedAt = formatLegalDate(input.terms.acceptedAt);
  const preheader = "Ton compte est actif. Ton journal de spectacles peut commencer.";
  const subject = `Bienvenue sur Todam, ${displayName} !`;

  const steps = [
    {
      color: color.brandText,
      description: "Cherche un spectacle, un lieu ou une compagnie.",
      number: "01",
      title: "Découvre",
    },
    {
      color: color.lilacText,
      description: "Marque-le vu, précise la date et attribue une note.",
      number: "02",
      title: "Garde une trace",
    },
    {
      color: color.aquaText,
      description: "Publie ton journal, un avis ou une liste.",
      number: "03",
      title: "Partage",
    },
  ]
    .map(
      (step) => `
        <tr>
          <td valign="top" style="color:${step.color};font-family:${emailFont.sans};font-size:12px;font-weight:800;line-height:20px;padding:0 14px 16px 0;width:28px;">${step.number}</td>
          <td valign="top" style="padding:0 0 16px;">
            <p style="color:${color.ink};font-family:${emailFont.sans};font-size:15px;font-weight:700;line-height:21px;margin:0 0 2px;">${step.title}</p>
            <p style="color:${color.muted};font-family:${emailFont.sans};font-size:14px;line-height:21px;margin:0;">${step.description}</p>
          </td>
        </tr>`,
    )
    .join("");

  const content = `
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 14px;">Bonjour <strong>${safeDisplayName}</strong>,</p>
    <p style="color:${color.ink};font-family:${emailFont.sans};font-size:17px;line-height:27px;margin:0 0 24px;">Ton compte est actif. Note dans ton journal les spectacles que tu as vus, partage tes listes et découvre-en de nouveaux.</p>
    ${renderButton("Ouvrir mon journal", input.journalUrl)}
    <div style="border-top:1px solid ${color.border};margin:34px 0 0;padding:30px 0 8px;">
      <p style="color:${color.brandText};font-family:${emailFont.sans};font-size:12px;font-weight:800;letter-spacing:1.4px;line-height:18px;margin:0 0 18px;text-transform:uppercase;">Pour commencer</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
        ${steps}
      </table>
    </div>
    <div style="background:${color.background};border:1px solid ${color.border};border-radius:18px;margin:24px 0 0;padding:22px;">
      <p class="email-serif" style="color:${color.ink};font-family:${emailFont.serif};font-size:20px;font-weight:700;line-height:26px;margin:0 0 13px;">Tes documents d’inscription</p>
      <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:0 0 7px;">CGU version ${escapeHtml(input.terms.version)} acceptées le ${escapeHtml(acceptedAt)}.</p>
      <p style="color:${color.muted};font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:0 0 14px;">Politique de confidentialité version ${escapeHtml(input.privacyNotice.version)} présentée lors de l’inscription.</p>
      <p style="font-family:${emailFont.sans};font-size:13px;line-height:21px;margin:0;">
        <a href="${escapeHtml(input.terms.pdfUrl)}" style="color:${color.brandText};font-weight:700;text-decoration:underline;">Télécharger les CGU</a>
        <span style="color:${color.border};padding:0 7px;">•</span>
        <a href="${escapeHtml(input.privacyNotice.pdfUrl)}" style="color:${color.brandText};font-weight:700;text-decoration:underline;">Consulter la politique</a>
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
      "Ton compte est actif. Note dans ton journal les spectacles que tu as vus, partage tes listes et découvre-en de nouveaux.\n\n" +
      `Ouvrir mon journal : ${input.journalUrl}\n\n` +
      "Pour commencer :\n" +
      "1. Cherche un spectacle, un lieu ou une compagnie.\n" +
      "2. Marque-le vu, précise la date et attribue une note.\n" +
      "3. Publie ton journal, un avis ou une liste.\n\n" +
      "Tes documents d'inscription :\n" +
      `CGU version ${input.terms.version} acceptées le ${acceptedAt}.\n` +
      `Archive des CGU : ${input.terms.pdfUrl}\n` +
      `Politique de confidentialité version ${input.privacyNotice.version} présentée lors de l'inscription.\n` +
      `Archive de la politique : ${input.privacyNotice.pdfUrl}`,
  };
}

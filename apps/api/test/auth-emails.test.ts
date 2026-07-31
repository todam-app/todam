import { describe, expect, it } from "vitest";

import {
  createAccountDeletionEmail,
  createEmailChangeRequestedEmail,
  createEmailChangeVerificationEmail,
  createPasswordResetEmail,
  createVerificationEmail,
  createWelcomeEmail,
} from "../src/auth-emails.js";

describe("e-mails d'authentification Todam", () => {
  it("rend la confirmation en HTML et en texte sans injecter les valeurs dynamiques", () => {
    const email = createVerificationEmail({
      displayName: "Léa <Scène> & Co",
      publicWebUrl: "https://todam.fr",
      verificationUrl:
        "https://api.todam.fr/v1/auth/verify-email?token=secret&next=<journal>",
    });

    expect(email.subject).toBe("Confirme ton adresse e-mail — Todam");
    expect(email.text).toContain("Bonjour Léa <Scène> & Co");
    expect(email.text).toContain("Ce lien est valable pendant 24 heures.");
    expect(email.text).toContain(
      "https://api.todam.fr/v1/auth/verify-email?token=secret&next=<journal>",
    );
    expect(email.html).toContain(
      "Active ton compte en un clic. Ce lien est valable 24 heures.",
    );
    expect(email.html).toContain("Bonjour <strong>Léa &lt;Scène&gt; &amp; Co</strong>");
    expect(email.html).toContain(
      "https://api.todam.fr/v1/auth/verify-email?token=secret&amp;next=&lt;journal&gt;",
    );
    expect(email.html).toContain('src="https://todam.fr/email/todam-logo.png"');
    expect(email.html).toContain("Confirmer mon adresse");
    expect(email.html).not.toContain("Bonjour <strong>Léa <Scène>");
  });

  it("rend un accueil personnalisé avec les étapes et la preuve juridique", () => {
    const email = createWelcomeEmail({
      displayName: "  Léa   du Rideau  ",
      privacyNotice: {
        pdfUrl: "https://todam.fr/legal/confidentialite-todam-v1.0.2.pdf",
        version: "1.0.2",
      },
      journalUrl: "https://todam.fr/journal",
      publicWebUrl: "https://todam.fr",
      terms: {
        acceptedAt: new Date("2026-07-27T14:30:00.000Z"),
        pdfUrl: "https://todam.fr/legal/cgu-todam-v1.0.1.pdf",
        version: "1.0.1",
      },
    });

    expect(email.subject).toBe("Bienvenue sur Todam, Léa du Rideau !");
    expect(email.text).toContain("Bonjour Léa du Rideau");
    expect(email.text).toContain("27 juillet 2026");
    expect(email.text).toContain("https://todam.fr/journal");
    expect(email.html).toContain("Compte activé");
    expect(email.html).toContain("Bienvenue dans ton journal de spectacles.");
    expect(email.html).toContain(
      "Note dans ton journal les spectacles que tu as vus, partage tes listes et découvre-en de nouveaux.",
    );
    expect(email.text).toContain(
      "Note dans ton journal les spectacles que tu as vus, partage tes listes et découvre-en de nouveaux.",
    );
    expect(email.html).toContain("Découvre");
    expect(email.html).toContain("Garde une trace");
    expect(email.html).toContain("Partage");
    expect(email.html).toContain("Tes documents d’inscription");
    expect(email.html).toContain("CGU version 1.0.1 acceptées le 27 juillet 2026");
    expect(email.html).toContain('href="https://todam.fr/journal"');
  });

  it("distingue la confirmation d'une nouvelle adresse de l'inscription", () => {
    const email = createEmailChangeVerificationEmail({
      displayName: "Camille",
      publicWebUrl: "https://todam.fr",
      verificationUrl: "https://api.todam.fr/v1/auth/verify-email?token=change-email",
    });

    expect(email.subject).toBe("Confirme ta nouvelle adresse e-mail — Todam");
    expect(email.text).toContain("Ton ancienne adresse reste active");
    expect(email.html).toContain("Confirmer ma nouvelle adresse");
    expect(email.html).toContain("Sécurité du compte");
    expect(email.html).not.toContain("Ton journal t’attend");
  });

  it("conserve une mise en page éditoriale lisible sur les clients e-mail", () => {
    const html = createVerificationEmail({
      displayName: "Camille",
      publicWebUrl: "https://todam.fr/",
      verificationUrl: "https://api.todam.fr/verification",
    }).html;

    expect(html).toContain('width="600"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain(
      "font-family:'Playfair Display',Georgia,'Times New Roman',serif",
    );
    expect(html).toContain("font-family:'Work Sans',Arial,Helvetica,sans-serif");
    expect(html).toContain("@font-face");
    expect(html).toContain("mso-font-alt: Arial");
    expect(html).toContain("mso-font-alt: Georgia");
    expect(html).toContain(
      "https://todam.fr/fonts/playfair-display-latin-700-normal.woff2",
    );
    expect(html).toContain("https://todam.fr/fonts/work-sans-latin-400-normal.woff2");
    expect(html).toContain("https://todam.fr/fonts/work-sans-latin-600-normal.woff2");
    expect(html).toContain("https://todam.fr/fonts/work-sans-latin-700-normal.woff2");
    expect(html).toContain("https://todam.fr/fonts/work-sans-latin-800-normal.woff2");
    expect(html).toContain("font-family: Arial, Helvetica, sans-serif !important");
    expect(html).toContain("font-family: Georgia, 'Times New Roman', serif !important");
    expect(html).toContain("#FCF8F2");
    expect(html).toContain("#FFFDF8");
    expect(html).toContain("#151515");
    expect(html).toContain("#ED2215");
    expect(html).toContain("#D9271A");
    expect(html).toContain("border-radius:10px");
    expect(html).toContain("font-weight:600");
    expect(html).not.toContain("#C43D28");
    expect(html).toContain("@media screen and (max-width: 620px)");
    expect(html).toContain("width: 100% !important");
    expect(html).not.toContain("https://todam.fr//email/");
    expect(html).not.toContain("https://todam.fr//fonts/");
  });

  it("habille la réinitialisation du mot de passe avec le CTA principal", () => {
    const email = createPasswordResetEmail({
      displayName: "Camille <Rideau>",
      publicWebUrl: "https://todam.fr",
      resetUrl: "https://todam.fr/reinitialiser-mot-de-passe?token=secret&next=<profil>",
    });

    expect(email.subject).toBe("Réinitialise ton mot de passe — Todam");
    expect(email.text).toContain("Ce lien est valable pendant une heure.");
    expect(email.html).toContain("Réinitialiser mon mot de passe");
    expect(email.html).toContain("Camille &lt;Rideau&gt;");
    expect(email.html).toContain("background:#151515");
    expect(email.html).not.toContain("Réinitialisez");
  });

  it("rend la suppression avec le traitement danger et le tutoiement", () => {
    const email = createAccountDeletionEmail({
      deletionUrl: "https://todam.fr/suppression-compte?token=secret",
      displayName: "Camille",
      publicWebUrl: "https://todam.fr",
    });

    expect(email.subject).toBe("Confirme la suppression de ton compte — Todam");
    expect(email.text).toContain("ton compte restera actif");
    expect(email.html).toContain("Supprimer définitivement mon compte");
    expect(email.html).toContain("background:#A1261A");
    expect(email.html).toContain("Suppression du compte");
  });

  it("notifie l’ancienne adresse avec un accès de sécurisation", () => {
    const email = createEmailChangeRequestedEmail({
      displayName: "Camille",
      newEmail: "nouvelle+<scene>@example.test",
      publicWebUrl: "https://todam.fr",
      securityUrl: "https://todam.fr/mot-de-passe-oublie",
    });

    expect(email.subject).toBe("Demande de changement d’adresse e-mail — Todam");
    expect(email.text).toContain("https://todam.fr/mot-de-passe-oublie");
    expect(email.html).toContain("Sécuriser mon compte");
    expect(email.html).toContain("nouvelle+&lt;scene&gt;@example.test");
    expect(email.html).not.toContain("nouvelle+<scene>@example.test");
  });
});

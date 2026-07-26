import { describe, expect, it } from "vitest";

import { createVerificationEmail, createWelcomeEmail } from "../src/auth-emails.js";

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
        pdfUrl: "https://todam.fr/legal/confidentialite-v1.0.1.pdf",
        version: "1.0.1",
      },
      profileUrl: "https://todam.fr/profile",
      publicWebUrl: "https://todam.fr",
      terms: {
        acceptedAt: new Date("2026-07-26T14:30:00.000Z"),
        pdfUrl: "https://todam.fr/legal/cgu-v1.0.0.pdf",
        version: "1.0.0",
      },
    });

    expect(email.subject).toBe("Bienvenue sur Todam, Léa du Rideau !");
    expect(email.text).toContain("Bonjour Léa du Rideau");
    expect(email.text).toContain("26 juillet 2026");
    expect(email.text).toContain("https://todam.fr/profile");
    expect(email.html).toContain("Compte activé");
    expect(email.html).toContain("Bienvenue dans ton journal de spectacles.");
    expect(email.html).toContain("Choisis ta ville");
    expect(email.html).toContain("Ajoute les spectacles");
    expect(email.html).toContain("Tes documents d’inscription");
    expect(email.html).toContain("CGU version 1.0.0 acceptées le 26 juillet 2026");
    expect(email.html).toContain('href="https://todam.fr/profile"');
  });

  it("conserve une mise en page éditoriale lisible sur les clients e-mail", () => {
    const html = createVerificationEmail({
      displayName: "Camille",
      publicWebUrl: "https://todam.fr/",
      verificationUrl: "https://api.todam.fr/verification",
    }).html;

    expect(html).toContain('width="600"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain("Georgia,'Times New Roman',serif");
    expect(html).toContain("Arial,Helvetica,sans-serif");
    expect(html).toContain("#F7F3EC");
    expect(html).toContain("#FFFDF8");
    expect(html).toContain("#C43D28");
    expect(html).toContain("@media screen and (max-width: 620px)");
    expect(html).toContain("width: 100% !important");
    expect(html).not.toContain("https://todam.fr//email/");
  });
});

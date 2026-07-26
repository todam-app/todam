import {
  createEmailSenderFromEnvironment,
  type TransactionalEmail,
} from "@todam/domain";
import { describe, expect, it } from "vitest";

import {
  accountReportPeriodStart,
  buildAccountReportEmail,
  requireOperationsEmail,
  sendAccountReport,
} from "../src/account-report.js";

const generatedAt = new Date("2026-07-26T08:00:00.000Z");

function report(total: number): TransactionalEmail {
  return buildAccountReportEmail(
    {
      total,
      verified: Math.max(total - 10, 0),
      newLastSevenDays: Math.min(total, 12),
    },
    "operations@example.test",
    generatedAt,
  );
}

describe("rapport hebdomadaire des comptes", () => {
  it("retient une fenêtre exacte de sept jours", () => {
    expect(accountReportPeriodStart(generatedAt).toISOString()).toBe(
      "2026-07-19T08:00:00.000Z",
    );
  });

  it.each([
    { total: 0, toReview: 900, toProfessional: 1_000, warning: false },
    { total: 899, toReview: 1, toProfessional: 101, warning: false },
    { total: 900, toReview: 0, toProfessional: 100, warning: true },
    { total: 999, toReview: 0, toProfessional: 1, warning: true },
    { total: 1_000, toReview: 0, toProfessional: 0, warning: true },
  ])(
    "calcule les seuils pour $total comptes",
    ({ total, toReview, toProfessional, warning }) => {
      const message = report(total);

      expect(message.text).toContain(`Comptes totaux : ${total}`);
      expect(message.text).toContain(`Distance jusqu'à 900 comptes : ${toReview}`);
      expect(message.text).toContain(
        `Distance jusqu'à 1 000 comptes : ${toProfessional}`,
      );
      expect(message.text.includes("ALERTE :")).toBe(warning);
      expect(message.text.includes("SEUIL ATTEINT :")).toBe(total >= 1_000);
    },
  );

  it("inclut les comptes vérifiés et les nouveaux comptes sans donnée utilisateur", () => {
    const message = buildAccountReportEmail(
      { total: 40, verified: 31, newLastSevenDays: 8 },
      "operations@example.test",
      generatedAt,
    );

    expect(message.text).toContain("Comptes vérifiés : 31");
    expect(message.text).toContain("Nouveaux comptes sur 7 jours : 8");
    expect(message.text).not.toContain("pseudonyme");
    expect(message.text).not.toContain("adresse e-mail utilisateur");
  });

  it("échoue explicitement sans TODAM_OPERATIONS_EMAIL", () => {
    expect(() => requireOperationsEmail({})).toThrowError(
      /TODAM_OPERATIONS_EMAIL est obligatoire/,
    );
  });

  it("échoue explicitement lorsque Brevo n'est pas configuré", async () => {
    await expect(
      sendAccountReport(
        createEmailSenderFromEnvironment({}),
        { total: 0, verified: 0, newLastSevenDays: 0 },
        "operations@example.test",
        generatedAt,
      ),
    ).rejects.toThrowError(/BREVO_API_KEY et EMAIL_FROM/);
  });
});

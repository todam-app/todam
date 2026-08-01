import { describe, expect, it } from "vitest";

import {
  CatalogCandidateSchema,
  CreateCatalogRevisionBodySchema,
  CreateCompanyClaimBodySchema,
  CreateCompanyProductionBodySchema,
  ModerateContentReportBodySchema,
} from "./professional.js";

const companyId = "5aecf9f4-b9da-4da0-b8fa-8898e882d99f";

describe("contrats professionnels", () => {
  it("n’accepte que des URL HTTP ou HTTPS pour une revendication", () => {
    const valid = {
      representativeName: "Camille Martin",
      roleTitle: "Directrice artistique",
      professionalEmail: "direction@compagnie.example.test",
      officialWebsiteUrl: "https://compagnie.example.test",
      evidence:
        "Je représente officiellement cette compagnie et peux confirmer la demande depuis notre domaine.",
      authorityConfirmed: true,
    } as const;

    expect(CreateCompanyClaimBodySchema.parse(valid).officialWebsiteUrl).toBe(
      valid.officialWebsiteUrl,
    );
    expect(() =>
      CreateCompanyClaimBodySchema.parse({
        ...valid,
        officialWebsiteUrl: "javascript:alert(1)",
      }),
    ).toThrow();
  });

  it("refuse une provenance utilisant un protocole non affichable", () => {
    expect(() =>
      CreateCatalogRevisionBodySchema.parse({
        targetType: "company",
        targetId: companyId,
        justification: "Mise à jour de la présentation.",
        changes: [
          {
            field: "description",
            newValue: "Nouvelle présentation",
            provenanceUrl: "file:///document-interne.txt",
            rightsStatus: "permission_granted",
          },
        ],
      }),
    ).toThrow();
  });

  it("exige une décision motivée pour fermer un signalement", () => {
    expect(
      ModerateContentReportBodySchema.parse({
        decision: "La source officielle a été contrôlée avant la mise à jour publique.",
      }).decision,
    ).toContain("source officielle");
    expect(() =>
      ModerateContentReportBodySchema.parse({ decision: "Corrigé" }),
    ).toThrow();
  });

  it("autorise une URL officielle absente ou HTTPS pour un brouillon", () => {
    expect(
      CreateCompanyProductionBodySchema.parse({
        title: "Création pilote",
        discipline: "theatre",
        audience: "general",
        officialUrl: null,
      }).officialUrl,
    ).toBeNull();
    expect(() =>
      CreateCompanyProductionBodySchema.parse({
        title: "Création pilote",
        discipline: "theatre",
        audience: "general",
        officialUrl: "data:text/html,interdit",
      }),
    ).toThrow();
  });

  it("refuse les informations techniques concaténées dans le titre", () => {
    expect(() =>
      CreateCompanyProductionBodySchema.parse({
        title: "Création pilote — Compagnie Exemple",
        discipline: "theatre",
        audience: "general",
        officialUrl: null,
      }),
    ).toThrow();
  });

  it("décrit une fiche à relire avec ses contrôles et sa provenance", () => {
    expect(
      CatalogCandidateSchema.parse({
        id: companyId,
        targetType: "production",
        slug: "creation-pilote",
        label: "Création pilote",
        secondaryLabel: "Compagnie exemple",
        discipline: "theatre",
        publicationStatus: "draft",
        readinessIssues: ["description complète publiée"],
        sources: [
          {
            title: "Programme officiel",
            url: "https://compagnie.example.test/programme",
            retrievedAt: "2026-07-27T08:00:00.000Z",
            rightsStatus: "open_license",
            license: "CC0-1.0",
          },
        ],
        updatedAt: "2026-07-27T09:00:00.000Z",
        reviewedAt: null,
      }).publicationStatus,
    ).toBe("draft");
  });
});

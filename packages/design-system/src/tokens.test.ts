import { describe, expect, it } from "vitest";

import { tokens } from "./tokens.js";

function luminance(hex: string): number {
  const values = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((part) => Number.parseInt(part, 16) / 255)
    .map((value) =>
      value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
    );
  return 0.2126 * values[0]! + 0.7152 * values[1]! + 0.0722 * values[2]!;
}

function contrast(first: string, second: string): number {
  const light = Math.max(luminance(first), luminance(second));
  const dark = Math.min(luminance(first), luminance(second));
  return (light + 0.05) / (dark + 0.05);
}

describe("tokens accessibles", () => {
  it("conserve une cible tactile minimale de 44 px", () => {
    expect(tokens.minimumTouchTarget).toBeGreaterThanOrEqual(44);
  });

  it("garde le texte principal au niveau WCAG AA sur le fond", () => {
    expect(contrast(tokens.color.ink, tokens.color.background)).toBeGreaterThan(4.5);
  });

  it("garde le libellé du bouton destructif au niveau WCAG AA", () => {
    expect(contrast(tokens.color.surface, tokens.color.error)).toBeGreaterThan(4.5);
  });

  it("centralise les surfaces neutres selon leur rôle", () => {
    expect({
      background: tokens.color.background,
      surface: tokens.color.surface,
      placeholder: tokens.color.placeholder,
      disabled: tokens.color.disabled,
      border: tokens.color.border,
      selectedSurface: tokens.color.selectedSurface,
    }).toEqual({
      background: "#FCF8F2",
      surface: "#FFFDF8",
      placeholder: "#F0E9DF",
      disabled: "#E5E0D8",
      border: "#D8D1C6",
      selectedSurface: "#FCEFEA",
    });
  });

  it("conserve exactement la direction visuelle du bouton standard", () => {
    expect(tokens.button.standard).toEqual({
      background: "#FFFDF8",
      border: "#C43D28",
      borderWidth: 1,
      fontFamily: "Work Sans",
      fontWeight: "500",
      radius: 4,
      text: "#171412",
    });
  });

  it("centralise le bouton de service neutre", () => {
    expect(tokens.button.quiet).toEqual({
      background: "#FFFDF8",
      border: "#978F84",
      borderWidth: 1,
      fontFamily: "Work Sans",
      fontWeight: "500",
      radius: 4,
      text: "#171412",
    });
  });

  it("centralise le CTA vedette et conserve son contraste", () => {
    expect(tokens.button.featured).toEqual({
      background: "#151515",
      backgroundHover: "#C43D28",
      border: "#151515",
      borderWidth: 1,
      fontFamily: "Work Sans",
      fontWeight: "600",
      radius: 4,
      text: "#FFFDF8",
    });
    expect(
      contrast(tokens.button.featured.text, tokens.button.featured.background),
    ).toBeGreaterThan(4.5);
    expect(
      contrast(tokens.button.featured.text, tokens.button.featured.backgroundHover),
    ).toBeGreaterThan(4.5);
  });

  it("expose les accents éditoriaux, rayons et surfaces Web", () => {
    expect({
      coral: tokens.color.coral,
      lilac: tokens.color.lilac,
      aqua: tokens.color.aqua,
      panel: tokens.radius.panel,
      media: tokens.radius.media,
      glass: tokens.surface.glass,
      shadow: tokens.shadow.light,
    }).toEqual({
      coral: "#F3A995",
      lilac: "#C8B8F0",
      aqua: "#9FD8D0",
      panel: 12,
      media: 16,
      glass: "rgba(255, 253, 248, 0.82)",
      shadow: "0 10px 30px rgba(43, 34, 27, 0.10)",
    });
  });

  it("garde le bouton standard lisible et sa bordure perceptible", () => {
    expect(
      contrast(tokens.button.standard.text, tokens.button.standard.background),
    ).toBeCloseTo(18.04, 2);
    expect(
      contrast(tokens.button.standard.border, tokens.button.standard.background),
    ).toBeCloseTo(5.11, 2);
    expect(
      contrast(tokens.button.standard.border, tokens.color.background),
    ).toBeCloseTo(4.91, 2);
  });

  it("garde la bordure du bouton neutre perceptible sur les fonds Web", () => {
    expect(
      contrast(tokens.button.quiet.border, tokens.button.quiet.background),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrast(tokens.button.quiet.border, tokens.color.background),
    ).toBeGreaterThanOrEqual(3);
  });
});

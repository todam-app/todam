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
});

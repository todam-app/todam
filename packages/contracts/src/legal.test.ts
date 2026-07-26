import { describe, expect, it } from "vitest";

import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_TERMS_VERSION,
  SignUpBodySchema,
} from "./legal.js";

const validSignUp = {
  name: "spectatrice",
  username: "spectatrice",
  displayUsername: "spectatrice",
  email: "spectatrice@example.test",
  password: "Todam-test-2026",
  age15OrOlder: true,
  termsVersion: CURRENT_TERMS_VERSION,
  privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
  channel: "web",
};

describe("contrat d'inscription juridique", () => {
  it("exige la déclaration positive des 15 ans", () => {
    expect(SignUpBodySchema.safeParse(validSignUp).success).toBe(true);
    expect(
      SignUpBodySchema.safeParse({ ...validSignUp, age15OrOlder: false }).success,
    ).toBe(false);
    const { age15OrOlder: _age, ...missingAge } = validSignUp;
    expect(SignUpBodySchema.safeParse(missingAge).success).toBe(false);
  });

  it("limite le canal public au Web et à Android", () => {
    expect(
      SignUpBodySchema.safeParse({
        ...validSignUp,
        channel: "ios",
      }).success,
    ).toBe(false);
  });
});

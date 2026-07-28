import { z } from "zod";

export const UsernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(
    /^[\p{L}\p{N}._-]+$/u,
    "Le pseudonyme peut contenir des lettres, chiffres, points, tirets et underscores.",
  );

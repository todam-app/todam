import { z } from "zod";

export const RightsStatusSchema = z.enum([
  "review_required",
  "factual_metadata_only",
  "permission_granted",
  "open_license",
  "contractual_display",
  "hotlink_only",
  "todam_original",
  "community_submission",
]);
export type RightsStatus = z.infer<typeof RightsStatusSchema>;

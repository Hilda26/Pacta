import { z } from "zod";

export const covenantStatusSchema = z.enum([
  "DRAFT",
  "BONDED",
  "ACTIVE",
  "EVIDENCE_SUBMITTED",
  "EVALUATION_PENDING",
  "FULFILLED",
  "PARTIALLY_FULFILLED",
  "BROKEN",
  "CANCELLED"
]);

export const createCovenantSchema = z.object({
  title: z.string().min(3).max(120),
  promise: z.string().min(10).max(5000),
  successCriteria: z.string().min(10).max(5000),
  evidenceRequirements: z.string().min(10).max(5000),
  deadlineAt: z.string().datetime(),
  requiredBondAmount: z.string().regex(/^\d+(\.\d+)?$/),
  privacy: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]),
  metadata: z.record(z.unknown()).default({})
});

export type CovenantStatus = z.infer<typeof covenantStatusSchema>;
export type CreateCovenantInput = z.infer<typeof createCovenantSchema>;

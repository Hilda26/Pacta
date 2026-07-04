import { z } from "zod";
import { badRequest } from "./errors";

export const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address.");
const metadataSchema = z.record(z.string(), z.unknown());

export const createNonceSchema = z.object({
  walletAddress: walletAddressSchema
});

export const verifyWalletSchema = z.object({
  walletAddress: walletAddressSchema,
  nonce: z.string().min(16).max(256),
  signature: z.string().min(65).max(512)
});

export const createCovenantSchema = z.object({
  title: z.string().min(3).max(120),
  promise: z.string().min(10).max(5000),
  successCriteria: z.string().min(10).max(5000),
  evidenceRequirements: z.string().min(10).max(5000),
  deadlineAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid deadline."),
  requiredBondAmount: z.string().regex(/^\d+(\.\d+)?$/, "Bond amount must be numeric."),
  privacy: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]),
  metadata: metadataSchema.optional()
});

export const submitEvaluationSchema = z.object({
  reason: z.string().min(1).max(1000).optional(),
  contractCovenantId: z.string().min(1).max(120).optional()
});

export const evidenceTypes = [
  "DOCUMENT",
  "GITHUB_COMMIT",
  "PAYMENT_RECEIPT",
  "PHOTO",
  "VIDEO",
  "API_RESPONSE",
  "ATTESTATION",
  "IOT_DEVICE_DATA",
  "SOCIAL_PROOF",
  "URL",
  "STRUCTURED_METADATA"
] as const;

export const createEvidenceSchema = z.object({
  type: z.enum(evidenceTypes),
  contentHash: z.string().min(16).max(180),
  storageUri: z.string().min(8).max(500).optional(),
  sourceUrl: z.string().url().optional(),
  structuredMetadata: metadataSchema.optional()
});

export const createBondSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Bond amount must be numeric."),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash."),
  role: z.enum(["CREATOR", "CO_STAKER", "COUNTERPARTY"]),
  contractCovenantId: z.string().min(1).max(120).optional()
});

export async function readJson<T>(request: Request, schema: z.ZodType<T>) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw badRequest("Request validation failed.", parsed.error.flatten());
  }
  return parsed.data;
}

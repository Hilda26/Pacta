import type { Covenant, EvidenceType } from "@/lib/api/types";
import { parseUnits } from "viem";

export type ContractActionPayload = {
  functionName: string;
  args: unknown[];
  value?: string;
};

export function buildCreateCovenantAction(covenant: Covenant): ContractActionPayload {
  return {
    functionName: "create_covenant",
    args: [
      covenant.id,
      covenant.promise,
      covenant.successCriteria,
      covenant.evidenceRequirements,
      Math.floor(new Date(covenant.deadlineAt).getTime() / 1000),
      covenant.privacy,
      Number(covenant.metadata?.disputeWindowSeconds ?? 604800),
      String(covenant.metadata?.metadataHash ?? "sha256:metadata-not-provided")
    ]
  };
}

export function buildBondCovenantAction(covenantId: string, role: string, amountWei: string): ContractActionPayload {
  return {
    functionName: "bond_covenant",
    args: [covenantId, role],
    value: amountWei
  };
}

export function genToWei(value: string) {
  return parseUnits(value, 18).toString();
}

export function buildEvidenceAction(input: {
  covenantId: string;
  type: EvidenceType;
  uri: string;
  contentHash: string;
  metadataHash?: string;
}): ContractActionPayload {
  return {
    functionName: "submit_evidence",
    args: [input.covenantId, input.type, input.uri, input.contentHash, input.metadataHash ?? "sha256:metadata-not-provided"]
  };
}

export function buildEvaluationAction(covenantId: string): ContractActionPayload {
  return {
    functionName: "request_evaluation",
    args: [covenantId]
  };
}

export async function metadataHash(value: Record<string, unknown> | undefined) {
  if (!value || Object.keys(value).length === 0 || typeof crypto === "undefined" || !crypto.subtle) {
    return "sha256:metadata-not-provided";
  }

  const json = JSON.stringify(sortRecord(value));
  const bytes = new TextEncoder().encode(json);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function sortRecord(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortRecord);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortRecord(item)])
    );
  }

  return value;
}

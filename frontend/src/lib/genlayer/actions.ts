import type { Covenant, EvidenceType } from "@/lib/api/types";

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

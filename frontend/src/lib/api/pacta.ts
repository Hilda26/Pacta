import { apiFetch, jsonBody } from "./client";
import type { AuthUser, Covenant, EvidenceType, GenLayerConfig, ReputationProfile } from "./types";

export const authApi = {
  nonce(walletAddress: string) {
    return apiFetch<{ nonce: string; message: string; expiresAt: string }>("/auth/nonce", {
      method: "POST",
      body: jsonBody({ walletAddress })
    });
  },
  verify(input: { walletAddress: string; nonce: string; signature: string }) {
    return apiFetch<{ user: AuthUser; expiresAt: string; csrfToken: string }>("/auth/verify", {
      method: "POST",
      body: jsonBody(input)
    });
  },
  me() {
    return apiFetch<{ user: AuthUser }>("/auth/me");
  },
  logout() {
    return apiFetch<{ ok: true }>("/auth/logout", { method: "POST" });
  }
};

export const covenantsApi = {
  list() {
    return apiFetch<Covenant[]>("/covenants");
  },
  get(id: string) {
    return apiFetch<Covenant>(`/covenants/${id}`);
  },
  create(input: {
    title: string;
    promise: string;
    successCriteria: string;
    evidenceRequirements: string;
    deadlineAt: string;
    requiredBondAmount: string;
    privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
    metadata?: Record<string, unknown>;
  }) {
    return apiFetch<Covenant>("/covenants", {
      method: "POST",
      body: jsonBody(input)
    });
  },
  submitEvaluation(id: string, input: { reason?: string; contractCovenantId?: string }) {
    return apiFetch<Covenant>(`/covenants/${id}/submit-evaluation`, {
      method: "POST",
      body: jsonBody(input)
    });
  }
};

export const evidenceApi = {
  create(
    covenantId: string,
    input: {
      type: EvidenceType;
      contentHash: string;
      storageUri?: string;
      sourceUrl?: string;
      structuredMetadata?: Record<string, unknown>;
    }
  ) {
    return apiFetch(`/covenants/${covenantId}/evidence`, {
      method: "POST",
      body: jsonBody(input)
    });
  }
};

export const bondsApi = {
  create(
    covenantId: string,
    input: {
      amount: string;
      txHash: string;
      role: "CREATOR" | "CO_STAKER" | "COUNTERPARTY";
      contractCovenantId?: string;
    }
  ) {
    return apiFetch(`/covenants/${covenantId}/bonds`, {
      method: "POST",
      body: jsonBody(input)
    });
  }
};

export const genlayerApi = {
  config() {
    return apiFetch<GenLayerConfig>("/genlayer/config");
  },
  covenant(contractCovenantId: string) {
    return apiFetch<Record<string, unknown>>(`/genlayer/contract/covenants/${contractCovenantId}`);
  }
};

export const reputationApi = {
  get(walletAddress: string) {
    return apiFetch<ReputationProfile>(`/reputation/${walletAddress}`);
  }
};

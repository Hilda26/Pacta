export type AuthUser = {
  id: string;
  walletAddress: string;
  displayName: string | null;
};

export type CovenantStatus =
  | "DRAFT"
  | "BONDED"
  | "ACTIVE"
  | "EVIDENCE_SUBMITTED"
  | "EVALUATION_PENDING"
  | "FULFILLED"
  | "PARTIALLY_FULFILLED"
  | "BROKEN"
  | "CANCELLED";

export type EvidenceType =
  | "DOCUMENT"
  | "GITHUB_COMMIT"
  | "PAYMENT_RECEIPT"
  | "PHOTO"
  | "VIDEO"
  | "API_RESPONSE"
  | "ATTESTATION"
  | "IOT_DEVICE_DATA"
  | "SOCIAL_PROOF"
  | "URL"
  | "STRUCTURED_METADATA";

export type CovenantParticipant = {
  id: string;
  covenantId: string;
  walletAddress: string;
  role: string;
  createdAt: string;
};

export type EvidenceItem = {
  id: string;
  covenantId: string;
  type: EvidenceType;
  storageUri: string | null;
  sourceUrl: string | null;
  contentHash: string;
  structuredMetadata: Record<string, unknown>;
  verificationStatus: string;
  createdAt: string;
};

export type BondPosition = {
  id: string;
  covenantId: string;
  userId: string;
  amount: string;
  status: string;
  txHash: string | null;
  createdAt: string;
  user?: AuthUser;
};

export type Evaluation = {
  id: string;
  covenantId: string;
  outcome: string;
  confidence: number;
  reasoning: Record<string, unknown>;
  bondDistribution: Record<string, unknown>;
  reputationImpact: Record<string, unknown>;
  contractTxHash: string | null;
  createdAt: string;
};

export type Covenant = {
  id: string;
  contractCovenantId: string | null;
  creatorId: string;
  title: string;
  promise: string;
  successCriteria: string;
  evidenceRequirements: string;
  deadlineAt: string;
  privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
  status: CovenantStatus;
  requiredBondAmount: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  participants: CovenantParticipant[];
  evidenceItems: EvidenceItem[];
  evaluations: Evaluation[];
  bondPositions: BondPosition[];
};

export type ReputationProfile = {
  user: AuthUser;
  score: number;
  stats: {
    fulfilled: number;
    partiallyFulfilled: number;
    broken: number;
  };
  recentEvents: Array<{
    id: string;
    eventType: string;
    delta: number;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  publicCovenants: Array<{
    id: string;
    title: string;
    status: CovenantStatus;
    deadlineAt: string;
    createdAt: string;
  }>;
};

export type GenLayerConfig = {
  network: string;
  contractAddress: string;
  rpcUrl: string;
  rpcUrlConfigured: boolean;
};

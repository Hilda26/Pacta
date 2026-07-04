type Row = Record<string, any>;

export function mapUser(row: Row) {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    displayName: row.display_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapParticipant(row: Row) {
  return {
    id: row.id,
    covenantId: row.covenant_id,
    walletAddress: row.wallet_address,
    role: row.role,
    createdAt: row.created_at
  };
}

export function mapEvidence(row: Row) {
  return {
    id: row.id,
    covenantId: row.covenant_id,
    type: row.type,
    storageUri: row.storage_uri ?? null,
    sourceUrl: row.source_url ?? null,
    contentHash: row.content_hash,
    structuredMetadata: row.structured_metadata ?? {},
    verificationStatus: row.verification_status,
    createdAt: row.created_at
  };
}

export function mapBond(row: Row) {
  const result: Row = {
    id: row.id,
    covenantId: row.covenant_id,
    userId: row.user_id,
    amount: String(row.amount),
    status: row.status,
    txHash: row.tx_hash ?? null,
    createdAt: row.created_at
  };
  if (row.user) {
    result.user = mapUser(row.user);
  }
  return result;
}

export function mapEvaluation(row: Row) {
  return {
    id: row.id,
    covenantId: row.covenant_id,
    outcome: row.outcome,
    confidence: row.confidence,
    reasoning: row.reasoning ?? {},
    bondDistribution: row.bond_distribution ?? {},
    reputationImpact: row.reputation_impact ?? {},
    contractTxHash: row.contract_tx_hash ?? null,
    createdAt: row.created_at
  };
}

export function mapReputationEvent(row: Row) {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    delta: row.delta,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

export function mapCovenant(row: Row) {
  const evaluations = [...(row.evaluations ?? [])].sort((left: Row, right: Row) =>
    String(right.created_at).localeCompare(String(left.created_at))
  );

  return {
    id: row.id,
    contractCovenantId: row.contract_covenant_id ?? null,
    creatorId: row.creator_id,
    title: row.title,
    promise: row.promise,
    successCriteria: row.success_criteria,
    evidenceRequirements: row.evidence_requirements,
    deadlineAt: row.deadline_at,
    privacy: row.privacy,
    status: row.status,
    requiredBondAmount: String(row.required_bond_amount),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    participants: (row.participants ?? []).map(mapParticipant),
    evidenceItems: (row.evidenceItems ?? []).map(mapEvidence),
    evaluations: evaluations.slice(0, 1).map(mapEvaluation),
    bondPositions: (row.bondPositions ?? []).map(mapBond)
  };
}

export function mapPublicCovenant(row: Row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    deadlineAt: row.deadline_at,
    createdAt: row.created_at
  };
}

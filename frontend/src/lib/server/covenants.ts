import { AuthenticatedUser } from "./auth";
import { badRequest, forbidden, notFound } from "./errors";
import { mapCovenant } from "./mappers";
import { recordAudit } from "./audit";
import { ensure, ensureArray, supabaseAdmin, throwIfError } from "./supabase";

const covenantSelect =
  "*, participants:covenant_participants(*), evidenceItems:evidence_items(*), evaluations:evaluations(*), bondPositions:bond_positions(*, user:users(id,wallet_address,display_name,created_at,updated_at))";

const terminalStatuses = ["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN", "CANCELLED"];

export async function createCovenant(
  user: AuthenticatedUser,
  input: {
    title: string;
    promise: string;
    successCriteria: string;
    evidenceRequirements: string;
    deadlineAt: string;
    privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
    requiredBondAmount: string;
    metadata?: Record<string, unknown> | undefined;
  }
) {
  const deadlineAt = new Date(input.deadlineAt);
  if (Number.isNaN(deadlineAt.getTime()) || deadlineAt.getTime() <= Date.now()) {
    throw badRequest("Covenant deadline must be in the future.");
  }

  const { data, error } = await supabaseAdmin().rpc("pacta_create_covenant_with_creator", {
    p_creator_id: user.id,
    p_wallet_address: user.walletAddress,
    p_title: input.title,
    p_promise: input.promise,
    p_success_criteria: input.successCriteria,
    p_evidence_requirements: input.evidenceRequirements,
    p_deadline_at: deadlineAt.toISOString(),
    p_privacy: input.privacy,
    p_required_bond_amount: input.requiredBondAmount,
    p_metadata: input.metadata ?? {}
  });
  const covenantId = ensure(data as string | null, error, "Create covenant");
  const covenant = await findCovenant(covenantId);

  await recordAudit({
    actorId: user.id,
    action: "covenant.created",
    target: covenant.id,
    metadata: { privacy: covenant.privacy, deadlineAt: covenant.deadlineAt }
  });

  return covenant;
}

export async function listCovenantsForUser(user: AuthenticatedUser) {
  const { data: participantRows, error: participantError } = await supabaseAdmin()
    .from("covenant_participants")
    .select("covenant_id")
    .eq("wallet_address", user.walletAddress);
  const covenantIds = ensureArray(participantRows, participantError, "List participant covenants").map((row) => row.covenant_id);

  const filters = [`creator_id.eq.${user.id}`, "privacy.eq.PUBLIC"];
  if (covenantIds.length > 0) {
    filters.push(`id.in.(${covenantIds.join(",")})`);
  }

  const { data, error } = await supabaseAdmin()
    .from("covenants")
    .select(covenantSelect)
    .or(filters.join(","))
    .order("created_at", { ascending: false });

  return ensureArray(data, error, "List covenants").map(mapCovenant);
}

export async function getCovenantForUser(user: AuthenticatedUser, id: string) {
  const covenant = await findCovenant(id);
  const canView =
    covenant.creatorId === user.id ||
    covenant.privacy === "PUBLIC" ||
    covenant.participants.some((participant: { walletAddress: string }) => participant.walletAddress === user.walletAddress);

  if (!canView) {
    throw forbidden("You do not have access to this covenant.");
  }

  return covenant;
}

export async function submitEvaluation(
  user: AuthenticatedUser,
  id: string,
  input: { reason?: string | undefined; contractCovenantId?: string | undefined }
) {
  const covenant = await findCovenant(id);
  const canSubmit =
    covenant.creatorId === user.id ||
    covenant.participants.some((participant: { walletAddress: string }) => participant.walletAddress === user.walletAddress);

  if (!canSubmit) {
    throw forbidden("You cannot request evaluation for this covenant.");
  }

  if (terminalStatuses.includes(covenant.status)) {
    throw badRequest("This covenant already has a terminal outcome.");
  }

  if (covenant.evidenceItems.length === 0) {
    throw badRequest("At least one evidence item is required before evaluation.");
  }

  if (covenant.bondPositions.length === 0) {
    throw badRequest("At least one bond must be submitted before evaluation.");
  }

  const { error } = await supabaseAdmin()
    .from("covenants")
    .update({
      status: "EVALUATION_PENDING",
      contract_covenant_id: input.contractCovenantId ?? covenant.contractCovenantId
    })
    .eq("id", id);
  throwIfError(error, "Submit covenant evaluation");

  await recordAudit({
    actorId: user.id,
    action: "covenant.evaluation_requested",
    target: id,
    metadata: {
      reason: input.reason,
      contractCovenantId: input.contractCovenantId ?? covenant.contractCovenantId
    }
  });

  return findCovenant(id);
}

export async function findCovenant(id: string) {
  const { data, error } = await supabaseAdmin().from("covenants").select(covenantSelect).eq("id", id).maybeSingle();
  throwIfError(error, "Find covenant");
  if (!data) {
    throw notFound("Covenant not found.");
  }
  return mapCovenant(data);
}

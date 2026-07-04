import { AuthenticatedUser } from "./auth";
import { badRequest, forbidden, notFound } from "./errors";
import { mapEvidence } from "./mappers";
import { recordAudit } from "./audit";
import { ensure, ensureArray, supabaseAdmin, throwIfError } from "./supabase";

const terminalStatuses = ["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN", "CANCELLED"];

export async function createEvidence(
  user: AuthenticatedUser,
  covenantId: string,
  input: {
    type: string;
    contentHash: string;
    storageUri?: string | undefined;
    sourceUrl?: string | undefined;
    structuredMetadata?: Record<string, unknown> | undefined;
  }
) {
  await assertCanSubmitEvidence(user, covenantId);

  if (!input.storageUri && !input.sourceUrl && Object.keys(input.structuredMetadata ?? {}).length === 0) {
    throw badRequest("Evidence requires a storage URI, source URL, or structured metadata.");
  }

  const { data, error } = await supabaseAdmin().rpc("pacta_create_evidence_item", {
    p_covenant_id: covenantId,
    p_type: input.type,
    p_storage_uri: input.storageUri ?? null,
    p_source_url: input.sourceUrl ?? null,
    p_content_hash: input.contentHash,
    p_structured_metadata: input.structuredMetadata ?? {}
  });
  const evidenceId = ensure(data as string | null, error, "Create evidence");

  const { data: evidence, error: evidenceError } = await supabaseAdmin()
    .from("evidence_items")
    .select("*")
    .eq("id", evidenceId)
    .single();
  const mappedEvidence = mapEvidence(ensure(evidence, evidenceError, "Read evidence"));

  await recordAudit({
    actorId: user.id,
    action: "evidence.created",
    target: mappedEvidence.id,
    metadata: { covenantId, type: mappedEvidence.type }
  });

  return mappedEvidence;
}

export async function listEvidence(user: AuthenticatedUser, covenantId: string) {
  await assertCanViewEvidence(user, covenantId);

  const { data, error } = await supabaseAdmin()
    .from("evidence_items")
    .select("*")
    .eq("covenant_id", covenantId)
    .order("created_at", { ascending: false });

  return ensureArray(data, error, "List evidence").map(mapEvidence);
}

async function assertCanSubmitEvidence(user: AuthenticatedUser, covenantId: string) {
  const covenant = await findCovenantWithParticipants(covenantId);
  const canSubmit =
    covenant.creator_id === user.id ||
    covenant.participants.some((participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress);

  if (!canSubmit) {
    throw forbidden("You cannot submit evidence for this covenant.");
  }

  if (terminalStatuses.includes(covenant.status)) {
    throw badRequest("This covenant no longer accepts evidence.");
  }
}

async function assertCanViewEvidence(user: AuthenticatedUser, covenantId: string) {
  const covenant = await findCovenantWithParticipants(covenantId);
  const canView =
    covenant.creator_id === user.id ||
    covenant.privacy === "PUBLIC" ||
    covenant.participants.some((participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress);

  if (!canView) {
    throw forbidden("You cannot view evidence for this covenant.");
  }
}

async function findCovenantWithParticipants(covenantId: string) {
  const { data, error } = await supabaseAdmin()
    .from("covenants")
    .select("*, participants:covenant_participants(*)")
    .eq("id", covenantId)
    .maybeSingle();
  throwIfError(error, "Find covenant for evidence");
  if (!data) {
    throw notFound("Covenant not found.");
  }
  return data as any;
}

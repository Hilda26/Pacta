import { AuthenticatedUser } from "./auth";
import { badRequest, forbidden, notFound } from "./errors";
import { mapBond } from "./mappers";
import { recordAudit } from "./audit";
import { ensure, ensureArray, supabaseAdmin, throwIfError } from "./supabase";

const closedStatuses = ["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN", "CANCELLED", "EVALUATION_PENDING"];

export async function createBond(
  user: AuthenticatedUser,
  covenantId: string,
  input: {
    amount: string;
    txHash: string;
    role: "CREATOR" | "CO_STAKER" | "COUNTERPARTY";
    contractCovenantId?: string | undefined;
  }
) {
  const covenant = await findCovenantWithParticipants(covenantId);

  if (closedStatuses.includes(covenant.status)) {
    throw badRequest("This covenant no longer accepts new bonds.");
  }

  if (input.role === "CREATOR" && covenant.creator_id !== user.id) {
    throw forbidden("Only the covenant creator can register the creator bond.");
  }

  if (input.role !== "CREATOR" && covenant.privacy === "PRIVATE") {
    const isParticipant = covenant.participants.some(
      (participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress
    );
    if (!isParticipant) {
      throw forbidden("Private covenants only accept bonds from participants.");
    }
  }

  const { data, error } = await supabaseAdmin().rpc("pacta_register_bond_position", {
    p_covenant_id: covenantId,
    p_user_id: user.id,
    p_wallet_address: user.walletAddress,
    p_amount: input.amount,
    p_tx_hash: input.txHash,
    p_role: input.role,
    p_contract_covenant_id: input.contractCovenantId ?? covenant.contract_covenant_id
  });
  const bondId = ensure(data as string | null, error, "Register bond position");

  const { data: bondRow, error: bondError } = await supabaseAdmin()
    .from("bond_positions")
    .select("*, user:users(id,wallet_address,display_name,created_at,updated_at)")
    .eq("id", bondId)
    .single();
  const bond = mapBond(ensure(bondRow, bondError, "Read bond position"));

  await recordAudit({
    actorId: user.id,
    action: "bond.submitted",
    target: bond.id,
    metadata: { covenantId, amount: input.amount, txHash: input.txHash, role: input.role }
  });

  return bond;
}

export async function listBonds(user: AuthenticatedUser, covenantId: string) {
  await assertCanViewBonds(user, covenantId);

  const { data, error } = await supabaseAdmin()
    .from("bond_positions")
    .select("*, user:users(id,wallet_address,display_name,created_at,updated_at)")
    .eq("covenant_id", covenantId)
    .order("created_at", { ascending: false });

  return ensureArray(data, error, "List bond positions").map(mapBond);
}

async function assertCanViewBonds(user: AuthenticatedUser, covenantId: string) {
  const covenant = await findCovenantWithParticipants(covenantId);
  const canView =
    covenant.creator_id === user.id ||
    covenant.privacy === "PUBLIC" ||
    covenant.participants.some((participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress);

  if (!canView) {
    throw forbidden("You cannot view bonds for this covenant.");
  }
}

async function findCovenantWithParticipants(covenantId: string) {
  const { data, error } = await supabaseAdmin()
    .from("covenants")
    .select("*, participants:covenant_participants(*)")
    .eq("id", covenantId)
    .maybeSingle();
  throwIfError(error, "Find covenant for bond");
  if (!data) {
    throw notFound("Covenant not found.");
  }
  return data as any;
}

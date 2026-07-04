import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/auth.service";
import { mapBond } from "../database/record-mappers";
import { SupabaseService } from "../database/supabase.service";
import { CreateBondPositionDto } from "./dto/create-bond-position.dto";

@Injectable()
export class BondsService {
  constructor(
    private readonly audit: AuditService,
    private readonly db: SupabaseService
  ) {}

  async create(user: AuthenticatedUser, covenantId: string, dto: CreateBondPositionDto) {
    const covenant = await this.findCovenantWithParticipants(covenantId);

    if (["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN", "CANCELLED", "EVALUATION_PENDING"].includes(covenant.status)) {
      throw new BadRequestException("This covenant no longer accepts new bonds.");
    }

    if (dto.role === "CREATOR" && covenant.creator_id !== user.id) {
      throw new ForbiddenException("Only the covenant creator can register the creator bond.");
    }

    if (dto.role !== "CREATOR" && covenant.privacy === "PRIVATE") {
      const isParticipant = covenant.participants.some(
        (participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress
      );
      if (!isParticipant) {
        throw new ForbiddenException("Private covenants only accept bonds from participants.");
      }
    }

    const { data, error } = await this.db.admin.rpc("pacta_register_bond_position", {
      p_covenant_id: covenantId,
      p_user_id: user.id,
      p_wallet_address: user.walletAddress,
      p_amount: dto.amount,
      p_tx_hash: dto.txHash,
      p_role: dto.role,
      p_contract_covenant_id: dto.contractCovenantId ?? covenant.contract_covenant_id
    });
    const bondId = this.db.ensure(data as string | null, error, "Register bond position");

    const { data: bondRow, error: bondError } = await this.db.admin
      .from("bond_positions")
      .select("*, user:users(id,wallet_address,display_name,created_at,updated_at)")
      .eq("id", bondId)
      .single();
    const bond = mapBond(this.db.ensure(bondRow, bondError, "Read bond position"));

    await this.audit.record({
      actorId: user.id,
      action: "bond.submitted",
      target: bond.id,
      metadata: { covenantId, amount: dto.amount, txHash: dto.txHash, role: dto.role }
    });

    return bond;
  }

  async list(user: AuthenticatedUser, covenantId: string) {
    await this.assertCanViewBonds(user, covenantId);

    const { data, error } = await this.db.admin
      .from("bond_positions")
      .select("*, user:users(id,wallet_address,display_name,created_at,updated_at)")
      .eq("covenant_id", covenantId)
      .order("created_at", { ascending: false });

    return this.db.ensureArray(data, error, "List bond positions").map(mapBond);
  }

  private async assertCanViewBonds(user: AuthenticatedUser, covenantId: string) {
    const covenant = await this.findCovenantWithParticipants(covenantId);

    const canView =
      covenant.creator_id === user.id ||
      covenant.privacy === "PUBLIC" ||
      covenant.participants.some((participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress);

    if (!canView) {
      throw new ForbiddenException("You cannot view bonds for this covenant.");
    }
  }

  private async findCovenantWithParticipants(covenantId: string) {
    const { data, error } = await this.db.admin
      .from("covenants")
      .select("*, participants:covenant_participants(*)")
      .eq("id", covenantId)
      .maybeSingle();
    this.db.throwIfError(error, "Find covenant for bond");
    if (!data) {
      throw new NotFoundException("Covenant not found.");
    }
    return data as any;
  }
}

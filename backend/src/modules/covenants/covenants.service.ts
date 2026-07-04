import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/auth.service";
import { mapCovenant } from "../database/record-mappers";
import { SupabaseService } from "../database/supabase.service";
import { CreateCovenantDto } from "./dto/create-covenant.dto";
import { SubmitEvaluationDto } from "./dto/submit-evaluation.dto";

const covenantSelect =
  "*, participants:covenant_participants(*), evidenceItems:evidence_items(*), evaluations:evaluations(*), bondPositions:bond_positions(*, user:users(id,wallet_address,display_name,created_at,updated_at))";

@Injectable()
export class CovenantsService {
  constructor(
    private readonly audit: AuditService,
    private readonly db: SupabaseService
  ) {}

  async create(user: AuthenticatedUser, dto: CreateCovenantDto) {
    const deadlineAt = new Date(dto.deadlineAt);
    if (Number.isNaN(deadlineAt.getTime()) || deadlineAt.getTime() <= Date.now()) {
      throw new BadRequestException("Covenant deadline must be in the future.");
    }

    const { data, error } = await this.db.admin.rpc("pacta_create_covenant_with_creator", {
      p_creator_id: user.id,
      p_wallet_address: user.walletAddress,
      p_title: dto.title,
      p_promise: dto.promise,
      p_success_criteria: dto.successCriteria,
      p_evidence_requirements: dto.evidenceRequirements,
      p_deadline_at: deadlineAt.toISOString(),
      p_privacy: dto.privacy,
      p_required_bond_amount: dto.requiredBondAmount,
      p_metadata: dto.metadata ?? {}
    });
    const covenantId = this.db.ensure(data as string | null, error, "Create covenant");
    const covenant = await this.findCovenant(covenantId);

    await this.audit.record({
      actorId: user.id,
      action: "covenant.created",
      target: covenant.id,
      metadata: { privacy: covenant.privacy, deadlineAt: covenant.deadlineAt }
    });

    return covenant;
  }

  async listForUser(user: AuthenticatedUser) {
    const { data: participantRows, error: participantError } = await this.db.admin
      .from("covenant_participants")
      .select("covenant_id")
      .eq("wallet_address", user.walletAddress);
    const covenantIds = this.db.ensureArray(participantRows, participantError, "List participant covenants").map(
      (row) => row.covenant_id
    );

    const filters = [`creator_id.eq.${user.id}`, "privacy.eq.PUBLIC"];
    if (covenantIds.length > 0) {
      filters.push(`id.in.(${covenantIds.join(",")})`);
    }

    const { data, error } = await this.db.admin
      .from("covenants")
      .select(covenantSelect)
      .or(filters.join(","))
      .order("created_at", { ascending: false });

    return this.db.ensureArray(data, error, "List covenants").map(mapCovenant);
  }

  async getForUser(user: AuthenticatedUser, id: string) {
    const covenant = await this.findViewableCovenant(user, id);
    return covenant;
  }

  async submitEvaluation(user: AuthenticatedUser, id: string, dto: SubmitEvaluationDto) {
    const covenant = await this.findCovenant(id);

    const canSubmit =
      covenant.creatorId === user.id ||
      covenant.participants.some((participant: { walletAddress: string }) => participant.walletAddress === user.walletAddress);

    if (!canSubmit) {
      throw new ForbiddenException("You cannot request evaluation for this covenant.");
    }

    if (["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN", "CANCELLED"].includes(covenant.status)) {
      throw new BadRequestException("This covenant already has a terminal outcome.");
    }

    if (covenant.evidenceItems.length === 0) {
      throw new BadRequestException("At least one evidence item is required before evaluation.");
    }

    if (covenant.bondPositions.length === 0) {
      throw new BadRequestException("At least one bond must be submitted before evaluation.");
    }

    const { error } = await this.db.admin
      .from("covenants")
      .update({
        status: "EVALUATION_PENDING",
        contract_covenant_id: dto.contractCovenantId ?? covenant.contractCovenantId
      })
      .eq("id", id);
    this.db.throwIfError(error, "Submit covenant evaluation");
    const updated = await this.findCovenant(id);

    await this.audit.record({
      actorId: user.id,
      action: "covenant.evaluation_requested",
      target: id,
      metadata: {
        reason: dto.reason,
        contractCovenantId: dto.contractCovenantId ?? covenant.contractCovenantId
      }
    });

    return updated;
  }

  private async findViewableCovenant(user: AuthenticatedUser, id: string) {
    const covenant = await this.findCovenant(id);
    const canView =
      covenant.creatorId === user.id ||
      covenant.privacy === "PUBLIC" ||
      covenant.participants.some((participant: { walletAddress: string }) => participant.walletAddress === user.walletAddress);

    if (!canView) {
      throw new ForbiddenException("You do not have access to this covenant.");
    }

    return covenant;
  }

  private async findCovenant(id: string) {
    const { data, error } = await this.db.admin.from("covenants").select(covenantSelect).eq("id", id).maybeSingle();
    this.db.throwIfError(error, "Find covenant");
    if (!data) {
      throw new NotFoundException("Covenant not found.");
    }
    return mapCovenant(data);
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/auth.service";
import { mapEvidence } from "../database/record-mappers";
import { SupabaseService } from "../database/supabase.service";
import { StorageService } from "../storage/storage.service";
import { CreateEvidenceDto, CreateEvidenceUploadUrlDto } from "./dto/create-evidence.dto";

@Injectable()
export class EvidenceService {
  constructor(
    private readonly audit: AuditService,
    private readonly db: SupabaseService,
    private readonly storage: StorageService
  ) {}

  async createUploadUrl(user: AuthenticatedUser, covenantId: string, dto: CreateEvidenceUploadUrlDto) {
    await this.assertCanSubmitEvidence(user, covenantId);
    const upload = await this.storage.createEvidenceUploadUrl({
      covenantId,
      filename: dto.filename,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
      contentHash: dto.contentHash
    });

    await this.audit.record({
      actorId: user.id,
      action: "evidence.upload_url.created",
      target: covenantId,
      metadata: { storageUri: upload.storageUri, contentHash: dto.contentHash }
    });

    return upload;
  }

  async create(user: AuthenticatedUser, covenantId: string, dto: CreateEvidenceDto) {
    await this.assertCanSubmitEvidence(user, covenantId);

    if (!dto.storageUri && !dto.sourceUrl && Object.keys(dto.structuredMetadata ?? {}).length === 0) {
      throw new BadRequestException("Evidence requires a storage URI, source URL, or structured metadata.");
    }

    const { data, error } = await this.db.admin.rpc("pacta_create_evidence_item", {
      p_covenant_id: covenantId,
      p_type: dto.type,
      p_storage_uri: dto.storageUri ?? null,
      p_source_url: dto.sourceUrl ?? null,
      p_content_hash: dto.contentHash,
      p_structured_metadata: dto.structuredMetadata ?? {}
    });
    const evidenceId = this.db.ensure(data as string | null, error, "Create evidence");

    const { data: evidence, error: evidenceError } = await this.db.admin
      .from("evidence_items")
      .select("*")
      .eq("id", evidenceId)
      .single();
    const mappedEvidence = mapEvidence(this.db.ensure(evidence, evidenceError, "Read evidence"));

    await this.audit.record({
      actorId: user.id,
      action: "evidence.created",
      target: mappedEvidence.id,
      metadata: { covenantId, type: mappedEvidence.type }
    });

    return mappedEvidence;
  }

  async list(user: AuthenticatedUser, covenantId: string) {
    await this.assertCanViewEvidence(user, covenantId);

    const { data, error } = await this.db.admin
      .from("evidence_items")
      .select("*")
      .eq("covenant_id", covenantId)
      .order("created_at", { ascending: false });

    return this.db.ensureArray(data, error, "List evidence").map(mapEvidence);
  }

  private async assertCanSubmitEvidence(user: AuthenticatedUser, covenantId: string) {
    const covenant = await this.findCovenantWithParticipants(covenantId);

    const canSubmit =
      covenant.creator_id === user.id ||
      covenant.participants.some((participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress);

    if (!canSubmit) {
      throw new ForbiddenException("You cannot submit evidence for this covenant.");
    }

    if (["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN", "CANCELLED"].includes(covenant.status)) {
      throw new BadRequestException("This covenant no longer accepts evidence.");
    }
  }

  private async assertCanViewEvidence(user: AuthenticatedUser, covenantId: string) {
    const covenant = await this.findCovenantWithParticipants(covenantId);

    const canView =
      covenant.creator_id === user.id ||
      covenant.privacy === "PUBLIC" ||
      covenant.participants.some((participant: { wallet_address: string }) => participant.wallet_address === user.walletAddress);

    if (!canView) {
      throw new ForbiddenException("You cannot view evidence for this covenant.");
    }
  }

  private async findCovenantWithParticipants(covenantId: string) {
    const { data, error } = await this.db.admin
      .from("covenants")
      .select("*, participants:covenant_participants(*)")
      .eq("id", covenantId)
      .maybeSingle();
    this.db.throwIfError(error, "Find covenant for evidence");
    if (!data) {
      throw new NotFoundException("Covenant not found.");
    }
    return data as any;
  }
}

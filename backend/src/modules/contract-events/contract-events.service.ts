import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { SupabaseService } from "../database/supabase.service";
import { IngestContractEventDto } from "./dto/ingest-contract-event.dto";

type EvaluationOutcome = "FULFILLED" | "PARTIALLY_FULFILLED" | "BROKEN";

@Injectable()
export class ContractEventsService {
  constructor(
    private readonly audit: AuditService,
    private readonly db: SupabaseService
  ) {}

  async ingest(dto: IngestContractEventDto) {
    const event = await this.persistEvent(dto.txHash, dto.logIndex, dto.eventName, dto.payload);

    await this.applyKnownEvent(dto.eventName, dto.payload, dto.txHash);
    await this.audit.record({
      action: "contract_event.ingested",
      target: event.id,
      metadata: { txHash: dto.txHash, logIndex: dto.logIndex, eventName: dto.eventName, source: dto.source }
    });

    return event;
  }

  async ingestPactaContractEvent(event: Record<string, unknown>, source: string) {
    const eventId = this.numberPayload(event, "event_id");
    const eventName = this.stringPayload(event, "event_type");
    const syntheticTxHash = `0x${eventId.toString(16).padStart(64, "0")}`;
    const persisted = await this.persistEvent(syntheticTxHash, 0, eventName, event);

    await this.applyKnownEvent(eventName, event, syntheticTxHash);
    await this.audit.record({
      action: "contract_event.synced_from_genlayer",
      target: persisted.id,
      metadata: { eventId, eventName, source }
    });

    return persisted;
  }

  private async persistEvent(txHash: string, logIndex: number, eventName: string, payload: Record<string, unknown>) {
    const { data, error } = await this.db.admin
      .from("contract_events")
      .upsert(
        {
          tx_hash: txHash,
          log_index: logIndex,
          event_name: eventName,
          payload
        },
        { onConflict: "tx_hash,log_index", ignoreDuplicates: false }
      )
      .select("*")
      .single();
    return this.db.ensure(data, error, "Persist contract event");
  }

  private async applyKnownEvent(eventName: string, payload: Record<string, unknown>, txHash: string) {
    if (eventName === "BondConfirmed") {
      await this.applyBondConfirmed(payload, txHash);
      return;
    }

    if (eventName === "CovenantEvaluated") {
      await this.applyCovenantEvaluated(payload, txHash);
    }
  }

  private async applyBondConfirmed(payload: Record<string, unknown>, txHash: string) {
    const bondPositionId = this.stringPayload(payload, "bondPositionId");
    const covenantId = this.stringPayload(payload, "covenantId");
    const contractCovenantId = this.optionalStringPayload(payload, "contractCovenantId");

    const { error } = await this.db.admin.rpc("pacta_apply_bond_confirmed", {
      p_bond_position_id: bondPositionId,
      p_covenant_id: covenantId,
      p_contract_covenant_id: contractCovenantId,
      p_tx_hash: txHash
    });
    this.db.throwIfError(error, "Apply bond confirmation");
  }

  private async applyCovenantEvaluated(payload: Record<string, unknown>, txHash: string) {
    const eventPayload = this.optionalObjectPayload(payload, "payload") ?? payload;
    const covenantId = this.optionalStringPayload(payload, "covenant_id") ?? this.stringPayload(eventPayload, "covenantId");
    const outcome = this.outcomePayload(eventPayload);
    const confidence = this.numberPayload(eventPayload, "confidence");
    const reasoning = this.reasoningPayload(eventPayload);
    const bondDistribution = this.bondDistributionPayload(eventPayload);
    const reputationImpact = this.reputationImpactPayload(eventPayload);

    if (confidence < 0 || confidence > 100) {
      throw new BadRequestException("Evaluation confidence must be between 0 and 100.");
    }

    const { data: covenant, error: covenantError } = await this.db.admin
      .from("covenants")
      .select("creator_id")
      .eq("id", covenantId)
      .maybeSingle();
    this.db.throwIfError(covenantError, "Read covenant for evaluation");
    if (!covenant) {
      throw new BadRequestException("Covenant in contract event does not exist.");
    }

    const reputationDelta = this.reputationDelta(outcome, confidence, reputationImpact);
    const { error } = await this.db.admin.rpc("pacta_apply_covenant_evaluated", {
      p_covenant_id: covenantId,
      p_creator_id: covenant.creator_id,
      p_outcome: outcome,
      p_confidence: confidence,
      p_reasoning: reasoning,
      p_bond_distribution: bondDistribution,
      p_reputation_impact: reputationImpact,
      p_contract_tx_hash: txHash,
      p_reputation_delta: reputationDelta
    });
    this.db.throwIfError(error, "Apply covenant evaluation");
  }

  private reputationDelta(outcome: EvaluationOutcome, confidence: number, reputationImpact: Record<string, unknown>) {
    const explicitDelta = reputationImpact.delta;
    if (typeof explicitDelta === "number" && Number.isFinite(explicitDelta)) {
      return Math.round(explicitDelta);
    }

    if (outcome === "FULFILLED") {
      return Math.round(10 + confidence / 10);
    }
    if (outcome === "PARTIALLY_FULFILLED") {
      return Math.round(confidence / 20);
    }
    return -Math.round(10 + confidence / 10);
  }

  private stringPayload(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new BadRequestException(`${key} must be a non-empty string.`);
    }
    return value;
  }

  private optionalStringPayload(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private numberPayload(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new BadRequestException(`${key} must be a finite number.`);
    }
    return value;
  }

  private optionalObjectPayload(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
  }

  private outcomePayload(payload: Record<string, unknown>): EvaluationOutcome {
    const value = this.optionalStringPayload(payload, "outcome") ?? this.optionalStringPayload(payload, "status") ?? "";
    if (!["FULFILLED", "PARTIALLY_FULFILLED", "BROKEN"].includes(value)) {
      throw new BadRequestException("Evaluation outcome is invalid.");
    }
    return value as EvaluationOutcome;
  }

  private reasoningPayload(payload: Record<string, unknown>) {
    const value = payload.reasoning;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === "string") {
      return { text: value };
    }
    throw new BadRequestException("reasoning must be a string or object.");
  }

  private bondDistributionPayload(payload: Record<string, unknown>) {
    const value = payload.bondDistribution;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {
      returnBps: payload.return_bps,
      slashBps: payload.slash_bps
    };
  }

  private reputationImpactPayload(payload: Record<string, unknown>) {
    const value = payload.reputationImpact;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {
      delta: payload.reputation_delta
    };
  }
}

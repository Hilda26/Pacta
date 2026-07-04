import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../database/supabase.service";

type AuditRecord = {
  actorId?: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: SupabaseService) {}

  async record(event: AuditRecord) {
    try {
      const { error } = await this.db.admin.from("audit_logs").insert({
        actor_id: event.actorId ?? null,
        action: event.action,
        target: event.target,
        metadata: event.metadata ?? {}
      });
      this.db.throwIfError(error, "Persist audit log");
    } catch (error) {
      this.logger.error("Failed to persist audit log", error instanceof Error ? error.stack : String(error));
    }
  }
}

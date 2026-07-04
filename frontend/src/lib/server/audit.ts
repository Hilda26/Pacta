import { supabaseAdmin, throwIfError } from "./supabase";

type AuditRecord = {
  actorId?: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
};

export async function recordAudit(event: AuditRecord) {
  try {
    const { error } = await supabaseAdmin().from("audit_logs").insert({
      actor_id: event.actorId ?? null,
      action: event.action,
      target: event.target,
      metadata: event.metadata ?? {}
    });
    throwIfError(error, "Persist audit log");
  } catch (error) {
    console.error("Failed to persist audit log", error);
  }
}

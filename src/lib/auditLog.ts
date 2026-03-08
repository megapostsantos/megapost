import { supabase } from "@/lib/customSupabase";

/**
 * Log an audit event for admin actions.
 * This is a client-side helper that logs to the audit_log table.
 */
export async function logAudit(
  action: string,
  module: string,
  targetId?: string | null,
  metadata?: Record<string, unknown> | null
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_log").insert([{
      user_id: user.id,
      acao: action,
      tabela: module,
      registro_id: targetId || user.id,
      dados_novos: metadata || null,
    }]);
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

// Pre-defined audit actions
export const AuditActions = {
  PAYROLL_PAID: "payroll_marked_paid",
  TRAINING_EDITED: "training_content_edited",
  TRAINING_CREATED: "training_content_created",
  TRAINING_DELETED: "training_content_deleted",
  ROUTE_DELETED: "route_deleted",
  ROUTE_CORRECTED: "route_corrected",
  SYSTEM_RESET: "system_reset",
} as const;

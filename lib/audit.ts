import { prismaUnscoped } from './db'
import type { SessionContext } from './auth-context'

// Her admin aksiyonu (çalışma alanı oluşturma/güncelleme, kaynak ayarı vb.) buradan loglanır.
export async function audit(
  ctx: SessionContext,
  action: string,
  opts?: {
    tenantId?: string | null
    targetType?: string
    targetId?: string
    meta?: Record<string, unknown>
  }
): Promise<void> {
  try {
    await prismaUnscoped.auditLog.create({
      data: {
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        tenantId: opts?.tenantId ?? ctx.tenantId,
        action,
        targetType: opts?.targetType,
        targetId: opts?.targetId,
        meta: opts?.meta as any,
      },
    })
  } catch (e) {
    // Audit yazımı asıl işlemi asla bloke etmemeli
    console.error('[audit] log yazılamadı:', e)
  }
}

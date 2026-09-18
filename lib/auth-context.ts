import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'
import { prismaUnscoped } from './db'

export type Role = 'super_admin' | 'tenant_owner' | 'tenant_member'

export interface SessionContext {
  userId: string
  role: Role
  tenantId: string | null
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

// Tüm route handler'lar ve server component'ler için tek auth giriş noktası.
export async function getSessionContext(): Promise<SessionContext> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new AuthError(401, 'Oturum bulunamadı. Lütfen tekrar giriş yapın.')
  }
  const role = (session.user.role ?? 'tenant_owner') as Role
  const tenantId = session.user.tenantId ?? null

  // JWT'deki kullanıcı DB'de yoksa (ör. DB sıfırlandı, çerez eski) → 401,
  // yoksa tenant kontrolü yanıltıcı bir "çalışma alanı bulunamadı" verir.
  const user = await prismaUnscoped.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  })
  if (!user) {
    throw new AuthError(401, 'Oturumunuz geçersiz. Lütfen tekrar giriş yapın.')
  }

  if (tenantId) {
    const tenant = await prismaUnscoped.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    })
    if (!tenant) {
      throw new AuthError(403, 'Hesabınıza bağlı çalışma alanı bulunamadı.')
    }
    if (tenant.status === 'suspended' && role !== 'super_admin') {
      throw new AuthError(403, 'Çalışma alanınız askıya alınmış. Yöneticinizle iletişime geçin.')
    }
  }

  return { userId: session.user.id, role, tenantId }
}

export function requireTenant(ctx: SessionContext): string {
  if (!ctx.tenantId) {
    throw new AuthError(403, 'Bu işlem bir çalışma alanı gerektirir.')
  }
  return ctx.tenantId
}

export function requireSuperAdmin(ctx: SessionContext): void {
  if (ctx.role !== 'super_admin') {
    throw new AuthError(403, 'Bu işlem için yönetici yetkisi gerekir.')
  }
}

// Route handler'larda ortak hata → JSON dönüşümü
export function apiError(e: unknown): NextResponse {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status })
  }
  console.error('[api]', e)
  return NextResponse.json(
    { error: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' },
    { status: 500 }
  )
}

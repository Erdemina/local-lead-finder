import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireSuperAdmin, apiError } from '@/lib/auth-context'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  retentionDays: z.number().int().min(1).max(3650).nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    requireSuperAdmin(ctx)
    const tenant = await prismaUnscoped.tenant.findUnique({
      where: { id: params.id },
      include: {
        users: { select: { id: true, email: true, name: true, role: true, lastLoginAt: true } },
        _count: { select: { leads: true, searches: true, sites: true, actions: true } },
      },
    })
    if (!tenant) return NextResponse.json({ error: 'Çalışma alanı bulunamadı.' }, { status: 404 })
    return NextResponse.json({ tenant })
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    requireSuperAdmin(ctx)
    const body = patchSchema.parse(await req.json())

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.status !== undefined) data.status = body.status
    if (body.retentionDays !== undefined) data.retentionDays = body.retentionDays

    const tenant = await prismaUnscoped.tenant.update({ where: { id: params.id }, data: data as any })
    await audit(ctx, 'tenant.update', {
      tenantId: tenant.id,
      targetType: 'Tenant',
      targetId: tenant.id,
      meta: body as Record<string, unknown>,
    })
    return NextResponse.json({ tenant })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz alanlar gönderildi.' }, { status: 400 })
    }
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    requireSuperAdmin(ctx)
    if (ctx.tenantId === params.id) {
      return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz.' }, { status: 400 })
    }
    await prismaUnscoped.$transaction([
      prismaUnscoped.generatedSite.deleteMany({ where: { tenantId: params.id } }),
      prismaUnscoped.action.deleteMany({ where: { tenantId: params.id } }),
      prismaUnscoped.leadNote.deleteMany({ where: { tenantId: params.id } }),
      prismaUnscoped.searchResult.deleteMany({ where: { tenantId: params.id } }),
      prismaUnscoped.search.deleteMany({ where: { tenantId: params.id } }),
      prismaUnscoped.lead.deleteMany({ where: { tenantId: params.id } }),
      prismaUnscoped.user.deleteMany({ where: { tenantId: params.id } }),
      prismaUnscoped.tenant.delete({ where: { id: params.id } }),
    ])
    await audit(ctx, 'tenant.delete', {
      tenantId: params.id,
      targetType: 'Tenant',
      targetId: params.id,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}

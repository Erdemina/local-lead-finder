import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'

export const dynamic = 'force-dynamic'

const schema = z.object({
  nicheProfile: z
    .object({
      niche: z.string().max(200).optional(),
      categoryKey: z.string().max(40).optional(),
      categoryText: z.string().max(80).optional(),
      city: z.string().max(60).optional(),
      district: z.string().max(60).optional(),
      radiusM: z.number().min(200).max(30000).optional(),
      websiteStatus: z.enum(['any', 'no_website', 'broken', 'working']).optional(),
    })
    .nullable(),
  retentionDays: z.number().int().min(1).max(3650).nullable().optional(),
})

export async function GET() {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const tenant = await prismaUnscoped.tenant.findUnique({
      where: { id: tenantId },
      select: { nicheProfile: true, retentionDays: true },
    })
    return NextResponse.json({
      nicheProfile: tenant?.nicheProfile ?? null,
      retentionDays: tenant?.retentionDays ?? null,
    })
  } catch (e) {
    return apiError(e)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const body = schema.parse(await req.json())
    const data: Record<string, unknown> = { nicheProfile: body.nicheProfile ?? undefined }
    if (body.nicheProfile === null) data.nicheProfile = null as any
    if (body.retentionDays !== undefined) data.retentionDays = body.retentionDays
    await prismaUnscoped.tenant.update({ where: { id: tenantId }, data: data as any })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz profil bilgisi.' }, { status: 400 })
    }
    return apiError(e)
  }
}

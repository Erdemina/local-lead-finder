import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { audit } from '@/lib/audit'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  stage: z.enum(['found', 'contacted', 'demo_sent', 'negotiation', 'won', 'lost']).optional(),
  name: z.string().min(2).max(200).optional(),
  category: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('').transform(() => null)),
  website: z.string().max(300).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const lead = await prisma.lead.findFirst({
      where: { id: params.id, tenantId },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        actions: { orderBy: { createdAt: 'desc' } },
        sites: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!lead) return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })
    return NextResponse.json({ lead })
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const body = patchSchema.parse(await req.json())

    const existing = await prisma.lead.findFirst({ where: { id: params.id, tenantId } })
    if (!existing) return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })

    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: { ...body, tenantId },
    })
    return NextResponse.json({ lead: updated })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz alanlar.' }, { status: 400 })
    }
    return apiError(e)
  }
}

// KVKK: adayın tüm kişisel verisini kalıcı siler (notlar/aksiyonlar cascade)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const existing = await prisma.lead.findFirst({ where: { id: params.id, tenantId } })
    if (!existing) return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })

    await prisma.lead.delete({ where: { id: existing.id } })
    await audit(ctx, 'lead.hard_delete', {
      tenantId,
      targetType: 'Lead',
      targetId: existing.id,
      meta: { reason: 'kvkk' },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const { body } = z.object({ body: z.string().min(1).max(5000) }).parse(await req.json())

    const lead = await prisma.lead.findFirst({ where: { id: params.id, tenantId } })
    if (!lead) return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })

    const note = await prisma.leadNote.create({
      data: { leadId: lead.id, tenantId, userId: ctx.userId, body },
    })
    return NextResponse.json({ note }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Not boş olamaz.' }, { status: 400 })
    }
    return apiError(e)
  }
}

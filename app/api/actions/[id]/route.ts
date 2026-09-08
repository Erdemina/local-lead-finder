import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const action = await prisma.action.findFirst({
      where: { id: params.id, tenantId },
      include: { site: true, lead: { select: { id: true, name: true } } },
    })
    if (!action) return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })
    return NextResponse.json({ action })
  } catch (e) {
    return apiError(e)
  }
}

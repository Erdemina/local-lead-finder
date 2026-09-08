import { NextRequest, NextResponse } from 'next/server'
import { prisma, prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { buildLeadsWorkbook } from '@/lib/excel/leads-workbook'
import { STAGE_VALUES } from '@/lib/leads/stages'
import type { LeadStage } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)

    const stageParam = req.nextUrl.searchParams.get('stage')
    const q = req.nextUrl.searchParams.get('q')?.trim()
    const stage = STAGE_VALUES.includes(stageParam as LeadStage)
      ? (stageParam as LeadStage)
      : undefined

    const [tenant, leads] = await Promise.all([
      prismaUnscoped.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      prisma.lead.findMany({
        where: {
          tenantId,
          ...(stage ? { stage } : {}),
          ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
        },
        orderBy: [{ aiScore: 'desc' }, { createdAt: 'desc' }],
        take: 20000,
      }),
    ])

    const buffer = await buildLeadsWorkbook(leads, {
      includeStage: true,
      title: 'Müşteri Adayları',
      tenantName: tenant?.name,
    })

    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="musteri-adaylari-${date}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return apiError(e)
  }
}

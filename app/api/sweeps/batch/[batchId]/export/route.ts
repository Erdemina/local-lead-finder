import { NextResponse } from 'next/server'
import { prisma, prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { buildLeadsWorkbook } from '@/lib/excel/leads-workbook'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Toplu taramanın TÜM illerinin sonuçlarını tek Excel'de birleştirir. */
export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)

    const searches = await prisma.search.findMany({
      where: { tenantId, batchId: params.batchId },
      select: { id: true, batchLabel: true },
    })
    if (searches.length === 0) {
      return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })
    }

    const [tenant, results] = await Promise.all([
      prismaUnscoped.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      prisma.searchResult.findMany({
        where: { tenantId, searchId: { in: searches.map((s) => s.id) } },
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
        take: 50000,
      }),
    ])

    const buffer = await buildLeadsWorkbook(
      results.map((r) => ({
        ...r,
        email: null,
        stage: null,
        lastContactAt: null,
        dataSource: r.sourceCode,
      })),
      {
        includeStage: false,
        title: searches[0].batchLabel ?? 'Türkiye Geneli Tarama',
        tenantName: tenant?.name,
      }
    )

    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="turkiye-taramasi-${date}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return apiError(e)
  }
}

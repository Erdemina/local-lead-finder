import { NextResponse } from 'next/server'
import { prisma, prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { buildLeadsWorkbook } from '@/lib/excel/leads-workbook'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)

    const search = await prisma.search.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true, sourceCode: true, createdAt: true },
    })
    if (!search) return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })

    const [tenant, results] = await Promise.all([
      prismaUnscoped.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      prisma.searchResult.findMany({
        where: { searchId: search.id, tenantId },
        orderBy: [{ aiScore: 'desc' }, { id: 'asc' }],
        take: 5000,
      }),
    ])

    // Arama sonuçları henüz aday değil: aşama/geri dönüş kolonları anlamsız.
    const buffer = await buildLeadsWorkbook(
      results.map((r) => ({ ...r, email: null, stage: null, lastContactAt: null, dataSource: r.sourceCode })),
      { includeStage: false, title: 'Arama Sonuçları', tenantName: tenant?.name }
    )

    const date = search.createdAt.toISOString().slice(0, 10)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="arama-sonuclari-${date}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return apiError(e)
  }
}

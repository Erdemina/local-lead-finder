import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const search = await prisma.search.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true },
    })
    if (!search) return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(
      100,
      Math.max(10, parseInt(req.nextUrl.searchParams.get('pageSize') ?? '50', 10))
    )

    const [total, results] = await Promise.all([
      prisma.searchResult.count({ where: { searchId: search.id, tenantId } }),
      prisma.searchResult.findMany({
        where: { searchId: search.id, tenantId },
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // Harita için tüm koordinatlar (hafif alan seti)
    const mapPoints = await prisma.searchResult.findMany({
      where: { searchId: search.id, tenantId, lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, lat: true, lng: true, websiteHealth: true },
      take: 2000,
    })

    return NextResponse.json({ total, page, pageSize, results, mapPoints })
  } catch (e) {
    return apiError(e)
  }
}

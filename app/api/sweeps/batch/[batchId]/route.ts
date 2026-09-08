import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

/** Toplu taramanın ilerleme özeti — arayüz bunu periyodik sorgular. */
export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)

    const searches = await prisma.search.findMany({
      where: { tenantId, batchId: params.batchId },
      select: {
        id: true,
        status: true,
        resultCount: true,
        error: true,
        params: true,
        finishedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (searches.length === 0) {
      return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })
    }

    const counts = { queued: 0, running: 0, done: 0, failed: 0 }
    let totalResults = 0
    for (const s of searches) {
      counts[s.status] = (counts[s.status] ?? 0) + 1
      totalResults += s.resultCount
    }

    return NextResponse.json({
      batchId: params.batchId,
      total: searches.length,
      counts,
      totalResults,
      finished: counts.queued === 0 && counts.running === 0,
      provinces: searches.map((s) => ({
        id: s.id,
        city: (s.params as Record<string, unknown>)?.city ?? '—',
        status: s.status,
        resultCount: s.resultCount,
        error: s.error,
      })),
    })
  } catch (e) {
    return apiError(e)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { parseLeadsWorkbook, ExcelParseError } from '@/lib/excel/leads-workbook'
import { diffRows, summarize } from '@/lib/excel/import-diff'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_BYTES = 10 * 1024 * 1024

/** Yükleneni ayrıştırır ve DB ile karşılaştırır — hiçbir şey yazmaz. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)

    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Dosya bulunamadı. Bir .xlsx dosyası seçin.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Dosya 10 MB sınırını aşıyor. Listeyi filtreleyip daha küçük bir dosya yükleyin.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const rows = await parseLeadsWorkbook(buffer)

    const ids = rows.map((r) => r.id).filter((id): id is string => !!id)
    const leads = ids.length
      ? await prisma.lead.findMany({ where: { tenantId, id: { in: ids } } })
      : []

    const diff = diffRows(rows, new Map(leads.map((l) => [l.id, l])))
    return NextResponse.json({ rows: diff, summary: summarize(diff) })
  } catch (e) {
    if (e instanceof ExcelParseError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return apiError(e)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

const schema = z.object({
  searchResultIds: z.array(z.string()).min(1).max(500),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const body = schema.parse(await req.json())

    const results = await prisma.searchResult.findMany({
      where: { id: { in: body.searchResultIds }, tenantId },
    })

    let saved = 0
    let skipped = 0
    for (const r of results) {
      try {
        if (r.sourceRecordId) {
          await prisma.lead.upsert({
            where: {
              tenantId_sourceRecordId_dataSource: {
                tenantId,
                sourceRecordId: r.sourceRecordId,
                dataSource: r.sourceCode,
              },
            },
            update: {
              websiteHealth: r.websiteHealth,
              healthCheckedAt: r.healthCheckedAt,
              healthDetail: r.healthDetail ?? undefined,
              aiScore: r.aiScore,
              aiNote: r.aiNote,
              aiReason: r.aiReason,
              aiModel: r.aiModel,
            },
            create: leadDataFromResult(r, tenantId),
          })
        } else {
          await prisma.lead.create({ data: leadDataFromResult(r, tenantId) })
        }
        saved++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({ saved, skipped })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    }
    return apiError(e)
  }
}

function leadDataFromResult(r: any, tenantId: string) {
  return {
    tenantId,
    name: r.name,
    category: r.category,
    address: r.address,
    city: r.city,
    district: r.district,
    phone: r.phone,
    website: r.website,
    lat: r.lat,
    lng: r.lng,
    websiteHealth: r.websiteHealth,
    healthCheckedAt: r.healthCheckedAt,
    healthDetail: r.healthDetail ?? undefined,
    dataSource: r.sourceCode,
    sourceRecordId: r.sourceRecordId,
    searchId: r.searchId,
    aiScore: r.aiScore,
    aiNote: r.aiNote,
    aiReason: r.aiReason,
    aiModel: r.aiModel,
  }
}

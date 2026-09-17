import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import type { Prisma } from '@prisma/client'
import { prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { resolveSource } from '@/lib/discovery/engine'
import { PROVINCES_BY_POPULATION, findProvince } from '@/lib/discovery/tr-provinces'
import { getQueue, QUEUE_NAMES, type SweepSearchJobData } from '@/lib/queue'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const schema = z
  .object({
    categoryKey: z.string().max(40).optional(),
    categoryText: z.string().max(80).optional(),
    /** Boş bırakılırsa 81 ilin tamamı taranır */
    provinces: z.array(z.string().max(40)).max(81).optional(),
    radiusM: z.number().min(2000).max(30000).default(25000),
    limitPerProvince: z.number().int().min(50).max(500).default(200),
    websiteStatus: z.enum(['any', 'no_website', 'broken', 'working', 'opportunity']).default('opportunity'),
  })
  .refine((d) => d.categoryKey || d.categoryText, { message: 'Kategori seçin veya yazın.' })

export async function POST(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const body = schema.parse(await req.json())

    await resolveSource(ctx, 'overpass')

    // İl seçimi: verilmemişse tamamı. Nüfusa göre sıralı — büyük iller önce işlensin.
    const targets = body.provinces?.length
      ? body.provinces
          .map((n) => findProvince(n))
          .filter((p): p is NonNullable<typeof p> => !!p)
      : PROVINCES_BY_POPULATION

    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'Geçerli il bulunamadı. İl adlarını kontrol edin.' },
        { status: 400 }
      )
    }

    const batchId = crypto.randomUUID()
    const label =
      body.categoryKey ?? body.categoryText ?? 'tarama'

    // Tüm il taramaları tek transaction'da — biri başarısızsa hiçbiri oluşmaz.
    const searches = await prismaUnscoped.$transaction(async (tx) => {
      const created = []
      for (const p of targets) {
        created.push(
          await tx.search.create({
            data: {
              tenantId,
              userId: ctx.userId,
              mode: 'sweep',
              sourceCode: 'overpass',
              batchId,
              batchLabel: `${label} — ${targets.length} il`,
              params: {
                categoryKey: body.categoryKey,
                categoryText: body.categoryText,
                city: p.name,
                lat: p.lat,
                lng: p.lng,
                radiusM: body.radiusM,
                limit: body.limitPerProvince,
                websiteStatus: body.websiteStatus,
              } as unknown as Prisma.InputJsonValue,
              status: 'queued',
            },
          })
        )
      }
      return created
    })

    // Kuyruk ekleme transaction dışında: DB kaydı kesinleşmeden iş başlamasın.
    const queue = getQueue<SweepSearchJobData>(QUEUE_NAMES.sweepSearch)
    for (const s of searches) {
      await queue.add('sweep', { searchId: s.id, tenantId, userId: ctx.userId })
    }

    return NextResponse.json(
      { batchId, provinceCount: targets.length },
      { status: 201 }
    )
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors[0]?.message ?? 'Geçersiz parametreler.' },
        { status: 400 }
      )
    }
    return apiError(e)
  }
}

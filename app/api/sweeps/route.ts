import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { resolveSource } from '@/lib/discovery/engine'
import { geocode } from '@/lib/discovery/nominatim'
import { getQueue, QUEUE_NAMES, type SweepSearchJobData } from '@/lib/queue'

export const dynamic = 'force-dynamic'

const schema = z
  .object({
    categoryKey: z.string().max(40).optional(),
    categoryText: z.string().max(80).optional(),
    city: z.string().max(60).optional(),
    district: z.string().max(60).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    radiusM: z.number().min(500).max(30000).default(10000),
    limit: z.number().int().min(50).max(500).default(200),
  })
  .refine((d) => d.categoryKey || d.categoryText, { message: 'Kategori gerekli.' })
  .refine((d) => (d.lat != null && d.lng != null) || d.city, { message: 'Konum gerekli.' })

export async function POST(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const body = schema.parse(await req.json())

    await resolveSource(ctx, 'overpass')

    // Konumu şimdi çöz — hatalıysa kredi harcamadan reddet
    let coords = body.lat != null && body.lng != null ? { lat: body.lat, lng: body.lng } : null
    if (!coords) {
      const query = body.district
        ? `${body.district}, ${body.city}, Türkiye`
        : `${body.city}, Türkiye`
      coords = await geocode(query)
      if (!coords) {
        return NextResponse.json({ error: `Konum bulunamadı: ${query}` }, { status: 400 })
      }
    }

    const search = await prismaUnscoped.$transaction(async (tx) => {
      const created = await tx.search.create({
        data: {
          tenantId,
          userId: ctx.userId,
          mode: 'sweep',
          sourceCode: 'overpass',
          params: {
            categoryKey: body.categoryKey,
            categoryText: body.categoryText,
            city: body.city,
            district: body.district,
            lat: coords!.lat,
            lng: coords!.lng,
            radiusM: body.radiusM,
            limit: body.limit,
            websiteStatus: 'opportunity',
          } as unknown as Prisma.InputJsonValue,
          status: 'queued',
        },
      })
      return created
    })

    await getQueue<SweepSearchJobData>(QUEUE_NAMES.sweepSearch).add('sweep', {
      searchId: search.id,
      tenantId,
      userId: ctx.userId,
    })

    return NextResponse.json({ search }, { status: 201 })
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

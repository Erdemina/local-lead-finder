import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionContext, AuthError, type SessionContext } from '@/lib/auth-context'
import { runInteractiveSearch } from '@/lib/discovery/engine'

export const dynamic = 'force-dynamic'
// AI araması (web araştırma turu + yapılandırma + skorlama) 150 sn'yi bulabiliyor.
export const maxDuration = 300

const schema = z
  .object({
    categoryKey: z.string().max(40).optional(),
    categoryText: z.string().max(80).optional(),
    city: z.string().max(60).optional(),
    district: z.string().max(60).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    radiusM: z.number().min(200).max(30000).default(5000),
    limit: z.number().int().min(5).max(200).default(50),
    websiteStatus: z.enum(['any', 'no_website', 'broken', 'working']).default('any'),
    sourceCode: z.string().max(40).optional(),
    enrichWithAi: z.boolean().default(false),
    product: z.string().max(120).optional(),
  })
  .refine((d) => d.categoryKey || d.categoryText, {
    message: 'Kategori seçin veya serbest metin girin.',
  })
  .refine((d) => (d.lat != null && d.lng != null) || d.city, {
    message: 'Şehir veya harita konumu belirtin.',
  })

export async function POST(req: NextRequest) {
  let ctx: SessionContext
  try {
    ctx = await getSessionContext()
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  let params: z.infer<typeof schema>
  try {
    params = schema.parse(await req.json())
  } catch (e) {
    const msg =
      e instanceof z.ZodError
        ? e.errors[0]?.message ?? 'Geçersiz arama parametreleri.'
        : 'Geçersiz istek gövdesi.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }
      try {
        const { search, results } = await runInteractiveSearch(
          ctx,
          {
            categoryKey: params.categoryKey,
            categoryText: params.categoryText,
            city: params.city,
            district: params.district,
            lat: params.lat,
            lng: params.lng,
            radiusM: params.radiusM,
            limit: params.limit,
            websiteStatus: params.websiteStatus,
            sourceCode: params.sourceCode,
            enrichWithAi: params.enrichWithAi,
            product: params.product,
          },
          (message, progress) => send({ status: 'processing', message, progress })
        )
        send({
          status: 'completed',
          searchId: search.id,
          resultCount: results.length,
          results: results.map((r) => ({
            id: r.id,
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
            healthReason: r.healthDetail?.reason,
            aiScore: r.aiScore ?? null,
            aiNote: r.aiNote ?? null,
            aiReason: r.aiReason ?? null,
          })),
        })
      } catch (e) {
        const message =
          e instanceof AuthError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Arama sırasında beklenmeyen bir hata oluştu.'
        send({ status: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

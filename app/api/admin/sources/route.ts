import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireSuperAdmin, apiError } from '@/lib/auth-context'
import { audit } from '@/lib/audit'
import { encryptSecret } from '@/lib/crypto'
import { createAiClient, loadAiSource, AiError } from '@/lib/ai/provider'
import { parseAiConfig, type AiSourceConfig } from '@/lib/ai/config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AI_SOURCES = ['ai_search', 'llm_research']

const patchSchema = z.object({
  code: z.string().min(2).max(40),
  enabledGlobally: z.boolean().optional(),
  provider: z.enum(['anthropic', 'openrouter']).optional(),
  model: z.string().max(120).optional(),
  webSearch: z.boolean().optional(),
  /** Boş string = anahtarı sil, undefined = dokunma */
  apiKey: z.string().max(400).optional(),
  test: z.boolean().optional(),
})

export async function GET() {
  try {
    const ctx = await getSessionContext()
    requireSuperAdmin(ctx)

    const sources = await prismaUnscoped.searchSource.findMany({ orderBy: { code: 'asc' } })

    // Anahtarlar asla dışa verilmez — yalnız varlık bilgisi.
    return NextResponse.json({
      sources: sources.map((s) => ({
        code: s.code,
        name: s.name,
        kind: s.kind,
        enabledGlobally: s.enabledGlobally,
        tosNotes: s.tosNotes,
        isAi: AI_SOURCES.includes(s.code),
        hasCredentials: !!s.credentialsEnc,
        config: parseAiConfig(s.config),
      })),
    })
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    requireSuperAdmin(ctx)
    const body = patchSchema.parse(await req.json())

    const source = await prismaUnscoped.searchSource.findUnique({ where: { code: body.code } })
    if (!source) {
      return NextResponse.json({ error: 'Veri kaynağı bulunamadı.' }, { status: 404 })
    }

    const current = parseAiConfig(source.config)
    const next: AiSourceConfig = {
      provider: body.provider ?? current.provider,
      model: body.model?.trim() || current.model,
      webSearch: body.webSearch ?? current.webSearch,
    }

    const data: Prisma.SearchSourceUpdateInput = {
      config: next as unknown as Prisma.InputJsonValue,
    }
    if (body.enabledGlobally != null) data.enabledGlobally = body.enabledGlobally
    if (body.apiKey != null) {
      data.credentialsEnc = body.apiKey.trim() ? encryptSecret(body.apiKey.trim()) : null
    }

    await prismaUnscoped.searchSource.update({ where: { code: body.code }, data })
    await audit(ctx, 'source.update', {
      targetType: 'SearchSource',
      targetId: body.code,
      meta: {
        provider: next.provider,
        model: next.model,
        enabledGlobally: body.enabledGlobally,
        keyChanged: body.apiKey != null,
      },
    })

    if (body.test) {
      const result = await testConnection(body.code)
      return NextResponse.json({ ok: true, test: result })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz form verisi.' }, { status: 400 })
    }
    return apiError(e)
  }
}

/** Ucuz bir çağrı ile anahtar + model kombinasyonunu doğrular. */
async function testConnection(code: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { config, apiKey } = await loadAiSource(code)
    const client = createAiClient(config, apiKey)
    await client.run<{ ok: boolean }>({
      system: 'Bağlantı testi. Sadece aracı çağır.',
      user: 'ping',
      tool: {
        name: 'report_ok',
        description: 'Bağlantı testini onayla.',
        schema: {
          type: 'object',
          properties: { ok: { type: 'boolean', description: 'her zaman true' } },
          required: ['ok'],
          additionalProperties: false,
        },
      },
      webSearch: false,
      effort: 'low',
      maxTokens: 1024,
    })
    return { ok: true, message: `Bağlantı başarılı (${client.provider} / ${client.model}).` }
  } catch (e) {
    const message =
      e instanceof AiError || e instanceof Error ? e.message : 'Bilinmeyen bağlantı hatası.'
    return { ok: false, message }
  }
}

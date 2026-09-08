import type { Prisma, Search, WebsiteHealth } from '@prisma/client'
import { prismaUnscoped } from '@/lib/db'
import { AuthError, type SessionContext, requireTenant } from '@/lib/auth-context'
import { checkWebsiteHealthBatch, type HealthResult } from '@/lib/health/checker'
import { getAiClient, loadAiSource, createAiClient, AiError } from '@/lib/ai/provider'
import { scoreProspects, type ScorableItem } from '@/lib/ai/score'
import { geocode } from './nominatim'
import { createOverpassAdapter } from './adapters/overpass'
import { createAiSearchAdapter } from './adapters/ai-search'
import { normalizeCity } from './tr-provinces'
import type { Prospect, SourceAdapter, WebsiteStatusFilter } from './types'

export const AI_SEARCH_SOURCE = 'ai_search'
export const AI_ENRICH_SOURCE = 'llm_research'
export const DEFAULT_PRODUCT = 'web sitesi ve dijital pazarlama hizmetleri'

export interface EngineParams {
  categoryKey?: string
  categoryText?: string
  city?: string
  district?: string
  lat?: number
  lng?: number
  radiusM: number
  limit: number
  websiteStatus: WebsiteStatusFilter
  sourceCode?: string
  /** Sonuçları AI ile skorla + notlandır (ek kredi) */
  enrichWithAi?: boolean
  /** Skorlama promptunda kullanılacak "ne satıyoruz" bilgisi */
  product?: string
}

export interface EngineResultItem extends Prospect {
  id: string
  websiteHealth: WebsiteHealth
  healthDetail?: HealthResult['detail']
  aiScore?: number | null
  aiNote?: string | null
  aiReason?: string | null
}

type ProgressFn = (message: string, progress: number) => void

async function getAdapter(
  code: string,
  source: { config: Prisma.JsonValue; rateLimitPerSec: number | null }
): Promise<SourceAdapter> {
  const config = (source.config ?? {}) as Record<string, unknown>
  switch (code) {
    case 'overpass':
      return createOverpassAdapter({
        url: typeof config.url === 'string' ? config.url : undefined,
        rateLimitPerSec: source.rateLimitPerSec ?? 1,
      })
    case AI_SEARCH_SOURCE:
      return createAiSearchAdapter(await getAiClient(AI_SEARCH_SOURCE))
    default:
      throw new AuthError(400, 'Bu veri kaynağı henüz desteklenmiyor.')
  }
}

export async function resolveSource(ctx: SessionContext, sourceCode: string) {
  const source = await prismaUnscoped.searchSource.findUnique({ where: { code: sourceCode } })
  if (!source || !source.enabledGlobally) {
    throw new AuthError(400, 'Bu veri kaynağı şu anda kullanılamıyor.')
  }
  return source
}

async function resolveCoords(params: EngineParams): Promise<{ lat: number; lng: number }> {
  if (params.lat != null && params.lng != null) {
    return { lat: params.lat, lng: params.lng }
  }
  if (!params.city) {
    throw new AuthError(400, 'Şehir veya koordinat belirtmelisiniz.')
  }
  const query = params.district
    ? `${params.district}, ${params.city}, Türkiye`
    : `${params.city}, Türkiye`
  const coords = await geocode(query)
  if (!coords) {
    throw new AuthError(400, `Konum bulunamadı: ${query}. Yazımı kontrol edin.`)
  }
  return coords
}

export const HEALTH_PRIORITY: Record<string, number> = {
  no_website: 0,
  red: 1,
  yellow: 2,
  green: 3,
  unknown: 4,
}

export function healthMatchesFilter(health: WebsiteHealth, filter: WebsiteStatusFilter): boolean {
  switch (filter) {
    case 'no_website':
      return health === 'no_website'
    case 'broken':
      return health === 'yellow' || health === 'red'
    case 'working':
      return health === 'green'
    case 'opportunity':
      return health === 'no_website' || health === 'yellow' || health === 'red'
    default:
      return true
  }
}

/**
 * Sonuçları AI ile skorlar ve DB'ye yazar. Skorlama arama akışını asla bozmamalı:
 * hata olursa sonuçlar skorsuz döner, kullanıcıya ilerleme mesajıyla bildirilir.
 */
async function applyAiScores(
  results: EngineResultItem[],
  product: string,
  onProgress: ProgressFn
): Promise<void> {
  try {
    const { config, apiKey } = await loadAiSource(AI_ENRICH_SOURCE)
    const client = createAiClient(config, apiKey)

    const items: ScorableItem[] = results.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      address: r.address,
      city: r.city,
      website: r.website,
      websiteHealth: r.websiteHealth,
    }))

    const scores = await scoreProspects(client, product, items, (done, total) => {
      onProgress(`Adaylar AI ile skorlanıyor… (${done}/${total})`, 88)
    })

    for (const item of results) {
      const score = scores.get(item.id)
      if (!score) continue
      item.aiScore = score.aiScore
      item.aiNote = score.aiNote
      item.aiReason = score.aiReason
      await prismaUnscoped.searchResult.update({
        where: { id: item.id },
        data: { ...score, aiModel: client.model },
      })
    }

    // En sıcak adaylar üste: önce AI skoru, skoru olmayanlar site durumuna göre.
    results.sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1))
  } catch (e) {
    const detail = e instanceof AiError || e instanceof Error ? e.message : 'bilinmeyen hata'
    onProgress(`AI skorlama atlandı: ${detail}`, 92)
  }
}

export async function runInteractiveSearch(
  ctx: SessionContext,
  params: EngineParams,
  onProgress: ProgressFn
): Promise<{ search: Search; results: EngineResultItem[] }> {
  const tenantId = requireTenant(ctx)
  const sourceCode = params.sourceCode ?? 'overpass'
  const source = await resolveSource(ctx, sourceCode)
  const enrichWithAi = params.enrichWithAi === true

  // AI skorlama ayrı bir kaynak olarak tanımlıdır; kapalıysa burada durur.
  if (enrichWithAi) await resolveSource(ctx, AI_ENRICH_SOURCE)

  const adapter = await getAdapter(sourceCode, source)

  onProgress('Konum çözümleniyor…', 5)
  const coords = await resolveCoords(params)

  const search = await prismaUnscoped.$transaction(async (tx) => {
    const created = await tx.search.create({
      data: {
        tenantId,
        userId: ctx.userId,
        mode: 'interactive',
        sourceCode,
        params: params as unknown as Prisma.InputJsonValue,
        status: 'running',
        enrichWithAi,
      },
    })
    return created
  })

  try {
    onProgress('İşletmeler aranıyor…', 15)
    const prospects = await adapter.search({
      categoryKey: params.categoryKey,
      categoryText: params.categoryText,
      lat: coords.lat,
      lng: coords.lng,
      radiusM: params.radiusM,
      limit: params.limit,
      city: params.city,
      district: params.district,
    })

    onProgress(`${prospects.length} işletme bulundu, web siteleri kontrol ediliyor…`, 45)

    // Filtre no_website ise sitesi olanları kontrol etmeye gerek yok
    const needsCheck =
      params.websiteStatus === 'no_website'
        ? []
        : prospects.filter((p) => p.website)
    const healthMap = needsCheck.length
      ? await checkWebsiteHealthBatch(needsCheck)
      : new Map<Prospect, HealthResult>()

    onProgress('Sonuçlar hazırlanıyor…', 80)

    const withHealth = prospects.map((p) => {
      const health: HealthResult = p.website
        ? (healthMap.get(p) ?? { status: 'green', detail: { reason: 'Kontrol edilmedi' } })
        : { status: 'no_website', detail: { reason: 'Web sitesi yok' } }
      return { prospect: p, health }
    })

    const filtered = withHealth.filter(({ health }) =>
      healthMatchesFilter(health.status as WebsiteHealth, params.websiteStatus)
    )

    // Sitesi olmayan / bozuk olanlar en değerli — önce onlar
    filtered.sort(
      (a, b) => (HEALTH_PRIORITY[a.health.status] ?? 9) - (HEALTH_PRIORITY[b.health.status] ?? 9)
    )

    const results: EngineResultItem[] = []
    for (const { prospect, health } of filtered) {
      const row = await prismaUnscoped.searchResult.create({
        data: {
          searchId: search.id,
          tenantId,
          name: prospect.name,
          category: prospect.category,
          address: prospect.address,
          city: normalizeCity(prospect.city, params.city),
          district: prospect.district ?? params.district,
          phone: prospect.phone,
          website: prospect.website,
          lat: prospect.lat,
          lng: prospect.lng,
          sourceCode,
          sourceRecordId: prospect.sourceRecordId,
          websiteHealth: health.status as WebsiteHealth,
          healthCheckedAt: prospect.website || health.status === 'no_website' ? new Date() : null,
          healthDetail: health.detail as unknown as Prisma.InputJsonValue,
          score: prospect.score,
          raw: prospect.raw as Prisma.InputJsonValue,
        },
      })
      results.push({
        ...prospect,
        id: row.id,
        websiteHealth: health.status as WebsiteHealth,
        healthDetail: health.detail,
      })
    }

    if (enrichWithAi && results.length > 0) {
      onProgress('Adaylar AI ile skorlanıyor…', 88)
      await applyAiScores(results, params.product ?? DEFAULT_PRODUCT, onProgress)
    }

    const done = await prismaUnscoped.search.update({
      where: { id: search.id },
      data: { status: 'done', resultCount: results.length, finishedAt: new Date() },
    })
    return { search: done, results }
  } catch (e) {
    await prismaUnscoped.search.update({
      where: { id: search.id },
      data: { status: 'failed', error: e instanceof Error ? e.message : 'Bilinmeyen hata', finishedAt: new Date() },
    })
    throw e
  }
}

import type { Job } from 'bullmq'
import type { Prisma, WebsiteHealth } from '@prisma/client'
import { prismaUnscoped } from '@/lib/db'
import { createOverpassAdapter } from '@/lib/discovery/adapters/overpass'
import { HEALTH_PRIORITY, healthMatchesFilter } from '@/lib/discovery/engine'
import { normalizeCity } from '@/lib/discovery/tr-provinces'
import type { WebsiteStatusFilter } from '@/lib/discovery/types'
import { checkWebsiteHealthBatch, type HealthResult } from '@/lib/health/checker'
import type { SweepSearchJobData } from '@/lib/queue'

interface SweepParams {
  categoryKey?: string
  categoryText?: string
  /** Taranan il — OSM etiketi eksik/hatalı olduğunda sonuçlara bu yazılır */
  city?: string
  lat: number
  lng: number
  radiusM: number
  limit: number
  websiteStatus: WebsiteStatusFilter
}

export async function processSweepSearch(job: Job<SweepSearchJobData>): Promise<void> {
  const { searchId, tenantId } = job.data
  const search = await prismaUnscoped.search.findUnique({ where: { id: searchId } })
  if (!search || search.tenantId !== tenantId) return
  if (search.status === 'done') return

  const params = search.params as unknown as SweepParams

  try {
    await prismaUnscoped.search.update({
      where: { id: searchId },
      data: { status: 'running' },
    })

    const source = await prismaUnscoped.searchSource.findUnique({ where: { code: 'overpass' } })
    const config = (source?.config ?? {}) as Record<string, unknown>
    const adapter = createOverpassAdapter({
      url: typeof config.url === 'string' ? config.url : undefined,
      rateLimitPerSec: source?.rateLimitPerSec ?? 1,
    })

    const prospects = await adapter.search({
      categoryKey: params.categoryKey,
      categoryText: params.categoryText,
      lat: params.lat,
      lng: params.lng,
      radiusM: params.radiusM,
      limit: params.limit,
    })

    const needsCheck =
      params.websiteStatus === 'no_website' ? [] : prospects.filter((p) => p.website)
    const healthMap = new Map<(typeof prospects)[number], HealthResult>()
    // Partiler halinde kontrol — tek seferde yüzlerce paralel fetch açma
    for (let i = 0; i < needsCheck.length; i += 30) {
      const batch = needsCheck.slice(i, i + 30)
      const results = await checkWebsiteHealthBatch(batch, 6)
      for (const [key, value] of results) healthMap.set(key, value)
    }

    const withHealth = prospects.map((p) => {
      const health: HealthResult = p.website
        ? (healthMap.get(p) ?? { status: 'unknown', detail: { reason: 'Kontrol edilmedi' } })
        : { status: 'no_website', detail: { reason: 'Web sitesi yok' } }
      return { prospect: p, health }
    })

    const filtered = withHealth
      .filter(({ health }) =>
        healthMatchesFilter(health.status as WebsiteHealth, params.websiteStatus)
      )
      .sort(
        (a, b) => (HEALTH_PRIORITY[a.health.status] ?? 9) - (HEALTH_PRIORITY[b.health.status] ?? 9)
      )
      // Adapter bilerek fazla çekiyor; kırpma filtreden sonra yapılır.
      .slice(0, params.limit)

    // Kuyruk yeniden denemesi (attempts:2) aynı taramayı ikinci kez işleyebilir;
    // önceki denemenin yazdıkları silinmezse sonuçlar mükerrer kaydediliyordu.
    await prismaUnscoped.searchResult.deleteMany({ where: { searchId, tenantId } })

    await prismaUnscoped.searchResult.createMany({
      data: filtered.map(({ prospect, health }) => ({
        searchId,
        tenantId,
        name: prospect.name,
        category: prospect.category,
        address: prospect.address,
        city: normalizeCity(prospect.city, params.city),
        district: prospect.district,
        phone: prospect.phone,
        website: prospect.website,
        lat: prospect.lat,
        lng: prospect.lng,
        sourceCode: 'overpass',
        sourceRecordId: prospect.sourceRecordId,
        websiteHealth: health.status as WebsiteHealth,
        healthCheckedAt: health.status === 'unknown' ? null : new Date(),
        healthDetail: health.detail as unknown as Prisma.InputJsonValue,
      })),
    })

    await prismaUnscoped.search.update({
      where: { id: searchId },
      data: { status: 'done', resultCount: filtered.length, finishedAt: new Date() },
    })
    console.log(`[sweep] tamamlandı: ${searchId} — ${filtered.length} sonuç`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Bilinmeyen tarama hatası'
    console.error(`[sweep] hata (${searchId}):`, message)
    await prismaUnscoped.search.update({
      where: { id: searchId },
      data: { status: 'failed', error: message, finishedAt: new Date() },
    })
    throw e
  }
}

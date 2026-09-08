import type { Job } from 'bullmq'
import { prismaUnscoped } from '@/lib/db'
import { getQueue, QUEUE_NAMES, type HealthCheckJobData, type ScheduledJobData } from '@/lib/queue'

export async function processScheduled(job: Job<ScheduledJobData>): Promise<void> {
  switch (job.data.task) {
    case 'health-recheck':
      return healthRecheck()
    case 'retention-purge':
      return retentionPurge()
  }
}

// 14 günden eski (veya hiç yapılmamış) kontrolleri tenant başına partiler halinde kuyruğa at
async function healthRecheck(): Promise<void> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const stale = await prismaUnscoped.lead.findMany({
    where: {
      website: { not: null },
      OR: [{ healthCheckedAt: null }, { healthCheckedAt: { lt: cutoff } }],
    },
    select: { id: true, tenantId: true },
    take: 500,
  })
  const byTenant = new Map<string, string[]>()
  for (const lead of stale) {
    const list = byTenant.get(lead.tenantId) ?? []
    list.push(lead.id)
    byTenant.set(lead.tenantId, list)
  }
  const queue = getQueue<HealthCheckJobData>(QUEUE_NAMES.healthCheck)
  for (const [tenantId, leadIds] of byTenant) {
    for (let i = 0; i < leadIds.length; i += 25) {
      await queue.add('recheck', { tenantId, leadIds: leadIds.slice(i, i + 25) })
    }
  }
  console.log(`[scheduled] sağlık yeniden kontrolü: ${stale.length} aday kuyruğa alındı`)
}

// KVKK: saklama süresi dolan adayları kalıcı sil
async function retentionPurge(): Promise<void> {
  const tenants = await prismaUnscoped.tenant.findMany({
    where: { retentionDays: { not: null } },
    select: { id: true, retentionDays: true },
  })
  let purged = 0
  for (const tenant of tenants) {
    const cutoff = new Date(Date.now() - tenant.retentionDays! * 24 * 60 * 60 * 1000)
    const result = await prismaUnscoped.lead.deleteMany({
      where: { tenantId: tenant.id, collectedAt: { lt: cutoff } },
    })
    purged += result.count
  }
  console.log(`[scheduled] KVKK saklama temizliği: ${purged} aday silindi`)
}

import type { Job } from 'bullmq'
import type { Prisma, WebsiteHealth } from '@prisma/client'
import { prismaUnscoped } from '@/lib/db'
import { checkWebsiteHealthBatch } from '@/lib/health/checker'
import type { HealthCheckJobData } from '@/lib/queue'

export async function processHealthCheck(job: Job<HealthCheckJobData>): Promise<void> {
  const { tenantId, leadIds } = job.data
  const leads = await prismaUnscoped.lead.findMany({
    where: { id: { in: leadIds }, tenantId },
  })
  if (!leads.length) return

  const results = await checkWebsiteHealthBatch(leads, 4)
  for (const lead of leads) {
    const result = results.get(lead)
    if (!result) continue
    await prismaUnscoped.lead.update({
      where: { id: lead.id },
      data: {
        websiteHealth: result.status as WebsiteHealth,
        healthCheckedAt: new Date(),
        healthDetail: result.detail as unknown as Prisma.InputJsonValue,
      },
    })
  }
  console.log(`[health-check] ${leads.length} aday kontrol edildi (tenant ${tenantId})`)
}

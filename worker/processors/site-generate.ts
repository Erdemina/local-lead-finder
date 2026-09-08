import type { Job } from 'bullmq'
import { prismaUnscoped } from '@/lib/db'
import { generateSiteFiles, deleteSiteFiles } from '@/lib/sites/render'
import type { SiteFields } from '@/lib/sites/templates'
import type { SiteGenerateJobData } from '@/lib/queue'

export async function processSiteGenerate(job: Job<SiteGenerateJobData>): Promise<void> {
  const { op, siteId } = job.data

  if (op === 'delete') {
    const site = await prismaUnscoped.generatedSite.findUnique({ where: { id: siteId } })
    if (!site) return
    await deleteSiteFiles(site.slug)
    await prismaUnscoped.generatedSite.delete({ where: { id: siteId } })
    console.log(`[site-generate] silindi: ${site.slug}`)
    return
  }

  const site = await prismaUnscoped.generatedSite.findUnique({
    where: { id: siteId },
    include: { action: true },
  })
  if (!site) {
    console.warn(`[site-generate] site bulunamadı: ${siteId}`)
    return
  }

  try {
    await prismaUnscoped.generatedSite.update({
      where: { id: site.id },
      data: { status: 'generating' },
    })
    await prismaUnscoped.action.update({
      where: { id: site.actionId },
      data: { status: 'running' },
    })

    await generateSiteFiles({
      templateId: site.templateId,
      slug: site.slug,
      fields: site.fields as unknown as SiteFields,
    })

    const baseUrl = (process.env.PUBLIC_SITES_BASE_URL ?? '/websites').replace(/\/$/, '')
    const url = `${baseUrl}/${site.slug}/`

    await prismaUnscoped.generatedSite.update({
      where: { id: site.id },
      data: { status: 'ready', url, publishedAt: new Date() },
    })
    await prismaUnscoped.action.update({
      where: { id: site.actionId },
      data: { status: 'done', output: { url }, finishedAt: new Date() },
    })
    console.log(`[site-generate] hazır: ${url}`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Bilinmeyen üretim hatası'
    console.error(`[site-generate] hata (${site.slug}):`, message)

    await prismaUnscoped.generatedSite.update({
      where: { id: site.id },
      data: { status: 'failed' },
    })
    await prismaUnscoped.action.update({
      where: { id: site.actionId },
      data: { status: 'failed', error: message, finishedAt: new Date() },
    })
    throw e
  }
}

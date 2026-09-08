import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { checkWebsiteHealthBatch } from '@/lib/health/checker'
import type { Prisma, WebsiteHealth } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Manuel yeniden kontrol — küçük partiler inline yapılır (worker gerektirmez).
// Periyodik toplu kontroller worker/processors/health-check.ts'te.
const schema = z.object({
  leadIds: z.array(z.string()).max(50).optional(),
  searchResultIds: z.array(z.string()).max(50).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const body = schema.parse(await req.json())

    const updated: { id: string; websiteHealth: WebsiteHealth; kind: 'lead' | 'result' }[] = []

    if (body.leadIds?.length) {
      const leads = await prisma.lead.findMany({
        where: { id: { in: body.leadIds }, tenantId },
      })
      const map = await checkWebsiteHealthBatch(leads)
      for (const lead of leads) {
        const result = map.get(lead)
        if (!result) continue
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            tenantId,
            websiteHealth: result.status as WebsiteHealth,
            healthCheckedAt: new Date(),
            healthDetail: result.detail as unknown as Prisma.InputJsonValue,
          },
        })
        updated.push({ id: lead.id, websiteHealth: result.status as WebsiteHealth, kind: 'lead' })
      }
    }

    if (body.searchResultIds?.length) {
      const results = await prisma.searchResult.findMany({
        where: { id: { in: body.searchResultIds }, tenantId },
      })
      const map = await checkWebsiteHealthBatch(results)
      for (const row of results) {
        const result = map.get(row)
        if (!result) continue
        await prisma.searchResult.update({
          where: { id: row.id },
          data: {
            tenantId,
            websiteHealth: result.status as WebsiteHealth,
            healthCheckedAt: new Date(),
            healthDetail: result.detail as unknown as Prisma.InputJsonValue,
          },
        })
        updated.push({ id: row.id, websiteHealth: result.status as WebsiteHealth, kind: 'result' })
      }
    }

    return NextResponse.json({ updated })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    }
    return apiError(e)
  }
}

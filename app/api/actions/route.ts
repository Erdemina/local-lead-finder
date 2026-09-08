import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { getQueue, QUEUE_NAMES, type SiteGenerateJobData } from '@/lib/queue'
import { isValidTemplate } from '@/lib/sites/templates'
import { uniqueSlug } from '@/lib/slug'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  leadId: z.string(),
  type: z.literal('generate_site'),
  templateId: z.string(),
  fields: z.object({
    businessName: z.string().min(2).max(120),
    category: z.string().max(120).optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(300).optional(),
    about: z.string().max(2000).optional(),
  }),
})

export async function GET() {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const actions = await prisma.action.findMany({
      where: { tenantId },
      include: {
        lead: { select: { id: true, name: true } },
        site: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json({ actions })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const body = createSchema.parse(await req.json())

    if (!isValidTemplate(body.templateId)) {
      return NextResponse.json({ error: 'Geçersiz şablon.' }, { status: 400 })
    }
    const lead = await prisma.lead.findFirst({ where: { id: body.leadId, tenantId } })
    if (!lead) return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })

    const slug = uniqueSlug(body.fields.businessName)

    const { action, site } = await prismaUnscoped.$transaction(async (tx) => {
      const createdAction = await tx.action.create({
        data: {
          tenantId,
          leadId: lead.id,
          userId: ctx.userId,
          type: 'generate_site',
          status: 'queued',
          input: { templateId: body.templateId, fields: body.fields },
        },
      })
      const createdSite = await tx.generatedSite.create({
        data: {
          tenantId,
          leadId: lead.id,
          actionId: createdAction.id,
          slug,
          templateId: body.templateId,
          status: 'queued',
          fields: body.fields,
        },
      })
      return { action: createdAction, site: createdSite }
    })

    await getQueue<SiteGenerateJobData>(QUEUE_NAMES.siteGenerate).add('generate', {
      op: 'generate',
      siteId: site.id,
      tenantId,
    })

    return NextResponse.json({ action, site }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Form alanlarını kontrol edin.' }, { status: 400 })
    }
    return apiError(e)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma, type LeadStage } from '@prisma/client'
import { prisma, prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { audit } from '@/lib/audit'
import { STAGE_VALUES } from '@/lib/leads/stages'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const rowSchema = z.object({
  rowNumber: z.number().int(),
  leadId: z.string().max(40).nullable(),
  name: z.string().max(200),
  stage: z.enum(STAGE_VALUES as [string, ...string[]]).nullable().optional(),
  feedback: z.string().max(4000).nullable().optional(),
  lastContactAt: z.string().datetime().nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  email: z.string().max(160).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  district: z.string().max(80).nullable().optional(),
  address: z.string().max(400).nullable().optional(),
})

const schema = z.object({ rows: z.array(rowSchema).min(1).max(5000) })

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const body = schema.parse(await req.json())

    const updates = body.rows.filter((r) => r.leadId)
    const creates = body.rows.filter((r) => !r.leadId && clean(r.name))

    // Kiracı doğrulaması: istemciden gelen id'lere asla güvenilmez.
    const owned = updates.length
      ? await prisma.lead.findMany({
          where: { tenantId, id: { in: updates.map((r) => r.leadId!) } },
        })
      : []
    const ownedById = new Map(owned.map((l) => [l.id, l]))

    const errors: { rowNumber: number; message: string }[] = []
    let stageChanged = 0
    let contactsUpdated = 0
    let notesAdded = 0
    let created = 0

    await prismaUnscoped.$transaction(async (tx) => {
      for (const row of updates) {
        const lead = ownedById.get(row.leadId!)
        if (!lead) {
          errors.push({ rowNumber: row.rowNumber, message: `Aday bulunamadı: ${row.leadId}` })
          continue
        }

        const data: Prisma.LeadUpdateInput = {}
        if (row.stage && row.stage !== lead.stage) {
          data.stage = row.stage as LeadStage
          stageChanged++
        }

        let contactTouched = false
        for (const field of ['phone', 'email', 'website'] as const) {
          const next = clean(row[field])
          if (next && next !== (lead[field] ?? '')) {
            ;(data as Record<string, unknown>)[field] = next
            contactTouched = true
          }
        }
        // Website değiştiyse eski sağlık verisi geçersiz — yeniden kontrol edilmeli.
        if ((data as Record<string, unknown>).website) {
          data.websiteHealth = 'unknown'
          data.healthCheckedAt = null
          data.healthDetail = Prisma.DbNull
        }

        if (row.lastContactAt) {
          const next = new Date(row.lastContactAt)
          if (!Number.isNaN(next.getTime())) {
            data.lastContactAt = next
            contactTouched = true
          }
        }
        if (contactTouched) contactsUpdated++

        if (Object.keys(data).length > 0) {
          await tx.lead.update({ where: { id: lead.id }, data })
        }

        const feedback = clean(row.feedback)
        if (feedback) {
          // Aynı notu iki kez yüklemek tekrar kayıt oluşturmasın.
          const last = await tx.leadNote.findFirst({
            where: { leadId: lead.id, tenantId },
            orderBy: { createdAt: 'desc' },
            select: { body: true },
          })
          if (last?.body !== feedback) {
            await tx.leadNote.create({
              data: { leadId: lead.id, tenantId, userId: ctx.userId, body: feedback },
            })
            notesAdded++
          }
        }
      }

      for (const row of creates) {
        const lead = await tx.lead.create({
          data: {
            tenantId,
            name: clean(row.name)!,
            category: clean(row.category),
            city: clean(row.city),
            district: clean(row.district),
            address: clean(row.address),
            phone: clean(row.phone),
            email: clean(row.email),
            website: clean(row.website),
            stage: (row.stage ?? 'found') as LeadStage,
            lastContactAt: row.lastContactAt ? new Date(row.lastContactAt) : null,
            dataSource: 'csv_import',
          },
        })
        created++

        const feedback = clean(row.feedback)
        if (feedback) {
          await tx.leadNote.create({
            data: { leadId: lead.id, tenantId, userId: ctx.userId, body: feedback },
          })
          notesAdded++
        }
      }
    })

    await audit(ctx, 'leads.import', {
      tenantId,
      targetType: 'Lead',
      meta: { stageChanged, contactsUpdated, notesAdded, created, errors: errors.length },
    })

    return NextResponse.json({ stageChanged, contactsUpdated, notesAdded, created, errors })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz içe aktarma verisi.' }, { status: 400 })
    }
    return apiError(e)
  }
}

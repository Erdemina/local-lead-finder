import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getSessionContext, requireTenant, apiError } from '@/lib/auth-context'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(60).optional(),
  district: z.string().max(60).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().max(300).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const stage = req.nextUrl.searchParams.get('stage') ?? undefined
    const q = req.nextUrl.searchParams.get('q') ?? undefined

    const leads = await prisma.lead.findMany({
      where: {
        tenantId,
        ...(stage ? { stage: stage as any } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    })
    return NextResponse.json({ leads })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    const tenantId = requireTenant(ctx)
    const body = createSchema.parse(await req.json())

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        name: body.name,
        category: body.category,
        address: body.address,
        city: body.city,
        district: body.district,
        phone: body.phone,
        email: body.email || undefined,
        website: body.website,
        websiteHealth: body.website ? 'unknown' : 'no_website',
        dataSource: 'manual',
      },
    })
    return NextResponse.json({ lead }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Form alanlarını kontrol edin.' }, { status: 400 })
    }
    return apiError(e)
  }
}

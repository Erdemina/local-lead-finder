import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireSuperAdmin, apiError } from '@/lib/auth-context'
import { audit } from '@/lib/audit'
import { slugify, randomSuffix } from '@/lib/slug'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(2),
  ownerPassword: z.string().min(8),
})

export async function GET() {
  try {
    const ctx = await getSessionContext()
    requireSuperAdmin(ctx)
    const tenants = await prismaUnscoped.tenant.findMany({
      include: {
        users: { select: { email: true, lastLoginAt: true }, take: 1 },
        _count: { select: { leads: true, searches: true, sites: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ tenants })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getSessionContext()
    requireSuperAdmin(ctx)
    const body = createSchema.parse(await req.json())

    const existing = await prismaUnscoped.user.findUnique({
      where: { email: body.ownerEmail.toLowerCase().trim() },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Bu e-posta ile kayıtlı bir kullanıcı zaten var.' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(body.ownerPassword, 12)
    const tenant = await prismaUnscoped.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name: body.name,
          slug: `${slugify(body.name)}-${randomSuffix()}`,
        },
      })
      await tx.user.create({
        data: {
          email: body.ownerEmail.toLowerCase().trim(),
          passwordHash,
          name: body.ownerName,
          role: 'tenant_owner',
          tenantId: created.id,
        },
      })
      return created
    })

    await audit(ctx, 'tenant.create', {
      tenantId: tenant.id,
      targetType: 'Tenant',
      targetId: tenant.id,
      meta: { name: body.name },
    })
    return NextResponse.json({ tenant }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Form alanlarını kontrol edin: ' + e.errors.map((x) => x.path.join('.')).join(', ') },
        { status: 400 }
      )
    }
    return apiError(e)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma, prismaUnscoped } from '@/lib/db'
import { getSessionContext, requireTenant, requireSuperAdmin, apiError } from '@/lib/auth-context'
import { getQueue, QUEUE_NAMES, type SiteGenerateJobData } from '@/lib/queue'
import { audit } from '@/lib/audit'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

// Site silme: dosyalar sadece worker'ın erişebildiği volume'da olduğundan kuyruk üzerinden yapılır.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getSessionContext()
    const asAdmin = req.nextUrl.searchParams.get('admin') === '1'

    let site
    if (asAdmin) {
      requireSuperAdmin(ctx)
      site = await prismaUnscoped.generatedSite.findUnique({ where: { id: params.id } })
    } else {
      const tenantId = requireTenant(ctx)
      site = await prisma.generatedSite.findFirst({ where: { id: params.id, tenantId } })
    }
    if (!site) return NextResponse.json({ error: TR.common.noRecords }, { status: 404 })

    await getQueue<SiteGenerateJobData>(QUEUE_NAMES.siteGenerate).add('delete', {
      op: 'delete',
      siteId: site.id,
      tenantId: site.tenantId,
    })
    await audit(ctx, 'site.delete_requested', {
      tenantId: site.tenantId,
      targetType: 'GeneratedSite',
      targetId: site.id,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}

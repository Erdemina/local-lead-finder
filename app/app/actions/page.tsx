import { getSessionContext, requireTenant } from '@/lib/auth-context'
import { prisma } from '@/lib/db'
import { ActionsList, type ActionRow } from '@/app/_components/actions/actions-list'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export default async function ActionsPage() {
  const ctx = await getSessionContext()
  const tenantId = requireTenant(ctx)
  const actions = await prisma.action.findMany({
    where: { tenantId },
    include: {
      lead: { select: { id: true, name: true } },
      site: { select: { url: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const rows: ActionRow[] = actions.map((a) => ({
    id: a.id,
    type: a.type,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    leadId: a.lead.id,
    leadName: a.lead.name,
    siteUrl: a.site?.url ?? null,
    error: a.error,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{TR.actions.title}</h1>
      <ActionsList actions={rows} />
    </div>
  )
}

import { getSessionContext, requireTenant } from '@/lib/auth-context'
import { prisma } from '@/lib/db'
import { LeadsBoard, type LeadRow } from '@/app/_components/leads/leads-board'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const ctx = await getSessionContext()
  const tenantId = requireTenant(ctx)
  const leads = await prisma.lead.findMany({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
    take: 1000,
    select: {
      id: true,
      name: true,
      category: true,
      address: true,
      city: true,
      district: true,
      phone: true,
      email: true,
      website: true,
      stage: true,
      websiteHealth: true,
      dataSource: true,
      aiScore: true,
      aiNote: true,
    },
  })
  return <LeadsBoard initialLeads={leads as LeadRow[]} />
}

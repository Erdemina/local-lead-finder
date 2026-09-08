import { notFound } from 'next/navigation'
import { getSessionContext, requireTenant } from '@/lib/auth-context'
import { prisma } from '@/lib/db'
import { LeadDetail, type LeadDetailData } from '@/app/_components/leads/lead-detail'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getSessionContext()
  const tenantId = requireTenant(ctx)
  const lead = await prisma.lead.findFirst({
    where: { id: params.id, tenantId },
    include: {
      notes: { orderBy: { createdAt: 'desc' } },
      sites: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!lead) notFound()

  const data: LeadDetailData = {
    id: lead.id,
    name: lead.name,
    category: lead.category,
    address: lead.address,
    city: lead.city,
    district: lead.district,
    phone: lead.phone,
    email: lead.email,
    website: lead.website,
    stage: lead.stage,
    websiteHealth: lead.websiteHealth,
    healthCheckedAt: lead.healthCheckedAt?.toISOString() ?? null,
    dataSource: lead.dataSource,
    notes: lead.notes.map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
    })),
    sites: lead.sites.map((s) => ({
      id: s.id,
      slug: s.slug,
      status: s.status,
      url: s.url,
      templateId: s.templateId,
      createdAt: s.createdAt.toISOString(),
    })),
  }

  return <LeadDetail lead={data} />
}

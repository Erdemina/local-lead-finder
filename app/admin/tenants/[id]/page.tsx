import { notFound } from 'next/navigation'
import { prismaUnscoped } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TenantEditPanel } from '@/app/_components/admin/tenant-edit-panel'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = await prismaUnscoped.tenant.findUnique({
    where: { id: params.id },
    include: {
      users: { select: { email: true, name: true, role: true, lastLoginAt: true } },
      _count: { select: { leads: true, searches: true, sites: true, actions: true } },
    },
  })
  if (!tenant) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        <Badge variant={tenant.status === 'active' ? 'default' : 'destructive'}>
          {tenant.status === 'active' ? TR.admin.statusActive : TR.admin.statusSuspended}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: TR.nav.leads, value: tenant._count.leads },
          { label: TR.admin.statSearchesMonth, value: tenant._count.searches },
          { label: TR.admin.statSitesGenerated, value: tenant._count.sites },
          { label: TR.nav.actions, value: tenant._count.actions },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TenantEditPanel
        tenant={{
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          retentionDays: tenant.retentionDays,
        }}
      />
    </div>
  )
}

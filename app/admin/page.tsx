import { prismaUnscoped } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [tenantCount, searchesToday, searchesMonth, siteCount, leadCount] = await Promise.all([
    prismaUnscoped.tenant.count(),
    prismaUnscoped.search.count({ where: { createdAt: { gte: startOfDay } } }),
    prismaUnscoped.search.count({ where: { createdAt: { gte: startOfMonth } } }),
    prismaUnscoped.generatedSite.count({ where: { status: 'ready' } }),
    prismaUnscoped.lead.count(),
  ])

  const stats = [
    { label: TR.admin.statTenants, value: tenantCount },
    { label: TR.admin.statSearchesToday, value: searchesToday },
    { label: TR.admin.statSearchesMonth, value: searchesMonth },
    { label: TR.admin.statSitesGenerated, value: siteCount },
    { label: TR.admin.statActiveLeads, value: leadCount },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{TR.admin.dashboardTitle}</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

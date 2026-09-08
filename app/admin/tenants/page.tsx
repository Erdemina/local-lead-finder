import Link from 'next/link'
import { prismaUnscoped } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export default async function AdminTenantsPage() {
  const tenants = await prismaUnscoped.tenant.findMany({
    include: {
      users: { select: { email: true, lastLoginAt: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      _count: { select: { leads: true, searches: true, sites: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{TR.admin.tenantsTitle}</h1>
        <Button asChild>
          <Link href="/admin/tenants/new" className="gap-1">
            <Plus className="h-4 w-4" />
            {TR.admin.createTenant}
          </Link>
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{TR.admin.tenantName}</TableHead>
              <TableHead>{TR.admin.ownerEmail}</TableHead>
              <TableHead>{TR.admin.statusLabel}</TableHead>
              <TableHead className="text-right">{TR.nav.leads}</TableHead>
              <TableHead>{TR.admin.lastActive}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {TR.common.noRecords}
                </TableCell>
              </TableRow>
            )}
            {tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link href={`/admin/tenants/${t.id}`} className="font-medium hover:underline">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.users[0]?.email ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={t.status === 'active' ? 'default' : 'destructive'}>
                    {t.status === 'active' ? TR.admin.statusActive : TR.admin.statusSuspended}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{t._count.leads}</TableCell>
                <TableCell className="text-muted-foreground">
                  {t.users[0]?.lastLoginAt
                    ? new Date(t.users[0].lastLoginAt).toLocaleDateString('tr-TR')
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

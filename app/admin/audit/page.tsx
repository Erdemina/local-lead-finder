import { prismaUnscoped } from '@/lib/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export default async function AuditLogPage() {
  const logs = await prismaUnscoped.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const users = await prismaUnscoped.user.findMany({
    where: { id: { in: Array.from(new Set(logs.map((l) => l.actorUserId))) } },
    select: { id: true, email: true },
  })
  const emailById = new Map(users.map((u) => [u.id, u.email]))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{TR.admin.auditTitle}</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{TR.common.date}</TableHead>
              <TableHead>{TR.admin.auditActor}</TableHead>
              <TableHead>{TR.admin.auditAction}</TableHead>
              <TableHead>{TR.admin.auditTarget}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {TR.common.noRecords}
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString('tr-TR')}
                </TableCell>
                <TableCell>{emailById.get(log.actorUserId) ?? log.actorUserId}</TableCell>
                <TableCell className="font-mono text-sm">{log.action}</TableCell>
                <TableCell className="text-muted-foreground">
                  {log.targetType ? `${log.targetType}: ${log.targetId ?? ''}` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

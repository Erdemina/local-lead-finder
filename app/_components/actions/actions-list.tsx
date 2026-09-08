'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Copy, ExternalLink } from 'lucide-react'
import { TR } from '@/lib/i18n/tr'

export interface ActionRow {
  id: string
  type: string
  status: string
  createdAt: string
  leadId: string
  leadName: string
  siteUrl: string | null
  error: string | null
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  done: 'default',
  failed: 'destructive',
  queued: 'secondary',
  running: 'secondary',
}

const STATUS_LABELS: Record<string, string> = {
  queued: TR.actions.statusQueued,
  running: TR.actions.statusRunning,
  done: TR.actions.statusDone,
  failed: TR.actions.statusFailed,
}

export function ActionsList({ actions }: { actions: ActionRow[] }) {
  if (actions.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">{TR.actions.noActions}</p>
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{TR.common.date}</TableHead>
            <TableHead>{TR.nav.leads}</TableHead>
            <TableHead>İşlem</TableHead>
            <TableHead>{TR.admin.statusLabel}</TableHead>
            <TableHead className="text-right">{TR.common.details}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {new Date(a.createdAt).toLocaleString('tr-TR')}
              </TableCell>
              <TableCell>
                <Link href={`/app/leads/${a.leadId}`} className="font-medium hover:underline">
                  {a.leadName}
                </Link>
              </TableCell>
              <TableCell>
                {a.type === 'generate_site' ? TR.actions.typeGenerateSite : a.type}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[a.status] ?? 'secondary'}>
                  {STATUS_LABELS[a.status] ?? a.status}
                </Badge>
                {a.error && (
                  <span className="ml-2 text-xs text-destructive" title={a.error}>
                    {a.error.slice(0, 60)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {a.siteUrl && (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(a.siteUrl!)
                        toast.success(TR.common.copied)
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={a.siteUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

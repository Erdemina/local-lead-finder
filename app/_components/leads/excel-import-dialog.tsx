'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { CHANGE_LABELS, type ImportRow, type ImportSummary } from '@/lib/excel/import-diff'
import { TR } from '@/lib/i18n/tr'

const BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  stage_change: 'default',
  note_added: 'secondary',
  contact_updated: 'secondary',
  new_lead: 'default',
  unchanged: 'outline',
  error: 'destructive',
}

export function ExcelImportDialog() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const actionable = useMemo(
    () => (rows ?? []).filter((r) => r.type !== 'unchanged' && r.type !== 'error'),
    [rows]
  )

  const reset = useCallback(() => {
    setRows(null)
    setSummary(null)
    setSelected(new Set())
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  async function analyze(file: File) {
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/leads/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? TR.common.genericError)
        return
      }
      const parsed = data.rows as ImportRow[]
      setRows(parsed)
      setSummary(data.summary as ImportSummary)
      setSelected(
        new Set(
          parsed
            .filter((r) => r.type !== 'unchanged' && r.type !== 'error')
            .map((r) => r.rowNumber)
        )
      )
    } catch {
      toast.error(TR.common.genericError)
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    if (!rows) return
    const payload = rows.filter((r) => selected.has(r.rowNumber))
    if (payload.length === 0) {
      toast.error(TR.excel.nothingToApply)
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/leads/import/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? TR.common.genericError)
        return
      }
      const parts = [
        `${data.stageChanged} ${TR.excel.summaryStage}`,
        `${data.notesAdded} ${TR.excel.summaryNote}`,
        `${data.contactsUpdated} ${TR.excel.summaryContact}`,
        `${data.created} ${TR.excel.summaryNew}`,
      ]
      toast.success(`${TR.excel.applied} ${parts.join(', ')}.`)
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        toast.error(`${data.errors.length} ${TR.excel.summaryError}: ${data.errors[0].message}`)
      }
      setOpen(false)
      reset()
      router.refresh()
    } catch {
      toast.error(TR.common.genericError)
    } finally {
      setBusy(false)
    }
  }

  function toggle(rowNumber: number) {
    const next = new Set(selected)
    if (next.has(rowNumber)) next.delete(rowNumber)
    else next.add(rowNumber)
    setSelected(next)
  }

  function toggleAll() {
    if (selected.size === actionable.length) setSelected(new Set())
    else setSelected(new Set(actionable.map((r) => r.rowNumber)))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1">
          <Upload className="h-4 w-4" />
          {TR.excel.importButton}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{TR.excel.dialogTitle}</DialogTitle>
          <DialogDescription>{TR.excel.dialogHint}</DialogDescription>
        </DialogHeader>

        {!rows ? (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) void analyze(file)
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              {busy ? TR.excel.analyzing : TR.excel.dropzone}
            </p>
            <p className="text-xs text-muted-foreground">{TR.excel.dropzoneHint}</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void analyze(file)
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {summary && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="default">
                  {summary.stageChanges} {TR.excel.summaryStage}
                </Badge>
                <Badge variant="secondary">
                  {summary.notesAdded} {TR.excel.summaryNote}
                </Badge>
                <Badge variant="secondary">
                  {summary.contactsUpdated} {TR.excel.summaryContact}
                </Badge>
                <Badge variant="default">
                  {summary.newLeads} {TR.excel.summaryNew}
                </Badge>
                {summary.errors > 0 && (
                  <Badge variant="destructive">
                    {summary.errors} {TR.excel.summaryError}
                  </Badge>
                )}
              </div>
            )}

            <ScrollArea className="h-[380px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={actionable.length > 0 && selected.size === actionable.length}
                        onCheckedChange={toggleAll}
                        aria-label={TR.excel.selectAll}
                      />
                    </TableHead>
                    <TableHead className="w-14">{TR.excel.rowColumn}</TableHead>
                    <TableHead>{TR.leads.nameLabel}</TableHead>
                    <TableHead className="w-40">{TR.excel.changeColumn}</TableHead>
                    <TableHead>{TR.excel.detailColumn}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const selectable = row.type !== 'unchanged' && row.type !== 'error'
                    return (
                      <TableRow
                        key={row.rowNumber}
                        className={row.type === 'unchanged' ? 'opacity-50' : undefined}
                      >
                        <TableCell>
                          {selectable && (
                            <Checkbox
                              checked={selected.has(row.rowNumber)}
                              onCheckedChange={() => toggle(row.rowNumber)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(row.types.length ? row.types : [row.type]).map((t) => (
                              <Badge key={t} variant={BADGE_VARIANT[t] ?? 'outline'}>
                                {CHANGE_LABELS[t]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.message ? (
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {row.message}
                            </span>
                          ) : row.changes.length ? (
                            <ul className="space-y-0.5">
                              {row.changes.map((c, i) => (
                                <li key={i}>
                                  <span className="text-muted-foreground">{c.label}: </span>
                                  {c.from && <s className="text-muted-foreground">{c.from}</s>}
                                  {c.from && ' → '}
                                  <span className="font-medium">{c.to}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={reset} disabled={busy}>
                {TR.common.back}
              </Button>
              <Button onClick={apply} disabled={busy || selected.size === 0}>
                {busy ? TR.excel.applying : `${TR.excel.apply} (${selected.size})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

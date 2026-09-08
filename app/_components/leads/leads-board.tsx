'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Download, LayoutGrid, TableProperties, Phone } from 'lucide-react'
import { HealthBadge } from '@/app/_components/search/health-badge'
import { AiScoreBadge } from '@/app/_components/leads/ai-score-badge'
import { ExcelImportDialog } from '@/app/_components/leads/excel-import-dialog'
import { STAGES } from '@/lib/leads/stages'
import { TR } from '@/lib/i18n/tr'

export interface LeadRow {
  id: string
  name: string
  category: string | null
  address: string | null
  city: string | null
  district: string | null
  phone: string | null
  email: string | null
  website: string | null
  stage: string
  websiteHealth: string
  dataSource: string
  aiScore: number | null
  aiNote: string | null
}

// Kaynak lib/leads/stages.ts — mevcut import yolları kırılmasın diye buradan da dışa aktarılıyor.
export { STAGES, stageLabel } from '@/lib/leads/stages'

export function LeadsBoard({ initialLeads }: { initialLeads: LeadRow[] }) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [view, setView] = useState<'board' | 'table'>('board')
  const [filter, setFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newLead, setNewLead] = useState({ name: '', category: '', phone: '', city: '', website: '' })
  const [busy, setBusy] = useState(false)

  // En sıcak adaylar üstte: AI skoru olanlar önce, skorsuzlar sona.
  const filtered = useMemo(() => {
    const base = filter
      ? leads.filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()))
      : leads
    return [...base].sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1))
  }, [leads, filter])

  async function changeStage(id: string, stage: string) {
    const prev = leads
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage } : l)))
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    if (!res.ok) {
      setLeads(prev)
      const data = await res.json().catch(() => null)
      toast.error(data?.error ?? TR.common.genericError)
    }
  }

  async function addLead() {
    setBusy(true)
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newLead.name,
        category: newLead.category || undefined,
        phone: newLead.phone || undefined,
        city: newLead.city || undefined,
        website: newLead.website || undefined,
      }),
    })
    setBusy(false)
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? TR.common.genericError)
      return
    }
    toast.success(TR.leads.added)
    setAddOpen(false)
    setNewLead({ name: '', category: '', phone: '', city: '', website: '' })
    router.refresh()
    setLeads((ls) => [data.lead, ...ls])
  }

  // Dışa aktarım sunucuda üretilir: biçimlendirme + açılır listeler istemcide mümkün değil
  // ve tabloya yüklenen 1000 kayıt limitine takılmadan tüm liste indirilebilir.
  const exportHref = filter ? `/api/leads/export?q=${encodeURIComponent(filter)}` : '/api/leads/export'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{TR.leads.title}</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder={TR.searchPage.colName + '…'}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-48"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setView(view === 'board' ? 'table' : 'board')}
            title={view === 'board' ? TR.leads.tableView : TR.leads.boardView}
          >
            {view === 'board' ? (
              <TableProperties className="h-4 w-4" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" asChild className="gap-1">
            <a href={exportHref}>
              <Download className="h-4 w-4" />
              {TR.excel.exportButton}
            </a>
          </Button>
          <ExcelImportDialog />
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" />
                {TR.leads.addManual}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{TR.leads.addManual}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>{TR.leads.nameLabel} *</Label>
                  <Input
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{TR.searchPage.colCategory}</Label>
                    <Input
                      value={newLead.category}
                      onChange={(e) => setNewLead({ ...newLead, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{TR.searchPage.colPhone}</Label>
                    <Input
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{TR.searchPage.cityLabel}</Label>
                    <Input
                      value={newLead.city}
                      onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{TR.searchPage.colWebsite}</Label>
                    <Input
                      value={newLead.website}
                      onChange={(e) => setNewLead({ ...newLead, website: e.target.value })}
                      placeholder="ornek.com"
                    />
                  </div>
                </div>
                <Button
                  onClick={addLead}
                  disabled={busy || newLead.name.trim().length < 2}
                  className="w-full"
                >
                  {TR.common.create}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">{TR.leads.noLeads}</p>
      ) : view === 'board' ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((stage) => {
            const items = filtered.filter((l) => l.stage === stage.value)
            return (
              <div key={stage.value} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2 rounded-lg bg-muted/40 p-2 min-h-24">
                  {items.map((lead) => (
                    <Card key={lead.id} className="shadow-sm">
                      <CardContent className="space-y-2 p-3">
                        <Link
                          href={`/app/leads/${lead.id}`}
                          className="block text-sm font-medium hover:underline"
                        >
                          {lead.name}
                        </Link>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <HealthBadge status={lead.websiteHealth} />
                            <AiScoreBadge score={lead.aiScore} note={lead.aiNote} />
                          </div>
                          {lead.phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                        <Select
                          value={lead.stage}
                          onValueChange={(v) => changeStage(lead.id, v)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{TR.leads.nameLabel}</TableHead>
                <TableHead>{TR.searchPage.colCategory}</TableHead>
                <TableHead>{TR.searchPage.colPhone}</TableHead>
                <TableHead>{TR.searchPage.colWebsite}</TableHead>
                <TableHead>{TR.searchPage.colHealth}</TableHead>
                <TableHead className="w-20">{TR.ai.scoreColumn}</TableHead>
                <TableHead>{TR.leads.stageLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/app/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.category ?? '—'}</TableCell>
                  <TableCell>{lead.phone ?? '—'}</TableCell>
                  <TableCell className="max-w-48 truncate">{lead.website ?? '—'}</TableCell>
                  <TableCell>
                    <HealthBadge status={lead.websiteHealth} />
                  </TableCell>
                  <TableCell>
                    <AiScoreBadge score={lead.aiScore} note={lead.aiNote} />
                  </TableCell>
                  <TableCell>
                    <Select value={lead.stage} onValueChange={(v) => changeStage(lead.id, v)}>
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RefreshCw, Trash2, Copy, ExternalLink, Phone, Mail, MapPin, Globe } from 'lucide-react'
import { HealthBadge } from '@/app/_components/search/health-badge'
import { SiteGenerateDialog } from './site-generate-dialog'
import { STAGES } from './leads-board'
import { TR } from '@/lib/i18n/tr'

interface Note {
  id: string
  body: string
  createdAt: string
}

interface Site {
  id: string
  slug: string
  status: string
  url: string | null
  templateId: string
  createdAt: string
}

export interface LeadDetailData {
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
  healthCheckedAt: string | null
  dataSource: string
  notes: Note[]
  sites: Site[]
}

const SOURCE_LABELS: Record<string, string> = {
  overpass: 'OpenStreetMap',
  google_places: 'Google Places',
  csv_import: 'CSV/Excel İçe Aktarma',
  manual: 'Manuel Giriş',
}

export function LeadDetail({ lead }: { lead: LeadDetailData }) {
  const router = useRouter()
  const [noteText, setNoteText] = useState('')
  const [busy, setBusy] = useState(false)

  async function changeStage(stage: string) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    if (res.ok) router.refresh()
    else toast.error(TR.common.genericError)
  }

  async function recheckHealth() {
    setBusy(true)
    const res = await fetch('/api/health-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds: [lead.id] }),
    })
    setBusy(false)
    if (res.ok) {
      toast.success(TR.common.saveSuccess)
      router.refresh()
    } else toast.error(TR.common.genericError)
  }

  async function addNote() {
    if (!noteText.trim()) return
    setBusy(true)
    const res = await fetch(`/api/leads/${lead.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: noteText }),
    })
    setBusy(false)
    if (res.ok) {
      setNoteText('')
      router.refresh()
    } else toast.error(TR.common.genericError)
  }

  async function deleteLead() {
    setBusy(true)
    const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      toast.success(TR.leads.deleted)
      router.push('/app/leads')
      router.refresh()
    } else toast.error(TR.common.genericError)
  }

  async function deleteSite(siteId: string) {
    const res = await fetch(`/api/sites/${siteId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(TR.common.saveSuccess)
      router.refresh()
    } else toast.error(TR.common.genericError)
  }

  const SITE_STATUS_LABELS: Record<string, string> = {
    queued: TR.actions.statusQueued,
    generating: TR.actions.statusRunning,
    ready: TR.actions.statusDone,
    failed: TR.actions.statusFailed,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
          <HealthBadge status={lead.websiteHealth} />
        </div>
        <div className="flex items-center gap-2">
          <Select value={lead.stage} onValueChange={changeStage}>
            <SelectTrigger className="w-44">
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
          <SiteGenerateDialog
            lead={{
              id: lead.id,
              name: lead.name,
              category: lead.category,
              phone: lead.phone,
              address: lead.address,
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{TR.leads.detailTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lead.category && (
              <p className="text-muted-foreground">{lead.category}</p>
            )}
            {lead.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
              </p>
            )}
            {lead.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
              </p>
            )}
            {(lead.address || lead.city) && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {[lead.address, lead.district, lead.city].filter(Boolean).join(', ')}
              </p>
            )}
            {lead.website && (
              <p className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={lead.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {lead.website.replace(/^https?:\/\//, '')}
                </a>
              </p>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={recheckHealth} disabled={busy} className="gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                {TR.health.checkNow}
              </Button>
              {lead.healthCheckedAt && (
                <span className="text-xs text-muted-foreground">
                  {TR.health.lastChecked}: {new Date(lead.healthCheckedAt).toLocaleString('tr-TR')}
                </span>
              )}
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              {TR.leads.dataSourceLabel}: {SOURCE_LABELS[lead.dataSource] ?? lead.dataSource}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  {TR.leads.deleteLead}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{TR.leads.deleteLead}</AlertDialogTitle>
                  <AlertDialogDescription>{TR.leads.deleteConfirm}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{TR.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteLead}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {TR.common.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{TR.leads.notesTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={TR.leads.notePlaceholder}
                rows={2}
              />
              <Button onClick={addNote} disabled={busy || !noteText.trim()}>
                {TR.leads.addNote}
              </Button>
            </div>
            {lead.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{TR.leads.noNotes}</p>
            ) : (
              <ul className="space-y-2">
                {lead.notes.map((n) => (
                  <li key={n.id} className="rounded-md bg-muted/50 p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {lead.sites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{TR.nav.sites}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lead.sites.map((site) => (
              <div
                key={site.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={site.status === 'ready' ? 'default' : site.status === 'failed' ? 'destructive' : 'secondary'}>
                    {SITE_STATUS_LABELS[site.status] ?? site.status}
                  </Badge>
                  <span className="font-mono text-sm">{site.slug}</span>
                </div>
                <div className="flex items-center gap-1">
                  {site.url && site.status === 'ready' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(site.url!)
                          toast.success(TR.common.copied)
                        }}
                        className="gap-1"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {TR.actions.copyLink}
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="gap-1">
                        <a href={site.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          {TR.actions.openSite}
                        </a>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSite(site.id)}
                    className="gap-1 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {TR.common.delete}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

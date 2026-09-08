'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe2, Download, AlertTriangle } from 'lucide-react'
import { OSM_CATEGORIES } from '@/lib/discovery/osm-categories'
import { TR } from '@/lib/i18n/tr'

// En yüksek ticari potansiyelli iller — "tüm Türkiye" ağır gelirse hızlı seçenek.
const MAJOR_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
  'Şanlıurfa', 'Kocaeli', 'Mersin', 'Diyarbakır', 'Kayseri', 'Samsun', 'Denizli',
]

interface ProvinceRow {
  id: string
  city: string
  status: 'queued' | 'running' | 'done' | 'failed'
  resultCount: number
  error: string | null
}

interface BatchStatus {
  batchId: string
  total: number
  counts: { queued: number; running: number; done: number; failed: number }
  totalResults: number
  finished: boolean
  provinces: ProvinceRow[]
}

const STATUS_LABEL: Record<string, string> = {
  queued: TR.nationwide.statusQueued,
  running: TR.nationwide.statusRunning,
  done: TR.nationwide.statusDone,
  failed: TR.nationwide.statusFailed,
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  queued: 'outline',
  running: 'secondary',
  done: 'default',
  failed: 'destructive',
}

export function NationwideSweep() {
  const [categoryKey, setCategoryKey] = useState('kuafor')
  const [scope, setScope] = useState<'all' | 'major'>('all')
  const [limitPerProvince, setLimitPerProvince] = useState(200)
  const [radiusKm, setRadiusKm] = useState(25)
  const [starting, setStarting] = useState(false)
  const [status, setStatus] = useState<BatchStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const provinceCount = scope === 'all' ? 81 : MAJOR_CITIES.length

  function poll(batchId: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/sweeps/batch/${batchId}`)
      if (!res.ok) return
      const data = (await res.json()) as BatchStatus
      setStatus(data)
      if (data.finished) {
        clearInterval(pollRef.current!)
        toast.success(TR.nationwide.allDone)
      }
    }, 4000)
  }

  async function start() {
    setStarting(true)
    setStatus(null)
    try {
      const res = await fetch('/api/sweeps/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryKey,
          provinces: scope === 'major' ? MAJOR_CITIES : undefined,
          radiusM: Math.round(radiusKm * 1000),
          limitPerProvince,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? TR.common.genericError)
        return
      }
      toast.success(`${data.provinceCount} ${TR.nationwide.started}`)
      poll(data.batchId)
      setStatus({
        batchId: data.batchId,
        total: data.provinceCount,
        counts: { queued: data.provinceCount, running: 0, done: 0, failed: 0 },
        totalResults: 0,
        finished: false,
        provinces: [],
      })
    } catch {
      toast.error(TR.common.genericError)
    } finally {
      setStarting(false)
    }
  }

  const completed = status ? status.counts.done + status.counts.failed : 0
  const pct = status && status.total ? Math.round((completed / status.total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-primary" />
          {TR.nationwide.title}
        </CardTitle>
        <CardDescription>{TR.nationwide.subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{TR.searchPage.categoryLabel}</Label>
            <Select value={categoryKey} onValueChange={setCategoryKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OSM_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{TR.nationwide.scopeLabel}</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as 'all' | 'major')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{TR.nationwide.scopeAll}</SelectItem>
                <SelectItem value="major">{TR.nationwide.scopeMajor}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{TR.nationwide.limitLabel}: {limitPerProvince}</Label>
            <Slider value={[limitPerProvince]} onValueChange={([v]) => setLimitPerProvince(v)} min={50} max={500} step={50} />
          </div>
          <div className="space-y-2">
            <Label>{TR.nationwide.radiusLabel}: {radiusKm} km</Label>
            <Slider value={[radiusKm]} onValueChange={([v]) => setRadiusKm(v)} min={5} max={30} step={5} />
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          {TR.nationwide.warnVolume}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={starting || (!!status && !status.finished)} className="gap-2">
            <Globe2 className="h-4 w-4" />
            {starting ? TR.nationwide.starting : TR.nationwide.startButton}
          </Button>
          <span className="text-xs text-muted-foreground">{provinceCount} il</span>
        </div>

        {status && (
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{TR.nationwide.progressTitle}</span>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{status.counts.queued} {TR.nationwide.statusQueued}</Badge>
                <Badge variant="secondary">{status.counts.running} {TR.nationwide.statusRunning}</Badge>
                <Badge>{status.counts.done} {TR.nationwide.statusDone}</Badge>
                {status.counts.failed > 0 && (
                  <Badge variant="destructive">{status.counts.failed} {TR.nationwide.statusFailed}</Badge>
                )}
              </div>
            </div>

            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              {completed}/{status.total} il · {TR.nationwide.totalResults}: <strong>{status.totalResults}</strong>
            </p>

            {status.provinces.length > 0 && (
              <ScrollArea className="h-52 rounded-md border">
                <table className="w-full text-xs">
                  <tbody>
                    {status.provinces.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium">{p.city}</td>
                        <td className="px-3 py-1.5">
                          <Badge variant={STATUS_VARIANT[p.status]} className="text-[10px]">
                            {STATUS_LABEL[p.status]}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{p.resultCount}</td>
                        <td className="max-w-64 truncate px-3 py-1.5 text-destructive">{p.error ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}

            {status.totalResults > 0 && (
              <Button variant="outline" asChild className="gap-1">
                <a href={`/api/sweeps/batch/${status.batchId}/export`}>
                  <Download className="h-4 w-4" />
                  {TR.nationwide.exportAll}
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

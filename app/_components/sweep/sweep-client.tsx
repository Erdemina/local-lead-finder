'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Radar, Save, Map as MapIcon, List } from 'lucide-react'
import { OSM_CATEGORIES } from '@/lib/discovery/osm-categories'
import { HealthBadge } from '@/app/_components/search/health-badge'
import { LocationSelect } from '@/app/_components/search/location-select'
import { SweepMap, type MapPoint } from './sweep-map'
import { TR } from '@/lib/i18n/tr'

interface ResultRow {
  id: string
  name: string
  category: string | null
  address: string | null
  phone: string | null
  website: string | null
  websiteHealth: string
}

export function SweepClient() {
  const [categoryKey, setCategoryKey] = useState('kuafor')
  const [city, setCity] = useState('İstanbul')
  const [district, setDistrict] = useState('')
  const [radiusKm, setRadiusKm] = useState(10)
  const [limit, setLimit] = useState(200)

  const [running, setRunning] = useState(false)
  const [searchId, setSearchId] = useState<string | null>(null)
  const [results, setResults] = useState<ResultRow[]>([])
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function loadResults(id: string, pageNum: number) {
    const res = await fetch(`/api/searches/${id}/results?page=${pageNum}&pageSize=50`)
    if (!res.ok) return
    const data = await res.json()
    setResults(data.results)
    setMapPoints(data.mapPoints)
    setTotal(data.total)
    setPage(pageNum)
  }

  async function startSweep() {
    setRunning(true)
    setResults([])
    setSelected(new Set())
    setSearchId(null)

    const res = await fetch('/api/sweeps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryKey,
        city: city || undefined,
        district: district || undefined,
        radiusM: Math.round(radiusKm * 1000),
        limit,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setRunning(false)
      toast.error(data.error ?? TR.common.genericError)
      return
    }

    const id = data.search.id as string
    setSearchId(id)
    pollRef.current = setInterval(async () => {
      const statusRes = await fetch(`/api/searches/${id}`)
      if (!statusRes.ok) return
      const statusData = await statusRes.json()
      const status = statusData.search?.status
      if (status === 'done') {
        clearInterval(pollRef.current!)
        setRunning(false)
        toast.success(TR.sweep.done)
        await loadResults(id, 1)
      } else if (status === 'failed') {
        clearInterval(pollRef.current!)
        setRunning(false)
        toast.error(statusData.search?.error ?? TR.sweep.failed)
      }
    }, 2500)
  }

  async function saveToLeads() {
    if (selected.size === 0) return
    const res = await fetch('/api/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchResultIds: Array.from(selected) }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? TR.common.genericError)
      return
    }
    toast.success(`${data.saved} ${TR.searchPage.savedToLeads}`)
    setSelected(new Set())
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAllOnPage() {
    const next = new Set(selected)
    const allSelected = results.every((r) => next.has(r.id))
    for (const r of results) {
      if (allSelected) next.delete(r.id)
      else next.add(r.id)
    }
    setSelected(next)
  }

  const totalPages = Math.max(1, Math.ceil(total / 50))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{TR.sweep.title}</CardTitle>
          <CardDescription>{TR.sweep.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{TR.searchPage.categoryLabel}</Label>
              <Select value={categoryKey} onValueChange={setCategoryKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OSM_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <LocationSelect
              city={city}
              district={district}
              onCityChange={setCity}
              onDistrictChange={setDistrict}
            />
            <div className="space-y-2">
              <Label>
                {TR.searchPage.radiusLabel}: {radiusKm} km
              </Label>
              <Slider
                value={[radiusKm]}
                onValueChange={([v]) => setRadiusKm(v)}
                min={2}
                max={30}
                step={1}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={startSweep} disabled={running} className="gap-2">
              <Radar className="h-4 w-4" />
              {running ? TR.sweep.running : TR.sweep.startButton}
            </Button>
            <div className="w-56">
              <Label className="text-xs">
                {TR.searchPage.limitLabel}: {limit}
              </Label>
              <Slider
                value={[limit]}
                onValueChange={([v]) => setLimit(v)}
                min={50}
                max={500}
                step={50}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {searchId && results.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>
              {TR.searchPage.resultsTitle} ({total})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView(view === 'list' ? 'map' : 'list')}
                className="gap-1"
              >
                {view === 'list' ? <MapIcon className="h-4 w-4" /> : <List className="h-4 w-4" />}
                {view === 'list' ? TR.sweep.mapView : TR.sweep.listView}
              </Button>
              <Button
                size="sm"
                onClick={saveToLeads}
                disabled={selected.size === 0}
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                {TR.searchPage.saveToLeads} ({selected.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {view === 'map' ? (
              <SweepMap points={mapPoints} />
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={results.length > 0 && results.every((r) => selected.has(r.id))}
                            onCheckedChange={toggleAllOnPage}
                          />
                        </TableHead>
                        <TableHead>{TR.searchPage.colName}</TableHead>
                        <TableHead>{TR.searchPage.colCategory}</TableHead>
                        <TableHead>{TR.searchPage.colPhone}</TableHead>
                        <TableHead>{TR.searchPage.colWebsite}</TableHead>
                        <TableHead>{TR.searchPage.colHealth}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(r.id)}
                              onCheckedChange={() => toggle(r.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.category ?? '—'}
                          </TableCell>
                          <TableCell>{r.phone ?? '—'}</TableCell>
                          <TableCell className="max-w-48 truncate">{r.website ?? '—'}</TableCell>
                          <TableCell>
                            <HealthBadge status={r.websiteHealth} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => searchId && loadResults(searchId, page - 1)}
                    >
                      ‹
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => searchId && loadResults(searchId, page + 1)}
                    >
                      ›
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

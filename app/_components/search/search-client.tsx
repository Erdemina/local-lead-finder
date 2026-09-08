'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search as SearchIcon, Save, Download, BookmarkPlus, Sparkles } from 'lucide-react'
import { OSM_CATEGORIES } from '@/lib/discovery/osm-categories'
import { AiScoreBadge } from '@/app/_components/leads/ai-score-badge'
import { LocationSelect } from './location-select'
import { HealthBadge } from './health-badge'
import { TR } from '@/lib/i18n/tr'

export interface SearchResultRow {
  id: string
  name: string
  category?: string
  address?: string
  city?: string
  district?: string
  phone?: string
  website?: string
  websiteHealth: string
  healthReason?: string
  aiScore?: number | null
  aiNote?: string | null
}

export interface NicheProfile {
  categoryKey?: string
  categoryText?: string
  city?: string
  district?: string
  radiusM?: number
  websiteStatus?: string
  product?: string
}

const FREE_TEXT = '__free__'
const SOURCE_OVERPASS = 'overpass'
const SOURCE_AI = 'ai_search'
const SOURCE_ENRICH = 'llm_research'

export function SearchClient({
  initialProfile,
  allowedSources = [],
}: {
  initialProfile: NicheProfile | null
  allowedSources?: string[]
}) {
  const [categoryKey, setCategoryKey] = useState(initialProfile?.categoryKey ?? '')
  const [categoryText, setCategoryText] = useState(initialProfile?.categoryText ?? '')
  const [city, setCity] = useState(initialProfile?.city ?? 'İstanbul')
  const [district, setDistrict] = useState(initialProfile?.district ?? '')
  const [radiusKm, setRadiusKm] = useState((initialProfile?.radiusM ?? 5000) / 1000)
  const [websiteStatus, setWebsiteStatus] = useState(initialProfile?.websiteStatus ?? 'any')
  const [limit, setLimit] = useState(50)
  const [sourceCode, setSourceCode] = useState(SOURCE_OVERPASS)
  const [enrichWithAi, setEnrichWithAi] = useState(false)
  const [product, setProduct] = useState(initialProfile?.product ?? '')

  const [searching, setSearching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [results, setResults] = useState<SearchResultRow[] | null>(null)
  const [searchId, setSearchId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const canUseAiSearch = allowedSources.includes(SOURCE_AI)
  const canUseEnrich = allowedSources.includes(SOURCE_ENRICH)
  const hasScores = useMemo(
    () => (results ?? []).some((r) => typeof r.aiScore === 'number'),
    [results]
  )

  async function runSearch() {
    setSearching(true)
    setResults(null)
    setSearchId(null)
    setSelected(new Set())
    setProgress(0)
    setProgressMsg(TR.searchPage.searching)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryKey: categoryKey && categoryKey !== FREE_TEXT ? categoryKey : undefined,
          categoryText: categoryKey === FREE_TEXT || !categoryKey ? categoryText || undefined : undefined,
          city: city || undefined,
          district: district || undefined,
          radiusM: Math.round(radiusKm * 1000),
          limit,
          websiteStatus,
          sourceCode,
          enrichWithAi,
          product: product.trim() || undefined,
        }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? TR.common.genericError)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const event of events) {
          const line = event.trim()
          if (!line.startsWith('data: ')) continue
          let payload: any
          try {
            payload = JSON.parse(line.slice(6))
          } catch {
            // Bağlantı kesilirse yarım çerçeve gelebilir; tüm akışı düşürmemeli.
            continue
          }
          if (payload.status === 'processing') {
            setProgress(payload.progress ?? 0)
            setProgressMsg(payload.message ?? '')
          } else if (payload.status === 'error') {
            toast.error(payload.message)
          } else if (payload.status === 'completed') {
            setResults(payload.results)
            setSearchId(payload.searchId ?? null)
            setProgress(100)
          }
        }
      }
    } catch {
      toast.error(TR.common.genericError)
    } finally {
      setSearching(false)
    }
  }

  async function saveProfile() {
    const res = await fetch('/api/tenant/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nicheProfile: {
          categoryKey: categoryKey && categoryKey !== FREE_TEXT ? categoryKey : undefined,
          categoryText: categoryText || undefined,
          city: city || undefined,
          district: district || undefined,
          radiusM: Math.round(radiusKm * 1000),
          websiteStatus,
          product: product.trim() || undefined,
        },
      }),
    })
    if (res.ok) toast.success(TR.searchPage.profileSaved)
    else toast.error(TR.common.genericError)
  }

  async function saveToLeads() {
    if (selected.size === 0) return
    setSaving(true)
    const res = await fetch('/api/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchResultIds: Array.from(selected) }),
    })
    setSaving(false)
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? TR.common.genericError)
      return
    }
    toast.success(`${data.saved} ${TR.searchPage.savedToLeads}`)
    setSelected(new Set())
  }

  function toggleAll() {
    if (!results) return
    if (selected.size === results.length) setSelected(new Set())
    else setSelected(new Set(results.map((r) => r.id)))
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{TR.searchPage.title}</CardTitle>
          <CardDescription>{TR.searchPage.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{TR.searchPage.categoryLabel}</Label>
              <Select value={categoryKey} onValueChange={setCategoryKey}>
                <SelectTrigger>
                  <SelectValue placeholder={TR.searchPage.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {OSM_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={FREE_TEXT}>Serbest metin…</SelectItem>
                </SelectContent>
              </Select>
              {categoryKey === FREE_TEXT && (
                <Input
                  value={categoryText}
                  onChange={(e) => setCategoryText(e.target.value)}
                  placeholder={TR.searchPage.categoryPlaceholder}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>{TR.searchPage.websiteFilterLabel}</Label>
              <Select value={websiteStatus} onValueChange={setWebsiteStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{TR.searchPage.websiteFilterAny}</SelectItem>
                  <SelectItem value="no_website">{TR.searchPage.websiteFilterNone}</SelectItem>
                  <SelectItem value="broken">{TR.searchPage.websiteFilterBroken}</SelectItem>
                  <SelectItem value="working">{TR.searchPage.websiteFilterWorking}</SelectItem>
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
                min={1}
                max={25}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {TR.searchPage.limitLabel}: {limit}
              </Label>
              <Slider
                value={[limit]}
                onValueChange={([v]) => setLimit(v)}
                min={10}
                max={200}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <Label>{TR.ai.sourceLabel}</Label>
              <Select value={sourceCode} onValueChange={setSourceCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SOURCE_OVERPASS}>{TR.ai.sourceOverpass}</SelectItem>
                  <SelectItem value={SOURCE_AI} disabled={!canUseAiSearch}>
                    {TR.ai.sourceAi}
                  </SelectItem>
                </SelectContent>
              </Select>
              {!canUseAiSearch && (
                <p className="text-xs text-muted-foreground">{TR.ai.sourceDisabled}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">{TR.ai.productLabel}</Label>
              <Input
                id="product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder={TR.ai.productPlaceholder}
              />
              <p className="text-xs text-muted-foreground">{TR.ai.productHint}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border p-3">
            <Checkbox
              id="enrich"
              checked={enrichWithAi}
              disabled={!canUseEnrich}
              onCheckedChange={(v) => setEnrichWithAi(v === true)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="enrich" className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {TR.ai.enrichLabel}
              </Label>
              <p className="text-xs text-muted-foreground">
                {canUseEnrich ? TR.ai.enrichHint : TR.ai.sourceDisabled}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={runSearch} disabled={searching} className="gap-2">
              <SearchIcon className="h-4 w-4" />
              {searching ? TR.searchPage.searching : TR.searchPage.searchButton}
            </Button>
            <Button variant="outline" onClick={saveProfile} className="gap-2">
              <BookmarkPlus className="h-4 w-4" />
              {TR.searchPage.saveProfile}
            </Button>
          </div>
          {sourceCode === SOURCE_AI && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{TR.ai.disclaimer}</p>
          )}
          {searching && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">{progressMsg}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>
              {TR.searchPage.resultsTitle} ({results.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveToLeads}
                disabled={selected.size === 0 || saving}
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                {TR.searchPage.saveToLeads} ({selected.size})
              </Button>
              <Button variant="outline" size="sm" asChild disabled={!searchId} className="gap-1">
                <a href={searchId ? `/api/searches/${searchId}/export` : '#'}>
                  <Download className="h-4 w-4" />
                  {TR.excel.exportButton}
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{TR.searchPage.noResults}</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={results.length > 0 && selected.size === results.length}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>{TR.searchPage.colName}</TableHead>
                      <TableHead>{TR.searchPage.colCategory}</TableHead>
                      <TableHead>{TR.searchPage.colAddress}</TableHead>
                      <TableHead>{TR.searchPage.colPhone}</TableHead>
                      <TableHead>{TR.searchPage.colWebsite}</TableHead>
                      <TableHead>{TR.searchPage.colHealth}</TableHead>
                      {hasScores && <TableHead className="w-20">{TR.ai.scoreColumn}</TableHead>}
                      {hasScores && <TableHead>{TR.ai.noteColumn}</TableHead>}
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
                        <TableCell className="text-muted-foreground">{r.category ?? '—'}</TableCell>
                        <TableCell className="max-w-64 truncate text-muted-foreground">
                          {r.address ?? '—'}
                        </TableCell>
                        <TableCell>{r.phone ?? '—'}</TableCell>
                        <TableCell className="max-w-48 truncate">
                          {r.website ? (
                            <a
                              href={r.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              {r.website.replace(/^https?:\/\//, '')}
                            </a>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <HealthBadge status={r.websiteHealth} title={r.healthReason} />
                        </TableCell>
                        {hasScores && (
                          <TableCell>
                            <AiScoreBadge score={r.aiScore} />
                          </TableCell>
                        )}
                        {hasScores && (
                          <TableCell className="max-w-72 text-xs text-muted-foreground">
                            {r.aiNote ?? '—'}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

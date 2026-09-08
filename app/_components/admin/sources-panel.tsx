'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, PlugZap, Save } from 'lucide-react'
import { DEFAULT_AI_CONFIG, type AiSourceConfig } from '@/lib/ai/config'
import { TR } from '@/lib/i18n/tr'

export interface AdminSource {
  code: string
  name: string
  kind: string
  enabledGlobally: boolean
  tosNotes: string | null
  isAi: boolean
  hasCredentials: boolean
  config: AiSourceConfig
}

const KIND_LABELS: Record<string, string> = {
  api: TR.admin.sourceKindApi,
  scraper: TR.admin.sourceKindScraper,
  import: TR.admin.sourceKindImport,
}

export function SourcesPanel({ sources }: { sources: AdminSource[] }) {
  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <SourceCard key={source.code} source={source} />
      ))}
    </div>
  )
}

function SourceCard({ source }: { source: AdminSource }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(source.enabledGlobally)
  const [provider, setProvider] = useState(source.config.provider)
  const [model, setModel] = useState(source.config.model)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(test: boolean) {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: source.code,
          enabledGlobally: enabled,
          ...(source.isAi
            ? {
                provider,
                model: model.trim() || DEFAULT_AI_CONFIG[provider].model,
              }
            : {}),
          // Boş bırakılırsa mevcut anahtara dokunulmaz.
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          test,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? TR.common.genericError)
        return
      }
      setApiKey('')
      if (data.test) {
        if (data.test.ok) toast.success(data.test.message)
        else toast.error(data.test.message)
      } else {
        toast.success(TR.common.saveSuccess)
      }
      router.refresh()
    } catch {
      toast.error(TR.common.genericError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            {source.name}
            <Badge variant="outline" className="font-mono text-xs">
              {source.code}
            </Badge>
            <Badge variant="secondary">{KIND_LABELS[source.kind] ?? source.kind}</Badge>
          </CardTitle>
          {source.tosNotes && <CardDescription>{source.tosNotes}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{TR.admin.sourceEnabled}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {source.isAi && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Sağlayıcı</Label>
              <Select
                value={provider}
                onValueChange={(v) => {
                  const next = v as AiSourceConfig['provider']
                  setProvider(next)
                  setModel(DEFAULT_AI_CONFIG[next].model)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} className="font-mono text-sm" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>{TR.admin.sourceApiKey}</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  source.hasCredentials
                    ? 'Değiştirmek için yeni anahtarı yazın'
                    : 'sk-ant-… veya sk-or-…'
                }
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showKey ? 'Gizle' : 'Göster'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {source.hasCredentials ? TR.admin.sourceApiKeySet : TR.admin.sourceApiKeyMissing}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => submit(false)} disabled={busy} className="gap-1">
            <Save className="h-4 w-4" />
            {TR.common.save}
          </Button>
          {source.isAi && (
            <Button
              variant="outline"
              onClick={() => submit(true)}
              disabled={busy}
              className="gap-1"
            >
              <PlugZap className="h-4 w-4" />
              Bağlantıyı Test Et
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

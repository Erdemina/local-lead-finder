'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TR } from '@/lib/i18n/tr'

interface Props {
  initialNiche: string
  initialRetentionDays: number | null
  currentProfile: Record<string, unknown> | null
}

export function TenantSettings({ initialNiche, initialRetentionDays, currentProfile }: Props) {
  const [niche, setNiche] = useState(initialNiche)
  const [retention, setRetention] = useState(initialRetentionDays?.toString() ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const res = await fetch('/api/tenant/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nicheProfile: { ...(currentProfile ?? {}), niche: niche || undefined },
        retentionDays: retention ? parseInt(retention, 10) : null,
      }),
    })
    setBusy(false)
    if (res.ok) toast.success(TR.common.saveSuccess)
    else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error ?? TR.common.genericError)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{TR.settings.profileSection}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>{TR.settings.nicheLabel}</Label>
          <Textarea
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder={TR.settings.nichePlaceholder}
            rows={2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{TR.settings.retentionSection}</CardTitle>
          <CardDescription>{TR.settings.retentionHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>{TR.settings.retentionLabel}</Label>
          <Input
            type="number"
            min={1}
            max={3650}
            value={retention}
            onChange={(e) => setRetention(e.target.value)}
            className="w-40"
          />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={busy}>
        {TR.common.save}
      </Button>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Globe, Copy, ExternalLink } from 'lucide-react'
import { SITE_TEMPLATES } from '@/lib/sites/templates'
import { TR } from '@/lib/i18n/tr'

interface LeadInfo {
  id: string
  name: string
  category: string | null
  phone: string | null
  address: string | null
}

export function SiteGenerateDialog({ lead }: { lead: LeadInfo }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState('klasik')
  const [fields, setFields] = useState({
    businessName: lead.name,
    category: lead.category ?? '',
    phone: lead.phone ?? '',
    address: lead.address ?? '',
    about: '',
  })
  const [state, setState] = useState<'idle' | 'generating' | 'ready' | 'failed'>('idle')
  const [siteUrl, setSiteUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function generate() {
    setState('generating')
    const res = await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        type: 'generate_site',
        templateId,
        fields: {
          businessName: fields.businessName,
          category: fields.category || undefined,
          phone: fields.phone || undefined,
          address: fields.address || undefined,
          about: fields.about || undefined,
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setState('idle')
      toast.error(data.error ?? TR.common.genericError)
      return
    }

    const actionId = data.action.id
    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/actions/${actionId}`)
      if (!pollRes.ok) return
      const pollData = await pollRes.json()
      const status = pollData.action?.status
      if (status === 'done') {
        clearInterval(pollRef.current!)
        setState('ready')
        setSiteUrl(pollData.action.site?.url ?? pollData.action.output?.url ?? null)
        toast.success(TR.actions.siteReady)
        router.refresh()
      } else if (status === 'failed') {
        clearInterval(pollRef.current!)
        setState('failed')
        toast.error(TR.actions.siteFailed)
        router.refresh()
      }
    }, 2000)
  }

  function copyLink() {
    if (!siteUrl) return
    navigator.clipboard.writeText(siteUrl)
    toast.success(TR.common.copied)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Globe className="h-4 w-4" />
          {TR.leads.generateSite}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{TR.siteGen.dialogTitle}</DialogTitle>
        </DialogHeader>

        {state === 'ready' && siteUrl ? (
          <div className="space-y-4 py-4 text-center">
            <p className="font-medium text-emerald-600">{TR.actions.siteReady}</p>
            <p className="break-all rounded-md bg-muted p-3 font-mono text-sm">{siteUrl}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={copyLink} variant="outline" className="gap-1">
                <Copy className="h-4 w-4" />
                {TR.actions.copyLink}
              </Button>
              <Button asChild className="gap-1">
                <a href={siteUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {TR.actions.openSite}
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{TR.siteGen.templateLabel}</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITE_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{TR.siteGen.businessName}</Label>
              <Input
                value={fields.businessName}
                onChange={(e) => setFields({ ...fields, businessName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{TR.siteGen.category}</Label>
                <Input
                  value={fields.category}
                  onChange={(e) => setFields({ ...fields, category: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{TR.siteGen.phone}</Label>
                <Input
                  value={fields.phone}
                  onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{TR.siteGen.address}</Label>
              <Input
                value={fields.address}
                onChange={(e) => setFields({ ...fields, address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{TR.siteGen.about}</Label>
              <Textarea
                value={fields.about}
                onChange={(e) => setFields({ ...fields, about: e.target.value })}
                placeholder={TR.siteGen.aboutPlaceholder}
                rows={3}
              />
            </div>
            <Button
              onClick={generate}
              disabled={state === 'generating' || fields.businessName.trim().length < 2}
              className="w-full"
            >
              {state === 'generating' ? TR.siteGen.generating : TR.siteGen.generateButton}
            </Button>
            {state === 'failed' && (
              <p className="text-sm text-destructive">{TR.actions.siteFailed}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

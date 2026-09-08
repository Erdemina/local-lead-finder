'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Trash2 } from 'lucide-react'
import { TR } from '@/lib/i18n/tr'

interface TenantData {
  id: string
  name: string
  status: string
  retentionDays: number | null
}

export function TenantEditPanel({ tenant }: { tenant: TenantData }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: tenant.name,
    retentionDays: tenant.retentionDays?.toString() ?? '',
  })
  const [busy, setBusy] = useState(false)

  async function patch(payload: Record<string, unknown>, successMsg: string) {
    setBusy(true)
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setBusy(false)
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? TR.common.genericError)
      return
    }
    toast.success(successMsg)
    router.refresh()
  }

  async function saveSettings() {
    await patch(
      {
        name: form.name,
        retentionDays: form.retentionDays ? parseInt(form.retentionDays, 10) : null,
      },
      TR.admin.tenantUpdated
    )
  }

  async function toggleStatus() {
    await patch(
      { status: tenant.status === 'active' ? 'suspended' : 'active' },
      TR.admin.tenantUpdated
    )
  }

  async function deleteTenant() {
    setBusy(true)
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? TR.common.genericError)
      return
    }
    router.push('/admin/tenants')
    router.refresh()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{TR.common.edit}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{TR.admin.tenantName}</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retention">{TR.settings.retentionLabel}</Label>
            <Input
              id="retention"
              type="number"
              min={1}
              max={3650}
              value={form.retentionDays}
              onChange={(e) => setForm({ ...form, retentionDays: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{TR.settings.retentionHint}</p>
          </div>
          <Button onClick={saveSettings} disabled={busy} className="w-full">
            {TR.common.save}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <Button
            onClick={toggleStatus}
            variant={tenant.status === 'active' ? 'destructive' : 'default'}
            className="w-full"
            disabled={busy}
          >
            {tenant.status === 'active' ? TR.admin.suspend : TR.admin.reactivate}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                {TR.common.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {TR.common.delete}: {tenant.name}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Çalışma alanının tüm verileri (adaylar, aramalar, siteler, kullanıcılar)
                  kalıcı olarak silinecek. Bu işlem geri alınamaz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{TR.common.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteTenant}
                  className="bg-destructive text-destructive-foreground"
                >
                  {TR.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

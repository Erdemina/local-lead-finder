'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TR } from '@/lib/i18n/tr'

export function TenantCreateForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    ownerEmail: '',
    ownerName: '',
    ownerPassword: '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? TR.common.genericError)
      return
    }
    toast.success(TR.admin.tenantCreated)
    router.push(`/admin/tenants/${data.tenant.id}`)
    router.refresh()
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{TR.admin.createTenant}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{TR.admin.tenantName}</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownerName">{TR.admin.ownerName}</Label>
              <Input
                id="ownerName"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">{TR.admin.ownerEmail}</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={form.ownerEmail}
                onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerPassword">{TR.admin.ownerPassword}</Label>
            <Input
              id="ownerPassword"
              type="text"
              value={form.ownerPassword}
              onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? TR.common.loading : TR.common.create}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

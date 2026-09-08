import { getSessionContext, requireTenant } from '@/lib/auth-context'
import { prismaUnscoped } from '@/lib/db'
import { TenantSettings } from '@/app/_components/settings/tenant-settings'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const ctx = await getSessionContext()
  const tenantId = requireTenant(ctx)
  const tenant = await prismaUnscoped.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { nicheProfile: true, retentionDays: true },
  })
  const profile = (tenant.nicheProfile ?? null) as Record<string, unknown> | null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{TR.settings.title}</h1>
      <TenantSettings
        initialNiche={(profile?.niche as string) ?? ''}
        initialRetentionDays={tenant.retentionDays}
        currentProfile={profile}
      />
    </div>
  )
}

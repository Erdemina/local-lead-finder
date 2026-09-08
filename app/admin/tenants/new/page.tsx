import { TenantCreateForm } from '@/app/_components/admin/tenant-create-form'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

export default function NewTenantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{TR.admin.createTenant}</h1>
      <TenantCreateForm />
    </div>
  )
}

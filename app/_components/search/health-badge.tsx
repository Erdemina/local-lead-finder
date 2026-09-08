import { Badge } from '@/components/ui/badge'
import { TR } from '@/lib/i18n/tr'

const HEALTH_CONFIG: Record<string, { label: string; className: string }> = {
  green: { label: TR.health.green, className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  yellow: { label: TR.health.yellow, className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  red: { label: TR.health.red, className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  no_website: { label: TR.health.noWebsite, className: 'bg-slate-200 text-slate-700 hover:bg-slate-200' },
  unknown: { label: TR.health.unknown, className: 'bg-slate-100 text-slate-500 hover:bg-slate-100' },
}

export function HealthBadge({ status, title }: { status: string; title?: string }) {
  const config = HEALTH_CONFIG[status] ?? HEALTH_CONFIG.unknown
  return (
    <Badge variant="secondary" className={config.className} title={title}>
      {config.label}
    </Badge>
  )
}

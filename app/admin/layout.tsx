import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Database,
  Globe,
  ScrollText,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react'
import { getSessionContext } from '@/lib/auth-context'
import { QueryProvider } from '@/components/providers/query-provider'
import { LogoutButton } from '@/app/_components/shell/logout-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

const NAV_ITEMS = [
  { href: '/admin', label: TR.nav.dashboard, icon: LayoutDashboard },
  { href: '/admin/tenants', label: TR.nav.tenants, icon: Building2 },
  { href: '/admin/sources', label: TR.nav.sources, icon: Database },
  { href: '/admin/sites', label: TR.nav.sites, icon: Globe },
  { href: '/admin/audit', label: TR.nav.auditLog, icon: ScrollText },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let role: string
  try {
    const ctx = await getSessionContext()
    role = ctx.role
  } catch {
    redirect('/login')
  }
  if (role !== 'super_admin') redirect('/app')

  return (
    <QueryProvider>
      <div className="flex min-h-screen">
        <aside className="flex w-60 flex-col border-r bg-muted/30">
          <div className="flex items-center gap-2 border-b px-4 py-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold">{TR.nav.adminPanel}</span>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/app"
              className="mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {TR.nav.tenantApp}
            </Link>
          </nav>
          <div className="space-y-2 border-t p-3">
            <ThemeToggle variant="sidebar" />
            <LogoutButton />
          </div>
        </aside>
        <main className="flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </QueryProvider>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Search, Radar, Users, Zap, Settings, ShieldCheck, MapPin } from 'lucide-react'
import { getSessionContext, AuthError, type SessionContext } from '@/lib/auth-context'
import { prismaUnscoped } from '@/lib/db'
import { QueryProvider } from '@/components/providers/query-provider'
import { LogoutButton } from '@/app/_components/shell/logout-button'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

const NAV_ITEMS = [
  { href: '/app/search', label: TR.nav.search, icon: Search },
  { href: '/app/sweep', label: TR.nav.sweep, icon: Radar },
  { href: '/app/leads', label: TR.nav.leads, icon: Users },
  { href: '/app/actions', label: TR.nav.actions, icon: Zap },
  { href: '/app/settings', label: TR.nav.settings, icon: Settings },
]

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  let ctx: SessionContext
  try {
    ctx = await getSessionContext()
  } catch (e) {
    if (e instanceof AuthError && e.status === 403) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          <p className="max-w-md text-lg text-muted-foreground">{e.message}</p>
        </div>
      )
    }
    redirect('/login')
  }

  const tenant = ctx.tenantId
    ? await prismaUnscoped.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true },
      })
    : null

  return (
    <QueryProvider>
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1">
          <aside className="flex w-60 flex-col border-r bg-muted/30">
            <div className="flex items-center gap-2 border-b px-4 py-4">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="font-semibold">{TR.common.appName}</span>
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
              {ctx.role === 'super_admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {TR.nav.adminPanel}
                </Link>
              )}
            </nav>
            <div className="space-y-2 border-t p-3">
              {tenant && (
                <div className="space-y-1 px-3 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">{tenant.name}</div>
                </div>
              )}
              <LogoutButton />
            </div>
          </aside>
          <main className="flex-1 overflow-x-hidden p-6">{children}</main>
        </div>
      </div>
    </QueryProvider>
  )
}

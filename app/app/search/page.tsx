import { getSessionContext } from '@/lib/auth-context'
import { prismaUnscoped } from '@/lib/db'
import { SearchClient, type NicheProfile } from '@/app/_components/search/search-client'

export const dynamic = 'force-dynamic'

/** Açık olan her veri kaynağı herkese sunulur — kendi kendine barındırılan kurulumda plan yok. */
async function allowedSourceCodes() {
  const enabled = await prismaUnscoped.searchSource.findMany({
    where: { enabledGlobally: true },
    select: { code: true },
  })
  return enabled.map((s) => s.code)
}

export default async function SearchPage() {
  const ctx = await getSessionContext()

  let profile: NicheProfile | null = null
  if (ctx.tenantId) {
    const tenant = await prismaUnscoped.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { nicheProfile: true },
    })
    profile = (tenant?.nicheProfile as NicheProfile | null) ?? null
  }

  const sources = await allowedSourceCodes()

  return <SearchClient initialProfile={profile} allowedSources={sources} />
}

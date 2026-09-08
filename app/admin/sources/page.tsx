import { prismaUnscoped } from '@/lib/db'
import { parseAiConfig } from '@/lib/ai/config'
import { SourcesPanel, type AdminSource } from '@/app/_components/admin/sources-panel'
import { TR } from '@/lib/i18n/tr'

export const dynamic = 'force-dynamic'

const AI_SOURCES = ['ai_search', 'llm_research']

export default async function AdminSourcesPage() {
  const sources = await prismaUnscoped.searchSource.findMany({ orderBy: { code: 'asc' } })

  // Anahtarlar istemciye asla gönderilmez — yalnız varlık bilgisi taşınır.
  const rows: AdminSource[] = sources.map((s) => ({
    code: s.code,
    name: s.name,
    kind: s.kind,
    enabledGlobally: s.enabledGlobally,
    tosNotes: s.tosNotes,
    isAi: AI_SOURCES.includes(s.code),
    hasCredentials: !!s.credentialsEnc,
    config: parseAiConfig(s.config),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{TR.admin.sourcesTitle}</h1>
        <p className="text-sm text-muted-foreground">
          AI kaynakları için sağlayıcı, model ve API anahtarını buradan yönetin. Anahtarlar
          şifrelenerek saklanır ve hiçbir ekranda geri gösterilmez.
        </p>
      </div>
      <SourcesPanel sources={rows} />
    </div>
  )
}

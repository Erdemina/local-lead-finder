import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SOURCES = [
  {
    code: 'overpass',
    name: 'OpenStreetMap (Overpass)',
    kind: 'api' as const,
    tosNotes: 'Ücretsiz, anahtarsız. Kullanım politikası: en fazla 1 istek/sn, tanımlayıcı User-Agent zorunlu.',
    rateLimitPerSec: 1,
  },
  {
    code: 'google_places',
    name: 'Google Places API',
    kind: 'api' as const,
    tosNotes: 'Ücretli/kotalı resmi API. Faturalama hesabı gerekir; SKU başına sınırlı ücretsiz istek.',
    rateLimitPerSec: 5,
  },
  {
    code: 'llm_research',
    name: 'AI Zenginleştirme (LLM)',
    kind: 'api' as const,
    tosNotes: 'Arama sonuçlarını LLM ile zenginleştirir (not + dönüşüm skoru). Veri üretmez, sadece yorumlar.',
    rateLimitPerSec: 2,
  },
  {
    code: 'ai_search',
    name: 'AI Araması (Claude / OpenRouter)',
    kind: 'api' as const,
    tosNotes:
      'LLM + web araması ile aday keşfi. Sonuçlar doğrulanmalıdır; model hata yapabilir. API anahtarı Veri Kaynakları ekranından girilir.',
    rateLimitPerSec: 1,
  },
  {
    code: 'csv_import',
    name: 'CSV/Excel İçe Aktarma',
    kind: 'import' as const,
    tosNotes: 'Kendi listeniz. KVKK sorumluluğu veri sahibindedir.',
    rateLimitPerSec: null,
  },
]

async function main() {
  const sourceByCode: Record<string, { id: string }> = {}
  for (const s of SOURCES) {
    sourceByCode[s.code] = await prisma.searchSource.upsert({
      where: { code: s.code },
      update: { name: s.name, tosNotes: s.tosNotes, rateLimitPerSec: s.rateLimitPerSec },
      create: s,
    })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminUsername = (process.env.ADMIN_USERNAME ?? 'admin').toLowerCase().trim()
  if (!adminEmail || !adminPassword) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD tanımlı değil — süper admin oluşturulmadı.')
    return
  }

  const ownerTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Varsayılan Çalışma Alanı',
      slug: 'default',
    },
  })

  // Şifre ve kullanıcı adı .env'den yönetilir; seed her çalıştığında ikisi de senkronlanır.
  const passwordHash = await bcrypt.hash(adminPassword, 12)
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'super_admin',
      tenantId: ownerTenant.id,
      username: adminUsername,
      passwordHash,
    },
    create: {
      email: adminEmail,
      username: adminUsername,
      passwordHash,
      name: process.env.ADMIN_NAME ?? 'Admin',
      role: 'super_admin',
      tenantId: ownerTenant.id,
    },
  })

  console.log('Seed tamamlandı: veri kaynakları, varsayılan çalışma alanı ve süper admin hazır.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

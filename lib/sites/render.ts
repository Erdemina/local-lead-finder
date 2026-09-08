import fs from 'fs/promises'
import path from 'path'
import type { SiteFields } from './templates'

// Bilinçli olarak SSG/şablon motoru YOK: worker'da hızlı ve bağımlılıksız çalışması için
// düz HTML token değişimi ({{alan}}) + basit {{#if alan}}...{{/if}} blokları yeterli.

const TEMPLATES_DIR = path.join(process.cwd(), 'templates', 'sites')

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderTemplate(html: string, fields: Record<string, string | undefined>): string {
  // {{#if key}} ... {{/if}} — değer boşsa bloğu tamamen kaldır
  let out = html.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, key: string, block: string) => (fields[key]?.trim() ? block : '')
  )
  // {{key}} — HTML-escape edilmiş değer
  out = out.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    escapeHtml(fields[key]?.trim() ?? '')
  )
  return out
}

export async function generateSiteFiles(opts: {
  templateId: string
  slug: string
  fields: SiteFields
}): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, opts.templateId, 'index.html')
  const html = await fs.readFile(templatePath, 'utf8')

  const year = new Date().getFullYear().toString()
  const phoneHref = opts.fields.phone?.replace(/[^\d+]/g, '') ?? ''
  const rendered = renderTemplate(html, {
    business_name: opts.fields.businessName,
    category: opts.fields.category,
    phone: opts.fields.phone,
    phone_href: phoneHref,
    address: opts.fields.address,
    about: opts.fields.about,
    year,
  })

  const outputRoot = process.env.SITES_OUTPUT_DIR ?? './data/websites'
  const outputDir = path.join(outputRoot, opts.slug)
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(path.join(outputDir, 'index.html'), rendered, 'utf8')
  return outputDir
}

export async function deleteSiteFiles(slug: string): Promise<void> {
  // Slug'ı doğrula — path traversal engeli
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Geçersiz slug: ${slug}`)
  }
  const outputRoot = process.env.SITES_OUTPUT_DIR ?? './data/websites'
  const dir = path.join(outputRoot, slug)
  await fs.rm(dir, { recursive: true, force: true })
}

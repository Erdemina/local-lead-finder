export interface SiteTemplate {
  id: string
  name: string
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  { id: 'klasik', name: 'Klasik' },
  { id: 'modern', name: 'Modern' },
  { id: 'minimal', name: 'Minimal' },
]

export function isValidTemplate(id: string): boolean {
  return SITE_TEMPLATES.some((t) => t.id === id)
}

export interface SiteFields {
  businessName: string
  category?: string
  phone?: string
  address?: string
  about?: string
}

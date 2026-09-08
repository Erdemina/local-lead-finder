import type { Lead, LeadStage } from '@prisma/client'
import { stageLabel } from '@/lib/leads/stages'
import type { ParsedRow } from './leads-workbook'

export type ImportChangeType =
  | 'stage_change'
  | 'note_added'
  | 'contact_updated'
  | 'new_lead'
  | 'unchanged'
  | 'error'

export const CHANGE_LABELS: Record<ImportChangeType, string> = {
  stage_change: 'Aşama değişti',
  note_added: 'Not eklendi',
  contact_updated: 'İletişim güncellendi',
  new_lead: 'Yeni aday',
  unchanged: 'Değişiklik yok',
  error: 'Hata',
}

export interface FieldChange {
  field: string
  label: string
  from: string | null
  to: string | null
}

export interface ImportRow {
  rowNumber: number
  leadId: string | null
  name: string
  /** Satırın baskın değişiklik tipi — rozet olarak gösterilir. */
  type: ImportChangeType
  /** Bir satırda birden fazla değişiklik olabilir (aşama + not gibi). */
  types: ImportChangeType[]
  changes: FieldChange[]
  stage: LeadStage | null
  feedback: string | null
  lastContactAt: string | null
  phone: string | null
  email: string | null
  website: string | null
  category: string | null
  city: string | null
  district: string | null
  address: string | null
  message?: string
}

export interface ImportSummary {
  total: number
  stageChanges: number
  notesAdded: number
  contactsUpdated: number
  newLeads: number
  unchanged: number
  errors: number
}

function norm(value: string | null | undefined): string {
  return (value ?? '').trim()
}

const CONTACT_FIELDS = [
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'E-posta' },
  { key: 'website', label: 'Website' },
] as const

/** Excel satırlarını mevcut lead'lerle karşılaştırıp uygulanacak değişiklikleri çıkarır. */
export function diffRows(rows: ParsedRow[], leads: Map<string, Lead>): ImportRow[] {
  return rows.map((row) => {
    const base: ImportRow = {
      rowNumber: row.rowNumber,
      leadId: row.id,
      name: norm(row.name) || '(isimsiz)',
      type: 'unchanged',
      types: [],
      changes: [],
      stage: row.stage,
      feedback: norm(row.feedback) || null,
      lastContactAt: row.lastContactAt ? row.lastContactAt.toISOString() : null,
      phone: norm(row.phone) || null,
      email: norm(row.email) || null,
      website: norm(row.website) || null,
      category: norm(row.category) || null,
      city: norm(row.city) || null,
      district: norm(row.district) || null,
      address: norm(row.address) || null,
    }

    if (row.error) {
      return { ...base, type: 'error', types: ['error'], message: row.error }
    }

    // Lead ID yok → yeni aday
    if (!row.id) {
      if (!norm(row.name)) {
        return {
          ...base,
          type: 'error',
          types: ['error'],
          message: 'Lead ID ve İşletme Adı boş — satır eşleştirilemedi.',
        }
      }
      return {
        ...base,
        type: 'new_lead',
        types: ['new_lead'],
        changes: [{ field: 'name', label: 'İşletme Adı', from: null, to: base.name }],
      }
    }

    const lead = leads.get(row.id)
    if (!lead) {
      return {
        ...base,
        type: 'error',
        types: ['error'],
        message: `Lead ID bulunamadı: ${row.id}. Satırı silin veya Lead ID'yi boşaltıp yeni aday olarak ekleyin.`,
      }
    }

    base.name = lead.name
    const changes: FieldChange[] = []
    const types: ImportChangeType[] = []

    if (row.stage && row.stage !== lead.stage) {
      types.push('stage_change')
      changes.push({
        field: 'stage',
        label: 'Aşama',
        from: stageLabel(lead.stage),
        to: stageLabel(row.stage),
      })
    }

    if (base.feedback) {
      types.push('note_added')
      changes.push({ field: 'feedback', label: 'Geri Dönüş Notu', from: null, to: base.feedback })
    }

    for (const field of CONTACT_FIELDS) {
      const next = norm(base[field.key])
      const current = norm(lead[field.key])
      if (next && next !== current) {
        if (!types.includes('contact_updated')) types.push('contact_updated')
        changes.push({
          field: field.key,
          label: field.label,
          from: current || null,
          to: next,
        })
      }
    }

    if (base.lastContactAt) {
      const next = new Date(base.lastContactAt)
      const current = lead.lastContactAt
      if (!current || Math.abs(next.getTime() - current.getTime()) > 86_400_000) {
        if (!types.includes('contact_updated')) types.push('contact_updated')
        changes.push({
          field: 'lastContactAt',
          label: 'Son Temas',
          from: current ? current.toLocaleDateString('tr-TR') : null,
          to: next.toLocaleDateString('tr-TR'),
        })
      }
    }

    return {
      ...base,
      type: types[0] ?? 'unchanged',
      types,
      changes,
    }
  })
}

export function summarize(rows: ImportRow[]): ImportSummary {
  const count = (t: ImportChangeType) => rows.filter((r) => r.types.includes(t)).length
  return {
    total: rows.length,
    stageChanges: count('stage_change'),
    notesAdded: count('note_added'),
    contactsUpdated: count('contact_updated'),
    newLeads: count('new_lead'),
    unchanged: rows.filter((r) => r.type === 'unchanged').length,
    errors: count('error'),
  }
}

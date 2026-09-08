import type { LeadStage } from '@prisma/client'
import { TR } from '@/lib/i18n/tr'

// Aşama listesi hem sunucu (Excel dışa/içe aktarma) hem istemci tarafından kullanıldığı için
// 'use client' dosyalarının dışında duruyor.
export const STAGES = [
  { value: 'found', label: TR.leads.stageFound },
  { value: 'contacted', label: TR.leads.stageContacted },
  { value: 'demo_sent', label: TR.leads.stageDemoSent },
  { value: 'negotiation', label: TR.leads.stageNegotiation },
  { value: 'won', label: TR.leads.stageWon },
  { value: 'lost', label: TR.leads.stageLost },
] as const satisfies ReadonlyArray<{ value: LeadStage; label: string }>

export const STAGE_VALUES = STAGES.map((s) => s.value) as LeadStage[]

export function stageLabel(value: string): string {
  return STAGES.find((s) => s.value === value)?.label ?? value
}

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')
}

// Excel'den dönen hücre değerini enum'a çevirir: Türkçe etiket ya da ham enum değeri kabul edilir.
export function parseStage(input: unknown): LeadStage | null {
  if (input == null) return null
  const raw = normalize(String(input))
  if (!raw) return null
  const byLabel = STAGES.find((s) => normalize(s.label) === raw)
  if (byLabel) return byLabel.value
  const byValue = STAGES.find((s) => s.value === raw)
  return byValue ? byValue.value : null
}

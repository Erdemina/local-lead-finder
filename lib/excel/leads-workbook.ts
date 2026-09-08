import ExcelJS from 'exceljs'
import type { LeadStage } from '@prisma/client'
import { STAGES, parseStage, stageLabel } from '@/lib/leads/stages'

// Excel round-trip'in tek kaynağı: kolon tanımı hem yazma hem okuma tarafında burada.
// Dışa aktarımda kilitli olmayan hücreler = kullanıcının doldurması beklenen alanlar.

export interface LeadColumn {
  key: string
  header: string
  width: number
  editable: boolean
  hidden?: boolean
  type?: 'date' | 'number'
  validation?: 'stages'
}

export const LEAD_COLUMNS: LeadColumn[] = [
  { key: 'id', header: 'Lead ID', width: 26, editable: false, hidden: true },
  { key: 'name', header: 'İşletme Adı', width: 32, editable: false },
  { key: 'category', header: 'Kategori', width: 18, editable: false },
  { key: 'city', header: 'Şehir', width: 14, editable: false },
  { key: 'district', header: 'İlçe', width: 14, editable: false },
  { key: 'address', header: 'Adres', width: 40, editable: false },
  { key: 'phone', header: 'Telefon', width: 18, editable: true },
  { key: 'email', header: 'E-posta', width: 24, editable: true },
  { key: 'website', header: 'Website', width: 28, editable: true },
  { key: 'websiteHealth', header: 'Site Durumu', width: 16, editable: false },
  { key: 'aiScore', header: 'AI Skor', width: 9, editable: false, type: 'number' },
  { key: 'aiNote', header: 'AI Notu', width: 38, editable: false },
  { key: 'stage', header: 'Aşama', width: 18, editable: true, validation: 'stages' },
  { key: 'feedback', header: 'Geri Dönüş Notu', width: 44, editable: true },
  { key: 'lastContactAt', header: 'Son Temas', width: 14, editable: true, type: 'date' },
  { key: 'dataSource', header: 'Kaynak', width: 18, editable: false },
]

const SHEET_ROWS = 'Adaylar'
const SHEET_SUMMARY = 'Özet'
const SHEET_LOOKUP = 'Liste'

export const HEALTH_LABELS: Record<string, string> = {
  unknown: 'Bilinmiyor',
  no_website: 'Web sitesi yok',
  green: 'Çalışıyor',
  yellow: 'Sorunlu',
  red: 'Açılmıyor',
}

export const SOURCE_LABELS: Record<string, string> = {
  overpass: 'OpenStreetMap',
  ai_search: 'AI Araması',
  google_places: 'Google Places',
  csv_import: 'Excel İçe Aktarma',
  manual: 'Manuel Giriş',
}

export interface ExportLead {
  id: string
  name: string
  category?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  websiteHealth: string
  aiScore?: number | null
  aiNote?: string | null
  stage?: string | null
  lastContactAt?: Date | null
  dataSource: string
}

export interface BuildOptions {
  /** Arama sonucu dışa aktarımında aşama/geri dönüş kolonları henüz anlamsızdır. */
  includeStage?: boolean
  title?: string
  tenantName?: string
}

// ------------------------------------------------------------------ dışa aktarım

export async function buildLeadsWorkbook(
  leads: ExportLead[],
  opts: BuildOptions = {}
): Promise<Buffer> {
  const includeStage = opts.includeStage !== false
  const columns = LEAD_COLUMNS.filter(
    (c) => includeStage || (c.key !== 'stage' && c.key !== 'feedback' && c.key !== 'lastContactAt')
  )

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sales Prospecting Agent'
  wb.created = new Date()

  const lookup = wb.addWorksheet(SHEET_LOOKUP, { state: 'veryHidden' })
  STAGES.forEach((s, i) => {
    lookup.getCell(i + 1, 1).value = s.label
  })
  const stageRange = `${SHEET_LOOKUP}!$A$1:$A$${STAGES.length}`

  const ws = wb.addWorksheet(SHEET_ROWS, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    hidden: c.hidden,
  }))

  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C1D95' } }
  header.alignment = { vertical: 'middle' }
  header.height = 22

  for (const lead of leads) {
    ws.addRow({
      id: lead.id,
      name: lead.name,
      category: lead.category ?? '',
      city: lead.city ?? '',
      district: lead.district ?? '',
      address: lead.address ?? '',
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      website: lead.website ?? '',
      websiteHealth: HEALTH_LABELS[lead.websiteHealth] ?? lead.websiteHealth,
      aiScore: lead.aiScore ?? '',
      aiNote: lead.aiNote ?? '',
      stage: lead.stage ? stageLabel(lead.stage) : '',
      feedback: '',
      lastContactAt: lead.lastContactAt ?? '',
      dataSource: SOURCE_LABELS[lead.dataSource] ?? lead.dataSource,
    })
  }

  const lastRow = Math.max(ws.rowCount, 2)
  const colIndex = (key: string) => columns.findIndex((c) => c.key === key) + 1

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lastRow, column: columns.length },
  }

  // Kimlik kolonları kilitli, doldurulacak kolonlar açık: kullanıcı yanlışlıkla eşleşmeyi bozamaz.
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r)
    for (const col of columns) {
      const cell = row.getCell(colIndex(col.key))
      cell.protection = { locked: !col.editable }
      cell.alignment = { vertical: 'top', wrapText: col.width >= 32 }
      if (col.type === 'date') cell.numFmt = 'dd.mm.yyyy'
      if (col.validation === 'stages') {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [stageRange],
          showErrorMessage: true,
          errorTitle: 'Geçersiz aşama',
          error: 'Lütfen açılır listeden bir aşama seçin.',
        }
      }
    }
    row.commit()
  }

  const scoreCol = colIndex('aiScore')
  if (scoreCol > 0 && lastRow >= 2) {
    const ref = `${ws.getColumn(scoreCol).letter}2:${ws.getColumn(scoreCol).letter}${lastRow}`
    ws.addConditionalFormatting({
      ref,
      rules: [
        {
          type: 'cellIs',
          operator: 'greaterThan',
          priority: 1,
          formulae: ['7'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFBBF7D0' } } },
        },
        {
          type: 'cellIs',
          operator: 'lessThan',
          priority: 2,
          formulae: ['4'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFECACA' } } },
        },
      ],
    })
  }

  // Parolasız koruma: amaç güvenlik değil, kazara veri bozulmasını engellemek.
  await ws.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
    sort: true,
  })

  buildSummarySheet(wb, leads, opts)

  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}

function buildSummarySheet(wb: ExcelJS.Workbook, leads: ExportLead[], opts: BuildOptions): void {
  const ws = wb.addWorksheet(SHEET_SUMMARY)
  ws.columns = [
    { header: '', key: 'label', width: 30 },
    { header: '', key: 'value', width: 18 },
  ]

  const scored = leads.filter((l) => typeof l.aiScore === 'number')
  const avg = scored.length
    ? Math.round((scored.reduce((s, l) => s + (l.aiScore ?? 0), 0) / scored.length) * 10) / 10
    : null

  const write = (label: string, value: string | number, bold = false) => {
    const row = ws.addRow({ label, value })
    if (bold) row.font = { bold: true }
  }

  write(opts.title ?? 'Aday Listesi', '', true)
  write('Kiracı', opts.tenantName ?? '-')
  write('Dışa aktarım', new Date().toLocaleString('tr-TR'))
  write('Toplam kayıt', leads.length)
  write('Ortalama AI skoru', avg ?? '-')
  ws.addRow({})

  write('Aşamaya göre', '', true)
  for (const stage of STAGES) {
    write(stage.label, leads.filter((l) => l.stage === stage.value).length)
  }
  ws.addRow({})

  write('Site durumuna göre', '', true)
  for (const [key, label] of Object.entries(HEALTH_LABELS)) {
    write(label, leads.filter((l) => l.websiteHealth === key).length)
  }
  ws.addRow({})

  write('Nasıl kullanılır?', '', true)
  write('1.', '"Adaylar" sayfasında Aşama sütununu açılır listeden seçin.')
  write('2.', 'Geri Dönüş Notu ve Son Temas alanlarını doldurun.')
  write('3.', 'Telefon / E-posta / Website düzeltmelerini aynı satırda yapın.')
  write('4.', 'Yeni aday için en alta satır ekleyin; Lead ID boş kalsın.')
  write('5.', 'Dosyayı kaydedip uygulamada "Excel\'den Güncelle" ile yükleyin.')
}

// ------------------------------------------------------------------ içe aktarım

export interface ParsedRow {
  rowNumber: number
  id: string | null
  name: string | null
  phone: string | null
  email: string | null
  website: string | null
  stage: LeadStage | null
  feedback: string | null
  lastContactAt: Date | null
  category: string | null
  city: string | null
  district: string | null
  address: string | null
  error?: string
}

function cellText(cell: ExcelJS.Cell | undefined): string | null {
  if (!cell) return null
  const value = cell.value
  if (value == null) return null
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toISOString()
    // Zengin metin / formül / hyperlink hücreleri
    const rich = value as unknown as Record<string, unknown>
    if (typeof rich.text === 'string') return rich.text.trim() || null
    if (typeof rich.result === 'string') return rich.result.trim() || null
    if (Array.isArray(rich.richText)) {
      return (
        (rich.richText as { text: string }[])
          .map((r) => r.text)
          .join('')
          .trim() || null
      )
    }
    return null
  }
  const text = String(value).trim()
  return text || null
}

function cellDate(cell: ExcelJS.Cell | undefined): Date | null {
  if (!cell) return null
  const value = cell.value
  if (value instanceof Date) return value
  const text = cellText(cell)
  if (!text) return null
  // gg.aa.yyyy ve gg/aa/yyyy — Türkçe Excel'in yerel biçimleri
  const tr = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (tr) return new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1]))
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeHeader(text: string): string {
  return text.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')
}

export class ExcelParseError extends Error {}

export async function parseLeadsWorkbook(buffer: Buffer): Promise<ParsedRow[]> {
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer)
  } catch {
    throw new ExcelParseError(
      'Dosya okunamadı. Uygulamadan indirdiğiniz .xlsx dosyasını düzenleyip yükleyin.'
    )
  }

  const ws = wb.getWorksheet(SHEET_ROWS) ?? wb.worksheets[0]
  if (!ws) throw new ExcelParseError('Excel dosyasında sayfa bulunamadı.')

  const headerRow = ws.getRow(1)
  const index = new Map<string, number>()
  headerRow.eachCell((cell, colNumber) => {
    const text = cellText(cell)
    if (!text) return
    const match = LEAD_COLUMNS.find((c) => normalizeHeader(c.header) === normalizeHeader(text))
    if (match) index.set(match.key, colNumber)
  })

  if (!index.has('name')) {
    throw new ExcelParseError(
      '"İşletme Adı" sütunu bulunamadı. Başlık satırını silmeyin; uygulamadan indirdiğiniz dosyayı kullanın.'
    )
  }

  const at = (row: ExcelJS.Row, key: string) => {
    const col = index.get(key)
    return col ? row.getCell(col) : undefined
  }

  const rows: ParsedRow[] = []
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const id = cellText(at(row, 'id'))
    const name = cellText(at(row, 'name'))
    const stageText = cellText(at(row, 'stage'))
    const stage = parseStage(stageText)

    // Tamamen boş satırları sessizce atla (Excel sık sık boş satır bırakır)
    if (!id && !name && !stageText && !cellText(at(row, 'feedback'))) continue

    rows.push({
      rowNumber: r,
      id,
      name,
      phone: cellText(at(row, 'phone')),
      email: cellText(at(row, 'email')),
      website: cellText(at(row, 'website')),
      stage,
      feedback: cellText(at(row, 'feedback')),
      lastContactAt: cellDate(at(row, 'lastContactAt')),
      category: cellText(at(row, 'category')),
      city: cellText(at(row, 'city')),
      district: cellText(at(row, 'district')),
      address: cellText(at(row, 'address')),
      error: stageText && !stage ? `Tanınmayan aşama: "${stageText}"` : undefined,
    })
  }

  if (rows.length === 0) {
    throw new ExcelParseError('Dosyada veri satırı yok.')
  }

  return rows
}

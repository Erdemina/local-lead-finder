import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import {
  buildLeadsWorkbook,
  parseLeadsWorkbook,
  LEAD_COLUMNS,
  type ExportLead,
} from '@/lib/excel/leads-workbook'
import { diffRows, summarize } from '@/lib/excel/import-diff'

const LEADS: ExportLead[] = [
  {
    id: 'lead_a',
    name: 'Kadıköy Kuaför',
    category: 'Kuaför',
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Moda Cad. 1',
    phone: '+905551112233',
    email: null,
    website: null,
    websiteHealth: 'no_website',
    aiScore: 9,
    aiNote: 'Web sitesi yok, aktif işletme.',
    stage: 'found',
    lastContactAt: null,
    dataSource: 'overpass',
  },
  {
    id: 'lead_b',
    name: 'Beşiktaş Güzellik',
    category: 'Güzellik Salonu',
    city: 'İstanbul',
    district: 'Beşiktaş',
    address: null,
    phone: null,
    email: 'info@ornek.com',
    website: 'https://ornek.com',
    websiteHealth: 'green',
    aiScore: 3,
    aiNote: 'Sitesi çalışıyor.',
    stage: 'contacted',
    lastContactAt: null,
    dataSource: 'ai_search',
  },
]

/** Kullanıcının Excel'de yaptığı düzenlemeyi taklit eder. */
async function editWorkbook(
  buffer: Buffer,
  edit: (ws: ExcelJS.Worksheet, col: (key: string) => number) => void
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as unknown as ArrayBuffer)
  const ws = wb.getWorksheet('Adaylar')!
  const col = (key: string) => LEAD_COLUMNS.findIndex((c) => c.key === key) + 1
  edit(ws, col)
  return Buffer.from(await wb.xlsx.writeBuffer())
}

describe('leads workbook round-trip', () => {
  it('dışa aktarılan dosya geri okunduğunda aynı kimlikleri verir', async () => {
    const rows = await parseLeadsWorkbook(await buildLeadsWorkbook(LEADS))

    expect(rows).toHaveLength(2)
    expect(rows[0].id).toBe('lead_a')
    expect(rows[0].name).toBe('Kadıköy Kuaför')
    expect(rows[0].stage).toBe('found')
    expect(rows[1].stage).toBe('contacted')
    expect(rows[1].email).toBe('info@ornek.com')
  })

  it('aşama, not, iletişim ve yeni satır düzenlemelerini doğru tipte ayırt eder', async () => {
    const edited = await editWorkbook(await buildLeadsWorkbook(LEADS), (ws, col) => {
      // 2. satır = lead_a: aşama ilerletildi + geri dönüş notu
      ws.getRow(2).getCell(col('stage')).value = 'İletişime Geçildi'
      ws.getRow(2).getCell(col('feedback')).value = 'Aradım, fiyat istedi.'
      // 3. satır = lead_b: telefon düzeltmesi
      ws.getRow(3).getCell(col('phone')).value = '+905559998877'
      // 4. satır = Lead ID'siz yeni aday
      ws.getRow(4).getCell(col('name')).value = 'Yeni İşletme'
      ws.getRow(4).getCell(col('city')).value = 'İzmir'
    })

    const parsed = await parseLeadsWorkbook(edited)
    const leads = new Map(
      LEADS.map((l) => [
        l.id,
        {
          id: l.id,
          name: l.name,
          stage: l.stage,
          phone: l.phone,
          email: l.email,
          website: l.website,
          lastContactAt: null,
        },
      ])
    ) as never

    const diff = diffRows(parsed, leads)
    const summary = summarize(diff)

    expect(summary.stageChanges).toBe(1)
    expect(summary.notesAdded).toBe(1)
    expect(summary.contactsUpdated).toBe(1)
    expect(summary.newLeads).toBe(1)
    expect(summary.errors).toBe(0)

    const newRow = diff.find((r) => r.type === 'new_lead')
    expect(newRow?.name).toBe('Yeni İşletme')
    expect(newRow?.city).toBe('İzmir')
  })

  it('tanınmayan aşama etiketini hata olarak işaretler, yazma önerisi üretmez', async () => {
    const edited = await editWorkbook(await buildLeadsWorkbook(LEADS), (ws, col) => {
      ws.getRow(2).getCell(col('stage')).value = 'Bilinmeyen Aşama'
    })

    const diff = diffRows(await parseLeadsWorkbook(edited), new Map() as never)
    expect(diff[0].type).toBe('error')
    expect(diff[0].message).toContain('Bilinmeyen Aşama')
  })

  it('aşama hücresinde açılır liste, kimlik hücrelerinde kilit ve özet sayfası üretir', async () => {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load((await buildLeadsWorkbook(LEADS)) as unknown as ArrayBuffer)

    const ws = wb.getWorksheet('Adaylar')!
    const col = (key: string) => LEAD_COLUMNS.findIndex((c) => c.key === key) + 1

    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(ws.autoFilter).toBeTruthy()

    const stageCell = ws.getRow(2).getCell(col('stage'))
    expect(stageCell.dataValidation?.type).toBe('list')
    expect(stageCell.protection?.locked).toBe(false)
    // Kimlik ve isim kolonları kullanıcı tarafından değiştirilememeli.
    // Excel'de "locked" varsayılan olduğu için dosyada yazılmaz; anlamlı olan
    // yalnız açık bırakılan hücrelerin açıkça false olmasıdır.
    expect(ws.getRow(2).getCell(col('id')).protection?.locked).not.toBe(false)
    expect(ws.getRow(2).getCell(col('name')).protection?.locked).not.toBe(false)

    expect(wb.getWorksheet('Özet')).toBeTruthy()
    expect(wb.getWorksheet('Liste')?.state).toBe('veryHidden')
  })

  it('arama sonucu dışa aktarımında aşama/geri dönüş kolonları çıkmaz', async () => {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(
      (await buildLeadsWorkbook(LEADS, { includeStage: false })) as unknown as ArrayBuffer
    )
    const headers = (wb.getWorksheet('Adaylar')!.getRow(1).values as string[]).filter(Boolean)
    expect(headers).not.toContain('Aşama')
    expect(headers).not.toContain('Geri Dönüş Notu')
    expect(headers).toContain('İşletme Adı')
  })

  it('bozuk dosyada kullanıcıya ne yapacağını söyleyen hata verir', async () => {
    await expect(parseLeadsWorkbook(Buffer.from('bu bir xlsx degil'))).rejects.toThrow(
      /Dosya okunamadı/
    )
  })
})

import Anthropic from '@anthropic-ai/sdk'
import { prismaUnscoped } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'
import { DEFAULT_AI_CONFIG, parseAiConfig, type AiProvider, type AiSourceConfig } from './config'

export { DEFAULT_AI_CONFIG, parseAiConfig }
export type { AiProvider, AiSourceConfig }

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
// Web aramalı araştırma turu 100 sn'yi bulabiliyor; asılı kalmaktansa temiz hata verilir.
const OPENROUTER_TIMEOUT_MS = 120_000
const ANTHROPIC_WEB_SEARCH = { type: 'web_search_20260209', name: 'web_search', max_uses: 8 }

// Kullanıcıya gösterilebilir, ne yapılacağını söyleyen hatalar.
export class AiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiError'
  }
}

export interface AiToolSpec {
  name: string
  description: string
  /** JSON Schema — strict mod için additionalProperties:false ve tam required listesi şart. */
  schema: Record<string, unknown>
}

export interface AiRunOptions {
  system: string
  user: string
  tool: AiToolSpec
  /** Web araması yalnız keşif için gerekli; skorlamada kapalı tutulur (hız + maliyet). */
  webSearch?: boolean
  effort?: 'low' | 'medium' | 'high'
  maxTokens?: number
}

export interface AiClient {
  provider: AiProvider
  model: string
  run<T>(opts: AiRunOptions): Promise<T>
}

function envKeyFor(provider: AiProvider): string | undefined {
  const raw =
    provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENROUTER_API_KEY
  const trimmed = raw?.trim()
  return trimmed && !trimmed.startsWith('your_') ? trimmed : undefined
}

/** DB'deki kaynak kaydından yapılandırma + çözülmüş API anahtarını okur. */
export async function loadAiSource(
  sourceCode: string
): Promise<{ config: AiSourceConfig; apiKey: string }> {
  const source = await prismaUnscoped.searchSource.findUnique({ where: { code: sourceCode } })
  if (!source) {
    throw new AiError(
      `"${sourceCode}" veri kaynağı tanımlı değil. Süper admin › Veri Kaynakları ekranından ekleyin.`
    )
  }
  if (!source.enabledGlobally) {
    throw new AiError(`"${source.name}" kaynağı kapalı. Süper admin › Veri Kaynakları'ndan açın.`)
  }

  const config = parseAiConfig(source.config)

  let apiKey = envKeyFor(config.provider)
  if (source.credentialsEnc) {
    try {
      apiKey = decryptSecret(source.credentialsEnc)
    } catch {
      throw new AiError(
        `"${source.name}" için kayıtlı API anahtarı çözülemedi (SECRETS_MASTER_KEY değişmiş olabilir). Anahtarı Veri Kaynakları ekranından yeniden girin.`
      )
    }
  }
  if (!apiKey) {
    throw new AiError(
      `"${source.name}" için API anahtarı tanımlı değil. Süper admin › Veri Kaynakları ekranından anahtarı girin.`
    )
  }

  return { config, apiKey }
}

export function createAiClient(config: AiSourceConfig, apiKey: string): AiClient {
  return config.provider === 'anthropic'
    ? anthropicClient(config, apiKey)
    : openRouterClient(config, apiKey)
}

export async function getAiClient(sourceCode: string): Promise<AiClient> {
  const { config, apiKey } = await loadAiSource(sourceCode)
  return createAiClient(config, apiKey)
}

// ---------------------------------------------------------------- Anthropic

function anthropicClient(config: AiSourceConfig, apiKey: string): AiClient {
  const client = new Anthropic({ apiKey, maxRetries: 2 })

  return {
    provider: 'anthropic',
    model: config.model,
    async run<T>(opts: AiRunOptions): Promise<T> {
      const useWebSearch = opts.webSearch !== false && config.webSearch
      const submitTool = {
        name: opts.tool.name,
        description: opts.tool.description,
        input_schema: opts.tool.schema,
        strict: true,
      }
      // web_search sunucu tarafı araç; SDK 0.115 tiplerinde henüz yok, bu yüzden cast gerekiyor.
      const tools = (useWebSearch ? [ANTHROPIC_WEB_SEARCH, submitTool] : [submitTool]) as any

      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: opts.user }]
      let nudged = false

      for (let attempt = 0; attempt < 6; attempt++) {
        const stream = client.messages.stream({
          model: config.model,
          max_tokens: opts.maxTokens ?? 16000,
          system: opts.system,
          tools,
          // Web araması varsa modelin önce arama yapması gerekir; zorlama yapılamaz.
          tool_choice: useWebSearch ? { type: 'auto' } : { type: 'tool', name: opts.tool.name },
          output_config: { effort: opts.effort ?? 'medium' },
          messages,
        } as any)
        const response = await stream.finalMessage()

        if (response.stop_reason === 'refusal') {
          throw new AiError(
            'Model bu isteği güvenlik nedeniyle reddetti. Arama kriterlerini sadeleştirip tekrar deneyin.'
          )
        }

        const submitted = response.content.find(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === opts.tool.name
        )
        if (submitted) return submitted.input as T

        messages.push({ role: 'assistant', content: response.content })

        // Sunucu tarafı araç döngüsü sınırına takıldı — aynı isteği yeniden göndermek devam ettirir.
        if (response.stop_reason === 'pause_turn') continue

        if (!nudged) {
          nudged = true
          messages.push({
            role: 'user',
            content: `Sonucu metin olarak yazma. "${opts.tool.name}" aracını çağırarak döndür.`,
          })
          continue
        }

        throw new AiError('Model beklenen yapıda yanıt üretmedi. Lütfen tekrar deneyin.')
      }

      throw new AiError('Model çok fazla adımda sonuca ulaşamadı. Sonuç sayısını azaltıp deneyin.')
    },
  }
}

// --------------------------------------------------------------- OpenRouter

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function openRouterClient(config: AiSourceConfig, apiKey: string): AiClient {
  async function chat(body: Record<string, unknown>): Promise<any> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Title': 'Sales Prospecting Agent',
        },
        body: JSON.stringify({ model: config.model, ...body }),
        signal: controller.signal,
      })
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new AiError(
          `OpenRouter ${OPENROUTER_TIMEOUT_MS / 1000} sn içinde yanıt vermedi. Sonuç sayısını azaltın veya daha hızlı bir model seçin.`
        )
      }
      throw new AiError(
        `OpenRouter'a bağlanılamadı: ${e instanceof Error ? e.message : 'bilinmeyen hata'}`
      )
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      if (res.status === 401 || res.status === 403) {
        throw new AiError(
          'OpenRouter anahtarı reddedildi. Veri Kaynakları ekranından anahtarı güncelleyin.'
        )
      }
      if (res.status === 402) {
        throw new AiError('OpenRouter bakiyesi yetersiz. Hesabınıza kredi yükleyin.')
      }
      if (res.status === 429) {
        throw new AiError('OpenRouter hız sınırına takıldı. Birkaç dakika sonra tekrar deneyin.')
      }
      throw new AiError(
        `OpenRouter isteği başarısız (${res.status}). ${detail.slice(0, 200) || 'Model adını kontrol edin.'}`
      )
    }

    // 200 + boş/HTML gövde olabiliyor (upstream timeout). Ham SyntaxError kullanıcıya
    // "Unexpected end of JSON input" olarak sızmasın diye burada yakalanıyor.
    const text = await res.text()
    if (!text.trim()) {
      throw new AiError(
        'OpenRouter boş yanıt döndürdü (büyük olasılıkla model zaman aşımı). Sonuç sayısını azaltıp tekrar deneyin.'
      )
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new AiError(
        `OpenRouter beklenmeyen bir yanıt döndürdü: ${text.slice(0, 120).replace(/\s+/g, ' ')}`
      )
    }
  }

  return {
    provider: 'openrouter',
    model: config.model,
    async run<T>(opts: AiRunOptions): Promise<T> {
      const useWebSearch = opts.webSearch !== false && config.webSearch
      const messages: ChatMessage[] = [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ]

      // OpenRouter'da web araması Anthropic'teki gibi bir araç değil, prompt'a sonuç
      // enjekte eden bir eklenti. tool_choice ile araç aynı turda zorlanırsa model
      // arama sonuçlarını okuyamadan yanıt veriyor ve boş liste dönüyor (ölçüldü).
      // Bu yüzden önce serbest metin araştırması, sonra yapılandırma yapılıyor.
      if (useWebSearch) {
        const research = await chat({
          max_tokens: opts.maxTokens ?? 16000,
          messages,
          plugins: [{ id: 'web', max_results: 10 }],
        })
        const prose = research?.choices?.[0]?.message?.content
        if (!prose || !String(prose).trim()) {
          throw new AiError(
            'Web araması sonuç döndürmedi. Şehir/ilçe yazımını kontrol edin veya birkaç dakika sonra tekrar deneyin.'
          )
        }
        messages.push({ role: 'assistant', content: String(prose) })
        messages.push({
          role: 'user',
          content: `Yukarıdaki araştırma sonucunu "${opts.tool.name}" aracıyla yapılandır. Yeni işletme ekleme, uydurma; sadece yukarıda geçenleri kullan. Eksik alanları boş string bırak.`,
        })
      }

      const data = await chat({
        max_tokens: opts.maxTokens ?? 16000,
        messages,
        tools: [
          {
            type: 'function',
            function: {
              name: opts.tool.name,
              description: opts.tool.description,
              parameters: opts.tool.schema,
              // Anthropic yolundaki strict:true ile eşitlensin; şema zaten
              // additionalProperties:false + tam required listesi taşıyor.
              strict: true,
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: opts.tool.name } },
      })

      const choice = data?.choices?.[0]
      const args = choice?.message?.tool_calls?.[0]?.function?.arguments
      if (!args) {
        if (choice?.finish_reason === 'length') {
          throw new AiError(
            'Yanıt token sınırına takıldı. Sonuç sayısını azaltıp tekrar deneyin.'
          )
        }
        throw new AiError(
          'Model beklenen yapıda yanıt üretmedi. Seçili modelin araç çağırmayı (tool calling) desteklediğinden emin olun.'
        )
      }
      try {
        return (typeof args === 'string' ? JSON.parse(args) : args) as T
      } catch {
        // Kesilmiş araç argümanı = token sınırı; ham JSON hatası göstermek yerine ne yapacağını söyle.
        throw new AiError(
          choice?.finish_reason === 'length'
            ? 'Yanıt token sınırına takıldığı için yarıda kesildi. Sonuç sayısını azaltıp tekrar deneyin.'
            : 'Model geçersiz JSON döndürdü. Lütfen tekrar deneyin.'
        )
      }
    },
  }
}

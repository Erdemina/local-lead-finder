// Sunucu bağımlılığı olmayan AI yapılandırma tipleri — admin ekranı (client component)
// bunları import edebilsin diye provider.ts'ten ayrı duruyor.

export type AiProvider = 'anthropic' | 'openrouter'

export interface AiSourceConfig {
  provider: AiProvider
  model: string
  webSearch: boolean
}

// OpenRouter model kimlikleri /api/v1/models ile doğrulandı; "-latest" takma adları geçersiz.
export const DEFAULT_AI_CONFIG: Record<AiProvider, { model: string }> = {
  anthropic: { model: 'claude-opus-5' },
  openrouter: { model: 'anthropic/claude-sonnet-5' },
}

export function parseAiConfig(raw: unknown): AiSourceConfig {
  const cfg = (raw ?? {}) as Record<string, unknown>
  const provider: AiProvider = cfg.provider === 'openrouter' ? 'openrouter' : 'anthropic'
  const model =
    typeof cfg.model === 'string' && cfg.model.trim()
      ? cfg.model.trim()
      : DEFAULT_AI_CONFIG[provider].model
  return { provider, model, webSearch: cfg.webSearch !== false }
}

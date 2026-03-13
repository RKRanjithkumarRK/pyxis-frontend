import { ModelDef } from '@/types'

export const models: ModelDef[] = [

  /* ──────────────────────────────────────────────────────
   * FREE  — Google AI Studio (Gemini)
   * Works for all users, no OpenRouter credits needed
   * ────────────────────────────────────────────────────── */
  {
    id:          'gemini-2.5-flash',
    name:        'Gemini 2.5 Flash',
    provider:    'Google',
    description: 'Latest Gemini — fast, smart, 2026 knowledge',
    free:        true,
    maxTokens:   8192,
  },
  {
    id:          'gemini-2.0-flash',
    name:        'Gemini 2.0 Flash',
    provider:    'Google',
    description: 'Fast & capable — great for most tasks',
    free:        true,
    maxTokens:   8192,
  },
  {
    id:          'gemini-2.0-flash-lite',
    name:        'Gemini 2.0 Flash Lite',
    provider:    'Google',
    description: 'Ultra-fast, lightest Gemini model',
    free:        true,
    maxTokens:   4096,
  },
  {
    id:          'gemini-1.5-flash',
    name:        'Gemini 1.5 Flash',
    provider:    'Google',
    description: 'Stable & reliable for everyday use',
    free:        true,
    maxTokens:   8192,
  },
  {
    id:          'gemini-1.5-pro',
    name:        'Gemini 1.5 Pro',
    provider:    'Google',
    description: 'Pro-level reasoning and long context',
    free:        true,
    maxTokens:   8192,
  },

  /* ──────────────────────────────────────────────────────
   * PREMIUM  — OpenRouter (requires API key in Settings)
   * ────────────────────────────────────────────────────── */
  {
    id:          'anthropic/claude-3.7-sonnet',
    name:        'Claude 3.7 Sonnet',
    provider:    'Anthropic',
    description: 'Best for writing, analysis & coding',
    free:        false,
    maxTokens:   8192,
  },
  {
    id:          'anthropic/claude-3.5-haiku',
    name:        'Claude 3.5 Haiku',
    provider:    'Anthropic',
    description: 'Fast & affordable Claude',
    free:        false,
    maxTokens:   4096,
  },
  {
    id:          'openai/gpt-4o',
    name:        'GPT-4o',
    provider:    'OpenAI',
    description: 'OpenAI flagship multimodal model',
    free:        false,
    maxTokens:   4096,
  },
  {
    id:          'openai/gpt-4o-mini',
    name:        'GPT-4o Mini',
    provider:    'OpenAI',
    description: 'Fast & affordable GPT model',
    free:        false,
    maxTokens:   4096,
  },
  {
    id:          'meta-llama/llama-3.3-70b-instruct:free',
    name:        'Llama 3.3 70B',
    provider:    'Meta (OpenRouter)',
    description: 'Open-source powerhouse (subject to rate limits)',
    free:        true,
    maxTokens:   4096,
  },
  {
    id:          'google/gemini-2.0-flash-001',
    name:        'Gemini 2.0 Flash (OpenRouter)',
    provider:    'Google via OpenRouter',
    description: 'Via OpenRouter with higher paid limits',
    free:        false,
    maxTokens:   8192,
  },
  {
    id:          'deepseek/deepseek-chat-v3-0324:free',
    name:        'DeepSeek V3',
    provider:    'DeepSeek (OpenRouter)',
    description: 'DeepSeek V3 — excellent reasoning (rate limited)',
    free:        true,
    maxTokens:   4096,
  },
]

/* Default to best free model */
export const defaultModel = 'gemini-2.5-flash'

export function getModel(id: string): ModelDef | undefined {
  return models.find(m => m.id === id)
}

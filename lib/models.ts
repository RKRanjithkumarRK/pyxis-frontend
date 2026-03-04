import { ModelDef } from '@/types'

export const models: ModelDef[] = [
  // ── FREE TIER ── No credits needed. Uses OpenRouter free endpoints.
  // "Auto (Free)" uses OpenRouter's smart free router — picks best available model automatically
  { id: 'openrouter/auto:free',              name: 'Auto (Free)',       provider: 'OpenRouter', description: 'Automatically picks the best available free model', free: true, maxTokens: 2048 },
  { id: 'stepfun/step-3.5-flash:free',       name: 'Step 3.5 Flash',   provider: 'Stepfun',   description: 'Fast & capable free model',                          free: true, maxTokens: 2048 },
  { id: 'arcee-ai/trinity-large-preview:free', name: 'Trinity Large',  provider: 'Arcee AI',  description: '400B params, powerful reasoning',                    free: true, maxTokens: 2048 },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nemotron 30B',  provider: 'NVIDIA',    description: 'NVIDIA open model, 30B params',                       free: true, maxTokens: 2048 },
  { id: 'arcee-ai/trinity-mini:free',        name: 'Trinity Mini',     provider: 'Arcee AI',  description: 'Compact & fast free model',                          free: true, maxTokens: 2048 },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', provider: 'Meta',  description: 'Powerful open-source model (may be rate-limited)',   free: true, maxTokens: 2048 },
  { id: 'google/gemma-3-12b-it:free',        name: 'Gemma 3 12B',      provider: 'Google',   description: 'Fast Google model (may be rate-limited)',             free: true, maxTokens: 2048 },

  // ── PAID TIER ── Requires OpenRouter credits. Add your key in Settings → Account.
  { id: 'anthropic/claude-3.5-haiku',        name: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Fast & affordable Claude model',   free: false, maxTokens: 2048 },
  { id: 'openai/gpt-4o-mini',                name: 'GPT-4o Mini',      provider: 'OpenAI',    description: 'Affordable & fast GPT model',       free: false, maxTokens: 2048 },
  { id: 'google/gemini-2.0-flash-001',       name: 'Gemini 2.0 Flash', provider: 'Google',    description: 'Fast Gemini model',                  free: false, maxTokens: 2048 },
  { id: 'anthropic/claude-sonnet-4-5',       name: 'Claude Sonnet 4.5', provider: 'Anthropic', description: 'Most capable Claude model',        free: false, maxTokens: 2048 },
  { id: 'openai/gpt-4o',                     name: 'GPT-4o',           provider: 'OpenAI',    description: 'Latest GPT-4 model',                free: false, maxTokens: 2048 },
]

export const defaultModel = models[0].id

export function getModel(id: string): ModelDef | undefined {
  return models.find(m => m.id === id)
}

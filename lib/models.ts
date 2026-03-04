import { ModelDef } from '@/types'

export const models: ModelDef[] = [
  // Free models — verified working on OpenRouter (no credits needed)
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', provider: 'Meta', description: 'Powerful open-source model', free: true, maxTokens: 4096 },
  { id: 'google/gemma-3-12b-it:free', name: 'Gemma 3 12B', provider: 'Google', description: 'Fast Google model', free: true, maxTokens: 4096 },
  { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', provider: 'Google', description: 'Larger Google model', free: true, maxTokens: 4096 },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B', provider: 'Alibaba', description: 'Powerful multilingual model', free: true, maxTokens: 4096 },
  { id: 'microsoft/phi-4:free', name: 'Phi-4', provider: 'Microsoft', description: 'Efficient reasoning model', free: true, maxTokens: 4096 },
  // Paid models — require OpenRouter credits (add your key in Settings → Account → API Keys)
  { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', description: 'Most capable Claude model', free: false, maxTokens: 4096 },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Fast Claude model', free: false, maxTokens: 4096 },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Latest GPT model', free: false, maxTokens: 4096 },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Affordable GPT model', free: false, maxTokens: 4096 },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Fast Gemini model', free: false, maxTokens: 4096 },
]

export const defaultModel = models[0].id

export function getModel(id: string): ModelDef | undefined {
  return models.find(m => m.id === id)
}

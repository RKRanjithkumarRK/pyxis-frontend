const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function streamChat(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  systemPrompt?: string,
  maxTokens = 2048,
): Promise<ReadableStream<Uint8Array>> {
  const allMessages: ChatMessage[] = []
  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt })
  }
  allMessages.push(...messages)

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Pyxis',
    },
    body: JSON.stringify({
      model,
      messages: allMessages,
      stream: true,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const raw = await response.text()
    if (response.status === 429) {
      throw new Error('This model is temporarily rate limited. Please select a different model from the dropdown.')
    }
    if (response.status === 404) {
      throw new Error('This model is no longer available on OpenRouter. Please select a different model.')
    }
    if (response.status === 402) {
      throw new Error('Not enough OpenRouter credits for this model. Add your own API key in Settings → Account → API Keys, or switch to a free model.')
    }
    let msg = raw
    try {
      const parsed = JSON.parse(raw)
      msg = parsed?.error?.message || raw
    } catch {}
    throw new Error(msg || `Request failed (${response.status})`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue
            const data = trimmed.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            } catch {}
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })
}
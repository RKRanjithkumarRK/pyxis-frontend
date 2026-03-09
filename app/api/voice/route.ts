import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth-helper'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic    = 'force-dynamic'
export const maxDuration = 30

/* ── Keywords that suggest the query needs live web data ── */
const SEARCH_TRIGGERS = [
  'today', 'tonight', 'yesterday', 'right now', 'happening',
  'latest', 'recent', 'just happened', 'breaking', 'news',
  'current', 'this week', 'this month', 'this year',
  'weather', 'temperature', 'forecast',
  'score', 'result', 'who won', 'winner',
  'stock', 'price', 'market', 'crypto',
  'released', 'launched', 'announced', 'new version',
  '2025', '2026', '2027',
]

function needsSearch(text: string): boolean {
  const lower = text.toLowerCase()
  return SEARCH_TRIGGERS.some(kw => lower.includes(kw))
}

/* ── Inline DuckDuckGo web search ── */
async function searchWeb(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(4000),
      }
    )
    const html  = await res.text()
    const items: string[] = []
    const blocks = html.split('result__body')
    for (const block of blocks.slice(1, 8)) {
      if (block.includes('result--ad') || block.includes('sponsored')) continue
      const titleM   = block.match(/class="result__a"[^>]*>([^<]+)</)
      const snippetM = block.match(/class="result__snippet"[^>]*>([^<]+(?:<b>[^<]*<\/b>[^<]*)*)/)
      if (titleM) {
        const title   = titleM[1].trim()
        const snippet = snippetM ? snippetM[1].replace(/<[^>]+>/g, '').trim() : ''
        items.push(snippet ? `• ${title}: ${snippet}` : `• ${title}`)
      }
      if (items.length >= 4) break
    }
    return items.length > 0
      ? `[Live web results]\n${items.join('\n')}`
      : ''
  } catch {
    return ''
  }
}

/* ── Single non-streaming AI call ── */
async function callAI(
  url: string,
  headers: Record<string, string>,
  body: object,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(18000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  /* ── Auth ── */
  const user = await verifyToken(req)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages, systemPrompt } = await req.json()

  /* ── API keys ── */
  const keySnap   = await adminDb.doc(`users/${user.uid}/private/apikeys`).get()
  const userKeys  = keySnap.exists ? keySnap.data() || {} : {}
  const orKey     = userKeys.openrouter || process.env.OPENROUTER_API_KEY
  const googleKey = process.env.GOOGLE_API_KEY

  if (!orKey && !googleKey) {
    return Response.json({ error: 'No API key configured.' }, { status: 400 })
  }

  /* ── Auto web search for current-event queries ── */
  const lastUserContent: string =
    [...messages].reverse().find((m: any) => m.role === 'user')?.content || ''

  let webCtx = ''
  if (needsSearch(lastUserContent)) {
    webCtx = await searchWeb(lastUserContent)
  }

  /* ── System prompt (with optional web-search instruction) ── */
  const baseSys = systemPrompt ||
    'You are Pyxis, a friendly and helpful voice AI assistant. ' +
    'Reply in 1–3 short conversational sentences. ' +
    'No markdown, bullets, or lists — plain spoken language only. ' +
    'Never reveal your underlying model or provider. You are Pyxis.'

  const sysContent = webCtx
    ? `${baseSys}\n\nYou have live web search results. Use them to give an accurate, up-to-date answer. Cite naturally ("According to recent reports…").`
    : baseSys

  /* ── Inject web context into last user message ── */
  const augmentedMessages = webCtx
    ? messages.map((m: any, idx: number) =>
        idx === messages.length - 1 && m.role === 'user'
          ? { ...m, content: `${m.content}\n\n${webCtx}` }
          : m
      )
    : messages

  const allMessages = [
    { role: 'system', content: sysContent },
    ...augmentedMessages,
  ]

  const reqBody = { messages: allMessages, stream: false, max_tokens: 200 }

  /* ── 1. Google AI Studio — gemini-2.5-flash (most up-to-date model) ── */
  if (googleKey) {
    for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']) {
      const reply = await callAI(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        { Authorization: `Bearer ${googleKey}` },
        { model, ...reqBody },
      )
      if (reply) return Response.json({ reply, searched: !!webCtx })
    }
  }

  /* ── 2. OpenRouter fallback ── */
  if (orKey) {
    for (const model of [
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-3-27b-it:free',
    ]) {
      const reply = await callAI(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          Authorization: `Bearer ${orKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Pyxis Voice',
        },
        { model, ...reqBody },
      )
      if (reply) return Response.json({ reply, searched: !!webCtx })
    }
  }

  return Response.json({ error: 'All AI models unavailable. Please try again.' }, { status: 503 })
}

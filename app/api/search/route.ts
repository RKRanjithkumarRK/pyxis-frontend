import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || ''
  if (!query) return Response.json({ results: [], answer: '' })

  try {
    // Scrape DuckDuckGo HTML results (still works, no API key needed)
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    )

    const html = await res.text()
    const results: { title: string; snippet: string; url: string }[] = []

    // Extract result titles, snippets, URLs from DDG HTML
    const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/g
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/g
    const urlRegex = /<a[^>]+class="result__url"[^>]*>([^<]*)<\/a>/g

    // Simpler approach: find result blocks
    const blocks = html.split('result__body')
    for (const block of blocks.slice(1, 12)) {
      // Skip sponsored/ad results
      if (block.includes('result--ad') || block.includes('sponsored')) continue

      const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</)
      const hrefMatch = block.match(/uddg=([^&"]+)/)
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([^<]+(?:<b>[^<]*<\/b>[^<]*)*)/)

      if (titleMatch) {
        const title = titleMatch[1].replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim()
        const url = hrefMatch ? decodeURIComponent(hrefMatch[1]) : ''
        const snippet = snippetMatch
          ? snippetMatch[1].replace(/<b>/g, '').replace(/<\/b>/g, '').replace(/&amp;/g, '&').trim()
          : ''
        // Skip DDG ad redirect URLs
        if (title && url && !url.startsWith('https://duckduckgo.com/y.js')) {
          results.push({ title, snippet, url })
        }
      }
    }

    return Response.json({ results: results.slice(0, 6), answer: '' })
  } catch (err: any) {
    return Response.json({ results: [], answer: '', error: err.message })
  }
}

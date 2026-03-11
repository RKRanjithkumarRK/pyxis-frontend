/**
 * Free AI News Feed
 * Aggregates RSS feeds from top AI/tech publications.
 * No API key required.
 */
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const FEEDS = [
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'The Verge AI',   url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
]

interface Article {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

function parseRSS(xml: string, sourceName: string): Article[] {
  const items: Article[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

  for (const match of itemMatches) {
    const item = match[1]
    const title       = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() || ''
    const link        = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim()
                     || item.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/)?.[1]?.trim() || ''
    const description = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]
                          ?.replace(/<[^>]+>/g, '').trim().slice(0, 200) || ''
    const pubDate     = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || ''

    if (title && link) {
      items.push({ title, link, description, pubDate, source: sourceName })
    }
    if (items.length >= 5) break
  }
  return items
}

export async function GET() {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Pyxis/1.0 RSS Reader' },
        next: { revalidate: 1800 }, // cache 30 min
      })
      const xml = await res.text()
      return parseRSS(xml, feed.name)
    })
  )

  const articles: Article[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') articles.push(...result.value)
  }

  // Sort by date (newest first)
  articles.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
    return db - da
  })

  return new Response(JSON.stringify({ articles: articles.slice(0, 20) }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=1800' },
  })
}

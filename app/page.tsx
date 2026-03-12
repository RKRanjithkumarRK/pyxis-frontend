'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

const SKILLS = [
  { icon: '✍️', title: 'Prompt Engineering', desc: 'Craft precision prompts that extract 10× better results from any AI model', color: 'from-violet-500 to-purple-600' },
  { icon: '⚙️', title: 'AI Workflow Builder', desc: 'Chain AI models together into automated, intelligent multi-step pipelines', color: 'from-orange-500 to-amber-500' },
  { icon: '🤖', title: 'Specialized AI Agents', desc: 'Research, Code, Writing, Data Analysis, SEO — 8 expert agents on demand', color: 'from-blue-500 to-cyan-500' },
  { icon: '📄', title: 'Document Intelligence', desc: 'Chat with PDFs, contracts, and reports — extract insights in seconds', color: 'from-emerald-500 to-green-500' },
  { icon: '🎨', title: 'Image Generation', desc: 'Create stunning visuals from text — DALL-E 3, Stable Diffusion, and more', color: 'from-pink-500 to-rose-500' },
  { icon: '🎛️', title: 'Prompt Library', desc: '50+ enterprise-grade prompts for marketing, legal, tech, and ops', color: 'from-indigo-500 to-blue-500' },
  { icon: '🎙️', title: 'Voice AI Assistant', desc: 'Hands-free AI conversations with natural speech recognition & synthesis', color: 'from-teal-500 to-cyan-500' },
  { icon: '⚡', title: 'Model Benchmarking', desc: 'Run any prompt across 6+ frontier AI models simultaneously and compare', color: 'from-yellow-500 to-orange-500' },
  { icon: '🎬', title: 'AI Video Generation', desc: 'Transform text descriptions into AI-generated video clips', color: 'from-red-500 to-pink-500' },
  { icon: '💻', title: 'Code Intelligence', desc: 'Generate, debug, explain, and run code across 50+ languages', color: 'from-slate-500 to-gray-500' },
  { icon: '📊', title: 'LLM Benchmarks', desc: 'Real-time performance, latency, and quality metrics across AI models', color: 'from-purple-500 to-violet-600' },
  { icon: '📰', title: 'AI Intelligence Feed', desc: 'Curated AI news from TechCrunch, MIT, Wired, and 20+ top sources', color: 'from-cyan-500 to-blue-500' },
  { icon: '✒️', title: 'AI Writing Studio', desc: 'Write, improve, summarize, expand — 10 AI commands for any document', color: 'from-violet-500 to-purple-600' },
]

const STATS = [
  { value: '13', label: 'AI Capabilities' },
  { value: '6+', label: 'AI Models' },
  { value: '100%', label: 'Free Forever' },
  { value: '<1s', label: 'Response Time' },
]

const TECH = ['Google Gemini 2.5', 'Meta Llama 3.3', 'Mistral AI', 'fal.ai', 'Replicate', 'OpenRouter']

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/chat')
  }, [user, loading, router])

  if (loading || user) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(16,163,127,0.4)', borderTopColor: '#10a37f' }} />
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a0a', color: '#ececec', minHeight: '100dvh', overflowX: 'hidden' }}>

      {/* ── Sticky Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #10a37f, #0d8c6d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Pyxis</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: 'rgba(16,163,127,0.12)', border: '1px solid rgba(16,163,127,0.3)', color: '#10a37f' }}>
              Enterprise
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/login" style={{ fontSize: 14, color: '#8e8e8e', textDecoration: 'none', padding: '8px 16px', borderRadius: 8, transition: 'color 0.15s' }}>
              Sign In
            </Link>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: '#fff', textDecoration: 'none', padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #10a37f, #0d8c6d)', boxShadow: '0 0 20px rgba(16,163,127,0.35)' }}>
              Get Started Free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', minHeight: '88vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Background effects */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '5%', left: '5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,163,127,0.1) 0%, transparent 65%)', animation: 'landingPulse 9s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '20%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 65%)', animation: 'landingPulse 11s ease-in-out infinite 3s' }} />
          <div style={{ position: 'absolute', bottom: '5%', left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)', animation: 'landingPulse 13s ease-in-out infinite 6s' }} />
          {/* Grid pattern */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to bottom, transparent, #0a0a0a)' }} />
        </div>

        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          {/* Live badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 40, background: 'rgba(16,163,127,0.08)', border: '1px solid rgba(16,163,127,0.2)', marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10a37f', display: 'inline-block', animation: 'landingPulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#10a37f' }}>Enterprise AI Platform · 100% Free · No API Key Required</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontWeight: 800, lineHeight: 1.08, marginBottom: 24, fontSize: 'clamp(2.8rem, 7vw, 5.5rem)' }}>
            <span style={{ display: 'block', background: 'linear-gradient(135deg, #ffffff 30%, #a3a3a3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Every AI Capability
            </span>
            <span style={{ display: 'block', background: 'linear-gradient(135deg, #10a37f 0%, #6366f1 50%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              In One Platform
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: '#8e8e8e', maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Pyxis unifies 12 enterprise-grade AI capabilities — intelligent agents, document intelligence, image & video generation, model benchmarking, and more — all free, all in one place.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, fontWeight: 700, fontSize: 16, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #10a37f, #0d8c6d)', boxShadow: '0 0 50px rgba(16,163,127,0.35)', transition: 'transform 0.15s' }}>
              Start Building Free →
            </Link>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, fontWeight: 600, fontSize: 16, color: '#ececec', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
              View All 12 Skills
            </Link>
          </div>

          {/* Tech pill row */}
          <div style={{ marginTop: 48, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {TECH.map(t => (
              <span key={t} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8e8e8e' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ background: 'rgba(255,255,255,0.018)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, background: 'linear-gradient(135deg, #10a37f, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.2, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 14, color: '#8e8e8e' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, color: '#ececec', marginBottom: 12 }}>
            12 Enterprise AI Capabilities
          </h2>
          <p style={{ fontSize: 18, color: '#8e8e8e', maxWidth: 540, margin: '0 auto' }}>
            Everything your organization needs to leverage AI at scale — all in one unified platform
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {SKILLS.map((skill) => (
            <Link
              key={skill.title}
              href="/login"
              style={{ display: 'block', padding: '20px', borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.045)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,163,127,0.3)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <div className={`bg-gradient-to-br ${skill.color}`} style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12 }}>
                {skill.icon}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#ececec', marginBottom: 6 }}>{skill.title}</h3>
              <p style={{ fontSize: 12, color: '#8e8e8e', lineHeight: 1.6 }}>{skill.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Why Pyxis ── */}
      <section style={{ background: 'rgba(255,255,255,0.018)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, color: '#ececec', marginBottom: 12 }}>
              Built for Enterprise, Priced for Everyone
            </h2>
            <p style={{ fontSize: 17, color: '#8e8e8e' }}>No subscriptions. No API keys. No limits.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { icon: '🚀', title: 'Production-Ready Stack', desc: 'Built on Next.js 14, Firebase, and frontier AI models. Enterprise architecture from day one.' },
              { icon: '🔒', title: 'Secure by Default', desc: 'Firebase Authentication, token verification on every API call. Your data stays yours.' },
              { icon: '⚡', title: 'Sub-Second Responses', desc: 'SSE streaming, edge functions, and async polling keep every interaction snappy.' },
              { icon: '🌐', title: 'Multi-Model Resilience', desc: 'If one AI provider fails, we automatically fall back to the next — zero downtime.' },
              { icon: '🧠', title: 'Frontier AI Models', desc: 'Gemini 2.5 Flash, Llama 3.3 70B, Mistral, and more — always the latest models.' },
              { icon: '💰', title: 'Completely Free', desc: 'Every capability, every model, every feature — free forever. No catch, no credit card.' },
            ].map(item => (
              <div key={item.title} style={{ padding: '24px', borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#ececec', marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: '#8e8e8e', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '96px 24px', textAlign: 'center', background: 'radial-gradient(ellipse at center, rgba(16,163,127,0.06) 0%, transparent 70%)' }}>
        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, color: '#ececec', marginBottom: 16 }}>
          The AI platform you&apos;ve been waiting for
        </h2>
        <p style={{ fontSize: 18, color: '#8e8e8e', marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
          Start using all 12 AI capabilities in under 60 seconds. No setup, no API keys, no credit card.
        </p>
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 40px', borderRadius: 16, fontWeight: 700, fontSize: 18, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #10a37f, #6366f1)', boxShadow: '0 0 80px rgba(16,163,127,0.2)', transition: 'transform 0.15s' }}>
          Get Started Free — No Credit Card
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #10a37f, #0d8c6d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#b4b4b4' }}>Pyxis AI Platform</span>
          </div>
          <p style={{ fontSize: 12, color: '#8e8e8e', textAlign: 'center' }}>
            Powered by Google Gemini · Meta Llama · Mistral AI · fal.ai · Replicate · OpenRouter
          </p>
        </div>
      </footer>

      {/* Keyframe definitions */}
      <style>{`
        @keyframes landingPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

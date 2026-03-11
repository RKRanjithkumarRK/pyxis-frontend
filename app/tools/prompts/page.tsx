'use client'
import { useState } from 'react'
import { Wand2, Copy, Check, Send, Loader2, ChevronRight } from 'lucide-react'

const CATEGORIES = [
  {
    name: 'Prompt Engineering',
    color: 'from-violet-500 to-purple-600',
    templates: [
      {
        title: 'Role + Task + Format',
        desc: 'The gold-standard prompt structure',
        prompt: `You are a [ROLE] with expertise in [DOMAIN].

Your task: [CLEAR TASK DESCRIPTION]

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Output format:
[Specify: bullet points / JSON / markdown / numbered list]

Tone: [professional / casual / technical]

Additional context: [Any background info]`,
      },
      {
        title: 'Chain of Thought',
        desc: 'Force step-by-step reasoning',
        prompt: `Think through this step by step before giving your final answer.

Problem: [YOUR PROBLEM HERE]

Step 1: Understand the problem
Step 2: Identify key constraints
Step 3: Consider approaches
Step 4: Evaluate trade-offs
Step 5: Give your final recommendation

Show your reasoning for each step.`,
      },
      {
        title: 'Few-Shot Examples',
        desc: 'Teach the model with examples',
        prompt: `Transform the input using the pattern shown in these examples:

Example 1:
Input: [EXAMPLE INPUT 1]
Output: [EXAMPLE OUTPUT 1]

Example 2:
Input: [EXAMPLE INPUT 2]
Output: [EXAMPLE OUTPUT 2]

Example 3:
Input: [EXAMPLE INPUT 3]
Output: [EXAMPLE OUTPUT 3]

Now apply the same pattern:
Input: [YOUR ACTUAL INPUT]
Output:`,
      },
    ],
  },
  {
    name: 'Business & Marketing',
    color: 'from-amber-500 to-orange-500',
    templates: [
      {
        title: 'Cold Email',
        desc: 'High-converting outreach email',
        prompt: `Write a cold email with the following details:

Company/Product: [NAME]
Target prospect: [JOB TITLE at COMPANY TYPE]
Pain point I solve: [SPECIFIC PROBLEM]
My unique value: [DIFFERENTIATOR]
Social proof: [1-LINE CREDIBILITY]
CTA: [WHAT YOU WANT THEM TO DO]

Requirements:
- Subject line: Curiosity-based, under 8 words
- Opening: Reference something specific about them
- Body: 3 sentences max
- CTA: One clear, low-commitment ask
- PS: Add a compelling PS line`,
      },
      {
        title: 'Product Description',
        desc: 'Conversion-focused copy',
        prompt: `Write a compelling product description for:

Product: [PRODUCT NAME]
Target customer: [IDEAL BUYER]
Key features: [LIST 3-5 FEATURES]
Main benefit: [CORE VALUE PROPOSITION]
Price point: [BUDGET / MID-RANGE / PREMIUM]
Tone: [PROFESSIONAL / FRIENDLY / LUXURY]

Format:
- Headline (benefit-focused, punchy)
- Subheadline (expand on the benefit)
- 3 bullet points (features → benefits)
- 1 paragraph description
- CTA button text`,
      },
      {
        title: 'Social Media Post',
        desc: 'Viral-worthy content',
        prompt: `Create a social media post for [PLATFORM: Twitter/LinkedIn/Instagram]:

Topic: [WHAT YOU WANT TO SHARE]
Goal: [Awareness / Engagement / Sales / Education]
Target audience: [WHO WILL SEE THIS]
Tone: [Professional / Casual / Inspirational / Educational]
Include: [Hashtags / CTA / Emojis / Stats]

Write 3 variations:
1. Storytelling angle
2. Contrarian/surprising take
3. Data/value-driven`,
      },
    ],
  },
  {
    name: 'AI & Development',
    color: 'from-cyan-500 to-blue-600',
    templates: [
      {
        title: 'System Prompt Creator',
        desc: 'Build perfect AI system prompts',
        prompt: `Design a system prompt for an AI assistant with these specs:

Role: [WHAT THIS AI IS]
Primary task: [MAIN JOB]
Tone: [HOW IT SHOULD SOUND]
Constraints: [WHAT IT SHOULD NEVER DO]
Special abilities: [UNIQUE BEHAVIORS]
Output format: [HOW IT FORMATS RESPONSES]
Target user: [WHO WILL USE IT]

Create a complete system prompt that:
1. Establishes clear identity
2. Defines exact behavior
3. Sets boundaries
4. Handles edge cases
5. Is under 500 words`,
      },
      {
        title: 'Code Review',
        desc: 'Expert code analysis prompt',
        prompt: `Review the following code as a senior engineer:

Language: [LANGUAGE]
Context: [WHAT THIS CODE DOES]

\`\`\`
[PASTE YOUR CODE HERE]
\`\`\`

Analyze for:
1. **Bugs** — Any logic errors or edge cases
2. **Performance** — Bottlenecks or inefficiencies
3. **Security** — Vulnerabilities or bad practices
4. **Readability** — Naming, structure, comments
5. **Best practices** — Language idioms, patterns

For each issue found:
- Line number
- Severity (Critical / High / Medium / Low)
- Explanation
- Fixed code snippet`,
      },
      {
        title: 'Debug Assistant',
        desc: 'Systematic debugging prompt',
        prompt: `Help me debug this issue:

Error message:
\`\`\`
[PASTE ERROR HERE]
\`\`\`

My code:
\`\`\`
[PASTE RELEVANT CODE]
\`\`\`

What I've already tried:
1. [ATTEMPT 1]
2. [ATTEMPT 2]

Environment: [OS / Runtime / Framework versions]

Please:
1. Identify the root cause
2. Explain WHY it's happening
3. Provide the fix with explanation
4. Suggest how to prevent it in the future`,
      },
    ],
  },
]

export default function PromptsPage() {
  const [selected, setSelected] = useState<{ category: string; title: string; prompt: string } | null>(null)
  const [customized, setCustomized] = useState('')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [copied, setCopied] = useState(false)

  const select = (cat: string, t: { title: string; desc: string; prompt: string }) => {
    setSelected({ category: cat, ...t })
    setCustomized(t.prompt)
    setOutput('')
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const test = async () => {
    if (!customized.trim() || streaming) return
    setOutput('')
    setStreaming(true)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45000)

    try {
      const res = await fetch('/api/tool-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemPrompt: 'You are a helpful AI assistant.',
          messages: [{ role: 'user', content: customized }],
          stream: false,
        }),
      })
      clearTimeout(timer)
      const data = await res.json()
      setOutput(data.content || data.error || '⚠️ Empty response from AI.')
    } catch (e: any) {
      clearTimeout(timer)
      setOutput(e.name === 'AbortError'
        ? '⏱ Timed out after 45s. Please try again.'
        : '⚠️ Error connecting to AI. Please try again.')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-semibold text-text-primary">Prompt Engineering Library</h1>
          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">9 Templates · Free</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          /* Template browser */
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
            {CATEGORIES.map(cat => (
              <div key={cat.name}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-4 rounded-full bg-gradient-to-b ${cat.color}`} />
                  <h2 className="text-text-primary font-semibold">{cat.name}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cat.templates.map(t => (
                    <button
                      key={t.title}
                      onClick={() => select(cat.name, t)}
                      className="group text-left p-4 bg-surface border border-border rounded-xl hover:border-indigo-500/40 transition-all"
                    >
                      <h3 className="text-text-primary text-sm font-medium mb-1 group-hover:text-indigo-300 transition-colors">{t.title}</h3>
                      <p className="text-text-tertiary text-xs">{t.desc}</p>
                      <div className="flex items-center gap-1 mt-3 text-xs text-text-tertiary group-hover:text-indigo-400 transition-colors">
                        <span>Use template</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Template editor */
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <button onClick={() => setSelected(null)} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors mb-1">
                  ← Back to templates
                </button>
                <h2 className="text-text-primary font-semibold">{selected.title}</h2>
                <p className="text-xs text-text-tertiary">{selected.category}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copy(customized)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-surface-hover hover:bg-surface-hover rounded-lg text-xs text-text-secondary transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy Prompt'}
                </button>
                <button
                  onClick={test}
                  disabled={streaming}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs text-white font-medium transition-all"
                >
                  {streaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {streaming ? 'Testing…' : 'Test Prompt'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Prompt editor */}
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Customize Prompt</p>
                <textarea
                  value={customized}
                  onChange={e => setCustomized(e.target.value)}
                  rows={18}
                  className="w-full bg-surface border border-border focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none transition-all font-mono"
                />
              </div>

              {/* Output */}
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">AI Response</p>
                <div className="h-[calc(18*1.5rem+2.5rem)] bg-surface border border-border rounded-xl px-4 py-3 overflow-y-auto">
                  {output ? (
                    <pre className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {output}
                      {streaming && <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse rounded-sm" />}
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
                      {streaming ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Running prompt…</span>
                        </div>
                      ) : (
                        <span>Click "Test Prompt" to see the AI response →</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

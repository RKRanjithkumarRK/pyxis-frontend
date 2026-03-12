'use client'

import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Wand2, Copy, Check, Send, Loader2, Search, Star, ArrowLeft, Zap } from 'lucide-react'

interface Template {
  title: string
  desc: string
  emoji: string
  prompt: string
  tags?: string[]
}

interface Category {
  name: string
  emoji: string
  color: string
  templates: Template[]
}

const CATEGORIES: Category[] = [
  {
    name: 'Prompt Engineering',
    emoji: '✍️',
    color: 'from-violet-500 to-purple-600',
    templates: [
      {
        title: 'Role + Task + Format', emoji: '🎯',
        desc: 'The gold-standard prompt structure for maximum AI output quality',
        tags: ['structure', 'foundation'],
        prompt: `You are a [ROLE] with expertise in [DOMAIN].

Your task: [CLEAR TASK DESCRIPTION]

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Output format: [bullet points / JSON / markdown / numbered list]
Tone: [professional / casual / technical]
Length: [brief / detailed / comprehensive]

Additional context: [Any background info the AI needs]`,
      },
      {
        title: 'Chain of Thought', emoji: '🧠',
        desc: 'Force step-by-step reasoning before giving final answer',
        tags: ['reasoning', 'analysis'],
        prompt: `Think through this problem step by step before giving your final answer.

Problem: [YOUR PROBLEM HERE]

Step 1: Understand the problem and identify key variables
Step 2: List the constraints and assumptions
Step 3: Consider 3+ different approaches
Step 4: Evaluate trade-offs of each approach
Step 5: Select the best approach and justify why
Step 6: Execute and provide your final answer

Show your full reasoning for each step. Do not skip steps.`,
      },
      {
        title: 'Few-Shot Learning', emoji: '📚',
        desc: 'Teach the model exactly what you want through examples',
        tags: ['examples', 'pattern'],
        prompt: `Transform the input using the exact pattern shown in these examples:

Input: [EXAMPLE INPUT 1]
Output: [EXAMPLE OUTPUT 1]

Input: [EXAMPLE INPUT 2]
Output: [EXAMPLE OUTPUT 2]

Input: [EXAMPLE INPUT 3]
Output: [EXAMPLE OUTPUT 3]

Now apply the same transformation:
Input: [YOUR ACTUAL INPUT]
Output:`,
      },
      {
        title: 'Critique & Improve', emoji: '🔄',
        desc: 'Make AI review and improve its own output iteratively',
        tags: ['iteration', 'quality'],
        prompt: `First, complete this task: [TASK]

Then, critique your own output by asking:
1. Is this accurate and complete? What's missing?
2. Is it clear and easy to understand?
3. What are 3 ways to improve it?

Finally, produce an improved version that addresses your critique. Label it "IMPROVED VERSION:"`,
      },
      {
        title: 'Persona Roleplay', emoji: '🎭',
        desc: 'Get expert-level responses by assigning a specific expert persona',
        tags: ['persona', 'expert'],
        prompt: `You are [EXPERT NAME], a world-renowned expert in [FIELD] with [X years] of experience. You've worked with [famous companies/people] and are known for [unique approach/philosophy].

Speaking as [EXPERT NAME] would, help me with: [YOUR QUESTION/TASK]

Include:
- Your perspective based on your experience
- A contrarian take that most people miss
- Specific actionable advice
- Common mistakes to avoid`,
      },
    ],
  },
  {
    name: 'Business & Marketing',
    emoji: '📊',
    color: 'from-amber-500 to-orange-500',
    templates: [
      {
        title: 'Cold Email Generator', emoji: '📧',
        desc: 'High-converting cold outreach email with proven structure',
        tags: ['email', 'sales', 'outreach'],
        prompt: `Write a cold email with these details:

Company/Product: [NAME]
Target prospect: [JOB TITLE at COMPANY TYPE]
Pain point solved: [SPECIFIC PROBLEM]
Unique value: [DIFFERENTIATOR]
Social proof: [1-LINE CREDIBILITY — clients, revenue, etc.]
CTA: [WHAT YOU WANT THEM TO DO]

Requirements:
- Subject line: Curiosity-based, under 8 words, no spam words
- Opening: Reference something specific about their company
- Body: Problem → Solution → Proof in 3 sentences max
- CTA: One clear, low-commitment ask (15-min call, reply yes/no)
- PS: Add a compelling PS that creates urgency or adds value`,
      },
      {
        title: 'Product Description', emoji: '🛍️',
        desc: 'Conversion-focused copy that sells benefits, not features',
        tags: ['ecommerce', 'copy', 'sales'],
        prompt: `Write a compelling product description for:

Product: [PRODUCT NAME]
Target customer: [IDEAL BUYER PERSONA]
Key features: [LIST 3-5 FEATURES]
Main benefit: [CORE VALUE PROPOSITION]
Price point: [BUDGET / MID-RANGE / PREMIUM]
Tone: [PROFESSIONAL / FRIENDLY / LUXURY / PLAYFUL]
Platform: [Amazon / Website / Shopify / etc.]

Format:
1. Headline (benefit-focused, punchy, under 10 words)
2. Subheadline (expand on the benefit)
3. 3 bullet points (features → concrete benefits)
4. Short paragraph (emotional connection + social proof)
5. CTA button text (2-4 words)`,
      },
      {
        title: 'Social Media Posts', emoji: '📱',
        desc: 'Create 3 variations of viral-worthy content for any platform',
        tags: ['social', 'content', 'viral'],
        prompt: `Create social media posts for [PLATFORM: Twitter/X / LinkedIn / Instagram / TikTok]:

Topic: [WHAT YOU WANT TO SHARE]
Goal: [Awareness / Engagement / Leads / Sales / Education]
Target audience: [WHO WILL SEE THIS]
Tone: [Professional / Casual / Inspirational / Educational / Funny]
Brand voice: [DESCRIBE YOUR BRAND PERSONALITY]
Include: [Hashtags / CTA / Emojis / Statistics / Story]

Write 3 variations:
1. 📖 Storytelling angle — hook with a personal story
2. 🔥 Contrarian/surprising take — challenge conventional wisdom
3. 📊 Data/value-driven — lead with a stat or actionable tip`,
      },
      {
        title: 'Brand Positioning Statement', emoji: '🎯',
        desc: 'Craft a compelling brand story and positioning',
        tags: ['brand', 'strategy', 'positioning'],
        prompt: `Create a comprehensive brand positioning strategy for:

Company/Product: [NAME]
Industry: [INDUSTRY]
Target market: [WHO YOU SERVE]
Problem you solve: [MAIN PAIN POINT]
Your solution: [HOW YOU SOLVE IT]
Key differentiators: [WHAT MAKES YOU UNIQUE]
Brand personality: [3 ADJECTIVES]

Deliver:
1. One-sentence positioning statement
2. Elevator pitch (30 seconds)
3. Brand tagline (3-5 words)
4. Brand voice guidelines (what to say, what to avoid)
5. Value proposition for 3 different customer segments`,
      },
      {
        title: 'Content Marketing Calendar', emoji: '📅',
        desc: 'Generate a full month of strategic content ideas',
        tags: ['content', 'strategy', 'planning'],
        prompt: `Create a 4-week content marketing calendar for:

Business: [TYPE OF BUSINESS]
Audience: [TARGET AUDIENCE]
Goals: [AWARENESS / ENGAGEMENT / LEADS / SALES]
Platforms: [WHICH CHANNELS]
Content types available: [BLOG / VIDEO / SOCIAL / EMAIL / PODCAST]
Team size: [SOLO / SMALL / MEDIUM]

For each week, provide:
- 1 pillar content piece (long-form, evergreen)
- 3 derivative pieces (repurposed from pillar)
- 5 social media posts
- 1 email newsletter topic
- Key metrics to track`,
      },
      {
        title: 'Customer Persona', emoji: '👤',
        desc: 'Build a detailed buyer persona from product and audience info',
        tags: ['marketing', 'research', 'audience'],
        prompt: `Create a detailed buyer persona for:

Product/Service: [NAME]
Industry: [YOUR INDUSTRY]
Known data about customers: [ANY DEMOGRAPHICS, BEHAVIORS YOU KNOW]
Company type: [B2B / B2C / B2B2C]

Build a complete persona including:
1. Demographics (age, location, income, job title)
2. Psychographics (values, goals, fears, frustrations)
3. Day in the life narrative
4. How they discover products like yours
5. Objections to buying (price, timing, trust)
6. Preferred content and communication channels
7. Quote that represents their mindset
8. How your product fits their journey`,
      },
    ],
  },
  {
    name: 'AI & Development',
    emoji: '🤖',
    color: 'from-cyan-500 to-blue-600',
    templates: [
      {
        title: 'System Prompt Designer', emoji: '⚙️',
        desc: 'Build perfect AI system prompts for any use case',
        tags: ['ai', 'system prompt', 'engineering'],
        prompt: `Design a complete system prompt for an AI assistant with these specs:

Role: [WHAT THIS AI IS — e.g., "Customer support agent for SaaS company"]
Primary task: [MAIN JOB]
Tone/Personality: [HOW IT SHOULD SOUND]
Hard rules: [WHAT IT MUST NEVER DO]
Special behaviors: [UNIQUE CAPABILITIES OR FLOWS]
Output format: [HOW IT FORMATS RESPONSES]
Target user: [WHO WILL INTERACT WITH IT]
Knowledge cutoff/constraints: [WHAT IT DOESN'T KNOW]

Create a system prompt that:
1. Establishes clear identity and purpose
2. Defines exact behavioral guidelines
3. Sets firm boundaries
4. Handles edge cases gracefully
5. Stays under 800 tokens for efficiency`,
      },
      {
        title: 'Code Review Checklist', emoji: '🔍',
        desc: 'Systematic code review from a senior engineer perspective',
        tags: ['code', 'review', 'engineering'],
        prompt: `Review the following code as a senior engineer:

Language: [LANGUAGE/FRAMEWORK]
Context: [WHAT THIS CODE DOES]
PR Size: [SMALL / MEDIUM / LARGE]

\`\`\`
[PASTE YOUR CODE HERE]
\`\`\`

Analyze across these dimensions:
1. 🐛 **Bugs** — Logic errors, off-by-ones, null checks, race conditions
2. ⚡ **Performance** — O(n) analysis, database queries, memory leaks
3. 🔒 **Security** — Injection, XSS, auth bypasses, exposed secrets
4. 📖 **Readability** — Naming, abstraction level, magic numbers
5. 🧪 **Testability** — Can this be unit tested? What's untestable?
6. 🏗️ **Architecture** — SOLID principles, separation of concerns

For each issue:
- **Line number(s)**
- **Severity**: 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low
- **Explanation**
- **Fixed code snippet**`,
      },
      {
        title: 'Technical Interview Prep', emoji: '💼',
        desc: 'Prepare for technical interviews with targeted practice',
        tags: ['interview', 'career', 'coding'],
        prompt: `Help me prepare for a technical interview at [COMPANY TYPE / COMPANY NAME]:

Role: [JOB TITLE]
Level: [Junior / Mid / Senior / Staff / Principal]
Interview format: [Phone Screen / Technical Screen / System Design / Onsite]
My weak areas: [LIST TOPICS YOU STRUGGLE WITH]
Technologies: [LANGUAGES/FRAMEWORKS USED IN THE ROLE]

Please provide:
1. Top 10 most likely questions for this role/level
2. For each question: ideal answer framework
3. 3 system design problems to practice
4. Behavioral questions with STAR method examples
5. Questions I should ask the interviewer
6. Red flags to avoid
7. 7-day study plan`,
      },
      {
        title: 'Architecture Decision Record', emoji: '📐',
        desc: 'Document important architectural decisions with ADR format',
        tags: ['architecture', 'documentation', 'engineering'],
        prompt: `Create an Architecture Decision Record (ADR) for:

Decision: [WHAT ARCHITECTURAL DECISION YOU'RE MAKING]
Context: [WHY THIS DECISION IS NEEDED]
Options considered: [LIST 2-3 ALTERNATIVES]
Team size: [SIZE]
Scale requirements: [USERS / REQUESTS PER SECOND]
Constraints: [BUDGET / TIME / TEAM EXPERTISE]

ADR Format:
## ADR-[NUMBER]: [TITLE]

**Status**: Proposed / Accepted / Deprecated / Superseded

**Context**: [Why this decision is needed]

**Decision**: [What we decided]

**Rationale**: [Why we chose this over alternatives]

**Consequences**:
- ✅ Positive: [Benefits]
- ❌ Negative: [Trade-offs]
- ⚠️ Risks: [What could go wrong]

**Alternatives Considered**: [Why we rejected them]`,
      },
    ],
  },
  {
    name: 'Content & Writing',
    emoji: '✍️',
    color: 'from-pink-500 to-rose-500',
    templates: [
      {
        title: 'Blog Post Creator', emoji: '📝',
        desc: 'Full SEO-optimized blog post with structure and hooks',
        tags: ['blog', 'seo', 'content'],
        prompt: `Write a comprehensive blog post about: [TOPIC]

Target audience: [WHO READS THIS]
Goal: [Educate / Entertain / Convert / Build authority]
Desired length: [SHORT 500w / MEDIUM 1500w / LONG 3000w]
Target keyword: [PRIMARY KEYWORD]
Tone: [Conversational / Professional / Academic / Playful]

Structure:
1. **Title** (3 options — SEO-optimized, click-worthy)
2. **Meta description** (155 chars, includes keyword)
3. **Hook** (first paragraph grabs attention immediately)
4. **Introduction** (what they'll learn + why it matters)
5. **Main sections** (with H2/H3 headers, examples, data)
6. **Actionable takeaways** (bulleted summary)
7. **Strong CTA** (what to do next)`,
      },
      {
        title: 'YouTube Script', emoji: '🎬',
        desc: 'Engaging video script with retention hooks and CTAs',
        tags: ['video', 'youtube', 'script'],
        prompt: `Write a YouTube script for: [VIDEO TOPIC]

Channel style: [EDUCATIONAL / ENTERTAINMENT / TUTORIAL / VLOG]
Target audience: [WHO WATCHES]
Video length: [5 / 10 / 15 / 20 mins]
CTA goal: [SUBSCRIBE / COURSE / PRODUCT / NEWSLETTER]

Script structure:
- **HOOK** (0-15s): [Pattern interrupt that stops the scroll]
- **INTRO** (15-60s): [Problem + promise + credibility]
- **CHAPTER 1** (timestamps): [Content with B-roll cues]
- **CHAPTER 2**: [Content with engagement question]
- **CHAPTER 3**: [Content with value bomb]
- **OUTRO** (last 30s): [CTA + subscribe prompt]

Also provide:
- 5 thumbnail concepts
- 5 title variations
- 20 hashtags`,
      },
      {
        title: 'Email Newsletter', emoji: '📨',
        desc: 'Newsletter that gets opened, read, and clicked',
        tags: ['newsletter', 'email', 'content'],
        prompt: `Write an email newsletter for:

Newsletter name: [NAME]
Topic/This week's theme: [THEME]
Audience: [SUBSCRIBERS TYPE]
Newsletter format: [CURATED / ORIGINAL / HYBRID]
Tone: [FORMAL / CASUAL / CONVERSATIONAL]
Main CTA: [WHAT YOU WANT READERS TO DO]

Include:
1. **Subject line** (3 options, A/B testable)
2. **Preview text** (under 90 chars, creates curiosity)
3. **Opening hook** (feel like it's just for them)
4. **Main content section** (core value of this edition)
5. **Quick hits** (3 brief interesting things)
6. **One question** (drives replies = deliverability boost)
7. **Sign-off** (personal, memorable)`,
      },
      {
        title: 'LinkedIn Thought Leadership', emoji: '💼',
        desc: 'LinkedIn posts that build authority and drive engagement',
        tags: ['linkedin', 'social', 'thought leadership'],
        prompt: `Write a LinkedIn thought leadership post about: [TOPIC]

My background: [YOUR ROLE / EXPERIENCE]
Target audience: [WHO FOLLOWS YOU]
Angle: [CONTRARIAN / STORY / FRAMEWORK / DATA / LESSON]
Goal: [FOLLOWERS / LEADS / BRAND / OPPORTUNITIES]

Post structure (optimized for LinkedIn algorithm):
- **Line 1**: Hook that stops scrolling (no "I" as first word)
- **Line 2-3**: Expand the hook, set up the story/insight
- **Body**: Teach or share in short punchy paragraphs
- **Insight**: The counterintuitive or surprising conclusion
- **CTA**: Question that invites comments
- **Hashtags**: 3-5 relevant ones at the end

Write 2 versions: one personal story, one data-driven`,
      },
    ],
  },
  {
    name: 'Data & Analysis',
    emoji: '📈',
    color: 'from-teal-500 to-emerald-500',
    templates: [
      {
        title: 'Data Analysis Request', emoji: '📊',
        desc: 'Extract insights from data with AI analysis prompts',
        tags: ['data', 'analysis', 'insights'],
        prompt: `Analyze the following data and extract meaningful insights:

Data type: [SALES / USER / FINANCIAL / SURVEY / WEBSITE / OTHER]
Time period: [DATE RANGE]
Business context: [WHAT THIS DATA IS FOR]

Data:
\`\`\`
[PASTE YOUR DATA HERE — CSV, JSON, or plain text]
\`\`\`

Provide:
1. **Key metrics summary** (top-line numbers)
2. **Notable trends** (what's increasing/decreasing and why)
3. **Anomalies** (outliers that need attention)
4. **Segment comparison** (if multiple segments exist)
5. **Actionable recommendations** (3-5 specific actions)
6. **Prediction** (what to expect next period based on trends)
7. **Visualization suggestions** (what charts would show this best)`,
      },
      {
        title: 'SQL Query Builder', emoji: '🗄️',
        desc: 'Generate complex SQL queries from plain English descriptions',
        tags: ['sql', 'database', 'query'],
        prompt: `Generate a SQL query for the following request:

Database type: [PostgreSQL / MySQL / SQLite / BigQuery / Snowflake]
Tables available: [LIST YOUR TABLES AND KEY COLUMNS]

What I need: [DESCRIBE IN PLAIN ENGLISH WHAT DATA YOU WANT]

Examples of what the output should look like:
[OPTIONAL: SHOW A FEW EXAMPLE ROWS]

Additional requirements:
- Performance: [Any indexes or performance constraints]
- Filters: [Specific WHERE conditions]
- Aggregations: [GROUP BY, COUNT, SUM, etc.]
- Joins: [Which tables need to be joined]

Please also:
1. Explain what the query does step by step
2. Suggest indexes that would improve performance
3. Show alternative approaches if applicable`,
      },
    ],
  },
  {
    name: 'Strategy & Planning',
    emoji: '♟️',
    color: 'from-indigo-500 to-blue-500',
    templates: [
      {
        title: 'SWOT Analysis', emoji: '🔍',
        desc: 'Comprehensive strategic analysis framework',
        tags: ['strategy', 'planning', 'business'],
        prompt: `Conduct a comprehensive SWOT analysis for:

Organization/Product/Project: [NAME]
Industry: [INDUSTRY]
Current stage: [STARTUP / GROWTH / MATURE / TURNAROUND]
Market context: [KEY MARKET DYNAMICS]
Main competitors: [LIST 2-3]
Resources available: [TEAM SIZE, BUDGET RANGE]

Provide:
**STRENGTHS** (Internal Positives)
[8-10 specific, evidence-based strengths]

**WEAKNESSES** (Internal Negatives)
[8-10 honest, specific weaknesses]

**OPPORTUNITIES** (External Positives)
[8-10 market opportunities with reasoning]

**THREATS** (External Negatives)
[8-10 real threats with impact assessment]

**Strategic Actions**:
- SO Strategies (use strengths to capture opportunities)
- WO Strategies (address weaknesses using opportunities)
- ST Strategies (use strengths to counter threats)
- WT Strategies (minimize weaknesses, avoid threats)`,
      },
      {
        title: 'OKR Framework', emoji: '🎯',
        desc: 'Create measurable OKRs aligned to company goals',
        tags: ['okr', 'goals', 'planning'],
        prompt: `Create OKRs (Objectives and Key Results) for:

Team/Department: [NAME]
Time period: [Q1 2026 / Annual / etc.]
Company mission: [OVERALL COMPANY GOAL]
Main priorities this period: [LIST 2-3]
Current challenges: [WHAT'S BLOCKING PROGRESS]

Format each OKR as:

**Objective**: [Inspirational, qualitative goal — 1 sentence]
- **KR1**: [Specific, measurable result with number/date]
- **KR2**: [Specific, measurable result with number/date]
- **KR3**: [Specific, measurable result with number/date]
- **Initiatives**: [2-3 projects that will drive these KRs]
- **Risks**: [What could prevent achieving this]

Create 3 objectives with 3 KRs each. Include a scoring guide (0.0-1.0).`,
      },
      {
        title: 'Competitive Analysis', emoji: '⚔️',
        desc: 'Deep competitor research and differentiation strategy',
        tags: ['competitive', 'strategy', 'market'],
        prompt: `Conduct a competitive analysis for:

My product/company: [NAME + 1-LINE DESCRIPTION]
Industry: [INDUSTRY]
Target market: [WHO WE SERVE]
My main competitors: [LIST 3-5 COMPETITORS]
What I believe my advantage is: [YOUR HYPOTHESIS]

Analyze each competitor across:
1. **Positioning** — How they describe themselves
2. **Pricing** — Model and price points
3. **Features** — What they offer vs what's missing
4. **Target customer** — Who they focus on
5. **Marketing channels** — How they acquire customers
6. **Weaknesses** — Where they're vulnerable

Conclude with:
- **Market gaps** — Unmet needs none of them address
- **Differentiation strategy** — How to position against them
- **Blue ocean opportunity** — Unexplored market space`,
      },
    ],
  },
  {
    name: 'HR & Management',
    emoji: '👥',
    color: 'from-orange-500 to-amber-500',
    templates: [
      {
        title: 'Job Description Writer', emoji: '📋',
        desc: 'Write compelling JDs that attract top talent',
        tags: ['hiring', 'hr', 'recruitment'],
        prompt: `Write a compelling job description for:

Role: [JOB TITLE]
Company: [COMPANY NAME + 1-LINE DESCRIPTION]
Team: [WHICH TEAM]
Level: [Junior / Mid / Senior / Lead / Principal]
Location: [REMOTE / HYBRID / ONSITE + LOCATION]
Salary range: [RANGE — be transparent]
Key responsibilities: [LIST 5-7 MAIN DUTIES]
Required skills: [MUST-HAVES]
Preferred skills: [NICE-TO-HAVES]
Company culture: [DESCRIBE YOUR CULTURE]

Format:
1. 🌟 Attention-grabbing opener (why this role is exciting)
2. About the company (what you're building + why it matters)
3. What you'll do (5-7 bullet responsibilities)
4. What we're looking for (requirements, not a wish list)
5. What we offer (compensation, benefits, growth)
6. Our values (authentic, specific)
7. How to apply (simple, clear)`,
      },
      {
        title: 'Performance Review', emoji: '📈',
        desc: 'Structure fair, impactful performance reviews',
        tags: ['management', 'performance', 'hr'],
        prompt: `Help me write a performance review for:

Employee name/role: [NAME, ROLE]
Review period: [DATES]
Key accomplishments: [LIST WHAT THEY ACHIEVED]
Areas for growth: [WHERE THEY NEED TO IMPROVE]
Relationship with team: [HOW THEY WORK WITH OTHERS]
Goals met: [% GOALS ACHIEVED]
My overall assessment: [EXCEEDS / MEETS / BELOW expectations]

Write:
1. **Executive summary** (2-3 sentences overall assessment)
2. **Key strengths** (3-4 specific examples with impact)
3. **Areas for development** (2-3, framed constructively)
4. **Accomplishments highlight** (biggest wins with quantified impact)
5. **Next period goals** (3 SMART goals)
6. **Career development** (opportunities and path)
7. **Overall rating justification**`,
      },
    ],
  },
  {
    name: 'Finance & Legal',
    emoji: '⚖️',
    color: 'from-slate-500 to-gray-600',
    templates: [
      {
        title: 'Business Plan Executive Summary', emoji: '📄',
        desc: 'Write a compelling executive summary for investors',
        tags: ['business plan', 'finance', 'investor'],
        prompt: `Write an executive summary for a business plan:

Business name: [NAME]
Industry: [INDUSTRY]
Problem solved: [MAIN PAIN POINT]
Solution: [YOUR PRODUCT/SERVICE]
Market size: [TAM/SAM/SOM if known]
Business model: [HOW YOU MAKE MONEY]
Traction: [CURRENT USERS/REVENUE/MILESTONES]
Team: [KEY FOUNDERS + RELEVANT EXPERIENCE]
Funding needed: [AMOUNT + USE OF FUNDS]
Stage: [PRE-SEED / SEED / SERIES A]

Executive summary (1-2 pages) covering:
1. The problem (backed by data)
2. Your solution and why now
3. Market opportunity
4. Business model and unit economics
5. Traction and key milestones
6. Team credibility
7. What you need and what you'll achieve with it`,
      },
      {
        title: 'Contract Plain Language Summary', emoji: '📝',
        desc: 'Translate legal contracts into plain English',
        tags: ['legal', 'contract', 'analysis'],
        prompt: `⚠️ Note: This is for informational purposes only. Consult a licensed attorney for legal advice.

Analyze and summarize this contract in plain language:

Contract type: [NDA / SaaS Agreement / Employment / Freelance / Partnership / etc.]

\`\`\`
[PASTE CONTRACT TEXT HERE]
\`\`\`

Provide:
1. **What this contract does** (1 paragraph overview)
2. **Key obligations** — What each party must do
3. **Key rights** — What each party is entitled to
4. **⚠️ Red flags** — Unusual or potentially harmful clauses
5. **Missing protections** — Standard clauses that should be included
6. **Termination conditions** — How and when this can end
7. **Plain English summary** — As if explaining to a friend
8. **Questions to ask a lawyer** — Critical items to clarify`,
      },
    ],
  },
]

const ALL_TEMPLATES = CATEGORIES.flatMap(c => c.templates.map(t => ({ ...t, category: c.name, categoryEmoji: c.emoji, color: c.color })))

export default function PromptsPage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selected, setSelected] = useState<(Template & { category: string; color: string }) | null>(null)
  const [customized, setCustomized] = useState('')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [copied, setCopied] = useState<'prompt' | 'output' | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter(t => {
      const matchesSearch = !query || t.title.toLowerCase().includes(query.toLowerCase()) || t.desc.toLowerCase().includes(query.toLowerCase()) || (t.tags?.some(tag => tag.includes(query.toLowerCase())))
      const matchesCat = activeCategory === 'All' || t.category === activeCategory
      return matchesSearch && matchesCat
    })
  }, [query, activeCategory])

  const select = (template: Template & { category: string; color: string }) => {
    setSelected(template)
    setCustomized(template.prompt)
    setOutput('')
  }

  const copy = async (text: string, type: 'prompt' | 'output') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggleFavorite = (title: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
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
          systemPrompt: 'You are a helpful, expert AI assistant. Respond clearly and thoroughly.',
          messages: [{ role: 'user', content: customized }],
          stream: false,
        }),
      })
      clearTimeout(timer)
      const data = await res.json()
      setOutput(data.content || data.error || '⚠️ Empty response from AI.')
    } catch (e: any) {
      clearTimeout(timer)
      setOutput(e.name === 'AbortError' ? '⏱ Timed out after 45s.' : '⚠️ Error connecting to AI.')
    } finally {
      setStreaming(false)
    }
  }

  const totalCount = ALL_TEMPLATES.length

  return (
    <div className="h-full flex flex-col bg-bg text-text-primary">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center">
            <Wand2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-text-primary text-sm">Enterprise Prompt Library</h1>
            <p className="text-xs text-text-tertiary">{totalCount} battle-tested templates across 8 categories</p>
          </div>
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            {totalCount} Prompts
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          /* ── Template Browser ── */
          <div className="max-w-5xl mx-auto px-4 py-5">
            {/* Search */}
            <div className="relative mb-4">
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search prompts by name, description, or tag…"
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              />
            </div>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap mb-5">
              {['All', ...CATEGORIES.map(c => c.name)].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    background: activeCategory === cat ? '#10a37f' : 'var(--surface)',
                    borderColor: activeCategory === cat ? '#10a37f' : 'var(--border)',
                    color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {cat === 'All' ? `All (${totalCount})` : cat}
                </button>
              ))}
            </div>

            {/* Results count */}
            <p className="text-xs text-text-tertiary mb-4">
              Showing {filteredTemplates.length} of {totalCount} prompts
              {query && ` for "${query}"`}
            </p>

            {/* Templates by category or search results */}
            {query || activeCategory !== 'All' ? (
              /* Flat search results */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTemplates.map(t => (
                  <TemplateCard key={`${t.category}-${t.title}`} template={t} onSelect={select} favorites={favorites} onToggleFavorite={toggleFavorite} />
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-text-tertiary">
                    <p className="text-4xl mb-3">🔍</p>
                    <p>No prompts found. Try a different search.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Grouped by category */
              CATEGORIES.map(cat => (
                <div key={cat.name} className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{cat.emoji}</span>
                    <h2 className="text-text-primary font-semibold text-sm">{cat.name}</h2>
                    <span className="text-xs text-text-tertiary">({cat.templates.length} prompts)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cat.templates.map(t => (
                      <TemplateCard
                        key={t.title}
                        template={{ ...t, category: cat.name, categoryEmoji: cat.emoji, color: cat.color }}
                        onSelect={select}
                        favorites={favorites}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── Template Editor ── */
          <div className="max-w-5xl mx-auto px-4 py-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <ArrowLeft size={13} />
                  Back
                </button>
                <div>
                  <h2 className="text-text-primary font-semibold text-sm">{selected.emoji} {selected.title}</h2>
                  <p className="text-xs text-text-tertiary">{selected.category}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copy(customized, 'prompt')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-surface-hover rounded-lg text-xs text-text-secondary hover:text-text-primary transition-all"
                >
                  {copied === 'prompt' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied === 'prompt' ? 'Copied!' : 'Copy Prompt'}
                </button>
                <button
                  onClick={test}
                  disabled={streaming}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs text-white font-medium transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {streaming ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  {streaming ? 'Testing…' : 'Test Prompt'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Editor */}
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2 font-medium">✏️ Customize & Fill In Brackets</p>
                <textarea
                  value={customized}
                  onChange={e => setCustomized(e.target.value)}
                  rows={22}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none resize-none transition-all font-mono leading-relaxed"
                />
                <p className="text-xs text-text-tertiary mt-2">
                  Replace all <code className="bg-surface-hover px-1 rounded">[BRACKETS]</code> with your actual content, then click Test Prompt
                </p>
              </div>

              {/* Output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium">🤖 AI Response</p>
                  {output && (
                    <button onClick={() => copy(output, 'output')} className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary">
                      {copied === 'output' ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                      {copied === 'output' ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
                <div style={{ height: 'calc(22 * 1.5rem + 1.5rem)', overflowY: 'auto' }} className="bg-surface border border-border rounded-xl px-4 py-3">
                  {output ? (
                    <div className="markdown-body text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-tertiary text-sm text-center">
                      {streaming ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex gap-1">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                          </div>
                          <span className="text-xs">Running your prompt…</span>
                        </div>
                      ) : (
                        <span className="text-xs">Fill in the prompt, then click<br />"Test Prompt" to see the AI output</span>
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

function TemplateCard({
  template,
  onSelect,
  favorites,
  onToggleFavorite,
}: {
  template: Template & { category: string; categoryEmoji?: string; color: string }
  onSelect: (t: Template & { category: string; color: string }) => void
  favorites: Set<string>
  onToggleFavorite: (title: string) => void
}) {
  const isFav = favorites.has(template.title)
  return (
    <div
      className="group relative bg-surface border border-border rounded-xl p-4 hover:border-opacity-60 transition-all cursor-pointer"
      onClick={() => onSelect(template)}
      style={{ borderColor: 'var(--border)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
    >
      <button
        onClick={e => { e.stopPropagation(); onToggleFavorite(template.title) }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star size={13} className={isFav ? 'text-yellow-400 fill-yellow-400' : 'text-text-tertiary'} />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{template.emoji}</span>
        <h3 className="text-text-primary text-xs font-semibold leading-tight group-hover:text-indigo-300 transition-colors">{template.title}</h3>
      </div>
      <p className="text-text-tertiary text-xs leading-relaxed mb-3">{template.desc}</p>
      {template.tags && (
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-tertiary">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Vercel serverless function — POST /api/chat
 * Uses OpenRouter (Mistral) for inference.
 * RAG retrieval is optional: set RETRIEVAL_URL to your local FAISS tunnel.
 *
 * Env vars (set in Vercel dashboard):
 *   OPENROUTER_API_KEY  — required
 *   RETRIEVAL_URL       — optional, e.g. https://xxxx.trycloudflare.com
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const RETRIEVAL_URL      = process.env.RETRIEVAL_URL

// Ordered by speed/quality preference — first available one wins
const MODEL_PRIORITY = [
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'mistralai/mistral-7b-instruct:free',
]

let _modelCache = null
let _modelCacheAt = 0

async function pickModel() {
  const now = Date.now()
  if (_modelCache && now - _modelCacheAt < 5 * 60 * 1000) return _modelCache

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` },
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const { data } = await res.json()
      const available = new Set(data.map(m => m.id))
      const chosen = MODEL_PRIORITY.find(m => available.has(m))
      if (chosen) {
        _modelCache = chosen
        _modelCacheAt = now
        console.log('Model selected:', chosen)
        return chosen
      }
    }
  } catch { /* fall through */ }

  return MODEL_PRIORITY[0]
}

// ── RAG retrieval ─────────────────────────────────────────────────────────────
async function retrieveChunks(entityName, query, k = 7) {
  if (!RETRIEVAL_URL) return []
  try {
    const res = await fetch(`${RETRIEVAL_URL}/retrieve`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: `${entityName} ${query}`, k }),
      signal:  AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(entity, chunks) {
  const chunkBlock = chunks.length
    ? chunks.map((c, i) => [
        `[DOC ${i + 1}] ${c.source ?? c.source_type ?? 'Unknown source'} | Year: ${c.year ?? '?'} | Page: ${c.page ?? '?'}`,
        c.url ? `URL: ${c.url}` : null,
        '',
        c.text ?? '',
      ].filter(x => x !== null).join('\n'))
      .join('\n\n' + '─'.repeat(60) + '\n\n')
    : 'No RAG corpus available. Base your analysis on the entity signal data only.'

  const signalLegend = [
    'cl1 = Unexplained Production Spike (USGS / EITI)',
    'cl2 = Regional Child Labour Prevalence (ILO ILOSTAT)',
    'cl3 = Low School Enrolment + Literacy (UNESCO)',
    'cl4 = Nighttime Luminosity Anomaly (NASA VIIRS)',
    'fl1 = Armed Group / Mine Proximity (IPIS / ACLED)',
    'fl2 = ILO Forced Labour Indicator (ILO 2022)',
    'fl3 = Debt Bondage / Wage Withholding (Amnesty Intl)',
    'fl4 = AIS Dark Shipping Events (MarineTraffic)',
    'df1 = Comtrade Mirror-Trade Gap (UN Comtrade)',
    'df2 = AIS Dark Events at Transit Port (MarineTraffic)',
    'df3 = Certificate Temporal Fraud (RMI RMAP / EITI)',
    'df4 = Mine Area vs Concession Mismatch (Sentinel-2)',
    'df5 = Invoice Price Below Market Floor (LME / Fastmarkets)',
    'mr1 = RMI AMRT Non-Compliance (RMI 2024)',
    'mr2 = GISTM Tailings Extreme/Very High (Global Tailings Portal 2025)',
    'mr3 = BHRRC Allegation Density (BHRRC TMT 2024)',
    'mr4 = Global Witness Investigative Flag (GW 2024)',
    'mr5 = BMI Carbon & Waste ESG Below Median (BMI 2024)',
  ].join('\n  ')

  const preset = entity.signalPreset ?? {}
  const signalLines = Object.entries(preset)
    .map(([k, v]) => `  ${k}: ${Number(v).toFixed(2)}`)
    .join('\n')

  return `You are REEtrieve Intelligence, an investigative AI embedded in the REEtrieve Compliance Platform. You specialise in critical mineral supply chains — specifically rare earth elements (REE), cobalt, nickel, tin, and tungsten.

Your audience is compliance officers, regulators, journalists, and auditors who need rigorous, cited, probabilistic analysis — not reassurance.

${'═'.repeat(65)}
ENTITY UNDER REVIEW
${'═'.repeat(65)}
Name:            ${entity.name}
Country:         ${entity.flag ?? ''} ${entity.country}
Industry:        ${entity.industry}
Risk Score:      ${entity.riskScore}/100  (Bayesian composite, 4 dimensions)
Cert Status:     ${entity.certStatus ?? 'unknown'}
Last Audit:      ${entity.lastAudit ?? 'never'}
Risk Flags:      ${(entity.riskFlags ?? []).join(' | ') || 'none'}
Intel Note:      ${entity.note ?? ''}

SIGNAL ACTIVATIONS (0 = no signal, 1 = fully active):
${signalLines}

SIGNAL LEGEND:
  ${signalLegend}

${'═'.repeat(65)}
RELEVANT DOCUMENT EXCERPTS  (ranked by relevance to your query)
${'═'.repeat(65)}
${chunkBlock}

${'═'.repeat(65)}
ANALYTICAL RULES — APPLY TO EVERY RESPONSE
${'═'.repeat(65)}
1. CITATION REQUIRED: Every factual claim must end with its source in parentheses.
2. TWO-SIDED ANALYSIS: After each risk finding, state the strongest counter-argument, then explain why you accept or reject it.
3. RELATIVIZE SCORES: The 13-entity database range is roughly 38–95. ≥82 = critical, 68–81 = high, 52–67 = elevated, <52 = lower.
4. PROBABILISTIC FRAMING: Use "the evidence is consistent with...", "with high/moderate/low confidence...". Never state certainties.
5. MISSING DATA IS A SIGNAL: Name gaps explicitly and explain what inference is still possible.
6. TEMPORAL LAG: Materials extracted today appear in products in 2–3 years.
7. DOWNSTREAM TRACING: Trace mine → smelter → refiner → manufacturer → brand. Only name companies that appear in cited documents.
8. SCOPE GUARD: You cover REE, cobalt, nickel, tin, tungsten only.
9. ADVERSARIAL LENS: Could this data have been falsified? Flag where document fraud signals (df1–df5) suggest numbers may be unreliable.`
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST')   return res.status(405).end()

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set' })
  }

  const { entity, messages } = req.body
  if (!entity || !Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'entity and messages[] required' })
  }

  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const chunks   = await retrieveChunks(entity.name, lastUser)
  const system   = buildSystemPrompt(entity, chunks)

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    const model  = await pickModel()
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://reetrieve.vercel.app',
        'X-Title':       'REEtrieve',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: system },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    })

    if (!orRes.ok) {
      const err = await orRes.text()
      throw new Error(`OpenRouter ${orRes.status}: ${err}`)
    }

    const reader  = orRes.body.getReader()
    const decoder = new TextDecoder()
    let   buffer  = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n')
          return res.end()
        }
        try {
          const json = JSON.parse(data)
          const text = json.choices?.[0]?.delta?.content
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
        } catch { /* partial JSON */ }
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('OpenRouter error:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
}

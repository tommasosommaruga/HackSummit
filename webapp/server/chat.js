/**
 * REEtrieve Intelligence — chat API server
 * POST /api/chat  →  SSE stream of Ollama responses grounded in RAG corpus
 *
 * Run alongside Vite:  npm run dev:all
 * Requires:  Ollama running locally (ollama serve) with a model pulled.
 *
 * Quick setup:
 *   brew install ollama
 *   ollama serve          # or open Ollama.app
 *   ollama pull llama3.2  # ~2 GB — good quality/speed balance
 *
 * Override model or URL via .env:
 *   OLLAMA_MODEL=mistral
 *   OLLAMA_URL=http://localhost:11434
 */

import express from 'express'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '1mb' }))

const PORT         = process.env.PORT        ?? 3001
const OLLAMA_URL   = process.env.OLLAMA_URL  ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2'

// ── Load RAG corpus once at startup ──────────────────────────────────────────
const CHUNKS_PATH = process.env.CHUNKS_PATH
  ?? path.resolve(__dirname, '../../rag_prep/data/chunks/chunks.jsonl')

let CHUNKS = []
if (existsSync(CHUNKS_PATH)) {
  const lines = readFileSync(CHUNKS_PATH, 'utf8').trim().split('\n').filter(Boolean)
  CHUNKS = lines.map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  console.log(`✓ Loaded ${CHUNKS.length} RAG chunks from ${path.basename(path.dirname(CHUNKS_PATH))}/chunks.jsonl`)
} else {
  console.warn(`⚠ chunks.jsonl not found at:\n  ${CHUNKS_PATH}\n  Running in entity-data-only mode (RAG disabled).\n  Run: cd rag_prep && python 05_chunk.py`)
}

// ── Keyword-based chunk retrieval ─────────────────────────────────────────────
const STOPWORDS = new Set([
  'the','and','for','that','this','with','are','from','into','what',
  'which','have','been','will','when','where','how','does','can','its',
  'their','about','used','also','over','more','than','such',
])

function retrieveChunks(entityName, query, topK = 7) {
  if (!CHUNKS.length) return []

  // Build token set: entity name tokens + meaningful query tokens
  const entityTokens = entityName.toLowerCase().split(/\W+/).filter(t => t.length > 2)
  const queryTokens  = query.toLowerCase().split(/\W+/)
    .filter(t => t.length > 3 && !STOPWORDS.has(t))
  const allTokens    = [...new Set([...entityTokens, ...queryTokens])]

  return CHUNKS
    .map(chunk => {
      const haystack = (chunk.text || chunk.content || '').toLowerCase()
      // Entity tokens worth 2 pts each (high precision), query tokens 1 pt
      const score =
        entityTokens.reduce((s, t) => s + (haystack.includes(t) ? 2 : 0), 0) +
        queryTokens.reduce((s, t)  => s + (haystack.includes(t) ? 1 : 0), 0)
      return { ...chunk, _score: score }
    })
    .filter(c => c._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, topK)
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(entity, chunks) {
  const chunkBlock = chunks.length
    ? chunks.map((c, i) => [
        `[DOC ${i + 1}] ${c.source ?? c.source_type ?? 'Unknown source'} | Year: ${c.year ?? '?'} | Page: ${c.page ?? '?'}`,
        c.url ? `URL: ${c.url}` : null,
        '',
        c.text ?? c.content ?? '',
      ].filter(x => x !== null).join('\n'))
      .join('\n\n' + '─'.repeat(60) + '\n\n')
    : 'No RAG corpus available for this session. Base your analysis on the entity signal data only and be explicit about this limitation.'

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
    .map(([k, v]) => `  ${k}: ${v.toFixed(2)}`)
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
   Use exact names: (USGS MCS 2024), (UN Comtrade 2023), (ILO ILOSTAT 2022),
   (RMI 2024), (BHRRC TMT 2024), (Global Witness 2024), (BMI 2024),
   or (REEtrieve signal data) for values derived from signal activations above.

2. TWO-SIDED ANALYSIS: After each risk finding, state the strongest
   counter-argument or benign alternative interpretation, then explain
   why you accept or reject it given the available evidence.

3. RELATIVIZE SCORES: Interpret numbers in context.
   The 13-entity database range is roughly 38–95. Quartile breakpoints:
   ≥82 = top quartile (critical), 68–81 = high, 52–67 = elevated, <52 = lower.
   Always say where this entity sits.

4. PROBABILISTIC FRAMING: Use "the evidence is consistent with...",
   "with high/moderate/low confidence...", "this cannot be confirmed but...".
   Never state certainties. Supply chains are inherently uncertain.

5. MISSING DATA IS A SIGNAL: If a dataset doesn't cover this entity,
   name the gap explicitly and explain what inference is still possible.
   E.g., absence from GISTM disclosures after the 2025 mandatory deadline
   is itself non-compliance, not a neutral absence.

6. TEMPORAL LAG: Materials extracted today appear in products in 2–3 years.
   A battery sold in 2025 contains ore from 2022–2023. Always anchor
   downstream product claims to the correct extraction window.

7. DOWNSTREAM TRACING: Trace material flows step by step using the document
   corpus: mine → smelter → refiner → manufacturer → brand. State each
   inference link explicitly. Only name companies that appear in cited documents.
   If a company cannot be confirmed, say so rather than speculating.

8. SCOPE GUARD: You cover REE, cobalt, nickel, tin, tungsten only.
   If asked about other minerals, note this is outside your current dataset.

9. ADVERSARIAL LENS: Always ask — could this data have been falsified?
   Who benefits from the official narrative? Flag where document fraud
   signals (df1–df5) suggest the numbers themselves may be unreliable.`
}

// ── Chat endpoint ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { entity, messages } = req.body

  if (!entity || !Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'entity and messages[] required' })
  }

  // Extract last user message for retrieval
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const chunks   = retrieveChunks(entity.name, lastUser)

  const systemPrompt = buildSystemPrompt(entity, chunks)

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    // Ollama OpenAI-compatible chat endpoint with streaming
    const model = req.body.model ?? OLLAMA_MODEL
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        options: { num_predict: 1500, temperature: 0.3 },
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    })

    if (!ollamaRes.ok) {
      const err = await ollamaRes.text()
      throw new Error(`Ollama ${ollamaRes.status}: ${err}`)
    }

    const reader  = ollamaRes.body.getReader()
    const decoder = new TextDecoder()
    let   buffer  = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const json = JSON.parse(line)
          const text = json.message?.content
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
          if (json.done) {
            res.write('data: [DONE]\n\n')
            res.end()
            return
          }
        } catch { /* partial JSON — skip */ }
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Ollama error:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
})

app.listen(PORT, () => {
  console.log(`\nREEtrieve chat API  →  http://localhost:${PORT}`)
  console.log(`Ollama:              ${OLLAMA_URL}`)
  console.log(`Model:               ${OLLAMA_MODEL}`)
  console.log(`RAG corpus:          ${CHUNKS.length} chunks loaded\n`)
})

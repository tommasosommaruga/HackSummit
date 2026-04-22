import { MINES } from '../data/mines.js'

const LAG = 2 // years from extraction to battery

export function computeTrustScore(manufactureYear) {
  const sourceYear = manufactureYear - LAG

  const shares = MINES.map(m => ({
    ...m,
    output_kt: m.output[sourceYear] ?? 0,
  }))

  const total = shares.reduce((s, m) => s + m.output_kt, 0)
  shares.forEach(m => { m.share = total > 0 ? m.output_kt / total : 0 })

  // Bootstrap CI — 2000 samples, ±20% output noise
  const samples = []
  for (let i = 0; i < 2000; i++) {
    let t = 0, hr = 0
    for (const m of shares) {
      const noisy = m.output_kt * (0.8 + Math.random() * 0.4)
      t += noisy
      if (m.risk >= 0.6) hr += noisy
    }
    samples.push(t > 0 ? hr / t : 0)
  }
  samples.sort((a, b) => a - b)

  const median = samples[Math.floor(samples.length / 2)]
  const p5 = samples[Math.floor(samples.length * 0.05)]
  const p95 = samples[Math.floor(samples.length * 0.95)]
  const pHighRisk = shares.filter(m => m.risk >= 0.6).reduce((s, m) => s + m.share, 0)

  return {
    manufactureYear,
    sourceYear,
    trustScore: Math.round((1 - median) * 100),
    pHighRisk,
    ci: { p5, median, p95 },
    mines: shares.sort((a, b) => b.share - a.share),
  }
}

export function getVerdict(score) {
  if (score >= 72) return { label: 'Low Risk — Claims Plausible', cls: 'green', icon: '✓' }
  if (score >= 45) return { label: 'Moderate Risk — Claims Uncertain', cls: 'yellow', icon: '⚠' }
  return { label: 'High Risk — Claims Disputed', cls: 'red', icon: '✗' }
}

export function getFlags(result) {
  const flags = []
  const { mines, pHighRisk, ci, sourceYear } = result

  if (pHighRisk > 0.5)
    flags.push({ level: 'high', text: 'High-Risk Origin Majority', detail: `>${Math.round(pHighRisk * 100)}% of supply from high-risk mines in ${sourceYear}` })

  if (ci.p95 - ci.p5 > 0.3)
    flags.push({ level: 'medium', text: 'Wide Confidence Interval', detail: 'Insufficient data to narrow origin estimate — missing manifests likely' })

  const drc = mines.find(m => m.id === 'KOB_DRC_01')
  if (drc && drc.share > 0.15)
    flags.push({ level: 'high', text: 'DRC ASM Exposure', detail: `~${Math.round(drc.share * 100)}% share from Kolwezi Basin — child labor documented` })

  const bol = mines.find(m => m.id === 'ASM_BOL_01')
  if (bol && bol.share > 0.1)
    flags.push({ level: 'medium', text: 'Unaudited Bolivian ASM', detail: 'No third-party audit on record for this source' })

  if (flags.length === 0)
    flags.push({ level: 'low', text: 'No Major Red Flags', detail: 'Supply dominated by certified, low-risk operations' })

  return flags
}

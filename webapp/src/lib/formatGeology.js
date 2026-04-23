/**
 * USGS / project-sheet geology strings often use "A type granite";
 * standard IUGS-style label is "A-type granite" (same for I/S-type, etc.).
 */
export function formatDepositTypeLabel(raw) {
  if (raw == null || typeof raw !== 'string') return raw
  const s = raw.trim()
  if (!s) return s
  return s.replace(/\b([A-Za-z])\s+type\s+/g, (match, letter) => `${letter.toUpperCase()}-type `)
}

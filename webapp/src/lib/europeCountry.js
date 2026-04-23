/**
 * Recycling spreadsheet (`recycling_facilities_cleaned.xlsx`) uses a fixed country column.
 * Non-European rows in the file are tagged explicitly (e.g. NORTH AMERICA).
 */
export function isEuropeSpreadsheetCountry (countryRaw) {
  const u = String(countryRaw ?? '').trim().toUpperCase()
  if (u === '' || u === 'NORTH AMERICA') return false
  return true
}

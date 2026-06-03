/**
 * Extract the first complete JSON object or array from a string.
 *
 * Handles: surrounding prose, code fences, nested objects/arrays,
 * strings containing braces, and escape sequences.
 *
 * Throws if no valid JSON structure is found.
 */
export function extractJSON(s: string): string {
  const opener = s.indexOf('{') !== -1
    ? (s.indexOf('[') !== -1 ? Math.min(s.indexOf('{'), s.indexOf('[')) : s.indexOf('{'))
    : s.indexOf('[')

  if (opener === -1) throw new Error('No JSON object or array found in response')

  const open = s[opener] as '{' | '['
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escape = false

  for (let i = opener; i < s.length; i++) {
    const ch = s[i] as string
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return s.slice(opener, i + 1)
    }
  }

  throw new Error('Unterminated JSON structure in response')
}

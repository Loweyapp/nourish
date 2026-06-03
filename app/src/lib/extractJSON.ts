// Per Phase 2 instructions: preserve the exact regex from the live app.
// The live code uses: resp.replace(/```json|```/g, "").trim()
// A proper character-walking extractor is logged as a Phase 3 improvement.
export function extractJSON(resp: string): string {
  return resp.replace(/```json|```/g, '').trim()
}

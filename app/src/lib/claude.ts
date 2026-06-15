import type { ClaudeMessage, AnthropicResponse, UsageTotals } from '../types'
import { getApiKey, getCoachingStyle, getLifetimeUsage, ls, USAGE_KEY } from './storage'

export const CLAUDE_MODEL = 'claude-sonnet-4-6'

// Module-level session accumulator — matches the live app's sessionUsage object
export const sessionUsage: UsageTotals = { input: 0, output: 0 }

export function trackUsage(usage: AnthropicResponse['usage']): void {
  if (!usage) return
  sessionUsage.input  += usage.input_tokens  || 0
  sessionUsage.output += usage.output_tokens || 0
  const lifetime = getLifetimeUsage()
  ls.set(USAGE_KEY, {
    input:  lifetime.input  + (usage.input_tokens  || 0),
    output: lifetime.output + (usage.output_tokens || 0),
  })
}

export function calcCost(inp: number, out: number): string {
  const cost = (inp / 1e6) * 2.37 + (out / 1e6) * 11.85
  return cost < 0.01 ? '<£0.01' : `£${cost.toFixed(2)}`
}

export function estimateCost(): string {
  return calcCost(sessionUsage.input, sessionUsage.output)
}

export async function askClaude(
  messages: ClaudeMessage[],
  systemPrompt: string,
): Promise<string> {
  const key = getApiKey()
  if (!key) throw new Error('No API key')
  const coaching = getCoachingStyle()
  const fullSystem =
    systemPrompt + (coaching ? `\n\nPersonal coaching preferences from the user: ${coaching}` : '')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      system: fullSystem,
      messages,
    }),
  })
  const raw = await res.text()
  let data: AnthropicResponse
  try { data = JSON.parse(raw) as AnthropicResponse }
  catch { throw new Error(`Bad response: ${raw.slice(0, 100)}`) }
  if (!res.ok || data.error) {
    const msg = data.error?.message || `HTTP ${res.status}`
    if (/deprecated|not found|invalid model/i.test(msg)) throw new Error('AI model outdated — the app needs an update. Please try again later.')
    throw new Error(msg)
  }
  trackUsage(data.usage)
  return data.content?.[0]?.text ?? ''
}

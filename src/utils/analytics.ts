import type { Turn, DisplayMessage } from '../parser/types'

export interface TurnTokenUsage {
  turnIndex: number
  userPreview: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
}

export interface SessionTokenSummary {
  totalInput: number
  totalOutput: number
  totalCacheRead: number
  totalCacheWrite: number
  cacheHitRate: number | null
}

export interface CostEstimate {
  inputCost: number
  outputCost: number
  cacheReadCost: number
  cacheWriteCost: number
  totalCost: number
}

export interface ClaudePricing {
  name: string
  inputPerM: number
  outputPerM: number
  cacheReadPerM: number
  cacheWritePerM: number
}

export const CLAUDE_PRICING: Record<string, ClaudePricing> = {
  haiku: {
    name: 'Claude 3.5 Haiku',
    inputPerM: 0.80,
    outputPerM: 4.00,
    cacheReadPerM: 0.08,
    cacheWritePerM: 1.00,
  },
  sonnet: {
    name: 'Claude 4 Sonnet',
    inputPerM: 3.00,
    outputPerM: 15.00,
    cacheReadPerM: 0.30,
    cacheWritePerM: 3.75,
  },
  opus: {
    name: 'Claude 4 Opus',
    inputPerM: 15.00,
    outputPerM: 75.00,
    cacheReadPerM: 1.50,
    cacheWritePerM: 18.75,
  },
}

export function computeTurnTokenUsage(turns: Turn[]): TurnTokenUsage[] {
  return turns.map((turn, i) => {
    let input = 0
    let output = 0
    let cacheRead = 0
    let cacheWrite = 0

    for (const step of turn.steps) {
      if (step.usage) {
        input += step.usage.input
        output += step.usage.output
        cacheRead += step.usage.cacheRead ?? 0
        cacheWrite += step.usage.cacheWrite ?? 0
      }
    }

    const userText = turn.user
      ? turn.user.content
          .filter(b => b.type === 'text')
          .map(b => (b as { text: string }).text)
          .join(' ')
          .slice(0, 60)
      : '(no user message)'

    return {
      turnIndex: i,
      userPreview: userText,
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: cacheWrite,
      totalTokens: input + output + cacheRead + cacheWrite,
    }
  })
}

export function computeSessionSummary(messages: DisplayMessage[]): SessionTokenSummary {
  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheWrite = 0

  for (const m of messages) {
    if (m.usage) {
      totalInput += m.usage.input
      totalOutput += m.usage.output
      totalCacheRead += m.usage.cacheRead ?? 0
      totalCacheWrite += m.usage.cacheWrite ?? 0
    }
  }

  const cacheTotal = totalInput + totalCacheRead
  const cacheHitRate = cacheTotal > 0 ? (totalCacheRead / cacheTotal) * 100 : null

  return { totalInput, totalOutput, totalCacheRead, totalCacheWrite, cacheHitRate }
}

export function estimateCost(summary: SessionTokenSummary, pricing: ClaudePricing): CostEstimate {
  const m = 1_000_000
  const inputCost = (summary.totalInput / m) * pricing.inputPerM
  const outputCost = (summary.totalOutput / m) * pricing.outputPerM
  const cacheReadCost = (summary.totalCacheRead / m) * pricing.cacheReadPerM
  const cacheWriteCost = (summary.totalCacheWrite / m) * pricing.cacheWritePerM
  const totalCost = inputCost + outputCost + cacheReadCost + cacheWriteCost

  return { inputCost, outputCost, cacheReadCost, cacheWriteCost, totalCost }
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

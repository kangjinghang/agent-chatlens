import { useState, useMemo } from 'react'
import { DollarSign, Database, TrendingUp, Zap } from 'lucide-react'
import type { Turn, DisplayMessage } from '../parser/types'
import {
  computeTurnTokenUsage,
  computeSessionSummary,
  estimateCost,
  CLAUDE_PRICING,
  formatTokens,
} from '../utils/analytics'

interface Props {
  turns: Turn[]
  messages: DisplayMessage[]
}

export default function AnalyticsView({ turns, messages }: Props) {
  const [pricingKey, setPricingKey] = useState('sonnet')

  const summary = useMemo(() => computeSessionSummary(messages), [messages])
  const turnUsage = useMemo(() => computeTurnTokenUsage(turns), [turns])
  const cost = useMemo(() => estimateCost(summary, CLAUDE_PRICING[pricingKey]), [summary, pricingKey])

  const maxTotal = useMemo(
    () => Math.max(...turnUsage.map(t => t.totalTokens), 1),
    [turnUsage],
  )

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Database className="h-3 w-3" /> Input Tokens
          </div>
          <div className="text-lg font-semibold">{formatTokens(summary.totalInput)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Zap className="h-3 w-3" /> Output Tokens
          </div>
          <div className="text-lg font-semibold">{formatTokens(summary.totalOutput)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" /> Cache Read
          </div>
          <div className="text-lg font-semibold">{formatTokens(summary.totalCacheRead)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Database className="h-3 w-3" /> Cache Write
          </div>
          <div className="text-lg font-semibold">{formatTokens(summary.totalCacheWrite)}</div>
        </div>
      </div>

      {/* Cache hit rate */}
      {summary.cacheHitRate !== null && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">Cache Efficiency</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500/60 rounded-full transition-all"
                style={{ width: `${summary.cacheHitRate}%` }}
              />
            </div>
            <span className="text-sm font-semibold">{summary.cacheHitRate.toFixed(1)}%</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">
            {formatTokens(summary.totalCacheRead)} cached of {formatTokens(summary.totalInput + summary.totalCacheRead)} total input
          </div>
        </div>
      )}

      {/* Cost estimation */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" /> Cost Estimation
          </div>
          <select
            value={pricingKey}
            onChange={e => setPricingKey(e.target.value)}
            className="text-xs bg-muted border border-border rounded-md px-2 py-1 outline-none"
          >
            {Object.entries(CLAUDE_PRICING).map(([key, pricing]) => (
              <option key={key} value={key}>{pricing.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <div className="text-[10px] text-muted-foreground">Input</div>
            <div className="text-sm font-mono">${cost.inputCost.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Output</div>
            <div className="text-sm font-mono">${cost.outputCost.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Cache Read</div>
            <div className="text-sm font-mono">${cost.cacheReadCost.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground font-medium">Total</div>
            <div className="text-sm font-mono font-semibold">${cost.totalCost.toFixed(4)}</div>
          </div>
        </div>
      </div>

      {/* Per-turn token chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">Per-Turn Token Usage</div>
        <div className="overflow-y-auto max-h-[400px] space-y-1.5">
          {turnUsage.map(turn => (
            <div key={turn.turnIndex} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono w-6 shrink-0 text-right">
                {turn.turnIndex + 1}
              </span>
              <div className="flex-1 h-4 bg-muted/20 rounded overflow-hidden flex min-w-0">
                {turn.inputTokens > 0 && (
                  <div
                    className="h-full bg-blue-500/50"
                    style={{ width: `${(turn.inputTokens / maxTotal) * 100}%` }}
                    title={`Input: ${formatTokens(turn.inputTokens)}`}
                  />
                )}
                {turn.outputTokens > 0 && (
                  <div
                    className="h-full bg-green-500/50"
                    style={{ width: `${(turn.outputTokens / maxTotal) * 100}%` }}
                    title={`Output: ${formatTokens(turn.outputTokens)}`}
                  />
                )}
                {turn.cacheReadTokens > 0 && (
                  <div
                    className="h-full bg-amber-500/50"
                    style={{ width: `${(turn.cacheReadTokens / maxTotal) * 100}%` }}
                    title={`Cache Read: ${formatTokens(turn.cacheReadTokens)}`}
                  />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground font-mono w-12 shrink-0 text-right">
                {formatTokens(turn.totalTokens)}
              </span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[120px] sm:max-w-[200px] shrink-0">
                {turn.userPreview}
              </span>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/50" />
            <span className="text-[10px] text-muted-foreground">Input</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500/50" />
            <span className="text-[10px] text-muted-foreground">Output</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/50" />
            <span className="text-[10px] text-muted-foreground">Cache Read</span>
          </div>
        </div>
      </div>
    </div>
  )
}

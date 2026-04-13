import { useMemo } from 'react'

export interface ToolEvent {
  toolUseId: string
  name: string
  input: unknown
  startTime: number
  endTime: number | null
  duration: number | null
  isError: boolean
  resultPreview: string
  turnIndex: number
  userSummary: string
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${m}m${s}s`
}

function getToolColor(name: string): string {
  const lower = name.toLowerCase()
  if (lower === 'bash') return 'bg-yellow-500/70'
  if (lower === 'edit') return 'bg-blue-500/70'
  if (lower === 'write' || lower === 'create') return 'bg-green-500/70'
  if (lower === 'read') return 'bg-cyan-500/70'
  if (lower === 'grep') return 'bg-orange-500/70'
  if (lower === 'glob') return 'bg-purple-500/70'
  return 'bg-gray-500/70'
}

function getToolTextColor(name: string): string {
  const lower = name.toLowerCase()
  if (lower === 'bash') return 'text-yellow-500'
  if (lower === 'edit') return 'text-blue-500'
  if (lower === 'write' || lower === 'create') return 'text-green-500'
  if (lower === 'read') return 'text-cyan-500'
  if (lower === 'grep') return 'text-orange-500'
  if (lower === 'glob') return 'text-purple-500'
  return 'text-gray-500'
}

interface TimelineStatsProps {
  events: ToolEvent[]
  totalCacheRead: number
  totalCacheWrite: number
  totalInput: number
}

export default function TimelineStats({ events, totalCacheRead, totalCacheWrite, totalInput }: TimelineStatsProps) {
  const stats = useMemo(() => {
    const withDuration = events.filter(e => e.duration !== null) as (ToolEvent & { duration: number })[]
    const totalExecTime = withDuration.reduce((sum, e) => sum + e.duration, 0)
    const avgTime = withDuration.length > 0 ? totalExecTime / withDuration.length : 0

    // Slowest call
    const slowest = withDuration.length > 0
      ? withDuration.reduce((max, e) => e.duration > max.duration ? e : max, withDuration[0])
      : null

    // Breakdown by tool type
    const breakdown = new Map<string, { count: number; totalDuration: number; errorCount: number }>()
    for (const e of events) {
      const existing = breakdown.get(e.name) || { count: 0, totalDuration: 0, errorCount: 0 }
      existing.count++
      if (e.duration !== null) existing.totalDuration += e.duration
      if (e.isError) existing.errorCount++
      breakdown.set(e.name, existing)
    }

    // Sort by count descending
    const sortedBreakdown = [...breakdown.entries()]
      .map(([name, data]) => ({
        name,
        ...data,
        avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return { totalExecTime, avgTime, slowest, sortedBreakdown, withDurationCount: withDuration.length }
  }, [events])

  const cacheHitRate = useMemo(() => {
    const total = totalInput + totalCacheRead
    return total > 0 ? (totalCacheRead / total) * 100 : null
  }, [totalInput, totalCacheRead])

  return (
    <div className="p-4 space-y-4 border-b border-border">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Tool Calls</div>
          <div className="text-lg font-semibold">{events.length}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Total Exec Time</div>
          <div className="text-lg font-semibold">{formatDuration(stats.totalExecTime)}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Avg Duration</div>
          <div className="text-lg font-semibold">{formatDuration(stats.avgTime)}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Slowest Call</div>
          <div className="text-sm font-semibold">
            {stats.slowest ? (
              <span>
                <span className={getToolTextColor(stats.slowest.name)}>{stats.slowest.name}</span>
                <span className="text-muted-foreground ml-1 text-xs">{formatDuration(stats.slowest.duration)}</span>
              </span>
            ) : '—'}
          </div>
        </div>
      </div>

      {/* Tool type breakdown */}
      {stats.sortedBreakdown.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Tool Breakdown</div>
          <div className="space-y-1.5">
            {stats.sortedBreakdown.map(item => {
              const maxCount = stats.sortedBreakdown[0].count
              const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-sm shrink-0 ${getToolColor(item.name)}`} />
                  <span className={`text-xs font-medium w-16 shrink-0 ${getToolTextColor(item.name)}`}>{item.name}</span>
                  <div className="flex-1 h-4 bg-muted/30 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${getToolColor(item.name)} opacity-60`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{item.count}</span>
                  {item.errorCount > 0 && (
                    <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded shrink-0">
                      {item.errorCount} err
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground font-mono w-16 text-right shrink-0 hidden sm:block">
                    avg {formatDuration(item.avgDuration)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cache hit rate */}
      {cacheHitRate !== null && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Cache Hit Rate</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500/60 rounded-full transition-all"
                style={{ width: `${cacheHitRate}%` }}
              />
            </div>
            <span className="text-sm font-semibold">{cacheHitRate.toFixed(1)}%</span>
            <span className="text-[11px] text-muted-foreground">
              {formatTokens(totalCacheRead)} / {formatTokens(totalInput + totalCacheRead)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

import { useState, useMemo } from 'react'
import { Clock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { Turn } from '../parser'
import type { ToolUseBlock, ToolResultBlock } from '../parser/types'

// --- Data types ---

interface ToolEvent {
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

// --- Extract tool events from turns ---

function extractToolEvents(turns: Turn[]): ToolEvent[] {
  const events: ToolEvent[] = []

  for (let ti = 0; ti < turns.length; ti++) {
    const turn = turns[ti]
    const userSummary = getUserSummary(turn.user)
    const toolUseMap = new Map<string, { block: ToolUseBlock; timestamp: number }>()
    const toolResultMap = new Map<string, { block: ToolResultBlock; timestamp: number }>()

    for (const step of turn.steps) {
      if (!step.timestamp) continue
      for (const block of step.content) {
        if (block.type === 'toolUse') {
          toolUseMap.set(block.id, { block, timestamp: step.timestamp })
        }
        if (block.type === 'toolResult') {
          toolResultMap.set(block.toolUseId, { block, timestamp: step.timestamp })
        }
      }
    }

    for (const [id, { block, timestamp }] of toolUseMap) {
      const result = toolResultMap.get(id)
      events.push({
        toolUseId: id,
        name: block.name,
        input: block.input,
        startTime: timestamp,
        endTime: result?.timestamp ?? null,
        duration: result ? result.timestamp - timestamp : null,
        isError: result?.block.isError ?? false,
        resultPreview: getResultPreview(result?.block.content),
        turnIndex: ti,
        userSummary,
      })
    }
  }

  return events
}

function getUserSummary(msg: Turn['user']): string {
  if (!msg) return '(no user message)'
  const text = msg.content
    .filter(b => b.type === 'text')
    .map(b => (b as { text: string }).text)
    .join(' ')
  return text.slice(0, 80) + (text.length > 80 ? '...' : '') || '(no text)'
}

function getResultPreview(content?: string): string {
  if (!content) return ''
  const first = content.split('\n')[0]
  return first.length > 100 ? first.slice(0, 100) + '...' : first
}

// --- Tool colors ---

function getToolColor(name: string): { bg: string; bar: string; text: string } {
  const lower = name.toLowerCase()
  if (lower === 'bash') return { bg: 'bg-yellow-500/10', bar: 'bg-yellow-500/70', text: 'text-yellow-500' }
  if (lower === 'edit') return { bg: 'bg-blue-500/10', bar: 'bg-blue-500/70', text: 'text-blue-500' }
  if (lower === 'write' || lower === 'create') return { bg: 'bg-green-500/10', bar: 'bg-green-500/70', text: 'text-green-500' }
  if (lower === 'read') return { bg: 'bg-cyan-500/10', bar: 'bg-cyan-500/70', text: 'text-cyan-500' }
  if (lower === 'grep') return { bg: 'bg-orange-500/10', bar: 'bg-orange-500/70', text: 'text-orange-500' }
  if (lower === 'glob') return { bg: 'bg-purple-500/10', bar: 'bg-purple-500/70', text: 'text-purple-500' }
  if (lower === 'websearch' || lower === 'webfetch') return { bg: 'bg-teal-500/10', bar: 'bg-teal-500/70', text: 'text-teal-500' }
  return { bg: 'bg-gray-500/10', bar: 'bg-gray-500/70', text: 'text-gray-500' }
}

function getToolSummary(name: string, input: unknown): string {
  const inp = input as Record<string, unknown> | undefined
  const lower = name.toLowerCase()
  if (lower === 'bash') return String(inp?.command || '').slice(0, 60)
  if (lower === 'edit') return String(inp?.file_path || '')
  if (lower === 'write' || lower === 'create') return String(inp?.file_path || '')
  if (lower === 'read') return String(inp?.file_path || '')
  if (lower === 'grep') return String(inp?.pattern || '')
  if (lower === 'glob') return String(inp?.pattern || '')
  if (lower === 'websearch') return String(inp?.query || '')
  if (lower === 'webfetch') return String(inp?.url || '')
  return ''
}

// --- Time formatting ---

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${m}m${s}s`
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// --- Main component ---

interface Props {
  turns: Turn[]
}

export default function TimelineView({ turns }: Props) {
  const events = useMemo(() => extractToolEvents(turns), [turns])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tool calls found in this session.
      </div>
    )
  }

  // Calculate time range
  const allTimestamps = events.filter(e => e.endTime !== null).flatMap(e => [e.startTime, e.endTime!])
  const minTime = Math.min(...allTimestamps)
  const maxTime = Math.max(...allTimestamps)
  const totalTimeRange = maxTime - minTime

  // Group events by turn
  const turnGroups = useMemo(() => {
    const groups: Map<number, ToolEvent[]> = new Map()
    for (const event of events) {
      if (!groups.has(event.turnIndex)) groups.set(event.turnIndex, [])
      groups.get(event.turnIndex)!.push(event)
    }
    return groups
  }, [events])

  // Sort events within each turn by start time
  const sortedGroups = useMemo(() => {
    return [...turnGroups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([idx, evts]) => ({ turnIndex: idx, events: evts.sort((a, b) => a.startTime - b.startTime) }))
  }, [turnGroups])

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header with time axis */}
      <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center gap-4">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {events.length} tool calls · {formatTime(minTime)} → {formatTime(maxTime)}
          {totalTimeRange > 0 && ` · Total ${formatDuration(totalTimeRange)}`}
        </span>

        {/* Color legend */}
        <div className="flex items-center gap-3 ml-auto">
          {(['Bash', 'Edit', 'Write', 'Read', 'Grep', 'Glob'] as const).map(name => {
            const color = getToolColor(name)
            return (
              <div key={name} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-sm ${color.bar}`} />
                <span className="text-[10px] text-muted-foreground">{name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Time axis ruler */}
      {totalTimeRange > 0 && (
        <div className="px-48 py-1 border-b border-border bg-muted/30">
          <div className="relative h-4">
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const time = minTime + totalTimeRange * frac
              return (
                <div
                  key={frac}
                  className="absolute text-[9px] text-muted-foreground font-mono"
                  style={{ left: `${frac * 100}%`, transform: 'translateX(-50%)' }}
                >
                  {formatTime(time)}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Gantt rows grouped by turn */}
      <div className="divide-y divide-border">
        {sortedGroups.map(({ turnIndex, events: turnEvents }) => {
          const turn = turns[turnIndex]
          return (
            <div key={turnIndex}>
              {/* Turn header */}
              <div className="px-4 py-1.5 bg-muted/20 text-xs text-muted-foreground border-b border-border/50">
                Turn {turnIndex + 1}
                {turn.user && `: ${getUserSummary(turn.user)}`}
              </div>

              {/* Tool event rows */}
              {turnEvents.map(event => {
                const color = getToolColor(event.name)
                const summary = getToolSummary(event.name, event.input)
                const isExpanded = expandedId === event.toolUseId

                // Calculate bar position as percentage of total time range
                const leftPct = totalTimeRange > 0 ? ((event.startTime - minTime) / totalTimeRange) * 100 : 0
                const widthPct = event.duration && totalTimeRange > 0
                  ? Math.max((event.duration / totalTimeRange) * 100, 0.5) // minimum 0.5% width for visibility
                  : 0

                return (
                  <div key={event.toolUseId}>
                    <div
                      className={`flex items-center gap-3 px-4 py-1.5 hover:bg-muted/30 transition-colors cursor-pointer ${event.isError ? 'bg-red-500/5' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : event.toolUseId)}
                    >
                      {/* Tool info */}
                      <div className="w-40 shrink-0 flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        {event.isError && <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />}
                        <span className={`text-xs font-medium truncate ${color.text}`}>
                          {event.name}
                        </span>
                      </div>

                      {/* Input summary */}
                      <div className="w-32 shrink-0 min-w-0">
                        <span className="text-[11px] font-mono text-muted-foreground truncate block">
                          {summary}
                        </span>
                      </div>

                      {/* Gantt bar area */}
                      <div className="flex-1 relative h-6 min-w-0">
                        {totalTimeRange > 0 && (
                          <div
                            className={`absolute top-0.5 h-5 rounded ${color.bar} ${event.isError ? 'ring-1 ring-red-500/50' : ''} transition-all`}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          >
                            {event.duration !== null && widthPct > 8 && (
                              <span className="text-[10px] font-mono text-white/90 px-1.5 leading-5 block truncate">
                                {formatDuration(event.duration)}
                              </span>
                            )}
                          </div>
                        )}
                        {event.duration === null && (
                          <span className="text-[10px] text-muted-foreground italic">pending...</span>
                        )}
                      </div>

                      {/* Duration badge */}
                      <div className="w-20 shrink-0 text-right">
                        {event.duration !== null ? (
                          <span className={`text-xs font-mono ${event.duration > 10000 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                            {formatDuration(event.duration)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pl-12 space-y-2">
                        <div className="text-xs space-y-1">
                          <div className="flex gap-4">
                            <span className="text-muted-foreground">Start:</span>
                            <span className="font-mono">{formatTime(event.startTime)}</span>
                            {event.endTime && (
                              <>
                                <span className="text-muted-foreground">End:</span>
                                <span className="font-mono">{formatTime(event.endTime)}</span>
                              </>
                            )}
                            {event.duration !== null && (
                              <>
                                <span className="text-muted-foreground">Duration:</span>
                                <span className="font-mono font-medium">{formatDuration(event.duration)}</span>
                              </>
                            )}
                          </div>
                          {summary && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground shrink-0">Input:</span>
                              <code className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-[11px] break-all">{summary}</code>
                            </div>
                          )}
                          {event.resultPreview && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground shrink-0">Result:</span>
                              <code className={`font-mono px-1.5 py-0.5 rounded text-[11px] break-all ${event.isError ? 'bg-red-500/10 text-red-400' : 'bg-muted/50'}`}>
                                {event.resultPreview}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

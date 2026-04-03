import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertCircle, ArrowUp, ArrowDown, Layers, BarChart3, List, GanttChart } from 'lucide-react'
import type { ParsedSession } from '../parser'
import { groupIntoTurns } from '../parser'
import TurnView, { ToolCollapseProvider, useToolCollapse } from './TurnView'
import TimelineView from './TimelineView'

interface Props {
  session: ParsedSession
}

export default function SessionList({ session }: Props) {
  return (
    <ToolCollapseProvider>
      <SessionListInner session={session} />
    </ToolCollapseProvider>
  )
}

function SessionListInner({ session }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [view, setView] = useState<'list' | 'timeline'>('list')
  const { collapsed, toggle } = useToolCollapse()

  const turns = useMemo(() => groupIntoTurns(session.messages), [session.messages])

  const virtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 200,
    overscan: 3,
  })

  // Auto-scroll to bottom on first load
  useEffect(() => {
    if (turns.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [turns.length])

  // Track scroll position
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateScrollState = () => {
      const scrollTop = el.scrollTop
      const scrollHeight = el.scrollHeight
      const clientHeight = el.clientHeight

      setIsAtTop(scrollTop < 50)
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 50)
      setShowScrollButtons(scrollHeight > clientHeight * 1.5)
    }

    updateScrollState()
    el.addEventListener('scroll', updateScrollState)
    return () => el.removeEventListener('scroll', updateScrollState)
  }, [turns.length, view])

  const scrollToTop = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [])

  // Compute stats
  const stats = useMemo(() => {
    const toolCalls = session.messages.filter(m => m.role === 'assistant')
      .flatMap(m => m.content.filter(b => b.type === 'toolUse')).length
    const totalInput = session.messages.reduce((sum, m) => sum + (m.usage?.input ?? 0), 0)
    const totalOutput = session.messages.reduce((sum, m) => sum + (m.usage?.output ?? 0), 0)
    const firstTs = session.messages.find(m => m.timestamp)?.timestamp
    const lastTs = [...session.messages].reverse().find(m => m.timestamp)?.timestamp
    const duration = firstTs && lastTs ? lastTs - firstTs : null
    return { toolCalls, totalInput, totalOutput, duration }
  }, [session.messages])

  if (session.messages.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No displayable messages found</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          {/* Stats pills */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{turns.length} turns</span>
            <span>·</span>
            <span>{stats.toolCalls} tool calls</span>
            <span>·</span>
            <span>{formatTokens(stats.totalInput + stats.totalOutput)} tokens</span>
            {stats.duration !== null && (
              <>
                <span>·</span>
                <span>{formatDuration(stats.duration)}</span>
              </>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                view === 'timeline' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
              title="Timeline view"
            >
              <GanttChart className="h-3.5 w-3.5" />
              Timeline
            </button>
          </div>

          {view === 'list' && (
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-muted border border-border transition-colors"
              title={collapsed ? 'Expand all tool calls' : 'Collapse all tool calls'}
            >
              <Layers className="h-3.5 w-3.5" />
              {collapsed ? 'Expand Tools' : 'Collapse Tools'}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 240px)' }}
      >
        {view === 'timeline' ? (
          <TimelineView turns={turns} />
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const turn = turns[virtualItem.index]
              return (
                <div
                  key={turn.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingBottom: '1rem',
                  }}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                >
                  <TurnView turn={turn} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Scroll buttons */}
      {showScrollButtons && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          {!isAtTop && (
            <button
              onClick={scrollToTop}
              className="p-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
              title="Scroll to top"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          )}
          {!isAtBottom && (
            <button
              onClick={scrollToBottom}
              className="p-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
              title="Scroll to bottom"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
          )}
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

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m < 60) return `${m}m ${rem}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

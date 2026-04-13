import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertCircle, ArrowUp, ArrowDown, Layers, BarChart3, List, GanttChart, Download, Search, FileText, Code, ListOrdered } from 'lucide-react'
import type { ParsedSession } from '../parser'
import { groupIntoTurns } from '../parser'
import type { ToolResultBlock } from '../parser/types'
import TurnView, { ToolCollapseProvider, useToolCollapse } from './TurnView'
import TimelineView from './TimelineView'
import AnalyticsView from './AnalyticsView'
import TOCPanel from './TOCPanel'
import type { TOCEntry } from './TOCPanel'
import { exportToMarkdown, exportToHtml, downloadFile } from '../utils/export'
import SearchDialog from './SearchDialog'

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
  const [view, setView] = useState<'list' | 'timeline' | 'analytics'>('list')
  const [exportOpen, setExportOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlightText, setHighlightText] = useState('')
  const [tocOpen, setTocOpen] = useState(false)
  const [activeTurnIndex, setActiveTurnIndex] = useState(0)
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

  // Track scroll position + active turn index
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

      // Track active turn from virtualizer visible items
      if (view === 'list') {
        const virtualItems = virtualizer.getVirtualItems()
        if (virtualItems.length > 0) {
          const midItem = virtualItems[Math.floor(virtualItems.length / 2)]
          setActiveTurnIndex(midItem.index)
        }
      }
    }

    updateScrollState()
    el.addEventListener('scroll', updateScrollState)
    return () => el.removeEventListener('scroll', updateScrollState)
  }, [turns.length, view, virtualizer])

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

  // Compute TOC entries
  const tocEntries = useMemo((): TOCEntry[] => {
    return turns.map((turn, i) => {
      const userText = turn.user
        ? turn.user.content
            .filter(b => b.type === 'text')
            .map(b => (b as { text: string }).text)
            .join(' ')
            .slice(0, 60)
        : '(no user message)'
      const toolCount = turn.steps.reduce(
        (count, step) => count + step.content.filter(b => b.type === 'toolUse').length, 0,
      )
      return { turnIndex: i, preview: userText || '(no text)', toolCount }
    })
  }, [turns])

  // ⌘K / Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const scrollToTurn = useCallback((turnIndex: number) => {
    if (view === 'timeline') setView('list')
    // Need a small delay for the list to render after view switch
    setTimeout(() => {
      virtualizer.scrollToIndex(turnIndex, { align: 'center' })
    }, view === 'timeline' ? 50 : 0)
  }, [virtualizer, view])

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-1 gap-2">
        <div className="flex items-center gap-3">
          {/* Stats pills */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{turns.length} turns</span>
            <span className="hidden sm:inline">·</span>
            <span>{stats.toolCalls} tool calls</span>
            <span className="hidden sm:inline">·</span>
            <span>{formatTokens(stats.totalInput + stats.totalOutput)} tokens</span>
            {stats.duration !== null && (
              <>
                <span className="hidden sm:inline">·</span>
                <span>{formatDuration(stats.duration)}</span>
              </>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* TOC button (list view only) */}
          {view === 'list' && (
            <button
              onClick={() => setTocOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-muted border transition-colors ${
                tocOpen ? 'bg-muted border-foreground/20' : 'border-border'
              }`}
              title="Table of Contents"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">TOC</span>
            </button>
          )}
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-muted border border-border transition-colors"
            title="Search (⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>
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
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                view === 'timeline' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
              title="Timeline view"
            >
              <GanttChart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                view === 'analytics' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
              title="Analytics view"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
          </div>

          {view === 'list' && (
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-muted border border-border transition-colors"
              title={collapsed ? 'Expand all tool calls' : 'Collapse all tool calls'}
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{collapsed ? 'Expand Tools' : 'Collapse Tools'}</span>
            </button>
          )}

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-muted border border-border transition-colors"
              title="Export session"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                  <button
                    onClick={() => {
                      const md = exportToMarkdown(turns, session)
                      downloadFile(md, `${session.title}.md`, 'text/markdown')
                      setExportOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Export Markdown
                  </button>
                  <button
                    onClick={() => {
                      const html = exportToHtml(turns, session)
                      downloadFile(html, `${session.title}.html`, 'text/html')
                      setExportOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                  >
                    <Code className="h-3.5 w-3.5" />
                    Export HTML
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex">
        {/* TOC Panel */}
        {tocOpen && view === 'list' && (
          <TOCPanel
            entries={tocEntries}
            activeIndex={activeTurnIndex}
            onSelect={(index) => {
              scrollToTurn(index)
              // Close on mobile after selection
              if (window.innerWidth < 768) setTocOpen(false)
            }}
            isOpen={tocOpen && view === 'list'}
            onClose={() => setTocOpen(false)}
          />
        )}

        <div
          ref={scrollRef}
          className="overflow-y-auto flex-1"
          style={{ maxHeight: 'calc(100vh - 180px)' }}
        >
        {view === 'timeline' ? (
          <TimelineView turns={turns} messages={session.messages} />
        ) : view === 'analytics' ? (
          <AnalyticsView turns={turns} messages={session.messages} />
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
                  <TurnView turn={turn} highlightText={highlightText} />
                </div>
              )
            })}
          </div>
        )}
      </div>
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

      {/* Search dialog */}
      {searchOpen && (
        <SearchDialog
          turns={turns}
          onSelect={(turnIndex) => {
            scrollToTurn(turnIndex)
            setHighlightText('') // brief flash then clear — user found what they need
          }}
          onClose={() => setSearchOpen(false)}
        />
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

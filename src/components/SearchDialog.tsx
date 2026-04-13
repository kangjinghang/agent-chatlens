import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, X, User, Bot, Wrench } from 'lucide-react'
import type { Turn, ContentBlock, TextBlock, ThinkingBlock, ToolUseBlock, ToolResultBlock } from '../parser/types'
import { getSnippet } from '../utils/highlight'

export interface SearchResult {
  turnIndex: number
  turnId: string
  matchCount: number
  snippets: { role: string; text: string }[]
}

function extractAllText(blocks: ContentBlock[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'text': return b.text
      case 'thinking': return b.text
      case 'toolUse': return `${b.name} ${JSON.stringify(b.input)}`
      case 'toolResult': return b.content
    }
  }).join(' ')
}

function searchTurns(turns: Turn[], query: string): SearchResult[] {
  const lower = query.toLowerCase()
  const results: SearchResult[] = []

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]
    const snippets: SearchResult['snippets'] = []
    let matchCount = 0

    // Search user message
    if (turn.user) {
      const text = extractAllText(turn.user.content)
      if (text.toLowerCase().includes(lower)) {
        const count = (text.toLowerCase().match(new RegExp(lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        matchCount += count
        snippets.push({ role: 'user', text: getSnippet(text, query) })
      }
    }

    // Search assistant and toolResult steps
    for (const step of turn.steps) {
      const text = extractAllText(step.content)
      if (text.toLowerCase().includes(lower)) {
        const count = (text.toLowerCase().match(new RegExp(lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        matchCount += count
        const role = step.role === 'assistant' ? 'assistant' : 'tool'
        snippets.push({ role, text: getSnippet(text, query) })
      }
    }

    if (matchCount > 0) {
      results.push({ turnIndex: i, turnId: turn.id, matchCount, snippets })
    }
  }

  return results
}

interface Props {
  turns: Turn[]
  onSelect: (turnIndex: number) => void
  onClose: () => void
}

export default function SearchDialog({ turns, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchTurns(turns, query)
  }, [turns, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results.length])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      onSelect(results[selectedIndex].turnIndex)
      onClose()
    }
  }, [results, selectedIndex, onSelect, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement
      selected?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0)

  const roleIcon = (role: string) => {
    switch (role) {
      case 'user': return <User className="h-3 w-3 shrink-0" />
      case 'assistant': return <Bot className="h-3 w-3 shrink-0" />
      default: return <Wrench className="h-3 w-3 shrink-0" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:pt-[15vh]">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full h-full sm:h-auto sm:max-w-xl bg-background border border-border sm:rounded-xl rounded-none shadow-2xl overflow-hidden flex flex-col">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages, tools, thinking..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {results.length > 0 ? `${totalMatches} matches in ${results.length} turns` : 'No results'}
            </span>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div ref={listRef} className="flex-1 sm:max-h-[50vh] overflow-y-auto">
            {results.map((result, i) => (
              <button
                key={result.turnId}
                onClick={() => { onSelect(result.turnIndex); onClose() }}
                className={`w-full text-left px-4 py-2.5 border-b border-border/50 transition-colors ${
                  i === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Turn {result.turnIndex + 1}</span>
                  <span className="text-xs text-muted-foreground">{result.matchCount} match{result.matchCount > 1 ? 'es' : ''}</span>
                </div>
                <div className="space-y-0.5">
                  {result.snippets.slice(0, 2).map((s, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 text-muted-foreground/70">{roleIcon(s.role)}</span>
                      <span className="line-clamp-1">{s.text}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results found for "{query}"
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↵</kbd> Jump</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}

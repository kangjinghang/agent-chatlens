import { useEffect, useRef } from 'react'
import { X, Wrench } from 'lucide-react'

export interface TOCEntry {
  turnIndex: number
  preview: string
  toolCount: number
}

interface Props {
  entries: TOCEntry[]
  activeIndex: number
  onSelect: (index: number) => void
  isOpen: boolean
  onClose: () => void
}

export default function TOCPanel({ entries, activeIndex, onSelect, isOpen, onClose }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // Scroll active item into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  if (!isOpen) return null

  const handleSelect = (index: number) => {
    onSelect(index)
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="
        fixed top-0 left-0 bottom-0 z-50 md:relative md:z-auto
        w-64 md:w-60 shrink-0
        bg-background border-r border-border
        flex flex-col
        transform transition-transform duration-300
        md:transition-none
      ">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">
            Table of Contents ({entries.length})
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Entry list */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {entries.map(entry => {
            const isActive = entry.turnIndex === activeIndex
            return (
              <button
                key={entry.turnIndex}
                ref={isActive ? activeRef : undefined}
                onClick={() => handleSelect(entry.turnIndex)}
                className={`
                  w-full text-left px-3 py-1.5 text-xs transition-colors
                  border-l-2
                  ${isActive
                    ? 'bg-primary/10 border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    #{entry.turnIndex + 1}
                  </span>
                  <span className="truncate flex-1">{entry.preview}</span>
                  {entry.toolCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                      <Wrench className="h-2.5 w-2.5" />
                      {entry.toolCount}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}

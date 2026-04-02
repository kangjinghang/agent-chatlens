import { useRef, useEffect, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertCircle, ArrowUp, ArrowDown } from 'lucide-react'
import type { ParsedSession } from '../parser'
import MessageItem from './MessageItem'

interface Props {
  session: ParsedSession
}

export default function SessionList({ session }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const virtualizer = useVirtualizer({
    count: session.messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 150,
    overscan: 5,
  })

  // Auto-scroll to bottom on first load
  useEffect(() => {
    if (session.messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [session.messages.length])

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
  }, [session.messages.length])

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
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const msg = session.messages[virtualItem.index]
            return (
              <div
                key={msg.id}
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
                <MessageItem message={msg} />
              </div>
            )
          })}
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
    </div>
  )
}

import { useState } from 'react'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'

interface Props {
  text: string
}

export default function ThinkingBlock({ text }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border rounded-lg bg-muted/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Brain className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-medium text-muted-foreground">Thinking</span>
        <span className="text-xs text-muted-foreground ml-auto">{text.length} chars</span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-background rounded p-3 max-h-96 overflow-y-auto">
            {text}
          </div>
        </div>
      )}
    </div>
  )
}

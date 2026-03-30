import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  content: string
  isError: boolean
  toolName?: string
}

export default function ToolResultBlock({ content, isError, toolName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isError ? 'border-red-500/50 bg-red-500/10' : 'border-border bg-muted/20'
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{isError ? '❌ Error' : '✓ Result'}</span>
        {toolName && <span className="text-sm text-muted-foreground ml-2">{toolName}</span>}
      </button>
      {open && (
        <div className="px-4 pb-3">
          <pre className="text-xs font-mono bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}

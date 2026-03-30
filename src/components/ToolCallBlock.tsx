import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react'

interface Props {
  name: string
  input: unknown
}

export default function ToolCallBlock({ name, input }: Props) {
  const [open, setOpen] = useState(false)

  const icon = getToolIcon(name)

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
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium">{name}</span>
        {(input as any)?.file_path && (
          <span className="text-sm text-muted-foreground ml-2 font-mono truncate max-w-xs">
            {(input as any).file_path}
          </span>
        )}
        {(input as any)?.command && (
          <span className="text-sm text-muted-foreground ml-2 font-mono truncate max-w-xs">
            {(input as any).command}
          </span>
        )}
      </button>
      {open && input && (
        <div className="px-4 pb-3">
          <pre className="text-xs font-mono bg-background rounded p-3 overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function getToolIcon(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('read') || lower.includes('write') || lower.includes('edit')) return '📄'
  if (lower.includes('bash') || lower.includes('exec')) return '⚡'
  if (lower.includes('grep') || lower.includes('search')) return '🔍'
  if (lower.includes('glob') || lower.includes('ls')) return '📁'
  if (lower.includes('web')) return '🌐'
  if (lower.includes('todo')) return '📋'
  if (lower.includes('task')) return '🤖'
  return '🔧'
}

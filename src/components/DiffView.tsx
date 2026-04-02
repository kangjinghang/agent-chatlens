import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  oldString: string
  newString: string
  filePath?: string
}

export default function DiffView({ oldString, newString, filePath }: Props) {
  const [open, setOpen] = useState(true)

  const oldLines = oldString.split('\n')
  const newLines = newString.split('\n')

  // Simple inline diff: show old lines (red) then new lines (green)
  const diffLines: { type: 'old' | 'new' | 'ctx'; text: string }[] = []

  // Find common prefix
  let prefixEnd = 0
  while (prefixEnd < oldLines.length && prefixEnd < newLines.length && oldLines[prefixEnd] === newLines[prefixEnd]) {
    prefixEnd++
  }

  // Find common suffix
  let oldSuffixStart = oldLines.length - 1
  let newSuffixStart = newLines.length - 1
  while (oldSuffixStart > prefixEnd && newSuffixStart > prefixEnd && oldLines[oldSuffixStart] === newLines[newSuffixStart]) {
    oldSuffixStart--
    newSuffixStart--
  }

  // Add context before
  for (let i = Math.max(0, prefixEnd - 2); i < prefixEnd; i++) {
    diffLines.push({ type: 'ctx', text: oldLines[i] })
  }

  // Add removed lines
  for (let i = prefixEnd; i <= oldSuffixStart; i++) {
    diffLines.push({ type: 'old', text: oldLines[i] })
  }

  // Add added lines
  for (let i = prefixEnd; i <= newSuffixStart; i++) {
    diffLines.push({ type: 'new', text: newLines[i] })
  }

  // Add context after
  for (let i = oldSuffixStart + 1; i < Math.min(oldLines.length, oldSuffixStart + 3); i++) {
    diffLines.push({ type: 'ctx', text: oldLines[i] })
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-medium">Edit</span>
        {filePath && <span className="text-xs font-mono text-muted-foreground ml-1 truncate">{filePath}</span>}
        <span className="text-xs text-muted-foreground ml-auto">
          {oldLines.length} → {newLines.length} lines
        </span>
      </button>
      {open && (
        <div className="font-mono text-xs overflow-x-auto">
          {diffLines.map((line, i) => (
            <div
              key={i}
              className={`px-4 py-0.5 whitespace-pre ${
                line.type === 'old'
                  ? 'bg-red-500/15 text-red-400'
                  : line.type === 'new'
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-muted-foreground'
              }`}
            >
              <span className="inline-block w-5 text-right mr-3 select-none opacity-50">
                {line.type === 'old' ? '-' : line.type === 'new' ? '+' : ' '}
              </span>
              {line.text || ' '}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

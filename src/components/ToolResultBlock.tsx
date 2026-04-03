import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { useToolCollapse } from './TurnView'

interface Props {
  content: string
  isError: boolean
  toolName?: string
}

const syntaxTheme = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.375rem',
    padding: '0.75rem',
    margin: 0,
    fontSize: '0.75rem',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    fontSize: '0.75rem',
    fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
  },
}

export default function ToolResultBlock({ content, isError, toolName }: Props) {
  const { collapsed } = useToolCollapse()

  // Detect content type for better rendering
  const isCode = looksLikeCode(content)
  const isFilePaths = looksLikeFilePaths(content)
  const lineCount = content.split('\n').length

  // Auto-collapse very long results
  const isLong = lineCount > 50
  const defaultOpen = isError || (!isLong && lineCount <= 20)

  const [localOpen, setLocalOpen] = useState(defaultOpen)
  const [override, setOverride] = useState(false)

  // Reset override when global collapse is turned off
  useEffect(() => {
    if (!collapsed) setOverride(false)
  }, [collapsed])

  const isOpen = override || (!collapsed && localOpen)
  const toggle = () => {
    if (collapsed) {
      setOverride(!override)
    } else {
      setLocalOpen(!localOpen)
    }
  }

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isError ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-muted/20'
      }`}
    >
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        {isError ? (
          <XCircle className="h-4 w-4 text-red-400" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        )}
        <span className="text-sm font-medium">{isError ? 'Error' : 'Result'}</span>
        {toolName && <span className="text-xs text-muted-foreground">{toolName}</span>}
        <span className="text-xs text-muted-foreground ml-auto">{lineCount} lines</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          {isError ? (
            <pre className="text-xs font-mono bg-red-500/10 border border-red-500/30 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto text-red-400">
              {content}
            </pre>
          ) : isFilePaths ? (
            <div className="bg-background rounded border border-border p-2 max-h-64 overflow-y-auto">
              {content.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className="text-xs font-mono py-0.5 px-2 hover:bg-muted/50 rounded flex items-center gap-2">
                  <span className="text-muted-foreground">{getFileIcon(line)}</span>
                  <span className="truncate">{line}</span>
                </div>
              ))}
            </div>
          ) : isCode ? (
            <div className="max-h-96 overflow-y-auto">
              <SyntaxHighlighter style={syntaxTheme} language="typescript" PreTag="div">
                {content}
              </SyntaxHighlighter>
            </div>
          ) : (
            <pre className="text-xs font-mono bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto border border-border">
              {content}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function looksLikeCode(text: string): boolean {
  const lines = text.split('\n')
  if (lines.length < 3) return false
  const codeIndicators = [
    /^(import |export |const |let |var |function |class |interface |type |def |pub fn |async )/m,
    /[{};]$/,
    /^\s*(if|for|while|return|throw)\s/m,
  ]
  let matches = 0
  for (const re of codeIndicators) {
    if (re.test(text)) matches++
  }
  return matches >= 2
}

function looksLikeFilePaths(text: string): boolean {
  const lines = text.split('\n').filter(Boolean)
  if (lines.length < 3) return false
  const pathLike = lines.filter(l => l.startsWith('/') || l.startsWith('./') || l.includes('/src/') || l.includes('\\'))
  return pathLike.length / lines.length > 0.7
}

function getFileIcon(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return '📘'
  if (path.endsWith('.js') || path.endsWith('.jsx')) return '📙'
  if (path.endsWith('.py')) return '🐍'
  if (path.endsWith('.rs')) return '🦀'
  if (path.endsWith('.css') || path.endsWith('.scss')) return '🎨'
  if (path.endsWith('.json')) return '📋'
  if (path.endsWith('.md')) return '📝'
  if (path.endsWith('/')) return '📁'
  return '📄'
}

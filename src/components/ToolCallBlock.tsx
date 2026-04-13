import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ChevronDown, ChevronRight, Terminal, FileEdit, FileText, FolderSearch, Search } from 'lucide-react'
import DiffView from './DiffView'
import { useToolCollapse } from './TurnView'

interface Props {
  name: string
  input: unknown
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

export default function ToolCallBlock({ name, input }: Props) {
  const lower = name.toLowerCase()
  const inp = input as Record<string, unknown> | undefined

  if (lower === 'bash') return <BashCall command={(inp?.command as string) || ''} description={(inp?.description as string) || ''} />
  if (lower === 'edit') return <EditCall filePath={(inp?.file_path as string) || ''} oldString={(inp?.old_string as string) || ''} newString={(inp?.new_string as string) || ''} replaceAll={!!inp?.replace_all} />
  if (lower === 'write' || lower === 'create') return <WriteCall filePath={(inp?.file_path as string) || ''} content={(inp?.content as string) || ''} />
  if (lower === 'read') return <ReadCall filePath={(inp?.file_path as string) || ''} />
  if (lower === 'grep') return <GrepCall pattern={(inp?.pattern as string) || ''} path={(inp?.path as string) || ''} include={(inp?.include as string) || ''} />
  if (lower === 'glob') return <GlobCall pattern={(inp?.pattern as string) || ''} path={(inp?.path as string) || ''} />
  if (lower === 'websearch') return <WebSearchCall query={(inp?.query as string) || ''} />
  if (lower === 'webfetch') return <WebFetchCall url={(inp?.url as string) || ''} />

  return <GenericCall name={name} input={input} />
}

// --- Hook for collapse-aware open state ---
function useCollapsibleOpen() {
  const { collapsed } = useToolCollapse()
  const [open, setOpen] = useState(false)
  const [override, setOverride] = useState(false)

  // Reset override when global collapse is turned off
  useEffect(() => {
    if (!collapsed) setOverride(false)
  }, [collapsed])

  const isOpen = override || (!collapsed && open)
  const toggle = () => {
    if (collapsed) {
      setOverride(!override)
    } else {
      setOpen(!open)
    }
  }
  return { isOpen, toggle }
}

// --- Tool-specific components ---

function BashCall({ command, description }: { command: string; description: string }) {
  const { isOpen, toggle } = useCollapsibleOpen()

  return (
    <div className="border border-border rounded-lg bg-muted/30 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <Terminal className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-medium">Bash</span>
        {description && <span className="text-xs text-muted-foreground ml-1 truncate">{description}</span>}
        <code className="text-xs font-mono text-muted-foreground ml-auto truncate max-w-[120px] sm:max-w-xs">{command}</code>
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          <div className="bg-background rounded p-3 font-mono text-xs border border-border">
            <span className="text-green-400 select-none">$ </span>
            <span className="text-foreground">{command}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function EditCall({ filePath, oldString, newString, replaceAll }: { filePath: string; oldString: string; newString: string; replaceAll: boolean }) {
  const { collapsed } = useToolCollapse()

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
        <FileEdit className="h-4 w-4 text-blue-400" />
        <span className="font-medium text-foreground">Edit</span>
        {replaceAll && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">replace all</span>}
        <span className="font-mono truncate ml-1">{filePath}</span>
      </div>
      {!collapsed && <DiffView oldString={oldString} newString={newString} />}
    </div>
  )
}

function WriteCall({ filePath, content }: { filePath: string; content: string }) {
  const { isOpen, toggle } = useCollapsibleOpen()
  const lang = guessLang(filePath)

  return (
    <div className="border border-border rounded-lg bg-muted/30 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <FileText className="h-4 w-4 text-green-400" />
        <span className="text-sm font-medium">Write</span>
        <span className="text-xs font-mono text-muted-foreground truncate">{filePath}</span>
        <span className="text-xs text-muted-foreground ml-auto">{content.split('\n').length} lines</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-3 max-h-96 overflow-y-auto">
          <SyntaxHighlighter style={syntaxTheme} language={lang} PreTag="div">
            {content}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}

function ReadCall({ filePath }: { filePath: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm bg-muted/20 rounded-lg border border-border">
      <FileText className="h-4 w-4 text-blue-400" />
      <span className="font-medium">Read</span>
      <span className="font-mono text-muted-foreground truncate">{filePath}</span>
    </div>
  )
}

function GrepCall({ pattern, path, include }: { pattern: string; path: string; include: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm bg-muted/20 rounded-lg border border-border">
      <Search className="h-4 w-4 text-orange-400" />
      <span className="font-medium">Grep</span>
      <code className="text-xs bg-background px-1.5 py-0.5 rounded border border-border">{pattern}</code>
      {include && <span className="text-xs text-muted-foreground">in {include}</span>}
      {path && <span className="text-xs font-mono text-muted-foreground truncate ml-auto">{path}</span>}
    </div>
  )
}

function GlobCall({ pattern, path }: { pattern: string; path: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm bg-muted/20 rounded-lg border border-border">
      <FolderSearch className="h-4 w-4 text-purple-400" />
      <span className="font-medium">Glob</span>
      <code className="text-xs bg-background px-1.5 py-0.5 rounded border border-border">{pattern}</code>
      {path && <span className="text-xs font-mono text-muted-foreground truncate ml-auto">{path}</span>}
    </div>
  )
}

function WebSearchCall({ query }: { query: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm bg-muted/20 rounded-lg border border-border">
      <span className="text-base">🌐</span>
      <span className="font-medium">WebSearch</span>
      <span className="text-muted-foreground truncate">{query}</span>
    </div>
  )
}

function WebFetchCall({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm bg-muted/20 rounded-lg border border-border">
      <span className="text-base">🌐</span>
      <span className="font-medium">WebFetch</span>
      <span className="text-xs font-mono text-muted-foreground truncate">{url}</span>
    </div>
  )
}

function GenericCall({ name, input }: { name: string; input: unknown }) {
  const { isOpen, toggle } = useCollapsibleOpen()

  return (
    <div className="border border-border rounded-lg bg-muted/30 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="text-base">{getToolIcon(name)}</span>
        <span className="text-sm font-medium">{name}</span>
        {(input as Record<string, unknown>)?.file_path !== undefined && (
          <span className="text-sm text-muted-foreground ml-2 font-mono truncate max-w-[120px] sm:max-w-xs">
            {String((input as Record<string, unknown>).file_path)}
          </span>
        )}
      </button>
      {isOpen && input !== undefined && (
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

function guessLang(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    css: 'css', html: 'html', json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', sql: 'sql', sh: 'bash', bash: 'bash',
    toml: 'toml', xml: 'xml', graphql: 'graphql',
  }
  return map[ext] || 'text'
}

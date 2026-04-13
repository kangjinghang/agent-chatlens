import { useState, createContext, useContext } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Bot, User, AlertCircle, Copy, Check, Clock } from 'lucide-react'
import type { Turn, ContentBlock, DisplayMessage } from '../parser'
import ThinkingBlock from './ThinkingBlock'
import ToolCallBlock from './ToolCallBlock'
import ToolResultBlock from './ToolResultBlock'
import { HighlightedText } from '../utils/highlight'

const syntaxTheme = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.5rem',
    padding: '1rem',
    margin: '0.5rem 0',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    fontSize: '0.875rem',
    fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
  },
} as Record<string, React.CSSProperties>

// --- Collapse All Context ---
const ToolCollapseContext = createContext<{
  collapsed: boolean
  toggle: () => void
}>({ collapsed: false, toggle: () => {} })

export function useToolCollapse() {
  return useContext(ToolCollapseContext)
}

export function ToolCollapseProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const toggle = () => setCollapsed(prev => !prev)
  return (
    <ToolCollapseContext.Provider value={{ collapsed, toggle }}>
      {children}
    </ToolCollapseContext.Provider>
  )
}

// --- Highlight Context ---
const HighlightContext = createContext<string>('')

export function useHighlightText() {
  return useContext(HighlightContext)
}

// --- Time helpers ---
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${m}m${s}s`
}

// --- TurnView ---
export default function TurnView({ turn, highlightText }: { turn: Turn; highlightText?: string }) {
  return (
    <HighlightContext.Provider value={highlightText || ''}>
      <div className="space-y-3">
        {turn.user && <UserBubble message={turn.user} />}
        {turn.steps.length > 0 && <AssistantBubble steps={turn.steps} />}
      </div>
    </HighlightContext.Provider>
  )
}

// --- User Bubble ---
function UserBubble({ message }: { message: DisplayMessage }) {
  const highlightQuery = useHighlightText()
  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { text: string }).text)
    .join('\n')

  if (!text) return null

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] sm:max-w-[65%] bg-primary/10 border border-primary/20 rounded-2xl rounded-br-sm px-3 py-2 sm:px-5 sm:py-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-medium text-blue-400">User</span>
          {message.timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          )}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {highlightQuery ? <HighlightedText text={text} query={highlightQuery} /> : text}
        </div>
      </div>
    </div>
  )
}

// --- Assistant Bubble ---
function AssistantBubble({ steps }: { steps: DisplayMessage[] }) {
  const firstStep = steps[0]
  const model = steps.find(s => s.model)?.model
  const stopReason = steps.find(s => s.stopReason)?.stopReason
  const lastUsage = [...steps].reverse().find(s => s.usage)?.usage

  // Calculate total assistant time
  const lastStepTs = [...steps].reverse().find(s => s.timestamp)?.timestamp
  const totalDuration = firstStep?.timestamp && lastStepTs ? lastStepTs - firstStep.timestamp : null

  return (
    <div className="w-full">
      <div className="border border-border rounded-2xl rounded-bl-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-muted/50 border-b border-border">
          <Bot className="h-4 w-4 text-green-400" />
          <span className="text-xs font-medium text-green-400">Assistant</span>
          {model && <span className="text-xs text-muted-foreground font-mono">{model}</span>}
          {firstStep?.timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatTime(firstStep.timestamp)}
            </span>
          )}
          {totalDuration !== null && totalDuration > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(totalDuration)}
            </span>
          )}
          {stopReason && stopReason !== 'end_turn' && (
            <div className="flex items-center gap-1 text-xs text-orange-400 ml-auto">
              <AlertCircle className="h-3 w-3" />
              <span>{stopReason}</span>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="px-3 py-3 sm:px-5 sm:py-4 space-y-3">
          {steps.map((step, i) => {
            const prevTs = i > 0 ? steps[i - 1].timestamp : null
            return <StepView key={step.id + i} step={step} prevTimestamp={prevTs} />
          })}
        </div>

        {/* Usage */}
        {lastUsage && (
          <div className="px-3 py-2 sm:px-5 sm:py-2.5 text-xs text-muted-foreground border-t border-border bg-muted/30">
            Tokens: {lastUsage.input} in, {lastUsage.output} out
            {lastUsage.cacheRead !== undefined && lastUsage.cacheRead > 0 && (
              <span className="ml-2">Cache: {lastUsage.cacheRead} read</span>
            )}
            {lastUsage.cacheWrite !== undefined && lastUsage.cacheWrite > 0 && (
              <span className="ml-2">Cache: {lastUsage.cacheWrite} write</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Step View ---
function StepView({ step, prevTimestamp }: { step: DisplayMessage; prevTimestamp: number | null }) {
  const hasToolUse = step.content.some(b => b.type === 'toolUse')
  const isToolResult = step.role === 'toolResult'

  // Calculate duration: time between this step and the previous step
  const elapsed = prevTimestamp && step.timestamp ? step.timestamp - prevTimestamp : null
  const showDuration = isToolResult && elapsed !== null && elapsed > 0

  return (
    <div>
      {/* Timestamp badge for tool-related steps */}
      {(hasToolUse || isToolResult) && step.timestamp && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-muted-foreground font-mono">
            {formatTime(step.timestamp)}
          </span>
          {showDuration && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(elapsed!)}
            </span>
          )}
        </div>
      )}

      {isToolResult ? (
        <div>
          {step.content.map((block, i) => (
            <ContentBlockRenderer key={i} block={block} />
          ))}
        </div>
      ) : (
        <>
          {step.content.filter(b => b.type === 'thinking').map((block, i) => (
            <ContentBlockRenderer key={`think-${i}`} block={block} />
          ))}
          {step.content.filter(b => b.type === 'toolUse').map((block, i) => (
            <ContentBlockRenderer key={`tool-${i}`} block={block} />
          ))}
          {step.content.filter(b => b.type === 'text').map((block, i) => (
            <ContentBlockRenderer key={`text-${i}`} block={block} />
          ))}
        </>
      )}
    </div>
  )
}

// --- Content Block Renderer ---
function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  const highlightQuery = useHighlightText()

  switch (block.type) {
    case 'text':
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {highlightQuery ? (
            <HighlightedText text={block.text} query={highlightQuery} />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const { ref, ...restProps } = props as { ref?: any; [key: string]: any }
                  const match = /language-(\w+)/.exec(className || '')
                  const codeStr = String(children).replace(/\n$/, '')

                  if (!match) {
                    return <code className={className} {...restProps}>{children}</code>
                  }

                  return (
                    <div className="relative group">
                      <CopyButton text={codeStr} />
                      <SyntaxHighlighter style={syntaxTheme as any} language={match[1]} PreTag="div" {...restProps}>
                        {codeStr}
                      </SyntaxHighlighter>
                    </div>
                  )
                },
              }}
            >
              {block.text}
            </ReactMarkdown>
          )}
        </div>
      )

    case 'thinking':
      return <ThinkingBlock text={block.text} signature={block.signature} />

    case 'toolUse':
      return <ToolCallBlock name={block.name} input={block.input} />

    case 'toolResult':
      return <ToolResultBlock content={block.content} isError={block.isError} toolName={block.toolName} />
  }
}

// --- Copy Button ---
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted border border-border opacity-0 group-hover:opacity-100 transition-opacity z-10"
      title="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  )
}

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Bot, User, Terminal, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import type { DisplayMessage, ContentBlock } from '../parser'
import ThinkingBlock from './ThinkingBlock'
import ToolCallBlock from './ToolCallBlock'
import ToolResultBlock from './ToolResultBlock'

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

interface Props {
  message: DisplayMessage
}

export default function MessageItem({ message }: Props) {
  const [showMeta, setShowMeta] = useState(false)

  const { icon, label, colorClass } = getRoleInfo(message.role)

  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('zh-CN')
    : null

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setShowMeta(!showMeta)}
      >
        <span className={colorClass}>{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{label}</span>
            {message.model && <span className="text-xs text-muted-foreground font-mono">{message.model}</span>}
          </div>
          {showMeta && (
            <div className="text-xs text-muted-foreground mt-1 font-mono">{message.id}</div>
          )}
        </div>
        {message.stopReason && message.stopReason !== 'end_turn' && (
          <div className="flex items-center gap-1 text-xs text-orange-400">
            <AlertCircle className="h-3 w-3" />
            <span>{message.stopReason}</span>
          </div>
        )}
        {timestamp && <span className="text-xs text-muted-foreground">{timestamp}</span>}
        {showMeta ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {message.content.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">No content</p>
        ) : (
          message.content.map((block, i) => (
            <ContentBlockRenderer key={i} block={block} />
          ))
        )}

        {/* Usage */}
        {message.usage && (
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Tokens: {message.usage.input} in, {message.usage.output} out
            {message.usage.cacheRead !== undefined && message.usage.cacheRead > 0 && (
              <span className="ml-2">Cache: {message.usage.cacheRead} read</span>
            )}
            {message.usage.cacheWrite !== undefined && message.usage.cacheWrite > 0 && (
              <span className="ml-2">Cache: {message.usage.cacheWrite} write</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const { ref, ...restProps } = props as { ref?: any; [key: string]: any }
                const match = /language-(\w+)/.exec(className || '')
                return match ? (
                  <SyntaxHighlighter style={syntaxTheme as any} language={match[1]} PreTag="div" {...restProps}>
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...restProps}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {block.text}
          </ReactMarkdown>
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

function getRoleInfo(role: string) {
  switch (role) {
    case 'user':
      return { icon: <User className="h-5 w-5" />, label: 'User', colorClass: 'text-blue-400' }
    case 'assistant':
      return { icon: <Bot className="h-5 w-5" />, label: 'Assistant', colorClass: 'text-green-400' }
    case 'toolResult':
      return { icon: <Terminal className="h-5 w-5" />, label: 'Tool Result', colorClass: 'text-yellow-400' }
    default:
      return { icon: <Terminal className="h-5 w-5" />, label: role, colorClass: 'text-muted-foreground' }
  }
}

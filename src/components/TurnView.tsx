import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Bot, User, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import type { Turn, ContentBlock, DisplayMessage } from '../parser'
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

export default function TurnView({ turn }: { turn: Turn }) {
  return (
    <div className="space-y-3">
      {/* User message — right aligned */}
      {turn.user && <UserBubble message={turn.user} />}

      {/* Assistant steps — left aligned */}
      {turn.steps.length > 0 && <AssistantBubble steps={turn.steps} />}
    </div>
  )
}

function UserBubble({ message }: { message: DisplayMessage }) {
  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { text: string }).text)
    .join('\n')

  if (!text) return null

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-primary/10 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-medium text-blue-400">User</span>
          {message.timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString('zh-CN')}
            </span>
          )}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {text}
        </div>
      </div>
    </div>
  )
}

function AssistantBubble({ steps }: { steps: DisplayMessage[] }) {
  // Collect info from all steps
  const firstStep = steps[0]
  const model = steps.find(s => s.model)?.model
  const stopReason = steps.find(s => s.stopReason)?.stopReason
  const lastUsage = [...steps].reverse().find(s => s.usage)?.usage

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-4 w-4 text-green-400" />
          <span className="text-xs font-medium text-green-400">Assistant</span>
          {model && <span className="text-xs text-muted-foreground font-mono">{model}</span>}
          {firstStep?.timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(firstStep.timestamp).toLocaleTimeString('zh-CN')}
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
        <div className="space-y-2">
          {steps.map((step, i) => (
            <StepView key={step.id + i} step={step} />
          ))}
        </div>

        {/* Usage */}
        {lastUsage && (
          <div className="text-xs text-muted-foreground pt-2 mt-2 border-t border-border">
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

function StepView({ step }: { step: DisplayMessage }) {
  if (step.role === 'toolResult') {
    return (
      <div>
        {step.content.map((block, i) => (
          <ContentBlockRenderer key={i} block={block} />
        ))}
      </div>
    )
  }

  // Assistant step — separate thinking/tool-use from text
  const thinkingBlocks = step.content.filter(b => b.type === 'thinking')
  const toolBlocks = step.content.filter(b => b.type === 'toolUse')
  const textBlocks = step.content.filter(b => b.type === 'text')

  return (
    <div>
      {thinkingBlocks.map((block, i) => (
        <ContentBlockRenderer key={`think-${i}`} block={block} />
      ))}
      {toolBlocks.map((block, i) => (
        <ContentBlockRenderer key={`tool-${i}`} block={block} />
      ))}
      {textBlocks.map((block, i) => (
        <ContentBlockRenderer key={`text-${i}`} block={block} />
      ))}
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

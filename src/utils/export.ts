import type { Turn, ParsedSession, ContentBlock, TextBlock, ThinkingBlock, ToolUseBlock, ToolResultBlock } from '../parser/types'

function getTextFromBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'text':
      return block.text
    case 'thinking':
      return block.text
    case 'toolUse':
      return `${block.name}: ${JSON.stringify(block.input, null, 2)}`
    case 'toolResult':
      return block.content
    default:
      return ''
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return 'N/A'
  return new Date(ts).toLocaleString()
}

// --- Markdown Export ---

function blockToMarkdown(block: ContentBlock): string {
  switch (block.type) {
    case 'text':
      return block.text
    case 'thinking':
      return `<details>\n<summary>💭 Thinking</summary>\n\n${block.text}\n\n</details>`
    case 'toolUse': {
      const input = JSON.stringify(block.input, null, 2)
      return `#### 🔧 ${block.name}\n\`\`\`json\n${input}\n\`\`\``
    }
    case 'toolResult': {
      const prefix = block.isError ? '❌ **Error**' : '📤 **Result**'
      const content = block.content.length > 2000
        ? block.content.substring(0, 2000) + '\n... (truncated)'
        : block.content
      return `${prefix}\n\`\`\`\n${content}\n\`\`\``
    }
  }
}

function turnToMarkdown(turn: Turn, index: number): string {
  const parts: string[] = []
  parts.push(`## Turn ${index + 1}`)

  if (turn.user) {
    const userText = turn.user.content
      .filter((b): b is TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n')
    if (userText) {
      parts.push(`> **User**: ${userText.replace(/\n/g, '\n> ')}`)
    }
  }

  for (const step of turn.steps) {
    if (step.role === 'assistant') {
      const modelTag = step.model ? ` _(${step.model})_` : ''
      const tsTag = step.timestamp ? ` — ${formatTimestamp(step.timestamp)}` : ''
      parts.push(`\n**Assistant**${modelTag}${tsTag}\n`)
      for (const block of step.content) {
        parts.push(blockToMarkdown(block))
      }
    } else if (step.role === 'toolResult') {
      for (const block of step.content) {
        parts.push(blockToMarkdown(block))
      }
    }
  }

  return parts.join('\n\n')
}

export function exportToMarkdown(turns: Turn[], session: ParsedSession): string {
  const parts: string[] = []
  parts.push(`# ${session.title}`)
  parts.push(``)
  parts.push(`- **Format**: ${session.format}`)
  parts.push(`- **Created**: ${formatTimestamp(session.createdAt)}`)
  parts.push(`- **Messages**: ${session.messages.length}`)
  parts.push(`- **Turns**: ${turns.length}`)
  parts.push(`---`)
  parts.push('')

  turns.forEach((turn, i) => {
    parts.push(turnToMarkdown(turn, i))
    parts.push('')
  })

  return parts.join('\n')
}

// --- HTML Export ---

function blockToHtml(block: ContentBlock): string {
  switch (block.type) {
    case 'text':
      return `<div class="text-block">${escapeHtml(block.text)}</div>`
    case 'thinking':
      return `<details class="thinking-block"><summary>💭 Thinking</summary><pre>${escapeHtml(block.text)}</pre></details>`
    case 'toolUse': {
      const input = JSON.stringify(block.input, null, 2)
      return `<div class="tool-use"><span class="tool-name">🔧 ${escapeHtml(block.name)}</span><pre><code>${escapeHtml(input)}</code></pre></div>`
    }
    case 'toolResult': {
      const cls = block.isError ? 'tool-result error' : 'tool-result'
      const content = block.content.length > 2000
        ? escapeHtml(block.content.substring(0, 2000)) + '\n... (truncated)'
        : escapeHtml(block.content)
      return `<div class="${cls}"><span class="result-label">${block.isError ? '❌ Error' : '📤 Result'}</span><pre><code>${content}</code></pre></div>`
    }
  }
}

function turnToHtml(turn: Turn, index: number): string {
  const parts: string[] = []
  parts.push(`<div class="turn">`)
  parts.push(`<h2 class="turn-header">Turn ${index + 1}</h2>`)

  if (turn.user) {
    const userText = turn.user.content
      .filter((b): b is TextBlock => b.type === 'text')
      .map(b => escapeHtml(b.text))
      .join('<br>')
    if (userText) {
      parts.push(`<div class="user-message"><strong>User:</strong> ${userText}</div>`)
    }
  }

  for (const step of turn.steps) {
    if (step.role === 'assistant') {
      const modelTag = step.model ? ` <span class="model">(${escapeHtml(step.model)})</span>` : ''
      parts.push(`<div class="assistant-message"><strong>Assistant</strong>${modelTag}>`)
      for (const block of step.content) {
        parts.push(blockToHtml(block))
      }
      parts.push(`</div>`)
    } else if (step.role === 'toolResult') {
      for (const block of step.content) {
        parts.push(blockToHtml(block))
      }
    }
  }

  parts.push(`</div>`)
  return parts.join('\n')
}

export function exportToHtml(turns: Turn[], session: ParsedSession): string {
  const turnsHtml = turns.map((turn, i) => turnToHtml(turn, i)).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(session.title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #e5e5e5; line-height: 1.6; }
  h1 { font-size: 1.5rem; margin-bottom: 8px; color: #fff; }
  .meta { color: #888; font-size: 0.85rem; margin-bottom: 24px; }
  .turn { margin-bottom: 32px; border-left: 3px solid #333; padding-left: 16px; }
  .turn-header { font-size: 1rem; color: #aaa; margin-bottom: 12px; }
  .user-message { background: #1a2a1a; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
  .assistant-message { margin-bottom: 12px; }
  .model { color: #888; font-size: 0.85rem; }
  .text-block { white-space: pre-wrap; }
  .thinking-block { margin: 8px 0; border: 1px solid #333; border-radius: 6px; padding: 8px; }
  .thinking-block summary { cursor: pointer; color: #aaa; font-size: 0.9rem; }
  .thinking-block pre { margin-top: 8px; font-size: 0.85rem; color: #999; white-space: pre-wrap; }
  .tool-use { margin: 8px 0; background: #1a1a2a; border-radius: 6px; padding: 8px 12px; }
  .tool-name { color: #7aa2f7; font-weight: 600; }
  .tool-result { margin: 4px 0 8px; background: #1a1a1a; border-radius: 6px; padding: 8px 12px; }
  .tool-result.error { border: 1px solid #5a1a1a; }
  .result-label { color: #888; font-size: 0.85rem; }
  pre { background: #111; border-radius: 6px; padding: 12px; overflow-x: auto; font-size: 0.85rem; margin: 8px 0; }
  code { font-family: 'SF Mono', 'Fira Code', monospace; }
  hr { border: none; border-top: 1px solid #333; margin: 24px 0; }
</style>
</head>
<body>
<h1>${escapeHtml(session.title)}</h1>
<div class="meta">Format: ${session.format} · Created: ${formatTimestamp(session.createdAt)} · ${session.messages.length} messages · ${turns.length} turns</div>
<hr>
${turnsHtml}
</body>
</html>`
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

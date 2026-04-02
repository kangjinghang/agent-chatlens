import type { RawEntry, RawMessage, DisplayMessage, ContentBlock } from './types'

/**
 * Parse OpenClaw session JSONL content.
 *
 * OpenClaw format:
 *   - All entries have type="message" at top level
 *   - role is inside message.role: "user" | "assistant" | "toolResult"
 *   - content blocks use type "toolCall" (not "tool_use") with "arguments" (not "input")
 *   - tool results are separate messages with role="toolResult"
 */
export function parseOpenClawEntries(rawEntries: RawEntry[]): DisplayMessage[] {
  const messages: DisplayMessage[] = []

  for (const entry of rawEntries) {
    if (entry.type !== 'message' || !entry.message) continue

    const msg = entry.message as RawMessage
    const role = normalizeRole(msg.role)
    if (!role) continue

    const id = entry.id || String(messages.length)
    const timestamp = parseTimestamp(entry.timestamp || msg.timestamp)
    const content = parseContentBlocks(msg.content, role, msg)
    const usage = parseUsage(msg.usage)
    const stopReason = msg.stopReason
    const model = msg.model

    messages.push({ id, role, timestamp, content, usage, stopReason, model })
  }

  return messages
}

function normalizeRole(role?: string): 'user' | 'assistant' | 'toolResult' | null {
  if (role === 'user') return 'user'
  if (role === 'assistant') return 'assistant'
  if (role === 'toolResult') return 'toolResult'
  return null
}

function parseTimestamp(ts: unknown): number | null {
  if (ts == null) return null
  if (typeof ts === 'number') return ts
  if (typeof ts === 'string') return new Date(ts).getTime() || null
  return null
}

function parseContentBlocks(
  raw: unknown,
  role: string,
  msg: RawMessage,
): ContentBlock[] {
  // Tool result message: entire message is a tool result
  if (role === 'toolResult') {
    const textContent = extractTextContent(msg.content)
    return [
      {
        type: 'toolResult',
        toolUseId: msg.toolCallId || '',
        content: textContent,
        isError: msg.isError === true,
        toolName: msg.toolName,
      },
    ]
  }

  if (!Array.isArray(raw)) {
    const text = typeof raw === 'string' ? raw : ''
    return text ? [{ type: 'text', text }] : []
  }

  return (raw as any[]).map((block: any): ContentBlock => {
    if (block.type === 'text' && block.text != null) {
      return { type: 'text', text: String(block.text) }
    }
    if (block.type === 'thinking' && block.thinking != null) {
      return { type: 'thinking', text: String(block.thinking), signature: block.signature }
    }
    if ((block.type === 'toolCall' || block.type === 'tool_use') && block.name) {
      return {
        type: 'toolUse',
        id: block.id || '',
        name: block.name,
        input: block.input || block.arguments,
      }
    }
    // Fallback: stringify unknown blocks as text
    return { type: 'text', text: JSON.stringify(block, null, 2) }
  })
}

function extractTextContent(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return raw
      .map((b: any) => {
        if (typeof b === 'string') return b
        if (b?.type === 'text' && b.text != null) return String(b.text)
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return JSON.stringify(raw)
}

function parseUsage(
  usage?: RawMessage['usage'],
): { input: number; output: number; cacheRead?: number; cacheWrite?: number } | undefined {
  if (!usage) return undefined
  return {
    input: usage.input_tokens || usage.input || 0,
    output: usage.output_tokens || usage.output || 0,
    cacheRead: usage.cacheRead,
    cacheWrite: usage.cacheWrite,
  }
}

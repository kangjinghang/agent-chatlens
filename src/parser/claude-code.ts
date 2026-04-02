import type { RawEntry, RawMessage, DisplayMessage, ContentBlock } from './types'

/**
 * Parse Claude Code session JSONL content.
 *
 * Claude Code format:
 *   - type at top level: "user" | "assistant" | "file-history-snapshot" | "summary"
 *   - Assistant messages are streamed: multiple entries with type="assistant" for same message
 *   - Tool results come as type="user" with message.content containing tool_result blocks
 *   - Tool calls use type="tool_use" with "input" field
 *   - ID field is "uuid" (not "id")
 *   - Parent field is "parentUuid" (not "parentId")
 */
export function parseClaudeCodeEntries(rawEntries: RawEntry[]): DisplayMessage[] {
  const messages: DisplayMessage[] = []

  // Group assistant stream chunks by message.id
  const assistantGroups = new Map<string, RawEntry[]>()
  const orderedEntries: { type: 'single' | 'group'; key: string; entry?: RawEntry }[] = []

  for (const entry of rawEntries) {
    if (entry.type === 'file-history-snapshot' || entry.type === 'summary') continue

    if (entry.type === 'assistant' && entry.message?.id) {
      const msgId = entry.message.id
      if (!assistantGroups.has(msgId)) {
        assistantGroups.set(msgId, [])
        orderedEntries.push({ type: 'group', key: msgId })
      }
      assistantGroups.get(msgId)!.push(entry)
    } else if (entry.type === 'user' || entry.type === 'assistant') {
      orderedEntries.push({ type: 'single', key: entry.uuid || String(messages.length), entry })
    }
  }

  for (const item of orderedEntries) {
    if (item.type === 'group') {
      const group = assistantGroups.get(item.key)!
      const merged = mergeAssistantChunks(group)
      if (merged) messages.push(merged)
    } else if (item.entry) {
      const msg = parseSingleEntry(item.entry)
      if (msg) messages.push(msg)
    }
  }

  return messages
}

function mergeAssistantChunks(entries: RawEntry[]): DisplayMessage | null {
  if (entries.length === 0) return null

  const first = entries[0]
  const msg = first.message as RawMessage
  const id = msg?.id || first.uuid || 'unknown'
  const timestamp = parseTs(first.timestamp)

  // Collect all content blocks from all chunks, dedup by type+index
  const seen = new Set<string>()
  const content: ContentBlock[] = []
  let usage: { input: number; output: number; cacheRead?: number; cacheWrite?: number } | undefined
  let stopReason: string | undefined
  let model: string | undefined

  for (const entry of entries) {
    const m = entry.message as RawMessage
    if (!m?.content) continue

    const blocks = Array.isArray(m.content) ? m.content : []
    for (const block of blocks) {
      const key = `${block.type}:${block.id || block.name || ''}`
      if (seen.has(key)) continue
      seen.add(key)

      content.push(mapBlock(block))
    }

    // Take usage from the last chunk that has it
    if (m.usage) {
      usage = {
        input: m.usage.input_tokens || m.usage.input || 0,
        output: m.usage.output_tokens || m.usage.output || 0,
        cacheRead: m.usage.cacheRead,
        cacheWrite: m.usage.cacheWrite,
      }
    }

    // Capture stopReason and model from the last chunk
    if (m.stopReason) stopReason = m.stopReason
    if (m.model) model = m.model
  }

  return { id, role: 'assistant', timestamp, content, usage, stopReason, model }
}

function parseSingleEntry(entry: RawEntry): DisplayMessage | null {
  if (entry.type === 'user' && entry.message) {
    const msg = entry.message as RawMessage

    // Check if this is a tool result wrapper
    if (Array.isArray(msg.content)) {
      const hasToolResult = msg.content.some((b: any) => b.type === 'tool_result')
      if (hasToolResult) {
        // Extract tool result blocks
        const blocks: ContentBlock[] = msg.content
          .filter((b: any) => b.type === 'tool_result')
          .map((b: any) => ({
            type: 'toolResult' as const,
            toolUseId: b.tool_use_id || '',
            content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content, null, 2),
            isError: b.is_error === true,
          }))

        if (blocks.length > 0) {
          return {
            id: entry.uuid || '',
            role: 'toolResult',
            timestamp: parseTs(entry.timestamp),
            content: blocks,
          }
        }
      }

      // Regular user message with array content
      const text = msg.content
        .map((b: any) => {
          if (typeof b === 'string') return b
          if (b?.type === 'text' && b.text) return b.text
          return ''
        })
        .filter(Boolean)
        .join('\n')

      if (text) {
        return {
          id: entry.uuid || '',
          role: 'user',
          timestamp: parseTs(entry.timestamp),
          content: [{ type: 'text', text }],
        }
      }
    }

    // User message with string content
    if (typeof msg.content === 'string') {
      return {
        id: entry.uuid || '',
        role: 'user',
        timestamp: parseTs(entry.timestamp),
        content: [{ type: 'text', text: msg.content }],
      }
    }
  }

  // Standalone assistant chunk (no message.id grouping)
  if (entry.type === 'assistant' && entry.message) {
    const msg = entry.message as RawMessage
    const raw = msg.content
    const content: ContentBlock[] = Array.isArray(raw)
      ? raw.map(mapBlock)
      : typeof raw === 'string'
        ? [{ type: 'text' as const, text: raw }]
        : []

    return {
      id: entry.uuid || '',
      role: 'assistant',
      timestamp: parseTs(entry.timestamp),
      content,
    }
  }

  return null
}

function mapBlock(block: any): ContentBlock {
  if (block.type === 'text' && block.text != null) {
    return { type: 'text', text: String(block.text) }
  }
  if (block.type === 'thinking' && block.thinking != null) {
    return { type: 'thinking', text: String(block.thinking), signature: block.signature }
  }
  if (block.type === 'tool_use' && block.name) {
    return { type: 'toolUse', id: block.id || '', name: block.name, input: block.input }
  }
  return { type: 'text', text: JSON.stringify(block, null, 2) }
}

function parseTs(ts: unknown): number | null {
  if (ts == null) return null
  if (typeof ts === 'number') return ts
  if (typeof ts === 'string') return new Date(ts).getTime() || null
  return null
}

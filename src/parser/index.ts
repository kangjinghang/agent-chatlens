import type { RawEntry, ParsedSession, DisplayMessage, Turn } from './types'
import { parseOpenClawEntries } from './openclaw'
import { parseClaudeCodeEntries } from './claude-code'

export type { DisplayMessage, ContentBlock, ParsedSession, Role, Turn } from './types'
export { parseOpenClawEntries } from './openclaw'
export { parseClaudeCodeEntries } from './claude-code'

type SessionFormat = 'openclaw' | 'claude-code' | 'unknown'

/**
 * Auto-detect the JSONL format from the first few entries.
 */
export function detectFormat(entries: RawEntry[]): SessionFormat {
  // Check the type field of first few non-empty entries
  for (const entry of entries.slice(0, 10)) {
    const t = entry.type
    // OpenClaw indicators
    if (t === 'session' || t === 'model_change' || t === 'thinking_level_change') return 'openclaw'
    if (t === 'message' && entry.message?.role === 'toolResult') return 'openclaw'
    if (t === 'message' && entry.message?.role === 'assistant') {
      // Check if content has toolCall (OpenClaw-specific)
      const content = entry.message.content
      if (Array.isArray(content) && content.some((b: any) => b.type === 'toolCall')) return 'openclaw'
      // Could be either, keep checking
    }

    // Claude Code indicators
    if (t === 'file-history-snapshot') return 'claude-code'
    if (t === 'user' || t === 'assistant') {
      // Claude Code uses uuid, OpenClaw uses id
      if (entry.uuid && !entry.id) return 'claude-code'
    }
  }

  // Fallback: check if any entry has message with role="toolResult" (OpenClaw)
  for (const entry of entries) {
    if (entry.type === 'message' && (entry.message as any)?.role === 'toolResult') return 'openclaw'
  }

  // Fallback heuristic
  const types = new Set(entries.map(e => e.type))
  if (types.has('user') && types.has('assistant') && !types.has('message')) return 'claude-code'
  if (types.has('message')) return 'openclaw'

  return 'unknown'
}

/**
 * Parse JSONL content string into a ParsedSession.
 * Auto-detects format and uses the appropriate parser.
 */
export function parseSession(jsonlContent: string, filename: string): ParsedSession {
  const lines = jsonlContent.trim().split('\n')
  const rawEntries: RawEntry[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      rawEntries.push(JSON.parse(line))
    } catch {
      // Skip malformed lines
    }
  }

  if (rawEntries.length === 0) {
    return {
      id: filename,
      title: filename,
      format: 'unknown',
      createdAt: null,
      messages: [],
    }
  }

  const format = detectFormat(rawEntries)
  let messages: DisplayMessage[]

  switch (format) {
    case 'openclaw':
      messages = parseOpenClawEntries(rawEntries)
      break
    case 'claude-code':
      messages = parseClaudeCodeEntries(rawEntries)
      break
    default:
      // Try both and pick the one that produces more messages
      const oc = parseOpenClawEntries(rawEntries)
      const cc = parseClaudeCodeEntries(rawEntries)
      messages = oc.length >= cc.length ? oc : cc
      break
  }

  const sessionName = filename.replace(/\.jsonl$/i, '')
  const firstTs = messages[0]?.timestamp || null

  return {
    id: sessionName,
    title: sessionName,
    format,
    createdAt: firstTs,
    messages,
  }
}

/**
 * Group flat DisplayMessage[] into Turn[] for chat-style rendering.
 * Each turn starts with a user message, followed by assistant + toolResult steps.
 */
export function groupIntoTurns(messages: DisplayMessage[]): Turn[] {
  const turns: Turn[] = []
  let current: Turn | null = null

  for (const msg of messages) {
    if (msg.role === 'user') {
      if (current) turns.push(current)
      current = { id: msg.id, user: msg, steps: [] }
    } else if (current) {
      current.steps.push(msg)
    } else {
      // assistant/toolResult before any user message
      current = { id: msg.id, user: null, steps: [msg] }
    }
  }
  if (current) turns.push(current)
  return turns
}

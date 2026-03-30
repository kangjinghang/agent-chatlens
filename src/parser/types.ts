// --- Unified display types ---

export type Role = 'user' | 'assistant' | 'toolResult'

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ThinkingBlock {
  type: 'thinking'
  text: string
}

export interface ToolUseBlock {
  type: 'toolUse'
  id: string
  name: string
  input: unknown
}

export interface ToolResultBlock {
  type: 'toolResult'
  toolUseId: string
  content: string
  isError: boolean
  toolName?: string
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock

export interface DisplayMessage {
  id: string
  role: Role
  timestamp: number | null
  content: ContentBlock[]
  usage?: { input: number; output: number }
}

export interface ParsedSession {
  id: string
  title: string
  format: 'openclaw' | 'claude-code' | 'unknown'
  createdAt: number | null
  messages: DisplayMessage[]
}

// --- Raw entry types (for parsing) ---

export interface RawEntry {
  type: string
  id?: string
  uuid?: string
  timestamp?: string | number
  parentId?: string
  parentUuid?: string
  message?: RawMessage
  content?: unknown
  role?: string
  [key: string]: unknown
}

export interface RawMessage {
  role?: string
  content?: unknown
  timestamp?: string | number
  usage?: { input_tokens?: number; output_tokens?: number; input?: number; output?: number; cacheRead?: number; cacheWrite?: number }
  stopReason?: string
  model?: string
  id?: string
  toolCallId?: string
  toolName?: string
  isError?: boolean
  [key: string]: unknown
}

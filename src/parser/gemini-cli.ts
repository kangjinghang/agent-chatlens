import type { RawEntry, DisplayMessage, ContentBlock } from './types'

/**
 * Parse Gemini CLI session JSON into DisplayMessage[].
 *
 * Gemini CLI stores sessions as single JSON files with structure:
 * {
 *   sessionId: string,
 *   title?: string,
 *   messages: Array<{
 *     role: "user" | "model",
 *     parts: Array<{
 *       text?: string,
 *       functionCall?: { name: string, args: object },
 *       functionResponse?: { name: string, response: object }
 *     }>,
 *     timestamp?: string
 *   }>
 * }
 */
export function parseGeminiCliEntries(data: unknown): DisplayMessage[] {
  if (!data || typeof data !== 'object') return []

  const session = data as Record<string, unknown>
  const messages = session.messages
  if (!Array.isArray(messages)) return []

  const result: DisplayMessage[] = []
  let toolCallCounter = 0

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') continue

    const raw = msg as Record<string, unknown>
    const role = raw.role as string
    const parts = raw.parts as Array<Record<string, unknown>> | undefined
    const timestamp = parseTimestamp(raw.timestamp)

    if (!parts || !Array.isArray(parts)) continue

    if (role === 'user') {
      // User message — may contain text and/or functionResponse
      const textParts: ContentBlock[] = []

      for (const part of parts) {
        if (typeof part.text === 'string') {
          textParts.push({ type: 'text', text: part.text })
        }
        if (part.functionResponse && typeof part.functionResponse === 'object') {
          const fr = part.functionResponse as Record<string, unknown>
          const toolName = String(fr.name || 'unknown')
          const content = JSON.stringify(fr.response ?? fr, null, 2)
          textParts.push({
            type: 'toolResult',
            toolUseId: `gemini-tool-${toolCallCounter++}`,
            content,
            isError: false,
            toolName,
          })
        }
      }

      if (textParts.length > 0) {
        result.push({
          id: `gemini-user-${result.length}`,
          role: 'user',
          timestamp,
          content: textParts,
        })
      }
    } else if (role === 'model') {
      // Assistant message — may contain text and/or functionCall
      const contentParts: ContentBlock[] = []

      for (const part of parts) {
        if (typeof part.text === 'string') {
          contentParts.push({ type: 'text', text: part.text })
        }
        if (part.functionCall && typeof part.functionCall === 'object') {
          const fc = part.functionCall as Record<string, unknown>
          contentParts.push({
            type: 'toolUse',
            id: `gemini-tool-${toolCallCounter++}`,
            name: String(fc.name || 'unknown'),
            input: fc.args ?? {},
          })
        }
      }

      if (contentParts.length > 0) {
        result.push({
          id: `gemini-model-${result.length}`,
          role: 'assistant',
          timestamp,
          content: contentParts,
          model: 'gemini',
        })
      }
    }
  }

  return result
}

function parseTimestamp(ts: unknown): number | null {
  if (ts === undefined || ts === null) return null
  if (typeof ts === 'number') return ts
  if (typeof ts === 'string') {
    const d = new Date(ts)
    return isNaN(d.getTime()) ? null : d.getTime()
  }
  return null
}

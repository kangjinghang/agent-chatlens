import { describe, it, expect } from 'vitest'
import { parseSession, detectFormat, parseOpenClawEntries, parseClaudeCodeEntries } from '../index'
import type { RawEntry } from '../types'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// --- Helpers ---

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8')
}

function parseJsonl(content: string): RawEntry[] {
  return content.trim().split('\n').filter(l => l.trim()).map(l => JSON.parse(l))
}

// --- Real session file helpers ---

function findRealFiles(globPattern: string): string[] {
  const home = os.homedir()
  if (globPattern.includes('openclaw')) {
    const dir = path.join(home, '.openclaw', 'agents')
    if (!fs.existsSync(dir)) return []
    const agents = fs.readdirSync(dir)
    const files: string[] = []
    for (const agent of agents) {
      const sessionDir = path.join(dir, agent, 'sessions')
      if (!fs.existsSync(sessionDir)) continue
      for (const f of fs.readdirSync(sessionDir)) {
        if (f.endsWith('.jsonl')) files.push(path.join(sessionDir, f))
      }
    }
    return files
  }
  if (globPattern.includes('claude')) {
    const dir = path.join(home, '.claude', 'projects')
    if (!fs.existsSync(dir)) return []
    const files: string[] = []
    for (const project of fs.readdirSync(dir)) {
      const projectDir = path.join(dir, project)
      if (!fs.statSync(projectDir).isDirectory()) continue
      for (const f of fs.readdirSync(projectDir)) {
        if (f.endsWith('.jsonl')) files.push(path.join(projectDir, f))
      }
    }
    return files
  }
  return []
}

// ============================================================
// detectFormat
// ============================================================

describe('detectFormat', () => {
  it('detects OpenClaw from session type', () => {
    const entries: RawEntry[] = [
      { type: 'session', version: 3, id: 's1' },
      { type: 'message', id: 'm1', message: { role: 'user', content: [] } },
    ]
    expect(detectFormat(entries)).toBe('openclaw')
  })

  it('detects OpenClaw from model_change type', () => {
    const entries: RawEntry[] = [
      { type: 'model_change', id: 'mc1' },
      { type: 'message', id: 'm1', message: { role: 'user', content: [] } },
    ]
    expect(detectFormat(entries)).toBe('openclaw')
  })

  it('detects OpenClaw from toolResult role', () => {
    const entries: RawEntry[] = [
      { type: 'message', id: 'm1', message: { role: 'toolResult', content: [] } },
    ]
    expect(detectFormat(entries)).toBe('openclaw')
  })

  it('detects OpenClaw from toolCall content block', () => {
    const entries: RawEntry[] = [
      { type: 'message', id: 'm1', message: { role: 'assistant', content: [{ type: 'toolCall', name: 'test', arguments: {} }] } },
    ]
    expect(detectFormat(entries)).toBe('openclaw')
  })

  it('detects Claude Code from file-history-snapshot type', () => {
    const entries: RawEntry[] = [
      { type: 'file-history-snapshot', messageId: 's1' } as RawEntry,
    ]
    expect(detectFormat(entries)).toBe('claude-code')
  })

  it('detects Claude Code from uuid without id', () => {
    const entries: RawEntry[] = [
      { type: 'user', uuid: 'u1', message: { role: 'user', content: [] } },
    ]
    expect(detectFormat(entries)).toBe('claude-code')
  })

  it('detects Claude Code from user/assistant types without message type', () => {
    const entries: RawEntry[] = [
      { type: 'user', uuid: 'u1', id: 'u1', message: { role: 'user', content: [] } },
      { type: 'assistant', uuid: 'a1', id: 'a1', message: { role: 'assistant', content: [] } },
    ]
    expect(detectFormat(entries)).toBe('claude-code')
  })

  it('returns unknown for empty entries', () => {
    expect(detectFormat([])).toBe('unknown')
  })
})

// ============================================================
// parseOpenClawEntries (synthetic fixtures)
// ============================================================

describe('parseOpenClawEntries', () => {
  it('parses a full OpenClaw session from fixture', () => {
    const content = loadFixture('openclaw-session.jsonl')
    const entries = parseJsonl(content)
    const messages = parseOpenClawEntries(entries)

    // Should have: user msg, assistant+toolCall, toolResult, assistant, user, assistant+toolCall, toolResult, assistant, ...
    expect(messages.length).toBeGreaterThan(0)

    // First message should be user
    expect(messages[0].role).toBe('user')
    expect(messages[0].content[0].type).toBe('text')

    // Find assistant message with toolCall
    const toolCallMsg = messages.find(m =>
      m.content.some(b => b.type === 'toolUse')
    )
    expect(toolCallMsg).toBeDefined()
    expect(toolCallMsg!.role).toBe('assistant')
    const toolUse = toolCallMsg!.content.find(b => b.type === 'toolUse')!
    expect(toolUse).toEqual(expect.objectContaining({
      type: 'toolUse',
      name: 'read_file',
    }))

    // Find tool result
    const toolResultMsg = messages.find(m => m.role === 'toolResult')
    expect(toolResultMsg).toBeDefined()
    const toolResult = toolResultMsg!.content[0]
    expect(toolResult).toEqual(expect.objectContaining({
      type: 'toolResult',
      isError: false,
    }))

    // Check thinking block
    const thinkingMsg = messages.find(m =>
      m.content.some(b => b.type === 'thinking')
    )
    expect(thinkingMsg).toBeDefined()
    expect(thinkingMsg!.content.find(b => b.type === 'thinking')!.text).toBeTruthy()
  })

  it('handles tool result with error', () => {
    const content = loadFixture('openclaw-error-toolresult.jsonl')
    const entries = parseJsonl(content)
    const messages = parseOpenClawEntries(entries)

    const toolResult = messages.find(m => m.role === 'toolResult')
    expect(toolResult).toBeDefined()
    expect(toolResult!.content[0]).toEqual(expect.objectContaining({
      type: 'toolResult',
      isError: true,
    }))
  })

  it('skips non-message entries', () => {
    const entries: RawEntry[] = [
      { type: 'session', id: 's1' },
      { type: 'model_change', id: 'mc1' },
      { type: 'thinking_level_change', id: 'tlc1' },
    ]
    const messages = parseOpenClawEntries(entries)
    expect(messages).toHaveLength(0)
  })

  it('extracts usage from messages', () => {
    const content = loadFixture('openclaw-session.jsonl')
    const entries = parseJsonl(content)
    const messages = parseOpenClawEntries(entries)
    const withUsage = messages.find(m => m.usage !== undefined)
    expect(withUsage).toBeDefined()
    expect(withUsage!.usage).toEqual({ input: expect.any(Number), output: expect.any(Number) })
  })
})

// ============================================================
// parseClaudeCodeEntries (synthetic fixtures)
// ============================================================

describe('parseClaudeCodeEntries', () => {
  it('parses a full Claude Code session from fixture', () => {
    const content = loadFixture('claude-code-session.jsonl')
    const entries = parseJsonl(content)
    const messages = parseClaudeCodeEntries(entries)

    expect(messages.length).toBeGreaterThan(0)

    // First should be user
    expect(messages[0].role).toBe('user')

    // Should have assistant messages (merged chunks)
    const assistantMsgs = messages.filter(m => m.role === 'assistant')
    expect(assistantMsgs.length).toBeGreaterThan(0)

    // Check merged assistant message has text + tool_use
    const firstAssistant = assistantMsgs[0]
    expect(firstAssistant.content.some(b => b.type === 'text')).toBe(true)
    expect(firstAssistant.content.some(b => b.type === 'toolUse')).toBe(true)

    // Check tool result
    const toolResults = messages.filter(m => m.role === 'toolResult')
    expect(toolResults.length).toBeGreaterThan(0)
    expect(toolResults[0].content[0].type).toBe('toolResult')
  })

  it('merges assistant stream chunks by message.id', () => {
    const content = loadFixture('claude-code-session.jsonl')
    const entries = parseJsonl(content)
    const messages = parseClaudeCodeEntries(entries)

    // The fixture has msg_aa001 with text chunk + tool_use chunk → should be 1 message
    const msgAa001 = messages.find(m => m.id === 'msg_aa001')
    expect(msgAa001).toBeDefined()
    expect(msgAa001!.content).toHaveLength(2)
    expect(msgAa001!.content[0].type).toBe('text')
    expect(msgAa001!.content[1].type).toBe('toolUse')
  })

  it('merges thinking + text chunks for same message.id', () => {
    const content = loadFixture('claude-code-session.jsonl')
    const entries = parseJsonl(content)
    const messages = parseClaudeCodeEntries(entries)

    const msgAa002 = messages.find(m => m.id === 'msg_aa002')
    expect(msgAa002).toBeDefined()
    // thinking + text merged
    expect(msgAa002!.content).toHaveLength(2)
    expect(msgAa002!.content[0].type).toBe('thinking')
    expect(msgAa002!.content[1].type).toBe('text')
  })

  it('handles tool result with error', () => {
    const content = loadFixture('claude-code-error-toolresult.jsonl')
    const entries = parseJsonl(content)
    const messages = parseClaudeCodeEntries(entries)

    const toolResult = messages.find(m => m.role === 'toolResult')
    expect(toolResult).toBeDefined()
    expect(toolResult!.content[0]).toEqual(expect.objectContaining({
      type: 'toolResult',
      isError: true,
    }))
  })

  it('skips file-history-snapshot and summary entries', () => {
    const content = loadFixture('claude-code-session.jsonl')
    const entries = parseJsonl(content)
    const messages = parseClaudeCodeEntries(entries)
    // No messages should have content from snapshot/summary
    for (const m of messages) {
      for (const b of m.content) {
        if (b.type === 'text') {
          expect(b.text).not.toContain('file-history-snapshot')
        }
      }
    }
  })
})

// ============================================================
// parseSession (integration)
// ============================================================

describe('parseSession', () => {
  it('auto-detects and parses OpenClaw fixture', () => {
    const content = loadFixture('openclaw-session.jsonl')
    const result = parseSession(content, 'test-session.jsonl')

    expect(result.format).toBe('openclaw')
    expect(result.title).toBe('test-session')
    expect(result.messages.length).toBeGreaterThan(0)
  })

  it('auto-detects and parses Claude Code fixture', () => {
    const content = loadFixture('claude-code-session.jsonl')
    const result = parseSession(content, 'test-cc.jsonl')

    expect(result.format).toBe('claude-code')
    expect(result.title).toBe('test-cc')
    expect(result.messages.length).toBeGreaterThan(0)
  })

  it('handles empty file', () => {
    const content = loadFixture('empty.jsonl')
    const result = parseSession(content, 'empty.jsonl')

    expect(result.format).toBe('unknown')
    expect(result.messages).toHaveLength(0)
  })

  it('handles malformed JSONL gracefully', () => {
    const content = loadFixture('malformed.jsonl')
    const result = parseSession(content, 'malformed.jsonl')

    // Should still parse the valid lines
    expect(result.messages.length).toBeGreaterThan(0)
  })

  it('sets createdAt from first message timestamp', () => {
    const content = loadFixture('openclaw-session.jsonl')
    const result = parseSession(content, 'test.jsonl')

    if (result.messages.length > 0 && result.messages[0].timestamp) {
      expect(result.createdAt).toBe(result.messages[0].timestamp)
    }
  })

  it('strips .jsonl extension from title', () => {
    const result = parseSession('{"type":"user","uuid":"u1","message":{"role":"user","content":[{"type":"text","text":"hi"}]}}', 'my-session.jsonl')
    expect(result.title).toBe('my-session')
  })
})

// ============================================================
// Real session file tests
// ============================================================

describe('real OpenClaw session files', () => {
  const files = findRealFiles('openclaw')

  it.skipIf(files.length === 0)(`parses all ${files.length} OpenClaw files without errors`, () => {
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const result = parseSession(content, path.basename(filePath))

      expect(result.format, `${path.basename(filePath)}: should detect openclaw format`).toBe('openclaw')
      expect(result.messages.length, `${path.basename(filePath)}: should have messages`).toBeGreaterThan(0)

      // All messages should have valid roles
      for (const msg of result.messages) {
        expect(['user', 'assistant', 'toolResult']).toContain(msg.role)
        expect(msg.content.length, `${path.basename(filePath)} msg ${msg.id}: should have content`).toBeGreaterThan(0)
      }
    }
  })
})

describe('real Claude Code session files', () => {
  const files = findRealFiles('claude')

  it.skipIf(files.length === 0)(`parses all ${files.length} Claude Code files without errors`, () => {
    let parsed = 0
    let totalMessages = 0

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')

      // Skip empty files or files with only metadata (summary/snapshot)
      if (!content.trim()) continue

      const entries = parseJsonl(content)
      const hasRealEntries = entries.some(
        e => e.type === 'user' || e.type === 'assistant' || e.type === 'file-history-snapshot'
      )
      if (!hasRealEntries) continue

      const result = parseSession(content, path.basename(filePath))

      expect(result.format, `${path.basename(filePath)}: should detect claude-code format`).toBe('claude-code')

      if (result.messages.length > 0) {
        parsed++
        totalMessages += result.messages.length

        for (const msg of result.messages) {
          expect(['user', 'assistant', 'toolResult']).toContain(msg.role)
          expect(msg.id).toBeTruthy()
        }
      }
    }

    console.log(`Parsed ${parsed}/${files.length} Claude Code files with messages (total: ${totalMessages} messages)`)
  })

  it.skipIf(files.length === 0)('correctly merges streamed assistant chunks in real files', () => {
    // Find a file with multiple assistant chunks sharing same message.id
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const entries = parseJsonl(content)

      // Find entries with same message.id
      const msgIds = new Map<string, number>()
      for (const e of entries) {
        if (e.type === 'assistant' && e.message?.id) {
          msgIds.set(e.message.id, (msgIds.get(e.message.id) || 0) + 1)
        }
      }

      // Find a message.id that appears more than once (streamed)
      const streamedId = [...msgIds.entries()].find(([, count]) => count > 1)
      if (!streamedId) continue

      const messages = parseClaudeCodeEntries(entries)
      const merged = messages.find(m => m.id === streamedId[0])

      // The merged message should exist and have combined content
      expect(merged).toBeDefined()
      expect(merged!.content.length).toBeGreaterThan(0)
    }
  })
})

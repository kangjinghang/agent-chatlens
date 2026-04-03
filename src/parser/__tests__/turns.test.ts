import { describe, it, expect } from 'vitest'
import { groupIntoTurns } from '../index'
import type { DisplayMessage } from '../types'

function makeMsg(id: string, role: 'user' | 'assistant' | 'toolResult', timestamp?: number): DisplayMessage {
  return {
    id,
    role,
    timestamp: timestamp ?? null,
    content: [{ type: 'text', text: `${role} ${id}` }],
  }
}

// ============================================================
// groupIntoTurns
// ============================================================

describe('groupIntoTurns', () => {
  it('returns empty array for empty input', () => {
    expect(groupIntoTurns([])).toEqual([])
  })

  it('groups a simple user + assistant into one turn', () => {
    const msgs = [
      makeMsg('u1', 'user'),
      makeMsg('a1', 'assistant'),
    ]
    const turns = groupIntoTurns(msgs)

    expect(turns).toHaveLength(1)
    expect(turns[0].id).toBe('u1')
    expect(turns[0].user).toEqual(msgs[0])
    expect(turns[0].steps).toEqual([msgs[1]])
  })

  it('groups multiple turns correctly', () => {
    const msgs = [
      makeMsg('u1', 'user'),
      makeMsg('a1', 'assistant'),
      makeMsg('u2', 'user'),
      makeMsg('a2', 'assistant'),
    ]
    const turns = groupIntoTurns(msgs)

    expect(turns).toHaveLength(2)
    expect(turns[0].id).toBe('u1')
    expect(turns[0].user!.id).toBe('u1')
    expect(turns[0].steps).toHaveLength(1)
    expect(turns[1].id).toBe('u2')
    expect(turns[1].user!.id).toBe('u2')
    expect(turns[1].steps).toHaveLength(1)
  })

  it('collects tool results as steps in the same turn', () => {
    const msgs = [
      makeMsg('u1', 'user'),
      makeMsg('a1', 'assistant'),
      makeMsg('tr1', 'toolResult'),
      makeMsg('a2', 'assistant'),
      makeMsg('tr2', 'toolResult'),
    ]
    const turns = groupIntoTurns(msgs)

    expect(turns).toHaveLength(1)
    expect(turns[0].steps).toHaveLength(4)
    expect(turns[0].steps.map(s => s.id)).toEqual(['a1', 'tr1', 'a2', 'tr2'])
  })

  it('handles assistant messages before any user message', () => {
    const msgs = [
      makeMsg('a1', 'assistant'),
      makeMsg('tr1', 'toolResult'),
    ]
    const turns = groupIntoTurns(msgs)

    expect(turns).toHaveLength(1)
    expect(turns[0].user).toBeNull()
    expect(turns[0].steps).toHaveLength(2)
    expect(turns[0].id).toBe('a1')
  })

  it('creates separate turns for each user message', () => {
    const msgs = [
      makeMsg('u1', 'user'),
      makeMsg('a1', 'assistant'),
      makeMsg('tr1', 'toolResult'),
      makeMsg('u2', 'user'),
      makeMsg('a2', 'assistant'),
      makeMsg('u3', 'user'),
    ]
    const turns = groupIntoTurns(msgs)

    expect(turns).toHaveLength(3)
    // Turn 1: u1 + [a1, tr1]
    expect(turns[0].user!.id).toBe('u1')
    expect(turns[0].steps).toHaveLength(2)
    // Turn 2: u2 + [a2]
    expect(turns[1].user!.id).toBe('u2')
    expect(turns[1].steps).toHaveLength(1)
    // Turn 3: u3 + []
    expect(turns[2].user!.id).toBe('u3')
    expect(turns[2].steps).toHaveLength(0)
  })

  it('preserves timestamps on messages', () => {
    const msgs = [
      makeMsg('u1', 'user', 1000),
      makeMsg('a1', 'assistant', 2000),
      makeMsg('tr1', 'toolResult', 3000),
    ]
    const turns = groupIntoTurns(msgs)

    expect(turns[0].user!.timestamp).toBe(1000)
    expect(turns[0].steps[0].timestamp).toBe(2000)
    expect(turns[0].steps[1].timestamp).toBe(3000)
  })
})

// ============================================================
// Integration: groupIntoTurns with parsed sessions
// ============================================================

describe('groupIntoTurns integration', () => {
  it('groups parsed OpenClaw session into turns', async () => {
    const { parseSession } = await import('../index')
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')

    const content = readFileSync(join(__dirname, 'fixtures', 'openclaw-session.jsonl'), 'utf-8')
    const session = parseSession(content, 'test.jsonl')
    const turns = groupIntoTurns(session.messages)

    expect(turns.length).toBeGreaterThan(0)
    // First turn should start with a user message
    expect(turns[0].user).not.toBeNull()
    expect(turns[0].user!.role).toBe('user')
    // Steps should only contain assistant and toolResult
    for (const step of turns[0].steps) {
      expect(['assistant', 'toolResult']).toContain(step.role)
    }
  })

  it('groups parsed Claude Code session into turns', async () => {
    const { parseSession } = await import('../index')
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')

    const content = readFileSync(join(__dirname, 'fixtures', 'claude-code-session.jsonl'), 'utf-8')
    const session = parseSession(content, 'test.jsonl')
    const turns = groupIntoTurns(session.messages)

    expect(turns.length).toBeGreaterThan(0)
    // All steps should be assistant or toolResult
    for (const turn of turns) {
      for (const step of turn.steps) {
        expect(['assistant', 'toolResult']).toContain(step.role)
      }
    }
  })

  it('tool use and result are in the same turn', async () => {
    const { parseSession } = await import('../index')
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')

    const content = readFileSync(join(__dirname, 'fixtures', 'openclaw-session.jsonl'), 'utf-8')
    const session = parseSession(content, 'test.jsonl')
    const turns = groupIntoTurns(session.messages)

    // Find a turn that has both toolUse and toolResult
    const turnWithTool = turns.find(t =>
      t.steps.some(s => s.content.some(b => b.type === 'toolUse')) &&
      t.steps.some(s => s.content.some(b => b.type === 'toolResult'))
    )
    if (turnWithTool) {
      const toolUseStep = turnWithTool.steps.find(s => s.content.some(b => b.type === 'toolUse'))!
      const toolResultStep = turnWithTool.steps.find(s => s.content.some(b => b.type === 'toolResult'))!
      // Tool result should have matching toolUseId
      const toolUse = toolUseStep.content.find(b => b.type === 'toolUse')!
      const toolResult = toolResultStep.content.find(b => b.type === 'toolResult')! as any
      expect(toolResult.toolUseId).toBe(toolUse.id)
    }
  })
})

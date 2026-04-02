# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent ChatLens is a pure-frontend React app for viewing AI agent session files (JSONL format). It supports OpenClaw and Claude Code session formats with auto-detection.

## Commands

- **Dev server:** `bun dev` (runs on port 3000, auto-opens browser)
- **Build:** `bun run build` (runs `tsc && vite build`, outputs to `dist/`)
- **Preview production build:** `bun run preview`
- **Type checking:** `npx tsc --noEmit`
- **Run tests:** `bun test` (Vitest, runs all `src/**/*.test.ts`)
- **Watch tests:** `bun run test:watch`

No linter or formatter is configured.

### Testing

Tests use **Vitest** and focus on the parser layer (`src/parser/__tests__/`). Synthetic fixtures cover format detection, chunk merging, tool calls/results, and edge cases. Real session files from `~/.openclaw/` and `~/.claude/` are also tested when present.

## Architecture

```
JSONL file → parseSession() → ParsedSession → SessionList → MessageItem → ContentBlock renderers
```

### Parser layer (`src/parser/`)

The core of the app. Two format-specific parsers produce a unified `DisplayMessage[]`:

- **`types.ts`** — Shared types: `DisplayMessage`, `ContentBlock` (text/thinking/toolUse/toolResult), `ParsedSession`, `RawEntry`
- **`index.ts`** — `parseSession()` entry point: splits JSONL into lines, auto-detects format via `detectFormat()`, delegates to the correct parser
- **`openclaw.ts`** — Parses OpenClaw format: all entries have `type="message"`, role inside `message.role`, tool calls use `type="toolCall"` with `arguments`
- **`claude-code.ts`** — Parses Claude Code format: entry types are `"user"/"assistant"`, assistant messages are streamed (multiple chunks sharing same `message.id` that get merged via `mergeAssistantChunks()`), IDs use `uuid`/`parentUuid`

### Component layer (`src/components/`)

- **`DropZone.tsx`** — File drag-and-drop / file picker interface
- **`SessionList.tsx`** — Renders the list of `DisplayMessage[]`
- **`MessageItem.tsx`** — Individual message with role-based styling
- **`ThinkingBlock.tsx`** — Collapsible thinking/reasoning blocks
- **`ToolCallBlock.tsx`** — Tool call display (name + JSON input)
- **`ToolResultBlock.tsx`** — Tool result display
- **`ThemeToggle.tsx`** — Dark/light mode toggle using CSS class strategy

### Styling

Tailwind CSS with CSS-variable-based theming (shadcn/ui pattern). Dark mode uses `darkMode: 'class'` in tailwind config. Theme colors are defined as HSL CSS variables in `src/index.css`.

### State management

Pure React `useState`/`useCallback` in `App.tsx`. No external state library. Single session loaded at a time.

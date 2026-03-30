# Agent ChatLens

A lightweight, open-source web app for viewing AI agent session files (JSONL format). Supports both **OpenClaw** and **Claude Code** session formats.

## Features

- Drag & drop JSONL files for instant viewing
- Auto-detects OpenClaw and Claude Code formats
- Markdown rendering with syntax highlighting
- Collapsible thinking blocks, tool calls, and tool results
- Dark / light theme toggle
- Pure frontend — no backend required

## Quick Start

```bash
git clone https://github.com/kangjinghang/agent-chatlens.git
cd agent-chatlens
bun install
bun run dev
```

Then open http://localhost:3000 and drop a `.jsonl` file.

## Supported Formats

### OpenClaw Sessions

Files from `~/.openclaw/agents/*/sessions/*.jsonl`

```jsonl
{"type":"session","version":3,"id":"abc-123",...}
{"type":"message","id":"m1","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}
{"type":"message","id":"m2","message":{"role":"assistant","content":[{"type":"thinking","thinking":"..."},{"type":"text","text":"Hi!"},{"type":"toolCall","id":"c1","name":"read","arguments":{...}}]}}
{"type":"message","id":"m3","message":{"role":"toolResult","toolCallId":"c1","toolName":"read","content":[...]}}
```

### Claude Code Sessions

Files from `~/.claude/projects/*/*.jsonl`

```jsonl
{"type":"user","uuid":"u1","message":{"role":"user","content":"Hello"}}
{"type":"assistant","uuid":"a1","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}}
{"type":"assistant","uuid":"a2","message":{"role":"assistant","content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"ls"}}]}}
{"type":"user","uuid":"u2","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":"file.txt"}]}}
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- react-markdown + remark-gfm
- react-syntax-highlighter
- lucide-react

## Build

```bash
bun run build
bun run preview
```

## License

MIT

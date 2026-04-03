# Agent ChatLens

> A powerful, open-source web viewer for AI agent session files — inspect, analyze, and debug your agent conversations with ease.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)

**Agent ChatLens** is a lightweight, pure-frontend web application for viewing and analyzing AI agent session files in JSONL format. It supports both **OpenClaw** and **Claude Code** session formats with intelligent parsing and beautiful rendering.

## ✨ Features

### Core Capabilities
- 📁 **Drag & drop** JSONL files for instant viewing
- 🔍 **Auto-detects** OpenClaw and Claude Code formats
- 🎨 **Markdown rendering** with syntax highlighting
- 🌙 **Dark / light theme** toggle
- 💻 **Pure frontend** — no backend required

### Chat-Style Interface
- 💬 **Turn-based layout** — Messages grouped into user/assistant turns like a chat app
- 🧠 **Thinking blocks** — Collapsible reasoning/thinking display with signature info
- 📋 **Code copy** — One-click copy buttons on code blocks
- ⏱️ **Timestamps & durations** — Tool execution time badges, total turn duration

### Tool Visualization
- 🛠️ **Tool-specific rendering** — Smart display for Bash, Edit, Write, Read, Grep, Glob, and more
- 📊 **Inline diff view** — Visualize code changes in Edit tool calls (red/gold deletion, green addition)
- 📈 **Timeline view** — Gantt chart showing tool call execution timeline with duration bars
- 🔽 **Collapse/expand tools** — Toggle all tool calls collapsed, with per-item override

### Performance
- ⚡ **Virtual scrolling** — Handles large sessions (4000+ messages) without lag
- 📊 **Session statistics** — Turns, tool calls, total tokens, session duration at a glance

## 🚀 Quick Start

```bash
git clone https://github.com/kangjinghang/agent-chatlens.git
cd agent-chatlens
bun install
bun run dev
```

Then open http://localhost:3000 and drop a `.jsonl` file.

## 📁 Supported Formats

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

## 🛠️ Tech Stack

- **React 18** + TypeScript
- **Vite** for fast builds
- **Tailwind CSS** for styling
- **@tanstack/react-virtual** for virtual scrolling
- **react-markdown** + **remark-gfm** for Markdown
- **react-syntax-highlighter** for code highlighting
- **lucide-react** for icons

## 📦 Build

```bash
bun run build
bun run preview
```

## 🧪 Testing

```bash
bun test            # Run tests once
bun run test:watch  # Watch mode
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [kangjinghang](https://github.com/kangjinghang)

## 🔗 Keywords

AI agent, session viewer, JSONL viewer, OpenClaw, Claude Code, agent debugging, conversation analysis, tool call visualization, virtual scrolling, React, TypeScript

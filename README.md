<h1 align="center">Agent ChatLens</h1>

<p align="center">
  <strong>A beautiful web viewer for AI agent session files</strong><br>
  Inspect, analyze, and debug your Claude Code &amp; OpenClaw conversation sessions with ease.<br>
  Drop a <code>.jsonl</code> session file and explore — zero setup required.
</p>

<p align="center">
  <a href="https://kangjinghang.github.io/agent-chatlens/"><strong>Try it live — no install needed</strong></a>
  ·
  <a href="#-quick-start">Run locally</a>
  ·
  <a href="README_zh-CN.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT">
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61DAFB" alt="React 18">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome">
</p>

<p align="center">
  <img src="docs/drop-zone.png" width="49%" alt="Drop Zone">
  <img src="docs/chat-view.png" width="49%" alt="Chat View">
</p>

<p align="center">
  <img src="docs/timeline-view.png" width="70%" alt="Timeline View">
</p>

---

## Why Agent ChatLens?

Working with AI coding agents like **Claude Code** produces rich conversation logs, but reviewing them in the terminal is painful. Agent ChatLens gives you a **beautiful chat-style interface** to browse, search, and analyze your sessions — with zero setup.

**Just drag & drop a `.jsonl` file and start exploring.**

## ✨ Features

### Chat-Style Interface
- 💬 **Turn-based layout** — Messages grouped into user/assistant turns, just like a chat app
- 🧠 **Thinking blocks** — Collapsible reasoning/thinking display with signature info
- 📋 **Code copy** — One-click copy buttons on code blocks
- ⏱️ **Timestamps & durations** — Tool execution time badges, total turn duration

### Tool Visualization
- 🛠️ **Tool-specific rendering** — Smart display for Bash, Edit, Write, Read, Grep, Glob, and more
- 📊 **Inline diff view** — Visualize code changes in Edit tool calls
- 📈 **Timeline view** — Gantt chart showing tool call execution timeline with duration bars
- 🔽 **Collapse/expand tools** — Toggle all tool calls collapsed, with per-item override

### Performance
- ⚡ **Virtual scrolling** — Handles large sessions (4000+ messages) without lag
- 📊 **Session statistics** — Turns, tool calls, total tokens, session duration at a glance
- 🌙 **Dark / light theme** toggle

### Zero Config
- 📁 **Drag & drop** JSONL files for instant viewing
- 🔍 **Auto-detects** OpenClaw and Claude Code formats
- 💻 **Pure frontend** — No backend, no install, no signup. Just open and use.

## 🚀 Quick Start

### Online (fastest)

Go to [kangjinghang.github.io/agent-chatlens](https://kangjinghang.github.io/agent-chatlens/) and drop a `.jsonl` file. That's it.

### Local development

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

| Technology | Purpose |
|---|---|
| **React 18** + TypeScript | UI framework |
| **Vite** | Fast builds & dev server |
| **Tailwind CSS** | Styling |
| **@tanstack/react-virtual** | Virtual scrolling for large sessions |
| **react-markdown** + remark-gfm | Markdown rendering |
| **react-syntax-highlighter** | Code highlighting |
| **lucide-react** | Icons |

## 📦 Build

```bash
bun run build        # Production build
bun run preview      # Preview production build
```

## 🧪 Testing

```bash
bun test            # Run tests once
bun run test:watch  # Watch mode
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [kangjinghang](https://github.com/kangjinghang)

## 🔗 Keywords

AI agent, session viewer, JSONL viewer, OpenClaw, Claude Code, agent debugging, conversation analysis, tool call visualization, virtual scrolling, React, TypeScript

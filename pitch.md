# cmux

**A desktop app for managing multiple AI coding agents across repositories.**

## The Problem

Developers working with GitHub Copilot CLI often juggle multiple repositories simultaneously. Each needs its own terminal session, its own context, its own agent. Switching between them means losing focus. There's no unified way to orchestrate AI agents across a multi-repo workflow.

## The Solution

cmux is an Electron app that lets you:

- **Run multiple Copilot agents** — each scoped to a different repo, all visible in one window
- **Create agents from chat** — say "Create an agent for ~/src/my-project" and it spins up an SDK-powered agent
- **See what agents are doing** — live activity feeds show tool calls, file reads, edits, and results
- **Browse and view files** — Monaco editor integration with full syntax highlighting
- **Keep conversations** — chat history persists across restarts

The interface is a three-pane layout: agents/conversations on the left, active view in the center, file tree on the right.

## How It Works

Built on `@github/copilot-sdk`. Each agent session gets a `workingDirectory` that scopes its access. The orchestrator exposes tools (`vp_create_agent`, etc.) that let the chat interface spawn and manage agents. Full PTY support means TUI apps like vim work correctly.

## Current State

- **Version**: 0.13.3
- **Tests**: Unit tests via Jest, E2E via Playwright  
- **Packaging**: Electron Forge with auto-updates via GitHub releases
- **Auth**: Requires `gh auth login` (uses existing Copilot entitlement)

## What We Need

**From developers**: Test it. Break it. File issues. The multi-agent orchestration and activity feed UI are new — real-world usage will surface edge cases.

**From leadership**: Eyes on whether this is a direction worth pursuing. The thesis is that managing multiple scoped agents in a visual interface improves developer productivity over CLI-only workflows.

## Try It

```bash
git clone https://github.com/ipdelete/cmux.git
cd cmux
npm install
npm start
```

Requires Node 18+, npm 9+, and `gh` CLI authenticated.

## Contact

Ian Philpot — ianphil@microsoft.com

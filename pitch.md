# cmux

**A desktop app for managing AI coding agents and workspaces across repositories.**

## The Problem

Developers working with GitHub Copilot CLI often juggle multiple repositories simultaneously. Each needs its own terminal session, its own context, its own workspace. Switching between them means losing focus. There's no unified way to orchestrate AI agents across a multi-repo workflow.

## The Solution

cmux is an Electron app that lets you:

- **Open multiple workspaces** — each scoped to a different repo, all visible in one window
- **Create agents from chat** — say "Create an agent for ~/src/my-project" and it spins up an agent
- **See what agents are doing** — live activity feeds show tool calls, file reads, edits, and results
- **Browse and view files** — Monaco editor integration with full syntax highlighting
- **Keep conversations** — chat history persists across restarts

The interface is a three-pane layout: workspaces/conversations on the left, active view in the center, file tree on the right.

## How It Works

Built on `@github/copilot-sdk`. Each agent session gets a `workingDirectory` that scopes its access. The orchestrator exposes tools (`vp_create_agent`, etc.) that let the chat interface spawn and manage agents. Full PTY support in workspaces means TUI apps like GitHub Copilot CLI work correctly.

## Current State

- **Version**: 0.13.3
- **Tests**: Unit tests via Jest, E2E via Playwright  
- **Packaging**: Electron Forge with auto-updates via GitHub releases
- **Auth**: Uses Copilot CLI `/login` (existing GitHub Copilot entitlement)

## What We Need

**From developers**: Test it. Break it. File issues. The multi-agent orchestration and activity feed UI are new — real-world usage will surface edge cases.

**From leadership**: Eyes on whether this is a direction worth pursuing. The thesis is that managing multiple scoped agents in a visual interface improves developer productivity over CLI-only workflows.

## Try It

Download the latest release: https://github.com/ipdelete/cmux/releases

Requires `@github/copilot` CLI authenticated via `/login`.

## Contact

Ian Philpot — ianphil@microsoft.com

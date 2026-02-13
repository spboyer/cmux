# Glossary

Consistent terminology used throughout cmux documentation.

## Layout

| Term | Description |
|------|-------------|
| **Navigator** | The left pane. Shows all open workspaces, agents, and their associated files. Entry point for switching between everything. |
| **Main View** | The center pane. Displays the active content — a workspace terminal, agent activity feed, file viewer, or chat. |
| **Explorer** | The right pane in workspace/agent mode. Shows the file tree for the selected workspace or agent's directory. |
| **Conversations** | The right pane in chat mode. Lists and manages saved chat conversations. |

## Items

| Term | Description |
|------|-------------|
| **Workspace** | A PTY terminal session scoped to a directory, created via the `+` button in the Navigator. Runs your system shell (PowerShell, bash, zsh). |
| **Agent** | An AI-powered session created from Copilot Chat. Works autonomously in a repository and reports progress via an activity feed in Main View. |
| **Subagent** | An internal sub-task spawned by the Copilot SDK within an agent session. Part of Copilot's internal orchestration. |
| **Chat** | The Copilot Chat interface shown in Main View. Used to have conversations and create agents. |
| **Conversation** | A saved chat thread. Managed in the Conversations pane. Persisted to disk and restored on restart. |
| **File View** | A read-only file displayed in Main View with syntax highlighting via Monaco Editor. |
| **Activity Feed** | The card-based UI in Main View that shows an agent's tool calls, reasoning, and results in real time. |

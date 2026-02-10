# Getting Started

## Prerequisites

- Node.js 18+
- npm 9+
- Copilot CLI and SDK installed globally:

```bash
npm install -g @github/copilot @github/copilot-sdk
```

On first launch, use the `/login` command in the Copilot CLI to authenticate with your GitHub account.

## Option 1: Install from Releases

Download the latest release for your platform:

https://github.com/ipdelete/cmux/releases

Run the installer — no additional setup needed beyond the prerequisites above.

## Option 2: Clone & Run from Source

```bash
git clone https://github.com/ipdelete/cmux.git
cd cmux
npm install
npm start
```

## First Launch

The app opens with an empty Navigator on the left, Main View in the center, and Explorer on the right.

### Create Your First Workspace

1. Click the **`+`** button at the top of the Navigator
2. Select a directory in the folder picker — this becomes the workspace's working directory
3. A new workspace appears in the Navigator with a terminal in Main View
4. The Explorer on the right shows the file tree for that directory

You now have a fully interactive terminal scoped to your chosen directory. Type commands as you normally would — we recommend `copilot`.

## What's Next

- [Managing Workspaces](managing-workspaces.md) — Open more workspaces, rename them, switch between them
- [Using Copilot Chat](using-copilot-chat.md) — Start a conversation and create agents
- [Browsing Files](browsing-files.md) — Navigate the file tree and view files

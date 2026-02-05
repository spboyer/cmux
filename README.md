# Vibe Playground

A modern Electron-based terminal manager for working across multiple repositories simultaneously. Features a three-pane layout with integrated file browsing and syntax-highlighted file viewing.

![Terminal View](img/terminal-screenshot.png)

## Features

### 🖥️ Multi-Terminal Management
- Open multiple terminal sessions, each in a different directory/repository
- Full PTY support via node-pty - TUI apps like `vim`, `htop`, and GitHub Copilot CLI work perfectly
- Terminal state preserved when switching between views
- Quick switching between terminals via the left sidebar

### 📁 Integrated File Browser
- File tree view showing the current terminal's working directory
- Expandable folders with lazy loading
- Click files to view them with syntax highlighting

### ✨ Monaco Editor Integration
- View files with full syntax highlighting powered by Monaco Editor (VS Code's editor)
- Support for TypeScript, JavaScript, JSON, Markdown, CSS, HTML, Python, YAML, and more
- Line numbers and minimap navigation

![File View](img/file-screenshot.png)

### 🎨 Three-Pane Layout
- **Left Pane**: Terminal and file list - see all open terminals and their associated files
- **Center Pane**: Active terminal or file viewer
- **Right Pane**: File tree for the current terminal's directory

### 🔄 Auto-Updates
- Automatic update checks on startup
- Background downloads with progress indicator
- Non-disruptive updates - install on next restart
- Toast notifications for update status

## Installation

### Prerequisites
- Node.js 18+ 
- npm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/ipdelete/vibe-playground.git
cd vibe-playground

# Install dependencies
npm install

# Start the development server
npm start
```

## Usage

1. **Create a Terminal**: Click the `+` button in the left pane and select a directory
2. **Run Commands**: Type in the terminal as you normally would - full shell support
3. **Browse Files**: Use the right pane to navigate the file tree
4. **Open Files**: Click any file to view it with syntax highlighting
5. **Switch Views**: Click terminals or files in the left pane to switch between them
6. **Close Items**: Right-click on terminals or files for context menu options

### Keyboard Shortcuts
- `Ctrl+Tab` - Next terminal
- `Ctrl+Shift+Tab` - Previous terminal
- `Ctrl+Alt+\` - New terminal
- `Ctrl+W` - Close current terminal/file
- `F2` - Rename terminal
- `Ctrl+?` - Show keyboard shortcuts help
- `Ctrl+Shift+I` - Open DevTools

## Tech Stack

- **Electron** - Cross-platform desktop app framework
- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **xterm.js** - Terminal emulator
- **node-pty** - Pseudo-terminal for full shell support
- **Monaco Editor** - Code editor with syntax highlighting
- **Electron Forge** - Build and packaging toolchain

## Project Structure

```
src/
├── index.ts                 # Main process entry
├── preload.ts              # Preload script (IPC bridge)
├── renderer.tsx            # Renderer entry
├── shared/
│   └── types.ts            # Shared TypeScript types
├── main/
│   ├── services/
│   │   ├── TerminalService.ts   # PTY management
│   │   └── FileService.ts       # File system operations
│   └── ipc/
│       ├── terminal.ts     # Terminal IPC handlers
│       └── files.ts        # File IPC handlers
└── renderer/
    ├── App.tsx             # Main React component
    ├── contexts/
    │   └── AppStateContext.tsx  # State management
    ├── components/
    │   ├── Layout/         # Three-pane layout
    │   ├── LeftPane/       # Terminal/file list
    │   ├── CenterPane/     # Terminal & file viewer
    │   └── RightPane/      # File tree
    └── styles/
        └── global.css      # Application styles
```

## Development

```bash
# Run in development mode with hot reload
npm start

# Run tests
npm test

# Package the application
npm run package

# Create distributable
npm run make
```

## Known Limitations

- Terminal resize may have slight delay during rapid window resizing
- Some complex TUI applications may have minor rendering differences compared to native terminals

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

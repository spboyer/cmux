import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AppStateProvider, useAppState, initialState } from '../contexts/AppStateContext';
import { LeftPane } from '../components/LeftPane/LeftPane';
import { CenterPane } from '../components/CenterPane/CenterPane';
import { RightPane } from '../components/RightPane/RightPane';

// Mock all electronAPI functions
const mockCreateTerminal = jest.fn();
const mockKillTerminal = jest.fn();
const mockReadDirectory = jest.fn();
const mockReadFile = jest.fn();
const mockWatchDirectory = jest.fn();
const mockUnwatchDirectory = jest.fn();
const mockOnDirectoryChanged = jest.fn();
const mockShowOpenDialog = jest.fn();

// Mock TerminalView and FileView (complex dependencies)
jest.mock('../components/CenterPane/TerminalView', () => ({
  TerminalView: ({ terminalId, isActive }: { terminalId: string; isActive: boolean }) => (
    <div data-testid={`terminal-${terminalId}`} data-active={isActive}>
      Terminal {terminalId}
    </div>
  ),
}));

jest.mock('../components/CenterPane/FileView', () => ({
  FileView: ({ filePath, fileName }: { filePath: string; fileName: string }) => (
    <div data-testid="file-view">File: {fileName}</div>
  ),
}));

jest.mock('../components/RightPane/FileTree', () => ({
  FileTree: ({ rootPath, onFileClick }: { rootPath: string; onFileClick: (path: string) => void }) => (
    <div data-testid="file-tree">
      <button onClick={() => onFileClick(`${rootPath}/app.ts`)}>app.ts</button>
      <button onClick={() => onFileClick(`${rootPath}/index.ts`)}>index.ts</button>
    </div>
  ),
}));

beforeAll(() => {
  (window as any).electronAPI = {
    terminal: {
      create: mockCreateTerminal,
      kill: mockKillTerminal,
    },
    fs: {
      readDirectory: mockReadDirectory,
      readFile: mockReadFile,
      watchDirectory: mockWatchDirectory,
      unwatchDirectory: mockUnwatchDirectory,
      onDirectoryChanged: mockOnDirectoryChanged,
    },
    dialog: {
      showOpenDialog: mockShowOpenDialog,
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockOnDirectoryChanged.mockReturnValue(() => {});
  mockCreateTerminal.mockResolvedValue('term-new');
});

// Track terminal ID counter for unique IDs
let terminalCounter = 0;

// Integration component that ties LeftPane, CenterPane, and RightPane together
function IntegrationApp() {
  const { state, dispatch } = useAppState();
  const [renamingTerminalId, setRenamingTerminalId] = React.useState<string | null>(null);

  const handleAddTerminal = async () => {
    const terminalId = `term-${++terminalCounter}`;
    await window.electronAPI.terminal.create(terminalId, '/test/dir');
    dispatch({
      type: 'ADD_TERMINAL',
      payload: { id: terminalId, label: 'New Terminal', cwd: '/test/dir' },
    });
  };

  const handleCloseTerminal = (id: string) => {
    window.electronAPI.terminal.kill(id);
    dispatch({ type: 'REMOVE_TERMINAL', payload: { id } });
  };

  const handleFileClick = (filePath: string, fileName: string) => {
    const activeTerminalId = state.activeTerminalId;
    if (activeTerminalId) {
      dispatch({
        type: 'ADD_FILE',
        payload: {
          terminalId: activeTerminalId,
          file: {
            id: `file-${Date.now()}`,
            path: filePath,
            name: fileName,
            parentTerminalId: activeTerminalId,
          },
        },
      });
    }
  };

  const handleRenameComplete = (id: string, newLabel: string | null) => {
    setRenamingTerminalId(null);
    if (newLabel) {
      dispatch({ type: 'RENAME_TERMINAL', payload: { id, label: newLabel } });
    }
  };

  return (
    <div className="integration-app">
      <div className="left-pane">
        <LeftPane
          onAddTerminal={handleAddTerminal}
          onCloseTerminal={handleCloseTerminal}
          renamingTerminalId={renamingTerminalId}
          onRenameComplete={handleRenameComplete}
        />
      </div>
      <div className="center-pane">
        <CenterPane />
      </div>
      <div className="right-pane">
        <RightPane onFileClick={handleFileClick} />
      </div>
    </div>
  );
}

function renderIntegrationApp() {
  terminalCounter = 0; // Reset counter for each test
  return render(
    <AppStateProvider>
      <IntegrationApp />
    </AppStateProvider>
  );
}

describe('App Integration', () => {
  describe('terminal creation flow', () => {
    it('should create a terminal and update all panes', async () => {
      renderIntegrationApp();

      // Initial state - no terminals
      expect(screen.getByText('No terminals open')).toBeInTheDocument();
      expect(screen.getByText('Select or create a terminal')).toBeInTheDocument();
      expect(screen.getByText('No directory selected')).toBeInTheDocument();

      // Click add terminal button
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Terminal' }));
      });

      // Wait for terminal to be created
      await waitFor(() => {
        expect(mockCreateTerminal).toHaveBeenCalledWith('term-1', '/test/dir');
      });

      // Left pane should show new terminal
      await waitFor(() => {
        expect(screen.getByText('New Terminal')).toBeInTheDocument();
      });

      // Center pane should show terminal view
      expect(screen.getByTestId('terminal-term-1')).toBeInTheDocument();

      // Right pane should show file tree
      expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    });
  });

  describe('file open flow', () => {
    it('should open a file when clicked in file tree', async () => {
      renderIntegrationApp();

      // Create a terminal first
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Terminal' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('file-tree')).toBeInTheDocument();
      });

      // Click a file in the file tree (button in mock)
      const fileTreeButton = screen.getByTestId('file-tree').querySelector('button');
      await act(async () => {
        fireEvent.click(fileTreeButton!);
      });

      // File view should be shown in center pane
      await waitFor(() => {
        expect(screen.getByTestId('file-view')).toBeInTheDocument();
      });
      expect(screen.getByText('File: app.ts')).toBeInTheDocument();

      // File should also appear in left pane file list
      const fileList = document.querySelector('.file-list');
      expect(fileList).toBeInTheDocument();
    });

    it('should switch between files and terminal', async () => {
      renderIntegrationApp();

      // Create terminal
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Terminal' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('file-tree')).toBeInTheDocument();
      });

      // Open a file
      const fileTreeButton = screen.getByTestId('file-tree').querySelector('button');
      await act(async () => {
        fireEvent.click(fileTreeButton!);
      });

      await waitFor(() => {
        expect(screen.getByTestId('file-view')).toBeInTheDocument();
      });

      // Click on terminal in left pane to switch back
      await act(async () => {
        fireEvent.click(screen.getByText('New Terminal'));
      });

      // Terminal should be visible, file view hidden
      await waitFor(() => {
        expect(screen.getByTestId('terminal-term-1')).toHaveAttribute('data-active', 'true');
      });
    });
  });

  describe('terminal close flow', () => {
    it('should close terminal and clean up state', async () => {
      renderIntegrationApp();

      // Create terminal
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Terminal' }));
      });

      await waitFor(() => {
        expect(screen.getByText('New Terminal')).toBeInTheDocument();
      });

      // Right-click to open context menu
      const terminalItem = screen.getByText('New Terminal').closest('.terminal-item');
      await act(async () => {
        fireEvent.contextMenu(terminalItem!);
      });

      // Click close
      await act(async () => {
        fireEvent.click(screen.getByText('Close Terminal'));
      });

      // Terminal should be destroyed
      expect(mockKillTerminal).toHaveBeenCalledWith('term-1');

      // UI should reset to empty state
      await waitFor(() => {
        expect(screen.getByText('No terminals open')).toBeInTheDocument();
        expect(screen.getByText('Select or create a terminal')).toBeInTheDocument();
      });
    });
  });

  describe('multiple terminals', () => {
    it('should handle multiple terminals and switch between them', async () => {
      renderIntegrationApp();

      // Create first terminal
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Terminal' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('terminal-term-1')).toBeInTheDocument();
      });

      // Create second terminal
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Terminal' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('terminal-term-2')).toBeInTheDocument();
      });

      // Both terminals should be in left pane
      const terminalLabels = screen.getAllByText('New Terminal');
      expect(terminalLabels).toHaveLength(2);

      // Second terminal should be active (most recently created)
      expect(screen.getByTestId('terminal-term-2')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('terminal-term-1')).toHaveAttribute('data-active', 'false');
    });
  });
});

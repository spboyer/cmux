import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AppStateProvider, useAppState, initialState } from '../contexts/AppStateContext';
import { LeftPane } from '../components/LeftPane/LeftPane';
import { CenterPane } from '../components/CenterPane/CenterPane';
import { RightPane } from '../components/RightPane/RightPane';

// Mock all electronAPI functions
const mockCreateAgent = jest.fn();
const mockKillAgent = jest.fn();
const mockReadDirectory = jest.fn();
const mockReadFile = jest.fn();
const mockWatchDirectory = jest.fn();
const mockUnwatchDirectory = jest.fn();
const mockOnDirectoryChanged = jest.fn();
const mockShowOpenDialog = jest.fn();

// Mock AgentView and FileView (complex dependencies)
jest.mock('../components/CenterPane/AgentView', () => ({
  AgentView: ({ agentId, isActive }: { agentId: string; isActive: boolean }) => (
    <div data-testid={`agent-${agentId}`} data-active={isActive}>
      Agent {agentId}
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
    agent: {
      create: mockCreateAgent,
      kill: mockKillAgent,
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
    copilot: {
      listModels: jest.fn().mockResolvedValue([]),
      send: jest.fn(),
      onChunk: jest.fn().mockReturnValue(() => {}),
      onDone: jest.fn().mockReturnValue(() => {}),
      onError: jest.fn().mockReturnValue(() => {}),
    },
    conversation: {
      list: jest.fn().mockResolvedValue([]),
      load: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      rename: jest.fn().mockResolvedValue(undefined),
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockOnDirectoryChanged.mockReturnValue(() => {});
  mockCreateAgent.mockResolvedValue('agent-new');
});

// Track agent ID counter for unique IDs
let agentCounter = 0;

// Integration component that ties LeftPane, CenterPane, and RightPane together
function IntegrationApp() {
  const { state, dispatch } = useAppState();
  const [renamingAgentId, setRenamingAgentId] = React.useState<string | null>(null);

  const handleAddAgent = async () => {
    const agentId = `agent-${++agentCounter}`;
    await window.electronAPI.agent.create(agentId, '/test/dir');
    dispatch({
      type: 'ADD_AGENT',
      payload: { id: agentId, label: 'New Agent', cwd: '/test/dir' },
    });
  };

  const handleCloseAgent = (id: string) => {
    window.electronAPI.agent.kill(id);
    dispatch({ type: 'REMOVE_AGENT', payload: { id } });
  };

  const handleFileClick = (filePath: string, fileName: string) => {
    const activeAgentId = state.activeAgentId;
    if (activeAgentId) {
      dispatch({
        type: 'ADD_FILE',
        payload: {
          agentId: activeAgentId,
          file: {
            id: `file-${Date.now()}`,
            path: filePath,
            name: fileName,
            parentAgentId: activeAgentId,
          },
        },
      });
    }
  };

  const handleRenameComplete = (id: string, newLabel: string | null) => {
    setRenamingAgentId(null);
    if (newLabel) {
      dispatch({ type: 'RENAME_AGENT', payload: { id, label: newLabel } });
    }
  };

  return (
    <div className="integration-app">
      <div className="left-pane">
        <LeftPane
          onAddAgent={handleAddAgent}
          onCloseAgent={handleCloseAgent}
          renamingAgentId={renamingAgentId}
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
  agentCounter = 0; // Reset counter for each test
  return render(
    <AppStateProvider>
      <IntegrationApp />
    </AppStateProvider>
  );
}

describe('App Integration', () => {
  describe('agent creation flow', () => {
    it('should create an agent and update all panes', async () => {
      renderIntegrationApp();

      // Initial state - no agents
      expect(screen.getByText('No agents open')).toBeInTheDocument();
      expect(screen.getByText('Select or create an agent')).toBeInTheDocument();
      expect(screen.getByText('No directory selected')).toBeInTheDocument();

      // Click add agent button
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Agent' }));
      });

      // Wait for agent to be created
      await waitFor(() => {
        expect(mockCreateAgent).toHaveBeenCalledWith('agent-1', '/test/dir');
      });

      // Left pane should show new agent
      await waitFor(() => {
        expect(screen.getByText('New Agent')).toBeInTheDocument();
      });

      // Center pane should show agent view
      expect(screen.getByTestId('agent-agent-1')).toBeInTheDocument();

      // Right pane should show file tree
      expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    });
  });

  describe('file open flow', () => {
    it('should open a file when clicked in file tree', async () => {
      renderIntegrationApp();

      // Create an agent first
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Agent' }));
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

    it('should switch between files and agent', async () => {
      renderIntegrationApp();

      // Create agent
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Agent' }));
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

      // Click on agent in left pane to switch back
      await act(async () => {
        fireEvent.click(screen.getByText('New Agent'));
      });

      // Agent should be visible, file view hidden
      await waitFor(() => {
        expect(screen.getByTestId('agent-agent-1')).toHaveAttribute('data-active', 'true');
      });
    });
  });

  describe('agent close flow', () => {
    it('should close agent and clean up state', async () => {
      renderIntegrationApp();

      // Create agent
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Agent' }));
      });

      await waitFor(() => {
        expect(screen.getByText('New Agent')).toBeInTheDocument();
      });

      // Right-click to open context menu
      const agentItem = screen.getByText('New Agent').closest('.agent-item');
      await act(async () => {
        fireEvent.contextMenu(agentItem!);
      });

      // Click close
      await act(async () => {
        fireEvent.click(screen.getByText('Close Agent'));
      });

      // Agent should be destroyed
      expect(mockKillAgent).toHaveBeenCalledWith('agent-1');

      // UI should reset to empty state
      await waitFor(() => {
        expect(screen.getByText('No agents open')).toBeInTheDocument();
        expect(screen.getByText('Select or create an agent')).toBeInTheDocument();
      });
    });
  });

  describe('multiple agents', () => {
    it('should handle multiple agents and switch between them', async () => {
      renderIntegrationApp();

      // Create first agent
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Agent' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('agent-agent-1')).toBeInTheDocument();
      });

      // Create second agent
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New Agent' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('agent-agent-2')).toBeInTheDocument();
      });

      // Both agents should be in left pane
      const agentLabels = screen.getAllByText('New Agent');
      expect(agentLabels).toHaveLength(2);

      // Second agent should be active (most recently created)
      expect(screen.getByTestId('agent-agent-2')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('agent-agent-1')).toHaveAttribute('data-active', 'false');
    });
  });
});

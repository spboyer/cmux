import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightPane } from './RightPane';
import { AppStateProvider } from '../../contexts/AppStateContext';
import { AppState } from '../../../shared/types';

// Mock FileTree component which has complex IPC dependencies
jest.mock('./FileTree', () => ({
  FileTree: ({ rootPath, onFileClick, showHiddenFiles }: { rootPath: string; onFileClick: (path: string) => void; showHiddenFiles?: boolean }) => (
    <div data-testid="file-tree" data-root={rootPath} data-show-hidden={showHiddenFiles}>
      <button onClick={() => onFileClick('/home/test.ts')}>test.ts</button>
    </div>
  ),
}));

const renderWithProvider = (
  ui: React.ReactElement,
  initialState?: AppState
) => {
  return render(
    <AppStateProvider initialState={initialState}>
      {ui}
    </AppStateProvider>
  );
};

describe('RightPane', () => {
  it('should show empty state when no active agent', () => {
    renderWithProvider(<RightPane onFileClick={() => {}} />);

    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('No directory selected')).toBeInTheDocument();
  });

  it('should render FileTree when agent is active', () => {
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
      viewMode: 'agents',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state);

    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    expect(screen.getByTestId('file-tree')).toHaveAttribute('data-root', '/home');
  });

  it('should show refresh button when agent is active', () => {
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
      viewMode: 'agents',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state);

    expect(screen.getByRole('button', { name: 'Refresh file tree' })).toBeInTheDocument();
  });

  it('should not show refresh button when no agent', () => {
    renderWithProvider(<RightPane onFileClick={() => {}} />);

    expect(screen.queryByRole('button', { name: 'Refresh file tree' })).not.toBeInTheDocument();
  });

  it('should call onFileClick with path and filename when file clicked', () => {
    const onFileClick = jest.fn();
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
      viewMode: 'agents',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
    };

    renderWithProvider(<RightPane onFileClick={onFileClick} />, state);

    fireEvent.click(screen.getByText('test.ts'));

    expect(onFileClick).toHaveBeenCalledWith('/home/test.ts', 'test.ts');
  });

  it('should extract filename from path correctly', () => {
    const onFileClick = jest.fn();
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
      viewMode: 'agents',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
    };

    renderWithProvider(<RightPane onFileClick={onFileClick} />, state);

    // The mock FileTree passes '/home/test.ts', component should extract 'test.ts'
    fireEvent.click(screen.getByText('test.ts'));

    expect(onFileClick).toHaveBeenCalledWith('/home/test.ts', 'test.ts');
  });

  it('should pass correct rootPath to FileTree based on active agent', () => {
    // Test with first agent active
    const state1: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
      viewMode: 'agents',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state1);
    expect(screen.getByTestId('file-tree')).toHaveAttribute('data-root', '/home');
  });

  it('should pass different rootPath for different active agent', () => {
    // Test with second agent active
    const state2: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        { id: 'agent-2', label: 'Agent 2', cwd: '/project', openFiles: [] },
      ],
      activeItemId: 'agent-2',
      activeAgentId: 'agent-2',
      viewMode: 'agents',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state2);
    expect(screen.getByTestId('file-tree')).toHaveAttribute('data-root', '/project');
  });

  it('should show Chat header when viewMode is chat', () => {
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
      viewMode: 'chat',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state);

    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.queryByTestId('file-tree')).not.toBeInTheDocument();
  });

  it('should show toggle hidden files button when agent is active', () => {
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
      viewMode: 'agents',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state);

    expect(screen.getByRole('button', { name: 'Show hidden files' })).toBeInTheDocument();
  });

  it('should pass showHiddenFiles to FileTree', () => {
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
      viewMode: 'agents',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: true,
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state);

    expect(screen.getByTestId('file-tree')).toHaveAttribute('data-show-hidden', 'true');
  });

  it('should dispatch SET_SHOW_HIDDEN_FILES on toggle click', () => {
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
      viewMode: 'agents',
      chatMessages: [],
      chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state);

    fireEvent.click(screen.getByRole('button', { name: 'Show hidden files' }));

    // After clicking, the button label should change to "Hide hidden files"
    expect(screen.getByRole('button', { name: 'Hide hidden files' })).toBeInTheDocument();
  });
});

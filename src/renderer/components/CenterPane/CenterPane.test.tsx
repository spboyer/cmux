import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { CenterPane } from './CenterPane';
import { AppStateProvider } from '../../contexts/AppStateContext';
import { AppState } from '../../../shared/types';

// Mock the child components that have complex dependencies
jest.mock('./AgentView', () => ({
  AgentView: ({ agentId, isActive }: { agentId: string; isActive: boolean }) => (
    <div data-testid={`agent-${agentId}`} data-active={isActive}>
      Mock Agent {agentId}
    </div>
  ),
}));

jest.mock('./FileView', () => ({
  FileView: ({ filePath, fileName }: { filePath: string; fileName: string }) => (
    <div data-testid="file-view">
      Mock FileView: {fileName}
    </div>
  ),
}));

jest.mock('./ChatView', () => ({
  ChatView: () => (
    <div data-testid="chat-view">Mock ChatView</div>
  ),
}));

const renderWithProvider = (ui: React.ReactElement, initialState?: AppState) => {
  return render(
    <AppStateProvider initialState={initialState}>
      {ui}
    </AppStateProvider>
  );
};

describe('CenterPane', () => {
  it('should show empty state when no agents exist', () => {
    renderWithProvider(<CenterPane />);
    
    expect(screen.getByText('Select or create an agent')).toBeInTheDocument();
  });

  it('should render agents when agents exist', () => {
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

    renderWithProvider(<CenterPane />, state);

    expect(screen.getByTestId('agent-agent-1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-agent-1')).toHaveAttribute('data-active', 'true');
  });

  it('should render multiple agents', () => {
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        { id: 'agent-2', label: 'Agent 2', cwd: '/project', openFiles: [] },
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

    renderWithProvider(<CenterPane />, state);

    expect(screen.getByTestId('agent-agent-1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-agent-2')).toBeInTheDocument();
    expect(screen.getByTestId('agent-agent-1')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('agent-agent-2')).toHaveAttribute('data-active', 'false');
  });

  it('should show FileView when a file is active', () => {
    const state: AppState = {
      agents: [
        {
          id: 'agent-1',
          label: 'Agent 1',
          cwd: '/home',
          openFiles: [
            { id: 'file-1', path: '/home/test.ts', name: 'test.ts', parentAgentId: 'agent-1' },
          ],
        },
      ],
      activeItemId: 'file-1',
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

    renderWithProvider(<CenterPane />, state);

    expect(screen.getByTestId('file-view')).toBeInTheDocument();
    expect(screen.getByText('Mock FileView: test.ts')).toBeInTheDocument();
  });

  it('should hide agent pane when file is active', () => {
    const state: AppState = {
      agents: [
        {
          id: 'agent-1',
          label: 'Agent 1',
          cwd: '/home',
          openFiles: [
            { id: 'file-1', path: '/home/test.ts', name: 'test.ts', parentAgentId: 'agent-1' },
          ],
        },
      ],
      activeItemId: 'file-1',
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

    const { container } = renderWithProvider(<CenterPane />, state);

    const agentPane = container.querySelector('.agent-pane');
    expect(agentPane).toHaveStyle({ display: 'none' });
  });

  it('should show agent pane when agent is active', () => {
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

    const { container } = renderWithProvider(<CenterPane />, state);

    const agentPane = container.querySelector('.agent-pane');
    expect(agentPane).toHaveStyle({ display: 'block' });
  });

  it('should show ChatView when viewMode is chat', () => {
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

    const { container } = renderWithProvider(<CenterPane />, state);

    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
    const chatPane = container.querySelector('.chat-pane');
    expect(chatPane).toHaveStyle({ display: 'flex' });
    const agentPane = container.querySelector('.agent-pane');
    expect(agentPane).toHaveStyle({ display: 'none' });
  });

  it('should show ChatView even with zero agents', () => {
    const state: AppState = {
      agents: [],
      activeItemId: null,
      activeAgentId: null,
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

    renderWithProvider(<CenterPane />, state);

    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
    expect(screen.queryByText('Select or create an agent')).not.toBeInTheDocument();
  });
});

import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftPane } from './LeftPane';
import { AppStateProvider } from '../../contexts/AppStateContext';
import { AppState } from '../../../shared/types';

const renderWithProvider = (ui: React.ReactElement, initialState?: AppState) => {
  return render(
    <AppStateProvider initialState={initialState}>
      {ui}
    </AppStateProvider>
  );
};

describe('LeftPane', () => {
  it('should render header with title', () => {
    renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />);
    expect(screen.getByText('Agents')).toBeInTheDocument();
  });

  it('should render add button', () => {
    renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />);
    expect(screen.getByRole('button', { name: 'New Agent' })).toBeInTheDocument();
  });

  it('should call onAddAgent when + button is clicked', () => {
    const onAddAgent = jest.fn();
    renderWithProvider(<LeftPane onAddAgent={onAddAgent} onCloseAgent={() => {}} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'New Agent' }));
    expect(onAddAgent).toHaveBeenCalledTimes(1);
  });

  it('should show empty message when no agents', () => {
    renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />);
    expect(screen.getByText('No agents open')).toBeInTheDocument();
  });

  it('should render agent list', () => {
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        { id: 'agent-2', label: 'Agent 2', cwd: '/project', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
    };

    renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
    
    expect(screen.getByText('Agent 1')).toBeInTheDocument();
    expect(screen.getByText('Agent 2')).toBeInTheDocument();
  });

  it('should highlight active agent', () => {
    const state: AppState = {
      agents: [
        { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
    };

    renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
    
    const agentItem = screen.getByText('Agent 1').closest('.agent-item');
    expect(agentItem).toHaveClass('active');
  });

  it('should show files nested under agent', () => {
    const state: AppState = {
      agents: [
        {
          id: 'agent-1',
          label: 'Agent 1',
          cwd: '/home',
          openFiles: [
            { id: 'file-1', name: 'test.ts', path: '/home/test.ts', parentAgentId: 'agent-1' },
          ],
        },
      ],
      activeItemId: 'agent-1',
      activeAgentId: 'agent-1',
    };

    renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
    
    expect(screen.getByText('test.ts')).toBeInTheDocument();
  });

  describe('context menu', () => {
    it('should show context menu on agent right-click', () => {
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
      
      const agentItem = screen.getByText('Agent 1').closest('.agent-item');
      fireEvent.contextMenu(agentItem!);
      
      expect(screen.getByText('Close Agent')).toBeInTheDocument();
    });

    it('should show context menu on file right-click', () => {
      const state: AppState = {
        agents: [
          {
            id: 'agent-1',
            label: 'Agent 1',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', name: 'test.ts', path: '/home/test.ts', parentAgentId: 'agent-1' },
            ],
          },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
      
      const fileItem = screen.getByText('test.ts').closest('.file-item');
      fireEvent.contextMenu(fileItem!);
      
      expect(screen.getByText('Close File')).toBeInTheDocument();
    });

    it('should call onCloseAgent when Close Agent is clicked', () => {
      const onCloseAgent = jest.fn();
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={onCloseAgent} />, state);
      
      const agentItem = screen.getByText('Agent 1').closest('.agent-item');
      fireEvent.contextMenu(agentItem!);
      fireEvent.click(screen.getByText('Close Agent'));
      
      expect(onCloseAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should close context menu when clicking outside', () => {
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
      
      const agentItem = screen.getByText('Agent 1').closest('.agent-item');
      fireEvent.contextMenu(agentItem!);
      expect(screen.getByText('Close Agent')).toBeInTheDocument();
      
      // Click outside
      fireEvent.click(window);
      
      expect(screen.queryByText('Close Agent')).not.toBeInTheDocument();
    });
  });

  describe('agent rename', () => {
    it('should show input when renamingAgentId is set', () => {
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(
        <LeftPane 
          onAddAgent={() => {}} 
          onCloseAgent={() => {}}
          renamingAgentId="agent-1"
          onRenameComplete={() => {}}
        />, 
        state
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Agent 1');
    });

    it('should call onRenameComplete with new value on Enter', () => {
      const onRenameComplete = jest.fn();
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(
        <LeftPane 
          onAddAgent={() => {}} 
          onCloseAgent={() => {}}
          renamingAgentId="agent-1"
          onRenameComplete={onRenameComplete}
        />, 
        state
      );
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onRenameComplete).toHaveBeenCalledWith('agent-1', 'New Name');
    });

    it('should call onRenameComplete with null on Escape', () => {
      const onRenameComplete = jest.fn();
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(
        <LeftPane 
          onAddAgent={() => {}} 
          onCloseAgent={() => {}}
          renamingAgentId="agent-1"
          onRenameComplete={onRenameComplete}
        />, 
        state
      );
      
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(onRenameComplete).toHaveBeenCalledWith('agent-1', null);
    });

    it('should call onRenameComplete on blur', () => {
      const onRenameComplete = jest.fn();
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(
        <LeftPane 
          onAddAgent={() => {}} 
          onCloseAgent={() => {}}
          renamingAgentId="agent-1"
          onRenameComplete={onRenameComplete}
        />, 
        state
      );
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Blurred Name' } });
      fireEvent.blur(input);
      
      expect(onRenameComplete).toHaveBeenCalledWith('agent-1', 'Blurred Name');
    });
  });

  describe('worktree indicator', () => {
    it('should show worktree badge when agent is in a worktree', () => {
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'feature-branch', cwd: '/home/worktree', openFiles: [], isWorktree: true },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
      
      const badge = document.querySelector('.worktree-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', 'Git worktree');
    });

    it('should not show worktree badge for regular agents', () => {
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [], isWorktree: false },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
      
      const badge = document.querySelector('.worktree-badge');
      expect(badge).not.toBeInTheDocument();
    });

    it('should not show worktree badge when isWorktree is undefined', () => {
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
      
      const badge = document.querySelector('.worktree-badge');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('agent selection', () => {
    it('should dispatch SET_ACTIVE_AGENT when agent is clicked', () => {
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
          { id: 'agent-2', label: 'Agent 2', cwd: '/project', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
      
      fireEvent.click(screen.getByText('Agent 2'));
      
      // After click, agent-2 should be active (check via class)
      const agentItem = screen.getByText('Agent 2').closest('.agent-item');
      expect(agentItem).toHaveClass('active');
    });
  });

  describe('file selection', () => {
    it('should highlight active file', () => {
      const state: AppState = {
        agents: [
          {
            id: 'agent-1',
            label: 'Agent 1',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', name: 'test.ts', path: '/home/test.ts', parentAgentId: 'agent-1' },
            ],
          },
        ],
        activeItemId: 'file-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
      
      const fileItem = screen.getByText('test.ts').closest('.file-item');
      expect(fileItem).toHaveClass('active');
    });

    it('should set file as active when clicked', () => {
      const state: AppState = {
        agents: [
          {
            id: 'agent-1',
            label: 'Agent 1',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', name: 'test.ts', path: '/home/test.ts', parentAgentId: 'agent-1' },
            ],
          },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      };

      renderWithProvider(<LeftPane onAddAgent={() => {}} onCloseAgent={() => {}} />, state);
      
      fireEvent.click(screen.getByText('test.ts'));
      
      const fileItem = screen.getByText('test.ts').closest('.file-item');
      expect(fileItem).toHaveClass('active');
    });
  });
});

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
    renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />);
    expect(screen.getByText('Terminals')).toBeInTheDocument();
  });

  it('should render add button', () => {
    renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />);
    expect(screen.getByRole('button', { name: 'New Terminal' })).toBeInTheDocument();
  });

  it('should call onAddTerminal when + button is clicked', () => {
    const onAddTerminal = jest.fn();
    renderWithProvider(<LeftPane onAddTerminal={onAddTerminal} onCloseTerminal={() => {}} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'New Terminal' }));
    expect(onAddTerminal).toHaveBeenCalledTimes(1);
  });

  it('should show empty message when no terminals', () => {
    renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />);
    expect(screen.getByText('No terminals open')).toBeInTheDocument();
  });

  it('should render terminal list', () => {
    const state: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        { id: 'term-2', label: 'Terminal 2', cwd: '/project', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />, state);
    
    expect(screen.getByText('Terminal 1')).toBeInTheDocument();
    expect(screen.getByText('Terminal 2')).toBeInTheDocument();
  });

  it('should highlight active terminal', () => {
    const state: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />, state);
    
    const terminalItem = screen.getByText('Terminal 1').closest('.terminal-item');
    expect(terminalItem).toHaveClass('active');
  });

  it('should show files nested under terminal', () => {
    const state: AppState = {
      terminals: [
        {
          id: 'term-1',
          label: 'Terminal 1',
          cwd: '/home',
          openFiles: [
            { id: 'file-1', name: 'test.ts', path: '/home/test.ts', parentTerminalId: 'term-1' },
          ],
        },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />, state);
    
    expect(screen.getByText('test.ts')).toBeInTheDocument();
  });

  describe('context menu', () => {
    it('should show context menu on terminal right-click', () => {
      const state: AppState = {
        terminals: [
          { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />, state);
      
      const terminalItem = screen.getByText('Terminal 1').closest('.terminal-item');
      fireEvent.contextMenu(terminalItem!);
      
      expect(screen.getByText('Close Terminal')).toBeInTheDocument();
    });

    it('should show context menu on file right-click', () => {
      const state: AppState = {
        terminals: [
          {
            id: 'term-1',
            label: 'Terminal 1',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', name: 'test.ts', path: '/home/test.ts', parentTerminalId: 'term-1' },
            ],
          },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />, state);
      
      const fileItem = screen.getByText('test.ts').closest('.file-item');
      fireEvent.contextMenu(fileItem!);
      
      expect(screen.getByText('Close File')).toBeInTheDocument();
    });

    it('should call onCloseTerminal when Close Terminal is clicked', () => {
      const onCloseTerminal = jest.fn();
      const state: AppState = {
        terminals: [
          { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={onCloseTerminal} />, state);
      
      const terminalItem = screen.getByText('Terminal 1').closest('.terminal-item');
      fireEvent.contextMenu(terminalItem!);
      fireEvent.click(screen.getByText('Close Terminal'));
      
      expect(onCloseTerminal).toHaveBeenCalledWith('term-1');
    });

    it('should close context menu when clicking outside', () => {
      const state: AppState = {
        terminals: [
          { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />, state);
      
      const terminalItem = screen.getByText('Terminal 1').closest('.terminal-item');
      fireEvent.contextMenu(terminalItem!);
      expect(screen.getByText('Close Terminal')).toBeInTheDocument();
      
      // Click outside
      fireEvent.click(window);
      
      expect(screen.queryByText('Close Terminal')).not.toBeInTheDocument();
    });
  });

  describe('terminal rename', () => {
    it('should show input when renamingTerminalId is set', () => {
      const state: AppState = {
        terminals: [
          { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(
        <LeftPane 
          onAddTerminal={() => {}} 
          onCloseTerminal={() => {}}
          renamingTerminalId="term-1"
          onRenameComplete={() => {}}
        />, 
        state
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Terminal 1');
    });

    it('should call onRenameComplete with new value on Enter', () => {
      const onRenameComplete = jest.fn();
      const state: AppState = {
        terminals: [
          { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(
        <LeftPane 
          onAddTerminal={() => {}} 
          onCloseTerminal={() => {}}
          renamingTerminalId="term-1"
          onRenameComplete={onRenameComplete}
        />, 
        state
      );
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onRenameComplete).toHaveBeenCalledWith('term-1', 'New Name');
    });

    it('should call onRenameComplete with null on Escape', () => {
      const onRenameComplete = jest.fn();
      const state: AppState = {
        terminals: [
          { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(
        <LeftPane 
          onAddTerminal={() => {}} 
          onCloseTerminal={() => {}}
          renamingTerminalId="term-1"
          onRenameComplete={onRenameComplete}
        />, 
        state
      );
      
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(onRenameComplete).toHaveBeenCalledWith('term-1', null);
    });

    it('should call onRenameComplete on blur', () => {
      const onRenameComplete = jest.fn();
      const state: AppState = {
        terminals: [
          { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(
        <LeftPane 
          onAddTerminal={() => {}} 
          onCloseTerminal={() => {}}
          renamingTerminalId="term-1"
          onRenameComplete={onRenameComplete}
        />, 
        state
      );
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Blurred Name' } });
      fireEvent.blur(input);
      
      expect(onRenameComplete).toHaveBeenCalledWith('term-1', 'Blurred Name');
    });
  });

  describe('terminal selection', () => {
    it('should dispatch SET_ACTIVE_TERMINAL when terminal is clicked', () => {
      const state: AppState = {
        terminals: [
          { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
          { id: 'term-2', label: 'Terminal 2', cwd: '/project', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />, state);
      
      fireEvent.click(screen.getByText('Terminal 2'));
      
      // After click, term-2 should be active (check via class)
      const terminalItem = screen.getByText('Terminal 2').closest('.terminal-item');
      expect(terminalItem).toHaveClass('active');
    });
  });

  describe('file selection', () => {
    it('should highlight active file', () => {
      const state: AppState = {
        terminals: [
          {
            id: 'term-1',
            label: 'Terminal 1',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', name: 'test.ts', path: '/home/test.ts', parentTerminalId: 'term-1' },
            ],
          },
        ],
        activeItemId: 'file-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />, state);
      
      const fileItem = screen.getByText('test.ts').closest('.file-item');
      expect(fileItem).toHaveClass('active');
    });

    it('should set file as active when clicked', () => {
      const state: AppState = {
        terminals: [
          {
            id: 'term-1',
            label: 'Terminal 1',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', name: 'test.ts', path: '/home/test.ts', parentTerminalId: 'term-1' },
            ],
          },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      renderWithProvider(<LeftPane onAddTerminal={() => {}} onCloseTerminal={() => {}} />, state);
      
      fireEvent.click(screen.getByText('test.ts'));
      
      const fileItem = screen.getByText('test.ts').closest('.file-item');
      expect(fileItem).toHaveClass('active');
    });
  });
});

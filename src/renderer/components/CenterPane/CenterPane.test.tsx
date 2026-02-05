import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { CenterPane } from './CenterPane';
import { AppStateProvider } from '../../contexts/AppStateContext';
import { AppState } from '../../../shared/types';

// Mock the child components that have complex dependencies
jest.mock('./TerminalView', () => ({
  TerminalView: ({ terminalId, isActive }: { terminalId: string; isActive: boolean }) => (
    <div data-testid={`terminal-${terminalId}`} data-active={isActive}>
      Mock Terminal {terminalId}
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

const renderWithProvider = (ui: React.ReactElement, initialState?: AppState) => {
  return render(
    <AppStateProvider initialState={initialState}>
      {ui}
    </AppStateProvider>
  );
};

describe('CenterPane', () => {
  it('should show empty state when no terminals exist', () => {
    renderWithProvider(<CenterPane />);
    
    expect(screen.getByText('Select or create a terminal')).toBeInTheDocument();
  });

  it('should render terminals when terminals exist', () => {
    const state: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<CenterPane />, state);

    expect(screen.getByTestId('terminal-term-1')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-term-1')).toHaveAttribute('data-active', 'true');
  });

  it('should render multiple terminals', () => {
    const state: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        { id: 'term-2', label: 'Terminal 2', cwd: '/project', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<CenterPane />, state);

    expect(screen.getByTestId('terminal-term-1')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-term-2')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-term-1')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('terminal-term-2')).toHaveAttribute('data-active', 'false');
  });

  it('should show FileView when a file is active', () => {
    const state: AppState = {
      terminals: [
        {
          id: 'term-1',
          label: 'Terminal 1',
          cwd: '/home',
          openFiles: [
            { id: 'file-1', path: '/home/test.ts', name: 'test.ts', parentTerminalId: 'term-1' },
          ],
        },
      ],
      activeItemId: 'file-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<CenterPane />, state);

    expect(screen.getByTestId('file-view')).toBeInTheDocument();
    expect(screen.getByText('Mock FileView: test.ts')).toBeInTheDocument();
  });

  it('should hide terminal pane when file is active', () => {
    const state: AppState = {
      terminals: [
        {
          id: 'term-1',
          label: 'Terminal 1',
          cwd: '/home',
          openFiles: [
            { id: 'file-1', path: '/home/test.ts', name: 'test.ts', parentTerminalId: 'term-1' },
          ],
        },
      ],
      activeItemId: 'file-1',
      activeTerminalId: 'term-1',
    };

    const { container } = renderWithProvider(<CenterPane />, state);

    const terminalPane = container.querySelector('.terminal-pane');
    expect(terminalPane).toHaveStyle({ display: 'none' });
  });

  it('should show terminal pane when terminal is active', () => {
    const state: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    const { container } = renderWithProvider(<CenterPane />, state);

    const terminalPane = container.querySelector('.terminal-pane');
    expect(terminalPane).toHaveStyle({ display: 'block' });
  });
});

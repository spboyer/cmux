import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightPane } from './RightPane';
import { AppStateProvider } from '../../contexts/AppStateContext';
import { AppState } from '../../../shared/types';

// Mock FileTree component which has complex IPC dependencies
jest.mock('./FileTree', () => ({
  FileTree: ({ rootPath, onFileClick }: { rootPath: string; onFileClick: (path: string) => void }) => (
    <div data-testid="file-tree" data-root={rootPath}>
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
  it('should show empty state when no active terminal', () => {
    renderWithProvider(<RightPane onFileClick={() => {}} />);

    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('No directory selected')).toBeInTheDocument();
  });

  it('should render FileTree when terminal is active', () => {
    const state: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state);

    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    expect(screen.getByTestId('file-tree')).toHaveAttribute('data-root', '/home');
  });

  it('should show refresh button when terminal is active', () => {
    const state: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state);

    expect(screen.getByRole('button', { name: 'Refresh file tree' })).toBeInTheDocument();
  });

  it('should not show refresh button when no terminal', () => {
    renderWithProvider(<RightPane onFileClick={() => {}} />);

    expect(screen.queryByRole('button', { name: 'Refresh file tree' })).not.toBeInTheDocument();
  });

  it('should call onFileClick with path and filename when file clicked', () => {
    const onFileClick = jest.fn();
    const state: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<RightPane onFileClick={onFileClick} />, state);

    fireEvent.click(screen.getByText('test.ts'));

    expect(onFileClick).toHaveBeenCalledWith('/home/test.ts', 'test.ts');
  });

  it('should extract filename from path correctly', () => {
    const onFileClick = jest.fn();
    const state: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<RightPane onFileClick={onFileClick} />, state);

    // The mock FileTree passes '/home/test.ts', component should extract 'test.ts'
    fireEvent.click(screen.getByText('test.ts'));

    expect(onFileClick).toHaveBeenCalledWith('/home/test.ts', 'test.ts');
  });

  it('should pass correct rootPath to FileTree based on active terminal', () => {
    // Test with first terminal active
    const state1: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
      ],
      activeItemId: 'term-1',
      activeTerminalId: 'term-1',
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state1);
    expect(screen.getByTestId('file-tree')).toHaveAttribute('data-root', '/home');
  });

  it('should pass different rootPath for different active terminal', () => {
    // Test with second terminal active
    const state2: AppState = {
      terminals: [
        { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
        { id: 'term-2', label: 'Terminal 2', cwd: '/project', openFiles: [] },
      ],
      activeItemId: 'term-2',
      activeTerminalId: 'term-2',
    };

    renderWithProvider(<RightPane onFileClick={() => {}} />, state2);
    expect(screen.getByTestId('file-tree')).toHaveAttribute('data-root', '/project');
  });
});

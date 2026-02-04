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
    renderWithProvider(<LeftPane onAddTerminal={() => {}} />);
    expect(screen.getByText('Terminals')).toBeInTheDocument();
  });

  it('should render add button', () => {
    renderWithProvider(<LeftPane onAddTerminal={() => {}} />);
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
  });

  it('should call onAddTerminal when + button is clicked', () => {
    const onAddTerminal = jest.fn();
    renderWithProvider(<LeftPane onAddTerminal={onAddTerminal} />);
    
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(onAddTerminal).toHaveBeenCalledTimes(1);
  });

  it('should show empty message when no terminals', () => {
    renderWithProvider(<LeftPane onAddTerminal={() => {}} />);
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

    renderWithProvider(<LeftPane onAddTerminal={() => {}} />, state);
    
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

    renderWithProvider(<LeftPane onAddTerminal={() => {}} />, state);
    
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

    renderWithProvider(<LeftPane onAddTerminal={() => {}} />, state);
    
    expect(screen.getByText('test.ts')).toBeInTheDocument();
  });
});

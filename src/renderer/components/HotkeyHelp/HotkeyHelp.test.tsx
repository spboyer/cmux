import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HotkeyHelp } from './HotkeyHelp';

describe('HotkeyHelp', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(<HotkeyHelp isOpen={false} onClose={() => {}} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render modal when isOpen is true', () => {
    render(<HotkeyHelp isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('should display all keyboard shortcuts', () => {
    render(<HotkeyHelp isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText('Next agent')).toBeInTheDocument();
    expect(screen.getByText('Previous agent')).toBeInTheDocument();
    expect(screen.getByText('New agent')).toBeInTheDocument();
    expect(screen.getByText('Close current agent/file')).toBeInTheDocument();
    expect(screen.getByText('Rename agent')).toBeInTheDocument();
    expect(screen.getByText('Show this help')).toBeInTheDocument();
    expect(screen.getByText('Open DevTools')).toBeInTheDocument();
  });

  it('should render keyboard keys in kbd elements', () => {
    render(<HotkeyHelp isOpen={true} onClose={() => {}} />);
    
    const kbdElements = screen.getAllByRole('cell', { name: /Ctrl|Tab|Shift|Alt|F2|W|\?|I|\\/i });
    expect(kbdElements.length).toBeGreaterThan(0);
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<HotkeyHelp isOpen={true} onClose={onClose} />);
    
    const closeButton = document.querySelector('.modal-close') as HTMLElement;
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking on overlay', () => {
    const onClose = jest.fn();
    render(<HotkeyHelp isOpen={true} onClose={onClose} />);
    
    const overlay = document.querySelector('.modal-overlay') as HTMLElement;
    fireEvent.click(overlay);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when clicking on modal content', () => {
    const onClose = jest.fn();
    render(<HotkeyHelp isOpen={true} onClose={onClose} />);
    
    const modalContent = document.querySelector('.modal-content') as HTMLElement;
    fireEvent.click(modalContent);
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should have correct table structure', () => {
    render(<HotkeyHelp isOpen={true} onClose={() => {}} />);
    
    const table = document.querySelector('.hotkey-table');
    expect(table).toBeInTheDocument();
    
    const rows = table?.querySelectorAll('tr');
    expect(rows?.length).toBe(8); // 8 shortcuts defined
  });

  it('should call onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(<HotkeyHelp isOpen={true} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not respond to Escape key when modal is closed', () => {
    const onClose = jest.fn();
    render(<HotkeyHelp isOpen={false} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should clean up event listener on unmount', () => {
    const onClose = jest.fn();
    const { unmount } = render(<HotkeyHelp isOpen={true} onClose={onClose} />);
    
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).not.toHaveBeenCalled();
  });
});

import * as React from 'react';
import { render, cleanup } from '@testing-library/react';
import { act } from 'react';

// Mock xterm
jest.mock('@xterm/xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    loadAddon: jest.fn(),
    open: jest.fn(),
    onData: jest.fn().mockReturnValue({ dispose: jest.fn() }), // Returns IDisposable
    attachCustomKeyEventHandler: jest.fn(),
    write: jest.fn(),
    focus: jest.fn(),
    cols: 80,
    rows: 24,
    dispose: jest.fn(),
    getSelection: jest.fn(() => ''),
    clearSelection: jest.fn(),
  })),
}));

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => ({
    fit: jest.fn(),
    dispose: jest.fn(), // Add dispose method
  })),
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
(global as any).ResizeObserver = MockResizeObserver;

// Import after mocks
import { AgentView } from './AgentView';

describe('AgentView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Extend the existing electronAPI mock with our test-specific functions
    // onData and onExit now return cleanup functions
    (window.electronAPI as any).agent = {
      create: jest.fn().mockResolvedValue('test-id'),
      write: jest.fn().mockResolvedValue(undefined),
      resize: jest.fn().mockResolvedValue(undefined),
      kill: jest.fn().mockResolvedValue(undefined),
      onData: jest.fn().mockReturnValue(jest.fn()), // Returns cleanup function
      onExit: jest.fn().mockReturnValue(jest.fn()), // Returns cleanup function
    };
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('should render agent container', () => {
    render(<AgentView agentId="test-1" cwd="/home/user" isActive={true} />);
    expect(document.querySelector('.agent-container')).toBeTruthy();
  });

  it('should register IPC listeners on mount', async () => {
    render(<AgentView agentId="test-2" cwd="/home/user" isActive={true} />);

    // Advance timers to trigger the initial setup
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(window.electronAPI.agent.onData).toHaveBeenCalled();
  });

  it('should create agent in main process', async () => {
    render(<AgentView agentId="test-3" cwd="/home/user" isActive={true} />);

    // Advance timers to trigger agent creation
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(window.electronAPI.agent.create).toHaveBeenCalledWith('test-3', '/home/user');
  });
});

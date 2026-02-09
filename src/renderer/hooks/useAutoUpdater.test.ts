import { renderHook, act } from '@testing-library/react';
import { useAutoUpdater } from './useAutoUpdater';

describe('useAutoUpdater', () => {
  let mockOnStatus: jest.Mock;
  let mockOnProgress: jest.Mock;
  let mockDownload: jest.Mock;
  let mockInstall: jest.Mock;
  let statusCleanup: jest.Mock;
  let progressCleanup: jest.Mock;

  beforeEach(() => {
    statusCleanup = jest.fn();
    progressCleanup = jest.fn();
    mockOnStatus = jest.fn().mockReturnValue(statusCleanup);
    mockOnProgress = jest.fn().mockReturnValue(progressCleanup);
    mockDownload = jest.fn();
    mockInstall = jest.fn();

    (window as any).electronAPI = {
      updates: {
        onStatus: mockOnStatus,
        onProgress: mockOnProgress,
        download: mockDownload,
        install: mockInstall,
      },
    };
  });

  it('should start with idle state and not dismissed', () => {
    const { result } = renderHook(() => useAutoUpdater());

    expect(result.current.updateState).toEqual({ status: 'idle' });
    expect(result.current.isUpdateDismissed).toBe(false);
  });

  it('should subscribe to status and progress on mount', () => {
    renderHook(() => useAutoUpdater());

    expect(mockOnStatus).toHaveBeenCalledTimes(1);
    expect(mockOnProgress).toHaveBeenCalledTimes(1);
  });

  it('should clean up subscriptions on unmount', () => {
    const { unmount } = renderHook(() => useAutoUpdater());

    unmount();

    expect(statusCleanup).toHaveBeenCalledTimes(1);
    expect(progressCleanup).toHaveBeenCalledTimes(1);
  });

  it('should update state when status callback fires', () => {
    const { result } = renderHook(() => useAutoUpdater());

    const statusCallback = mockOnStatus.mock.calls[0][0];

    act(() => {
      statusCallback({ status: 'available', info: { version: '1.0.0' } });
    });

    expect(result.current.updateState.status).toBe('available');
    expect(result.current.updateState.info).toEqual({ version: '1.0.0' });
  });

  it('should update state when progress callback fires', () => {
    const { result } = renderHook(() => useAutoUpdater());

    const progressCallback = mockOnProgress.mock.calls[0][0];

    act(() => {
      progressCallback({ percent: 50 });
    });

    expect(result.current.updateState.status).toBe('downloading');
    expect(result.current.updateState.progress).toEqual({ percent: 50 });
  });

  it('should reset dismissed state when update becomes available', () => {
    const { result } = renderHook(() => useAutoUpdater());

    // First dismiss
    act(() => {
      result.current.handleDismiss();
    });
    expect(result.current.isUpdateDismissed).toBe(true);

    // Then a new update arrives
    const statusCallback = mockOnStatus.mock.calls[0][0];
    act(() => {
      statusCallback({ status: 'available' });
    });
    expect(result.current.isUpdateDismissed).toBe(false);
  });

  it('should reset dismissed state when update becomes ready', () => {
    const { result } = renderHook(() => useAutoUpdater());

    act(() => {
      result.current.handleDismiss();
    });

    const statusCallback = mockOnStatus.mock.calls[0][0];
    act(() => {
      statusCallback({ status: 'ready' });
    });
    expect(result.current.isUpdateDismissed).toBe(false);
  });

  it('should call electronAPI.updates.download on handleDownload', () => {
    const { result } = renderHook(() => useAutoUpdater());

    act(() => {
      result.current.handleDownload();
    });

    expect(mockDownload).toHaveBeenCalledTimes(1);
  });

  it('should call electronAPI.updates.install on handleInstall', () => {
    const { result } = renderHook(() => useAutoUpdater());

    act(() => {
      result.current.handleInstall();
    });

    expect(mockInstall).toHaveBeenCalledTimes(1);
  });

  it('should set isUpdateDismissed on handleDismiss', () => {
    const { result } = renderHook(() => useAutoUpdater());

    expect(result.current.isUpdateDismissed).toBe(false);

    act(() => {
      result.current.handleDismiss();
    });

    expect(result.current.isUpdateDismissed).toBe(true);
  });
});

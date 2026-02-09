import { renderHook, act, waitFor } from '@testing-library/react';
import { useGitStatusWatcher } from './useGitStatusWatcher';

describe('useGitStatusWatcher', () => {
  let mockIsRepo: jest.Mock;
  let mockGetStatus: jest.Mock;
  let mockGetRoot: jest.Mock;
  let mockWatchRepo: jest.Mock;
  let mockUnwatchRepo: jest.Mock;
  let mockOnStatusChanged: jest.Mock;
  let statusCleanup: jest.Mock;

  beforeEach(() => {
    statusCleanup = jest.fn();
    mockIsRepo = jest.fn();
    mockGetStatus = jest.fn();
    mockGetRoot = jest.fn();
    mockWatchRepo = jest.fn();
    mockUnwatchRepo = jest.fn();
    mockOnStatusChanged = jest.fn().mockReturnValue(statusCleanup);

    (window as any).electronAPI = {
      git: {
        isRepo: mockIsRepo,
        getStatus: mockGetStatus,
        getRoot: mockGetRoot,
        watchRepo: mockWatchRepo,
        unwatchRepo: mockUnwatchRepo,
        onStatusChanged: mockOnStatusChanged,
      },
    };
  });

  it('should start with empty git status', () => {
    mockIsRepo.mockResolvedValue(false);

    const { result } = renderHook(() => useGitStatusWatcher('/root'));

    expect(result.current.gitStatusMap).toEqual({});
  });

  it('should load git status for a git repo', async () => {
    mockIsRepo.mockResolvedValue(true);
    mockGetStatus.mockResolvedValue({ 'file.ts': 'M' });
    mockGetRoot.mockResolvedValue('/root');

    const { result } = renderHook(() => useGitStatusWatcher('/root'));

    await waitFor(() => {
      expect(result.current.gitStatusMap).toEqual({ 'file.ts': 'M' });
    });
  });

  it('should not load status for non-git repo', async () => {
    mockIsRepo.mockResolvedValue(false);

    const { result } = renderHook(() => useGitStatusWatcher('/root'));

    // Wait for the effect to complete
    await new Promise(r => setTimeout(r, 50));

    expect(mockGetStatus).not.toHaveBeenCalled();
    expect(result.current.gitStatusMap).toEqual({});
  });

  it('should watch repo and subscribe to status changes', async () => {
    mockIsRepo.mockResolvedValue(true);
    mockGetStatus.mockResolvedValue({});
    mockGetRoot.mockResolvedValue('/git-root');

    renderHook(() => useGitStatusWatcher('/root'));

    await waitFor(() => {
      expect(mockWatchRepo).toHaveBeenCalledWith('/git-root');
    });
    expect(mockOnStatusChanged).toHaveBeenCalled();
  });

  it('should reload status when git status changes for the watched repo', async () => {
    mockIsRepo.mockResolvedValue(true);
    mockGetStatus.mockResolvedValueOnce({}).mockResolvedValueOnce({ 'a.ts': 'A' });
    mockGetRoot.mockResolvedValue('/git-root');

    const { result } = renderHook(() => useGitStatusWatcher('/root'));

    await waitFor(() => {
      expect(mockOnStatusChanged).toHaveBeenCalled();
    });

    // Simulate git status change event
    const callback = mockOnStatusChanged.mock.calls[0][0];
    await act(async () => {
      callback({ repoRoot: '/git-root' });
    });

    await waitFor(() => {
      expect(result.current.gitStatusMap).toEqual({ 'a.ts': 'A' });
    });
  });

  it('should ignore status changes for other repos', async () => {
    mockIsRepo.mockResolvedValue(true);
    mockGetStatus.mockResolvedValue({});
    mockGetRoot.mockResolvedValue('/git-root');

    renderHook(() => useGitStatusWatcher('/root'));

    await waitFor(() => {
      expect(mockOnStatusChanged).toHaveBeenCalled();
    });

    mockGetStatus.mockClear();
    const callback = mockOnStatusChanged.mock.calls[0][0];
    callback({ repoRoot: '/other-repo' });

    expect(mockGetStatus).not.toHaveBeenCalled();
  });

  it('should clean up on unmount', async () => {
    mockIsRepo.mockResolvedValue(true);
    mockGetStatus.mockResolvedValue({});
    mockGetRoot.mockResolvedValue('/git-root');

    const { unmount } = renderHook(() => useGitStatusWatcher('/root'));

    await waitFor(() => {
      expect(mockWatchRepo).toHaveBeenCalledWith('/git-root');
    });

    unmount();

    expect(statusCleanup).toHaveBeenCalled();
    expect(mockUnwatchRepo).toHaveBeenCalledWith('/git-root');
  });

  it('should expose refreshGitStatus that reloads status', async () => {
    mockIsRepo.mockResolvedValue(true);
    mockGetStatus.mockResolvedValueOnce({ 'a.ts': 'M' }).mockResolvedValueOnce({ 'a.ts': 'M', 'b.ts': 'A' });
    mockGetRoot.mockResolvedValue('/root');

    const { result } = renderHook(() => useGitStatusWatcher('/root'));

    await waitFor(() => {
      expect(result.current.gitStatusMap).toEqual({ 'a.ts': 'M' });
    });

    await act(async () => {
      result.current.refreshGitStatus();
    });

    await waitFor(() => {
      expect(result.current.gitStatusMap).toEqual({ 'a.ts': 'M', 'b.ts': 'A' });
    });
  });

  it('should handle git errors gracefully', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockIsRepo.mockRejectedValue(new Error('git not found'));

    const { result } = renderHook(() => useGitStatusWatcher('/root'));

    await new Promise(r => setTimeout(r, 50));

    expect(result.current.gitStatusMap).toEqual({});
    (console.error as jest.Mock).mockRestore();
  });
});

import { renderHook } from '@testing-library/react';
import { useFileWatcher } from './useFileWatcher';
import type { FileWatchEvent } from '../../shared/types';

describe('useFileWatcher', () => {
  let mockWatchDirectory: jest.Mock;
  let mockUnwatchDirectory: jest.Mock;
  let mockOnDirectoryChanged: jest.Mock;
  let cleanupFn: jest.Mock;
  let refreshDirectory: jest.Mock;
  let watchedDirs: Set<string>;

  beforeEach(() => {
    cleanupFn = jest.fn();
    mockWatchDirectory = jest.fn();
    mockUnwatchDirectory = jest.fn();
    mockOnDirectoryChanged = jest.fn().mockReturnValue(cleanupFn);
    refreshDirectory = jest.fn();
    watchedDirs = new Set<string>();

    (window as any).electronAPI = {
      fs: {
        watchDirectory: mockWatchDirectory,
        unwatchDirectory: mockUnwatchDirectory,
        onDirectoryChanged: mockOnDirectoryChanged,
      },
    };
  });

  it('should watch root directory on mount', () => {
    renderHook(() =>
      useFileWatcher('/root', { current: watchedDirs }, refreshDirectory)
    );

    expect(mockWatchDirectory).toHaveBeenCalledWith('/root');
    expect(mockOnDirectoryChanged).toHaveBeenCalledTimes(1);
  });

  it('should not set up watchers when rootPath is empty', () => {
    renderHook(() =>
      useFileWatcher('', { current: watchedDirs }, refreshDirectory)
    );

    expect(mockWatchDirectory).not.toHaveBeenCalled();
    expect(mockOnDirectoryChanged).not.toHaveBeenCalled();
  });

  it('should call refreshDirectory when a watched directory changes', () => {
    watchedDirs.add('/root');

    renderHook(() =>
      useFileWatcher('/root', { current: watchedDirs }, refreshDirectory)
    );

    // Get the callback passed to onDirectoryChanged
    const callback = mockOnDirectoryChanged.mock.calls[0][0];
    const event: FileWatchEvent = { directory: '/root', type: 'change', filename: 'file.ts' };
    callback(event);

    expect(refreshDirectory).toHaveBeenCalledWith('/root');
  });

  it('should not refresh for unwatched directories', () => {
    renderHook(() =>
      useFileWatcher('/root', { current: watchedDirs }, refreshDirectory)
    );

    const callback = mockOnDirectoryChanged.mock.calls[0][0];
    const event: FileWatchEvent = { directory: '/other', type: 'change', filename: 'file.ts' };
    callback(event);

    expect(refreshDirectory).not.toHaveBeenCalled();
  });

  it('should call onRefresh when a watched directory changes', () => {
    watchedDirs.add('/root');
    const onRefresh = jest.fn();

    renderHook(() =>
      useFileWatcher('/root', { current: watchedDirs }, refreshDirectory, onRefresh)
    );

    const callback = mockOnDirectoryChanged.mock.calls[0][0];
    const event: FileWatchEvent = { directory: '/root', type: 'change', filename: 'file.ts' };
    callback(event);

    expect(refreshDirectory).toHaveBeenCalledWith('/root');
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('should not call onRefresh for unwatched directories', () => {
    const onRefresh = jest.fn();

    renderHook(() =>
      useFileWatcher('/root', { current: watchedDirs }, refreshDirectory, onRefresh)
    );

    const callback = mockOnDirectoryChanged.mock.calls[0][0];
    const event: FileWatchEvent = { directory: '/other', type: 'change', filename: 'file.ts' };
    callback(event);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('should clean up on unmount', () => {
    watchedDirs.add('/root');
    watchedDirs.add('/root/sub');

    const { unmount } = renderHook(() =>
      useFileWatcher('/root', { current: watchedDirs }, refreshDirectory)
    );

    unmount();

    expect(cleanupFn).toHaveBeenCalledTimes(1);
    expect(mockUnwatchDirectory).toHaveBeenCalledWith('/root');
    expect(mockUnwatchDirectory).toHaveBeenCalledWith('/root/sub');
  });
});

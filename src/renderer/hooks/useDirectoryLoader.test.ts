import { renderHook, act, waitFor } from '@testing-library/react';
import { useDirectoryLoader } from './useDirectoryLoader';

describe('useDirectoryLoader', () => {
  let mockReadDirectory: jest.Mock;
  let mockWatchDirectory: jest.Mock;
  let mockUnwatchDirectory: jest.Mock;

  beforeEach(() => {
    mockReadDirectory = jest.fn();
    mockWatchDirectory = jest.fn();
    mockUnwatchDirectory = jest.fn();

    (window as any).electronAPI = {
      fs: {
        readDirectory: mockReadDirectory,
        watchDirectory: mockWatchDirectory,
        unwatchDirectory: mockUnwatchDirectory,
      },
    };
  });

  it('should start in loading state', () => {
    mockReadDirectory.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useDirectoryLoader('/root', 0));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.rootEntries).toEqual([]);
  });

  it('should load root entries on mount', async () => {
    const entries = [
      { name: 'file.ts', path: '/root/file.ts', isDirectory: false },
    ];
    mockReadDirectory.mockResolvedValue(entries);

    const { result } = renderHook(() => useDirectoryLoader('/root', 0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.rootEntries).toEqual(entries);
    expect(result.current.error).toBeNull();
  });

  it('should handle load failure gracefully', async () => {
    mockReadDirectory.mockRejectedValue(new Error('access denied'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useDirectoryLoader('/root', 0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // loadDirectory catches errors and returns [], so rootEntries is empty
    expect(result.current.rootEntries).toEqual([]);

    (console.error as jest.Mock).mockRestore();
  });

  it('should reset state when rootPath changes', async () => {
    const entries1 = [{ name: 'a.ts', path: '/dir1/a.ts', isDirectory: false }];
    const entries2 = [{ name: 'b.ts', path: '/dir2/b.ts', isDirectory: false }];
    mockReadDirectory.mockImplementation((path: string) =>
      Promise.resolve(path === '/dir1' ? entries1 : entries2)
    );

    const { result, rerender } = renderHook(
      ({ rootPath }) => useDirectoryLoader(rootPath, 0),
      { initialProps: { rootPath: '/dir1' } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rootEntries).toEqual(entries1);

    rerender({ rootPath: '/dir2' });

    await waitFor(() => expect(result.current.rootEntries).toEqual(entries2));
  });

  it('should toggle directory expansion', async () => {
    mockReadDirectory.mockResolvedValue([]);

    const { result } = renderHook(() => useDirectoryLoader('/root', 0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Expand
    act(() => {
      result.current.handleDirectoryToggle('/root/sub', true);
    });
    expect(result.current.expandedDirs.has('/root/sub')).toBe(true);
    expect(mockWatchDirectory).toHaveBeenCalledWith('/root/sub');

    // Collapse
    act(() => {
      result.current.handleDirectoryToggle('/root/sub', false);
    });
    expect(result.current.expandedDirs.has('/root/sub')).toBe(false);
    expect(mockUnwatchDirectory).toHaveBeenCalledWith('/root/sub');
  });

  it('should not unwatch root when collapsing root', async () => {
    mockReadDirectory.mockResolvedValue([]);

    const { result } = renderHook(() => useDirectoryLoader('/root', 0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleDirectoryToggle('/root', false);
    });
    expect(mockUnwatchDirectory).not.toHaveBeenCalledWith('/root');
  });

  it('should load and cache children', async () => {
    const children = [{ name: 'c.ts', path: '/root/sub/c.ts', isDirectory: false }];
    mockReadDirectory.mockImplementation((path: string) =>
      Promise.resolve(path === '/root/sub' ? children : [])
    );

    const { result } = renderHook(() => useDirectoryLoader('/root', 0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let loaded: unknown[];
    await act(async () => {
      loaded = await result.current.loadChildren('/root/sub');
    });
    expect(loaded!).toEqual(children);

    // Cached
    expect(result.current.getChildren('/root/sub')).toEqual(children);
  });

  it('should refresh on refreshTrigger change', async () => {
    const entries = [{ name: 'a.ts', path: '/root/a.ts', isDirectory: false }];
    mockReadDirectory.mockResolvedValue(entries);

    const { result, rerender } = renderHook(
      ({ trigger }) => useDirectoryLoader('/root', trigger),
      { initialProps: { trigger: 0 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Clear call count
    mockReadDirectory.mockClear();

    rerender({ trigger: 1 });

    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalledWith('/root');
    });
  });
});

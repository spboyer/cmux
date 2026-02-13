import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FileTree } from './FileTree';

// Mock electronAPI
const mockReadDirectory = jest.fn();
const mockWatchDirectory = jest.fn();
const mockUnwatchDirectory = jest.fn();
const mockOnDirectoryChanged = jest.fn();

beforeAll(() => {
  (window as any).electronAPI = {
    fs: {
      readDirectory: mockReadDirectory,
      watchDirectory: mockWatchDirectory,
      unwatchDirectory: mockUnwatchDirectory,
      onDirectoryChanged: mockOnDirectoryChanged,
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockOnDirectoryChanged.mockReturnValue(() => {}); // Return cleanup function
});

describe('FileTree', () => {
  it('should show loading state initially', () => {
    mockReadDirectory.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show empty directory message when no entries', async () => {
    mockReadDirectory.mockResolvedValue([]);

    render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Empty directory')).toBeInTheDocument();
    });
  });

  it('should render file entries', async () => {
    mockReadDirectory.mockResolvedValue([
      { name: 'file.txt', path: '/home/file.txt', isDirectory: false },
      { name: 'folder', path: '/home/folder', isDirectory: true },
    ]);

    render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('file.txt')).toBeInTheDocument();
      expect(screen.getByText('folder')).toBeInTheDocument();
    });
  });

  it('should call onFileClick when file is clicked', async () => {
    mockReadDirectory.mockResolvedValue([
      { name: 'file.txt', path: '/home/file.txt', isDirectory: false },
    ]);
    const onFileClick = jest.fn();

    render(<FileTree rootPath="/home" onFileClick={onFileClick} />);

    await waitFor(() => {
      expect(screen.getByText('file.txt')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('file.txt'));

    expect(onFileClick).toHaveBeenCalledWith('/home/file.txt');
  });

  it('should expand folder when clicked', async () => {
    mockReadDirectory
      .mockResolvedValueOnce([
        { name: 'folder', path: '/home/folder', isDirectory: true },
      ])
      .mockResolvedValueOnce([
        { name: 'nested.txt', path: '/home/folder/nested.txt', isDirectory: false },
      ]);

    render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('folder')).toBeInTheDocument();
    });

    // Click on folder to expand
    fireEvent.click(screen.getByText('folder'));

    await waitFor(() => {
      expect(screen.getByText('nested.txt')).toBeInTheDocument();
    });
  });

  it('should start watching root directory on mount', async () => {
    mockReadDirectory.mockResolvedValue([]);

    render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(mockWatchDirectory).toHaveBeenCalledWith('/home');
    });
  });

  it('should watch expanded directories', async () => {
    mockReadDirectory
      .mockResolvedValueOnce([
        { name: 'folder', path: '/home/folder', isDirectory: true },
      ])
      .mockResolvedValueOnce([]);

    render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('folder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('folder'));

    await waitFor(() => {
      expect(mockWatchDirectory).toHaveBeenCalledWith('/home/folder');
    });
  });

  it('should unwatch directories on unmount', async () => {
    mockReadDirectory.mockResolvedValue([]);

    const { unmount } = render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(mockWatchDirectory).toHaveBeenCalledWith('/home');
    });

    unmount();

    expect(mockUnwatchDirectory).toHaveBeenCalledWith('/home');
  });

  it('should reload directory when rootPath changes', async () => {
    mockReadDirectory.mockResolvedValue([
      { name: 'file.txt', path: '/home/file.txt', isDirectory: false },
    ]);

    const { rerender } = render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalledWith('/home', undefined);
    });

    mockReadDirectory.mockClear();
    mockReadDirectory.mockResolvedValue([
      { name: 'other.txt', path: '/project/other.txt', isDirectory: false },
    ]);

    rerender(<FileTree rootPath="/project" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalledWith('/project', undefined);
    });
  });

  it('should refresh when refreshTrigger changes', async () => {
    mockReadDirectory.mockResolvedValue([
      { name: 'file.txt', path: '/home/file.txt', isDirectory: false },
    ]);

    const { rerender } = render(
      <FileTree rootPath="/home" onFileClick={() => {}} refreshTrigger={0} />
    );

    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalledTimes(1);
    });

    rerender(
      <FileTree rootPath="/home" onFileClick={() => {}} refreshTrigger={1} />
    );

    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalledTimes(2);
    });
  });

  it('should subscribe to directory change events', async () => {
    mockReadDirectory.mockResolvedValue([]);

    render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(mockOnDirectoryChanged).toHaveBeenCalled();
    });
  });

  it('should show empty directory when read fails', async () => {
    // The component catches errors in loadDirectory and returns empty array
    // which results in "Empty directory" being shown
    mockReadDirectory.mockRejectedValue(new Error('Permission denied'));

    render(<FileTree rootPath="/home" onFileClick={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Empty directory')).toBeInTheDocument();
    });
  });
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileTreeNode } from './FileTreeNode';
import type { FileEntry, FileWatchEvent, GitStatusMap } from '../../../shared/types';

interface FileTreeProps {
  rootPath: string;
  onFileClick: (filePath: string) => void;
  refreshTrigger?: number;
}

export const FileTree: React.FC<FileTreeProps> = ({ rootPath, onFileClick, refreshTrigger }) => {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gitStatusMap, setGitStatusMap] = useState<GitStatusMap>({});
  const [isGitRepo, setIsGitRepo] = useState(false);
  const watchedDirsRef = useRef<Set<string>>(new Set());
  const childrenCacheRef = useRef<Map<string, FileEntry[]>>(new Map());

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileEntry[]> => {
    try {
      const entries = await window.electronAPI.fs.readDirectory(dirPath);
      childrenCacheRef.current.set(dirPath, entries);
      return entries;
    } catch (err) {
      console.error('Error loading directory:', err);
      return [];
    }
  }, []);

  const refreshDirectory = useCallback(async (dirPath: string) => {
    const entries = await loadDirectory(dirPath);
    if (dirPath === rootPath) {
      setRootEntries(entries);
    }
    // Force re-render for expanded children by updating state
    setExpandedDirs(prev => new Set(prev));
  }, [loadDirectory, rootPath]);

  // Load git status for the repository
  const loadGitStatus = useCallback(async () => {
    if (!rootPath) return;
    try {
      const isRepo = await window.electronAPI.git.isRepo(rootPath);
      setIsGitRepo(isRepo);
      if (isRepo) {
        const status = await window.electronAPI.git.getStatus(rootPath);
        setGitStatusMap(status);
      } else {
        setGitStatusMap({});
      }
    } catch (err) {
      console.error('Error loading git status:', err);
      setGitStatusMap({});
    }
  }, [rootPath]);

  // Load root directory
  useEffect(() => {
    const loadRoot = async () => {
      setLoading(true);
      setError(null);
      try {
        const entries = await loadDirectory(rootPath);
        setRootEntries(entries);
      } catch (err) {
        setError('Failed to load directory');
        console.error('Error loading directory:', err);
      } finally {
        setLoading(false);
      }
    };

    if (rootPath) {
      loadRoot();
      loadGitStatus();
      setExpandedDirs(new Set());
      watchedDirsRef.current.clear();
      childrenCacheRef.current.clear();
    }
  }, [rootPath, loadDirectory, loadGitStatus]);

  // Handle manual refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refreshDirectory(rootPath);
      loadGitStatus();
      // Also refresh expanded directories
      for (const dir of expandedDirs) {
        loadDirectory(dir);
      }
    }
  }, [refreshTrigger, rootPath, refreshDirectory, expandedDirs, loadDirectory, loadGitStatus]);

  // Set up file watching
  useEffect(() => {
    if (!rootPath) return;

    // Watch root directory
    window.electronAPI.fs.watchDirectory(rootPath);
    watchedDirsRef.current.add(rootPath);

    // Subscribe to change events
    const cleanup = window.electronAPI.fs.onDirectoryChanged((event: FileWatchEvent) => {
      // Check if this event is for a directory we care about
      if (watchedDirsRef.current.has(event.directory)) {
        refreshDirectory(event.directory);
      }
    });

    return () => {
      cleanup();
      // Unwatch all directories when component unmounts
      for (const dir of watchedDirsRef.current) {
        window.electronAPI.fs.unwatchDirectory(dir);
      }
      watchedDirsRef.current.clear();
    };
  }, [rootPath, refreshDirectory]);

  // Set up git status watching
  useEffect(() => {
    if (!rootPath || !isGitRepo) return;

    let gitRoot: string | null = null;

    const setupGitWatch = async () => {
      gitRoot = await window.electronAPI.git.getRoot(rootPath);
      if (gitRoot) {
        window.electronAPI.git.watchRepo(gitRoot);
      }
    };

    setupGitWatch();

    // Subscribe to git status change events
    const cleanup = window.electronAPI.git.onStatusChanged((event) => {
      if (gitRoot && event.repoRoot === gitRoot) {
        loadGitStatus();
      }
    });

    return () => {
      cleanup();
      if (gitRoot) {
        window.electronAPI.git.unwatchRepo(gitRoot);
      }
    };
  }, [rootPath, isGitRepo, loadGitStatus]);

  const handleDirectoryToggle = useCallback((path: string, isExpanded: boolean) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(path);
        // Start watching expanded directory
        if (!watchedDirsRef.current.has(path)) {
          window.electronAPI.fs.watchDirectory(path);
          watchedDirsRef.current.add(path);
        }
      } else {
        next.delete(path);
        // Stop watching collapsed directory
        if (watchedDirsRef.current.has(path) && path !== rootPath) {
          window.electronAPI.fs.unwatchDirectory(path);
          watchedDirsRef.current.delete(path);
        }
      }
      return next;
    });
  }, [rootPath]);

  const loadChildren = useCallback(async (dirPath: string): Promise<FileEntry[]> => {
    return loadDirectory(dirPath);
  }, [loadDirectory]);

  const getChildren = useCallback((dirPath: string): FileEntry[] => {
    return childrenCacheRef.current.get(dirPath) || [];
  }, []);

  if (loading) {
    return <div className="file-tree-loading">Loading...</div>;
  }

  if (error) {
    return <div className="file-tree-error">{error}</div>;
  }

  if (rootEntries.length === 0) {
    return <div className="file-tree-empty">Empty directory</div>;
  }

  return (
    <div className="file-tree">
      {rootEntries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          level={0}
          onFileClick={onFileClick}
          onDirectoryToggle={handleDirectoryToggle}
          expandedDirs={expandedDirs}
          loadChildren={loadChildren}
          getChildren={getChildren}
          gitStatusMap={gitStatusMap}
        />
      ))}
    </div>
  );
};

export default FileTree;

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileEntry } from '../../shared/types';

export interface UseDirectoryLoaderResult {
  rootEntries: FileEntry[];
  loading: boolean;
  error: string | null;
  expandedDirs: Set<string>;
  watchedDirsRef: React.MutableRefObject<Set<string>>;
  childrenCacheRef: React.MutableRefObject<Map<string, FileEntry[]>>;
  loadDirectory: (dirPath: string) => Promise<FileEntry[]>;
  refreshDirectory: (dirPath: string) => Promise<void>;
  handleDirectoryToggle: (path: string, isExpanded: boolean) => void;
  loadChildren: (dirPath: string) => Promise<FileEntry[]>;
  getChildren: (dirPath: string) => FileEntry[];
}

export function useDirectoryLoader(rootPath: string, refreshTrigger: number): UseDirectoryLoaderResult {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setExpandedDirs(prev => new Set(prev));
  }, [loadDirectory, rootPath]);

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
      setExpandedDirs(new Set());
      watchedDirsRef.current.clear();
      childrenCacheRef.current.clear();
    }
  }, [rootPath, loadDirectory]);

  // Handle manual refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refreshDirectory(rootPath);
      for (const dir of expandedDirs) {
        loadDirectory(dir);
      }
    }
  }, [refreshTrigger, rootPath, refreshDirectory, expandedDirs, loadDirectory]);

  const handleDirectoryToggle = useCallback((path: string, isExpanded: boolean) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(path);
        if (!watchedDirsRef.current.has(path)) {
          window.electronAPI.fs.watchDirectory(path);
          watchedDirsRef.current.add(path);
        }
      } else {
        next.delete(path);
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

  return {
    rootEntries, loading, error, expandedDirs,
    watchedDirsRef, childrenCacheRef,
    loadDirectory, refreshDirectory, handleDirectoryToggle,
    loadChildren, getChildren,
  };
}

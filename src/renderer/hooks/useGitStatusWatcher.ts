import { useState, useEffect, useCallback } from 'react';
import type { GitStatusMap } from '../../shared/types';

export interface UseGitStatusWatcherResult {
  gitStatusMap: GitStatusMap;
  refreshGitStatus: () => void;
}

export function useGitStatusWatcher(rootPath: string): UseGitStatusWatcherResult {
  const [gitStatusMap, setGitStatusMap] = useState<GitStatusMap>({});
  const [isGitRepo, setIsGitRepo] = useState(false);

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

  // Load git status on mount / rootPath change
  useEffect(() => {
    if (rootPath) {
      loadGitStatus();
    }
  }, [rootPath, loadGitStatus]);

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

    const cleanup = window.electronAPI.git.onStatusChanged((event: { repoRoot: string }) => {
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

  return { gitStatusMap, refreshGitStatus: loadGitStatus };
}

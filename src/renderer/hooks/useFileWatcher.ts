import { useEffect } from 'react';
import type { FileWatchEvent } from '../../shared/types';

export function useFileWatcher(
  rootPath: string,
  watchedDirsRef: React.MutableRefObject<Set<string>>,
  refreshDirectory: (dirPath: string) => void,
  onRefresh?: () => void,
): void {
  useEffect(() => {
    if (!rootPath) return;

    window.electronAPI.fs.watchDirectory(rootPath);
    watchedDirsRef.current.add(rootPath);

    const cleanup = window.electronAPI.fs.onDirectoryChanged((event: FileWatchEvent) => {
      if (watchedDirsRef.current.has(event.directory)) {
        refreshDirectory(event.directory);
        onRefresh?.();
      }
    });

    return () => {
      cleanup();
      for (const dir of watchedDirsRef.current) {
        window.electronAPI.fs.unwatchDirectory(dir);
      }
      watchedDirsRef.current.clear();
    };
  }, [rootPath, refreshDirectory, onRefresh]);
}

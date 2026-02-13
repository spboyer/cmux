import React from 'react';
import { FileTreeNode } from './FileTreeNode';
import { useDirectoryLoader } from '../../hooks/useDirectoryLoader';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import { useGitStatusWatcher } from '../../hooks/useGitStatusWatcher';

interface FileTreeProps {
  rootPath: string;
  onFileClick: (filePath: string) => void;
  refreshTrigger?: number;
  showHiddenFiles?: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({ rootPath, onFileClick, refreshTrigger, showHiddenFiles }) => {
  const {
    rootEntries, loading, error, expandedDirs,
    watchedDirsRef, refreshDirectory,
    handleDirectoryToggle, loadChildren, getChildren,
  } = useDirectoryLoader(rootPath, refreshTrigger ?? 0, showHiddenFiles);

  const { gitStatusMap, refreshGitStatus } = useGitStatusWatcher(rootPath);

  useFileWatcher(rootPath, watchedDirsRef, refreshDirectory, refreshGitStatus);

  // Refresh git status on manual refresh
  React.useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refreshGitStatus();
    }
  }, [refreshTrigger, refreshGitStatus]);

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


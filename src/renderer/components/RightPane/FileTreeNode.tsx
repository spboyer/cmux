import React, { useState, useEffect, useMemo } from 'react';
import { Icon, getFileIcon } from '../Icon';
import type { FileEntry, GitFileStatus, GitStatusMap } from '../../../shared/types';

// Priority order for folder status (lower = higher priority)
const STATUS_PRIORITY: Record<GitFileStatus, number> = {
  deleted: 1,
  modified: 2,
  staged: 3,
  added: 4,
  renamed: 5,
  untracked: 6,
  ignored: 7,
};

interface FileTreeNodeProps {
  entry: FileEntry;
  level: number;
  onFileClick: (path: string) => void;
  onDirectoryToggle: (path: string, isExpanded: boolean) => void;
  expandedDirs: Set<string>;
  loadChildren: (path: string) => Promise<FileEntry[]>;
  getChildren: (path: string) => FileEntry[];
  gitStatusMap: GitStatusMap;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  entry,
  level,
  onFileClick,
  onDirectoryToggle,
  expandedDirs,
  loadChildren,
  getChildren,
  gitStatusMap,
}) => {
  const [loading, setLoading] = useState(false);
  const isExpanded = expandedDirs.has(entry.path);
  const children = getChildren(entry.path);

  // Get git status for this file/folder
  const gitStatus = useMemo(() => {
    if (!entry.isDirectory) {
      return gitStatusMap[entry.path];
    }
    // For directories, compute the "worst" status from children
    let worstStatus: GitFileStatus | undefined;
    let worstPriority = Infinity;
    
    for (const [filePath, status] of Object.entries(gitStatusMap)) {
      // Check if this file is under this directory
      if (filePath.startsWith(entry.path + '\\') || filePath.startsWith(entry.path + '/')) {
        const priority = STATUS_PRIORITY[status];
        if (priority < worstPriority) {
          worstPriority = priority;
          worstStatus = status;
        }
      }
    }
    return worstStatus;
  }, [entry.path, entry.isDirectory, gitStatusMap]);

  const statusClass = gitStatus ? `git-status-${gitStatus}` : '';

  // Load children when directory is expanded and not yet loaded
  useEffect(() => {
    if (entry.isDirectory && isExpanded && children.length === 0) {
      setLoading(true);
      loadChildren(entry.path).finally(() => setLoading(false));
    }
  }, [entry.isDirectory, entry.path, isExpanded, children.length, loadChildren]);

  const handleClick = async () => {
    if (entry.isDirectory) {
      if (!isExpanded && children.length === 0) {
        setLoading(true);
        await loadChildren(entry.path);
        setLoading(false);
      }
      onDirectoryToggle(entry.path, !isExpanded);
    } else {
      onFileClick(entry.path);
    }
  };

  const indent = level * 16 + 8;

  return (
    <div>
      <div
        className={`file-tree-node ${statusClass}`}
        style={{ paddingLeft: `${indent}px` }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        {entry.isDirectory && (
          <span className="chevron">
            <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size="sm" />
          </span>
        )}
        <span className="file-icon">
          {entry.isDirectory ? (
            <Icon name={isExpanded ? 'folder-opened' : 'folder'} size="sm" />
          ) : (
            <Icon name={getFileIcon(entry.name)} size="sm" />
          )}
        </span>
        <span className={`file-name ${statusClass}`}>{entry.name}</span>
        {loading && <span className="loading">loading...</span>}
      </div>
      {entry.isDirectory && isExpanded && (
        <div className="file-tree-children">
          {children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              level={level + 1}
              onFileClick={onFileClick}
              onDirectoryToggle={onDirectoryToggle}
              expandedDirs={expandedDirs}
              loadChildren={loadChildren}
              getChildren={getChildren}
              gitStatusMap={gitStatusMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileTreeNode;

import React, { useState, useEffect } from 'react';
import { Icon, getFileIcon } from '../Icon';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

interface FileTreeNodeProps {
  entry: FileEntry;
  level: number;
  onFileClick: (path: string) => void;
  onDirectoryToggle: (path: string, isExpanded: boolean) => void;
  expandedDirs: Set<string>;
  loadChildren: (path: string) => Promise<FileEntry[]>;
  getChildren: (path: string) => FileEntry[];
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  entry,
  level,
  onFileClick,
  onDirectoryToggle,
  expandedDirs,
  loadChildren,
  getChildren,
}) => {
  const [loading, setLoading] = useState(false);
  const isExpanded = expandedDirs.has(entry.path);
  const children = getChildren(entry.path);

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
        className="file-tree-node"
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
        <span className="file-name">{entry.name}</span>
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileTreeNode;

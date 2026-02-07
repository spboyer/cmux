import * as React from 'react';
import '@vscode/codicons/dist/codicon.css';

export type IconName =
  | 'terminal'
  | 'add'
  | 'close'
  | 'chevron-right'
  | 'chevron-down'
  | 'folder'
  | 'folder-opened'
  | 'file'
  | 'file-code'
  | 'symbol-file'
  | 'json'
  | 'markdown'
  | 'copilot'
  | 'comment-discussion'
  | 'refresh'
  | 'ellipsis'
  | 'search'
  | 'settings-gear'
  | 'symbol-method'
  | 'symbol-class'
  | 'symbol-interface'
  | 'css'
  | 'html'
  | 'python'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'java'
  | 'database'
  | 'git-commit'
  | 'git-branch'
  | 'source-control'
  | 'package'
  | 'lock'
  | 'image'
  | 'library'
  | 'send'
  | 'stop-circle';

interface IconProps {
  name: IconName;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

const sizeMap = {
  sm: 'var(--icon-sm)',
  md: 'var(--icon-md)',
  lg: 'var(--icon-lg)',
};

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 'md', 
  className = '', 
  style,
  title 
}) => {
  const fontSize = typeof size === 'number' ? `${size}px` : sizeMap[size];
  
  return (
    <i
      className={`codicon codicon-${name} ${className}`}
      style={{ fontSize, ...style }}
      title={title}
      aria-hidden={!title}
      role={title ? 'img' : undefined}
      aria-label={title}
    />
  );
};

// File extension to icon mapping
const extensionIconMap: Record<string, IconName> = {
  // TypeScript/JavaScript
  ts: 'symbol-class',
  tsx: 'symbol-class',
  js: 'symbol-method',
  jsx: 'symbol-method',
  mjs: 'symbol-method',
  cjs: 'symbol-method',
  
  // Data/Config
  json: 'json',
  yaml: 'symbol-file',
  yml: 'symbol-file',
  toml: 'symbol-file',
  xml: 'symbol-file',
  
  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  
  // Documentation
  md: 'markdown',
  mdx: 'markdown',
  txt: 'file',
  
  // Languages
  py: 'python',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  java: 'java',
  
  // Other
  sql: 'database',
  db: 'database',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  svg: 'image',
  ico: 'image',
  lock: 'lock',
};

// Special filename mappings
const filenameIconMap: Record<string, IconName> = {
  'package.json': 'package',
  'package-lock.json': 'lock',
  'tsconfig.json': 'json',
  '.gitignore': 'git-commit',
  '.git': 'source-control',
  'dockerfile': 'package',
  'license': 'file',
  'readme.md': 'markdown',
};

export function getFileIcon(filename: string): IconName {
  const lowerName = filename.toLowerCase();
  
  // Check special filenames first
  if (filenameIconMap[lowerName]) {
    return filenameIconMap[lowerName];
  }
  
  // Get extension
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && extensionIconMap[ext]) {
    return extensionIconMap[ext];
  }
  
  return 'file';
}

export default Icon;

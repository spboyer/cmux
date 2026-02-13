import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface FileViewProps {
  filePath: string;
  fileName: string;
}

// Map file extensions to Monaco language IDs
function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    sh: 'shell',
    bash: 'shell',
    ps1: 'powershell',
    sql: 'sql',
    graphql: 'graphql',
    dockerfile: 'dockerfile',
  };
  return languageMap[ext || ''] || 'plaintext';
}

export const FileView: React.FC<FileViewProps> = ({ filePath, fileName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load file content
  useEffect(() => {
    const loadFile = async () => {
      setLoading(true);
      setError(null);
      try {
        const fileContent = await window.electronAPI.fs.readFile(filePath);
        setContent(fileContent);
      } catch (err) {
        setError(`Failed to load file: ${err}`);
        console.error('Error loading file:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  // Initialize Monaco editor
  useEffect(() => {
    if (!containerRef.current || content === null) return;

    // Dispose existing editor
    if (editorRef.current) {
      editorRef.current.dispose();
    }

    const language = getLanguageFromFileName(fileName);

    editorRef.current = monaco.editor.create(containerRef.current, {
      value: content,
      language,
      theme: 'vs-dark',
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      wordWrap: 'on',
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [content, fileName]);

  if (loading) {
    return (
      <div className="file-view-loading">
        <p>Loading {fileName}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-view-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="file-view-container" ref={containerRef} />
  );
};


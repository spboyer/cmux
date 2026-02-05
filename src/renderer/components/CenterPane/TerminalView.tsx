import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  terminalId: string;
  cwd: string;
  isActive: boolean;
}

export function TerminalView({ terminalId, cwd, isActive }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      if (fitAddonRef.current && xtermRef.current && terminalRef.current) {
        // Only fit if container has dimensions
        const { offsetWidth, offsetHeight } = terminalRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          try {
            fitAddonRef.current.fit();
            const { cols, rows } = xtermRef.current;
            window.electronAPI.terminal.resize(terminalId, cols, rows);
          } catch (e) {
            // Ignore fit errors during rapid resize
          }
        }
      }
    }, 100); // 100ms debounce
  }, [terminalId]);

  useEffect(() => {
    if (!terminalRef.current || initializedRef.current) return;

    // Create terminal
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    initializedRef.current = true;

    // Initial fit after a short delay to ensure container is ready
    setTimeout(() => {
      fitAddon.fit();
      // Create PTY in main process with correct size
      window.electronAPI.terminal.create(terminalId, cwd);
      // Send initial size
      window.electronAPI.terminal.resize(terminalId, term.cols, term.rows);
    }, 50);

    // Handle terminal input
    term.onData((data) => {
      window.electronAPI.terminal.write(terminalId, data);
    });

    // Intercept copy/paste shortcuts before xterm processes them
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      // Only handle keydown events, not keyup
      if (e.type !== 'keydown') {
        return true;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.key.toLowerCase() === 'c') {
        const selection = term.getSelection();
        if (selection) {
          // Copy selected text to clipboard, prevent xterm from sending SIGINT
          e.preventDefault();
          navigator.clipboard.writeText(selection);
          term.clearSelection();
          return false; // Prevent xterm from handling this key
        }
        // No selection - let xterm send SIGINT
        return true;
      } else if (modifierKey && e.key.toLowerCase() === 'v') {
        // Paste from clipboard - prevent default browser paste AND xterm handling
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          if (text && xtermRef.current) {
            window.electronAPI.terminal.write(terminalId, text);
          }
        });
        return false; // Prevent xterm from handling this key
      }
      return true; // Let xterm handle all other keys
    });

    // Handle terminal output from main process
    window.electronAPI.terminal.onData((id, data) => {
      if (id === terminalId && xtermRef.current) {
        xtermRef.current.write(data);
      }
    });

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [terminalId, cwd, handleResize]);

  // Fit terminal when becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current && xtermRef.current) {
      // Delay to ensure container is visible and has dimensions
      setTimeout(() => {
        handleResize();
        xtermRef.current?.focus();
      }, 50);
    }
  }, [isActive, handleResize]);

  return (
    <div
      ref={terminalRef}
      className="terminal-container"
      style={{
        width: '100%',
        height: '100%',
        display: isActive ? 'block' : 'none',
      }}
    />
  );
}

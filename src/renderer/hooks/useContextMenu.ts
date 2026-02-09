import { useState, useEffect, useCallback } from 'react';

export interface ContextMenuState<T> {
  visible: boolean;
  x: number;
  y: number;
  target: T | null;
}

export interface UseContextMenuResult<T> {
  contextMenu: ContextMenuState<T>;
  openContextMenu: (e: React.MouseEvent, target: T) => void;
  closeContextMenu: () => void;
}

export function useContextMenu<T>(): UseContextMenuResult<T> {
  const [contextMenu, setContextMenu] = useState<ContextMenuState<T>>({
    visible: false,
    x: 0,
    y: 0,
    target: null,
  });

  const openContextMenu = useCallback((e: React.MouseEvent, target: T) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, target });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, target: null });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, target: null });
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  return { contextMenu, openContextMenu, closeContextMenu };
}

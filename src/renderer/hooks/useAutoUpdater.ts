import { useState, useEffect, useCallback } from 'react';
import { UpdateState } from '../../shared/types';

export interface UseAutoUpdaterResult {
  updateState: UpdateState;
  isUpdateDismissed: boolean;
  handleDownload: () => void;
  handleInstall: () => void;
  handleDismiss: () => void;
}

export function useAutoUpdater(): UseAutoUpdaterResult {
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);

  useEffect(() => {
    const unsubStatus = window.electronAPI.updates.onStatus((data: Record<string, unknown>) => {
      setUpdateState(prev => ({
        ...prev,
        status: data.status as UpdateState['status'],
        info: data.info as UpdateState['info'],
        error: data.message as string | undefined,
      }));
      if (data.status === 'available' || data.status === 'ready') {
        setIsUpdateDismissed(false);
      }
    });

    const unsubProgress = window.electronAPI.updates.onProgress((progress: UpdateState['progress']) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'downloading',
        progress,
      }));
    });

    return () => {
      unsubStatus();
      unsubProgress();
    };
  }, []);

  const handleDownload = useCallback(() => {
    window.electronAPI.updates.download();
  }, []);

  const handleInstall = useCallback(() => {
    window.electronAPI.updates.install();
  }, []);

  const handleDismiss = useCallback(() => {
    setIsUpdateDismissed(true);
  }, []);

  return { updateState, isUpdateDismissed, handleDownload, handleInstall, handleDismiss };
}

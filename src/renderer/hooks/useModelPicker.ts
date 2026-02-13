import { useState, useEffect, useRef } from 'react';
import { ModelInfo, AppAction } from '../../shared/types';

interface UseModelPickerResult {
  pickerOpen: boolean;
  setPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pickerRef: React.RefObject<HTMLDivElement>;
  selectedModelName: string;
}

export function useModelPicker(
  availableModels: ModelInfo[],
  selectedModel: string | null,
  chatLoading: boolean,
  dispatch: React.Dispatch<AppAction>,
): UseModelPickerResult {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch available models on mount
  useEffect(() => {
    if (availableModels.length > 0) return;
    window.electronAPI.copilot.listModels()
      .then((models: ModelInfo[]) => {
        dispatch({ type: 'SET_AVAILABLE_MODELS', payload: { models } });
        if (!selectedModel) {
          const lastUsed = localStorage.getItem('lastUsedModel');
          const defaultModel = lastUsed && models.some(m => m.id === lastUsed)
            ? lastUsed
            : models[0]?.id ?? null;
          dispatch({ type: 'SET_SELECTED_MODEL', payload: { model: defaultModel } });
        }
      })
      .catch(() => { /* models unavailable — picker will be hidden */ });
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [pickerOpen]);

  const selectedModelName = availableModels.find(m => m.id === selectedModel)?.name
    ?? selectedModel ?? 'Model';

  return { pickerOpen, setPickerOpen, pickerRef, selectedModelName };
}

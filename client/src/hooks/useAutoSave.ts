import { useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  debounceMs?: number;
  onSave: () => Promise<void>;
}

export function useAutoSave({ debounceMs = 2000, onSave }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const isFirstRender = useRef(true);

  const save = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setStatus('saving');

    debounceTimer.current = setTimeout(async () => {
      try {
        await onSave();
        setStatus('saved');
        
        setTimeout(() => {
          setStatus('idle');
        }, 2000);
      } catch (error) {
        setStatus('error');
        console.error('Auto-save error:', error);
        
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      }
    }, debounceMs);
  };

  const reset = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setStatus('idle');
    isFirstRender.current = true;
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { status, save, reset };
}

export function getAutoSaveStatusDisplay(status: SaveStatus) {
  const statusConfig: Record<SaveStatus, { icon: string; text: string; color: string }> = {
    idle: { icon: '', text: '', color: '' },
    saving: {
      icon: 'hourglass',
      text: 'Salvando...',
      color: 'text-blue-500'
    },
    saved: {
      icon: 'check',
      text: 'Salvo',
      color: 'text-green-500'
    },
    error: {
      icon: 'x',
      text: 'Erro ao salvar',
      color: 'text-red-500'
    }
  };

  return statusConfig[status];
}

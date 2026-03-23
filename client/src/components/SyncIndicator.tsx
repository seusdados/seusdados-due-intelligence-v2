import React, { useEffect, useState } from 'react';
import { Check, Cloud, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncIndicatorProps {
  status: SyncStatus;
  lastSyncTime?: Date;
  errorMessage?: string;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function SyncIndicator({
  status,
  lastSyncTime,
  errorMessage,
  className,
  showLabel = true,
  compact = false,
}: SyncIndicatorProps) {
  const [displayMessage, setDisplayMessage] = useState<string>('');

  useEffect(() => {
    if (status === 'success' && lastSyncTime) {
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000);

      if (diffSeconds < 60) {
        setDisplayMessage('Sincronizado agora');
      } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        setDisplayMessage(`Sincronizado há ${minutes}m`);
      } else {
        const hours = Math.floor(diffSeconds / 3600);
        setDisplayMessage(`Sincronizado há ${hours}h`);
      }
    } else if (status === 'syncing') {
      setDisplayMessage('Sincronizando...');
    } else if (status === 'error') {
      setDisplayMessage('Erro ao sincronizar');
    } else {
      setDisplayMessage('');
    }
  }, [status, lastSyncTime]);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {status === 'syncing' && (
          <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
        )}
        {status === 'success' && (
          <Check className="h-3 w-3 text-green-500" />
        )}
        {status === 'error' && (
          <AlertCircle className="h-3 w-3 text-red-500" />
        )}
        {status === 'idle' && (
          <Cloud className="h-3 w-3 text-gray-400" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
        {
          'bg-blue-50 text-blue-700': status === 'syncing',
          'bg-green-50 text-green-700': status === 'success',
          'bg-red-50 text-red-700': status === 'error',
          'bg-gray-50 text-gray-500': status === 'idle',
        },
        className
      )}
    >
      {status === 'syncing' && (
        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
      )}
      {status === 'success' && (
        <Check className="h-4 w-4 flex-shrink-0" />
      )}
      {status === 'error' && (
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
      )}
      {status === 'idle' && (
        <Cloud className="h-4 w-4 flex-shrink-0" />
      )}

      {showLabel && (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium">
            {status === 'syncing' && 'Sincronizando'}
            {status === 'success' && 'Sincronizado'}
            {status === 'error' && 'Erro na Sincronização'}
            {status === 'idle' && 'Pronto'}
          </p>
          {displayMessage && (
            <p className="text-xs opacity-75">{displayMessage}</p>
          )}
          {status === 'error' && errorMessage && (
            <p className="text-xs opacity-75">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook para gerenciar estado de sincronização
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const startSync = () => {
    setStatus('syncing');
    setErrorMessage(undefined);
  };

  const finishSync = () => {
    setStatus('success');
    setLastSyncTime(new Date());
    setErrorMessage(undefined);

    // Voltar para idle após 3 segundos
    const timeout = setTimeout(() => {
      setStatus('idle');
    }, 3000);

    return () => clearTimeout(timeout);
  };

  const errorSync = (message: string) => {
    setStatus('error');
    setErrorMessage(message);

    // Voltar para idle após 5 segundos
    const timeout = setTimeout(() => {
      setStatus('idle');
      setErrorMessage(undefined);
    }, 5000);

    return () => clearTimeout(timeout);
  };

  return {
    status,
    lastSyncTime,
    errorMessage,
    startSync,
    finishSync,
    errorSync,
  };
}

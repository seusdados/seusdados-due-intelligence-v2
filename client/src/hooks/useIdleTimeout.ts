import { useEffect, useRef, useCallback, useState } from 'react';

interface UseIdleTimeoutOptions {
  timeout: number; // tempo em milissegundos
  onIdle: () => void;
  onActive?: () => void;
  warningTime?: number; // tempo antes do timeout para mostrar aviso (em ms)
  onWarning?: () => void;
  enabled?: boolean;
}

export function useIdleTimeout({
  timeout,
  onIdle,
  onActive,
  warningTime = 60000, // 1 minuto antes por padrão
  onWarning,
  enabled = true,
}: UseIdleTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeout);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    clearAllTimeouts();
    setIsIdle(false);
    setShowWarning(false);
    setRemainingTime(timeout);

    // Timer para aviso
    if (warningTime && onWarning) {
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
        onWarning();
        
        // Iniciar countdown
        let remaining = warningTime;
        setRemainingTime(remaining);
        countdownRef.current = setInterval(() => {
          remaining -= 1000;
          setRemainingTime(remaining);
          if (remaining <= 0) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
          }
        }, 1000);
      }, timeout - warningTime);
    }

    // Timer principal
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      setShowWarning(false);
      onIdle();
    }, timeout);

    if (onActive && isIdle) {
      onActive();
    }
  }, [timeout, onIdle, onActive, warningTime, onWarning, enabled, clearAllTimeouts, isIdle]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      clearAllTimeouts();
      return;
    }

    // Eventos que indicam atividade do usuário
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'keypress',
    ];

    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimeouts();
    };
  }, [enabled, handleActivity, resetTimer, clearAllTimeouts]);

  return {
    isIdle,
    showWarning,
    remainingTime,
    resetTimer,
  };
}

// Constantes de configuração padrão
export const IDLE_TIMEOUT_DEFAULTS = {
  // 30 minutos de inatividade
  TIMEOUT: 30 * 60 * 1000,
  // Aviso 2 minutos antes
  WARNING_TIME: 2 * 60 * 1000,
};

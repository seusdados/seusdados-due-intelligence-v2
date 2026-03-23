import { useFocusMode } from '@/contexts/FocusModeContext';
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function FocusModeIndicator() {
  const { isFocusMode } = useFocusMode();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (isFocusMode) {
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isFocusMode]);

  if (!showNotification) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg"
        style={{
          backgroundColor: isFocusMode ? 'var(--brand-accent)' : 'var(--bg-secondary)',
          color: isFocusMode ? 'white' : 'var(--text-primary)',
        }}
      >
        {isFocusMode ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
        <span className="font-medium text-sm">
          {isFocusMode ? 'Modo Foco Ativado' : 'Modo Foco Desativado'}
        </span>
        <span className="text-xs opacity-75 ml-2">Ctrl+Shift+F</span>
      </div>
    </div>
  );
}

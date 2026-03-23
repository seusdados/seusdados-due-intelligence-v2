import { useRef, useCallback, useMemo } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em ms
}

interface UseAnalysisCacheReturn<T> {
  get: (key: string) => T | null;
  set: (key: string, data: T, ttl?: number) => void;
  clear: () => void;
  has: (key: string) => boolean;
  size: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

export function useAnalysisCache<T>(
  maxSize: number = 50
): UseAnalysisCacheReturn<T> {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cacheRef.current.delete(key);
      return null;
    }

    return entry.data;
  }, []);

  const set = useCallback((key: string, data: T, ttl: number = DEFAULT_TTL) => {
    // Limpar entradas expiradas se cache está cheio
    if (cacheRef.current.size >= maxSize) {
      const now = Date.now();
      const entriesToDelete: string[] = [];

      for (const [k, v] of cacheRef.current.entries()) {
        if (now - v.timestamp > v.ttl) {
          entriesToDelete.push(k);
        }
      }

      entriesToDelete.forEach((k) => cacheRef.current.delete(k));

      // Se ainda estiver cheio, remover entrada mais antiga
      if (cacheRef.current.size >= maxSize) {
        const oldestKey = Array.from(cacheRef.current.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp
        )[0]?.[0];
        if (oldestKey) cacheRef.current.delete(oldestKey);
      }
    }

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }, [maxSize]);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const has = useCallback((key: string): boolean => {
    return get(key) !== null;
  }, [get]);

  const size = useMemo(() => cacheRef.current.size, []);

  return useMemo(
    () => ({
      get,
      set,
      clear,
      has,
      size,
    }),
    [get, set, clear, has, size]
  );
}

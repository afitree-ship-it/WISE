import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchLive, getClientId, LiveRow, LockMap } from './liveSync';

interface Options {
  enabled: boolean;
  intervalMs?: number;
  onRows: (rows: LiveRow[]) => void;
}

/**
 * Polls the lightweight `live` endpoint for supervisor values and field locks.
 * `supported` is null until the first response, false when the backend is an older
 * version without the endpoint (callers then fall back to full refreshes).
 */
export const useLiveSupervisors = ({ enabled, intervalMs = 3000, onRows }: Options) => {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [locks, setLocks] = useState<LockMap>({});
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const onRowsRef = useRef(onRows);
  onRowsRef.current = onRows;
  const inFlight = useRef(false);
  const supportedRef = useRef<boolean | null>(null);

  const poll = useCallback(async () => {
    if (inFlight.current || supportedRef.current === false) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    inFlight.current = true;
    try {
      const snap = await fetchLive();
      if (!snap) {
        supportedRef.current = false;
        setSupported(false);
        return;
      }
      supportedRef.current = true;
      setSupported(true);
      const me = getClientId();
      const others: LockMap = {};
      Object.entries(snap.locks || {}).forEach(([id, l]) => {
        if (l && l.by !== me) others[id] = l;
      });
      setLocks(others);
      setLastSyncAt(Date.now());
      onRowsRef.current(snap.rows);
    } catch (e) {
      console.warn('live poll failed', e);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    poll();
    const t = setInterval(poll, intervalMs);
    const onVis = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, intervalMs, poll]);

  return { supported, locks, lastSyncAt, pollNow: poll };
};

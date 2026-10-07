import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchLive, getClientId, LiveRow, LiveSnapshot, LockMap } from './liveSync';

interface Options {
  enabled: boolean;
  intervalMs?: number;
  currentVersion?: string;
  onSnapshot?: (snap: LiveSnapshot) => void;
  onRows?: (rows: LiveRow[]) => void;
}

const shallowLocksEqual = (a: LockMap, b: LockMap): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!b[k] || a[k].by !== b[k].by || a[k].until !== b[k].until) return false;
  }
  return true;
};

/**
 * Polls the lightweight `live` endpoint for supervisor values and field locks.
 * `supported` is null until the first response, false when the backend is an older
 * version without the endpoint (callers then fall back to full refreshes).
 */
export const useLiveSupervisors = ({ enabled, intervalMs = 3500, currentVersion, onSnapshot, onRows }: Options) => {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [locks, setLocks] = useState<LockMap>({});
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const onRowsRef = useRef(onRows);
  onRowsRef.current = onRows;
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;
  const currentVersionRef = useRef(currentVersion);
  currentVersionRef.current = currentVersion;
  const inFlight = useRef(false);
  const supportedRef = useRef<boolean | null>(null);

  const poll = useCallback(async () => {
    if (inFlight.current || supportedRef.current === false) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    inFlight.current = true;
    try {
      const snap = await fetchLive(currentVersionRef.current);
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

      // Avoid triggering React re-renders if locks haven't changed
      setLocks(prev => (shallowLocksEqual(prev, others) ? prev : others));

      // If data is unchanged, do not trigger any re-renders or updates
      if (snap.unchanged) {
        return;
      }

      setLastSyncAt(Date.now());
      if (onSnapshotRef.current) onSnapshotRef.current(snap);
      if (snap.rows && onRowsRef.current) onRowsRef.current(snap.rows);
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
    const onFocus = () => { poll(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, intervalMs, poll]);

  return { supported, locks, lastSyncAt, pollNow: poll };
};

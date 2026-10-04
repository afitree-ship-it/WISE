import { SHEET_API_URL, withCacheBust } from './config';

/** A lock held on one student's supervisor field. */
export interface FieldLock {
  by: string;     // clientId of the holder
  name: string;   // display name of the holder
  until: number;  // epoch ms when it expires
}
export type LockMap = Record<string, FieldLock>;

export interface LiveRow {
  id: string;
  studentId: string;
  supervisor: string;
  lastUpdated: number;
}

export interface LiveSnapshot {
  serverTime: number;
  rows: LiveRow[];
  locks: LockMap;
}

const CLIENT_KEY = 'wise_client_id';
const NAME_KEY = 'wise_editor_name';

export const getClientId = (): string => {
  try {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  } catch {
    return 'c-anon';
  }
};

export const getEditorName = (): string => {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
};

export const setEditorName = (name: string) => {
  try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* ignore */ }
};

const post = async (payload: object): Promise<any> => {
  const res = await fetch(SHEET_API_URL, {
    method: 'POST',
    redirect: 'follow',
    // text/plain avoids a CORS preflight, which Apps Script does not answer
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  try { return await res.json(); } catch { return {}; }
};

/** Returns null when the backend has not been updated with the live endpoint yet. */
export const fetchLive = async (): Promise<LiveSnapshot | null> => {
  const res = await fetch(withCacheBust(SHEET_API_URL, 'type=live'), { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json || typeof json.serverTime !== 'number' || !Array.isArray(json.rows)) return null;
  return json as LiveSnapshot;
};

export type LockResult = { ok: true } | { ok: false; lock?: FieldLock; unsupported?: boolean };

export const acquireLock = async (id: string): Promise<LockResult> => {
  const r = await post({ type: 'lock', action: 'acquire', id, clientId: getClientId(), name: getEditorName() });
  if (r?.status === 'success') return { ok: true };
  if (r?.status === 'locked') return { ok: false, lock: r.lock };
  // Old backend: lock type is unknown → treat as unsupported but allow editing
  return { ok: false, unsupported: true };
};

export const releaseLock = (id: string) =>
  post({ type: 'lock', action: 'release', id, clientId: getClientId() }).catch(() => undefined);

export type SaveResult = { ok: true; lastUpdated: number } | { ok: false; lock?: FieldLock; unsupported?: boolean };

export const saveSupervisor = async (id: string, studentId: string, supervisor: string): Promise<SaveResult> => {
  const r = await post({ type: 'supervisor', id, studentId, supervisor, clientId: getClientId() });
  if (r?.status === 'success') return { ok: true, lastUpdated: r.lastUpdated || Date.now() };
  if (r?.status === 'locked') return { ok: false, lock: r.lock };
  return { ok: false, unsupported: true };
};

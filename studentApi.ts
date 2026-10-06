import { SHEET_API_URL } from './config';

/* ------------------------------------------------------------------ */
/* Types shared by the student area, the admin viewer and the eval page */
/* ------------------------------------------------------------------ */

export interface StudentRecordLite {
  id: string; studentId: string; name: string; status: string; major: string; internshipType: string;
  location: string; position: string; term: string; academicYear: string; startDate: string; endDate: string; supervisor: string;
}

export interface Coworker { name: string; studentId?: string; major?: string }

export interface LogbookData {
  orgName?: string; orgAddress?: string; lat?: number; lng?: number;
  mentorName?: string; mentorPosition?: string; mentorPhone?: string; facebook?: string; line?: string;
  lodging?: string; coworkers?: Coworker[]; orgHistory?: string;
}

export interface Workplace { lat: number; lng: number; radius: number; address: string; workStart: string; workEnd: string; locked: boolean }

export interface AttendanceRow {
  date: string; inTime: number | null; outTime: number | null; inDist: number; outDist: number;
  inLat: number | null; inLng: number | null; outLat: number | null; outLng: number | null;
}

export interface EvalCategory { id: string; title: string; items: { id: string; title: string }[] }

export interface EvaluationResult {
  evaluatorName: string; evaluatorPosition: string; scores: Record<string, number>; comment: string;
  avg: number; percent: number; level: string; submittedAt: number;
}

export interface StudentBundle {
  studentId: string;
  photo?: string; // Drive thumbnail URL of the student's profile photo

  records: StudentRecordLite[];
  logbooks: Record<string, { data: LogbookData; updatedAt: number }>;
  diary: Record<string, Record<string, string>>;
  workplaces: Record<string, Workplace>;
  attendance: Record<string, AttendanceRow[]>;
  evalLinks: Record<string, string>;
  evaluations: Record<string, EvaluationResult[]>;
  criteria: EvalCategory[];
  today: string;
  serverTime: number;
}

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

/** Remembers a passed capability probe for a few days, so later visits skip the 2–3 s round trip. */
export const cachedProbe = (name: string, check: () => Promise<boolean>) => {
  const key = `wise_cap_${name}`;
  let memo: Promise<boolean> | null = null;
  return () => {
    if (memo) return memo;
    const live = check();
    live.then(ok => {
      try { if (ok) localStorage.setItem(key, String(Date.now())); else localStorage.removeItem(key); } catch { /* storage blocked */ }
      if (!ok) setTimeout(() => { memo = null; }, 60000);
    });
    let seen = 0;
    try { seen = Number(localStorage.getItem(key) || 0); } catch { /* storage blocked */ }
    // A recent pass answers at once; the live check still runs and corrects the cache
    memo = Date.now() - seen < 3 * 86400000 ? Promise.resolve(true) : live;
    return memo;
  };
};

const probeUrl = (type: string) => `${SHEET_API_URL}${SHEET_API_URL.includes('?') ? '&' : '?'}type=${type}&_=${Date.now()}`;

/** Read-only check, so an older Apps Script deployment never receives an unknown POST type. */
export const backendHasStudents = cachedProbe('student', () =>
  fetch(probeUrl('student'), { redirect: 'follow' })
    .then(r => r.json())
    .then(j => !!(j && j.student === true))
    .catch(() => false));

export interface DriveStatus { drive: boolean; fallback?: boolean; reason?: string; message?: string; url?: string; folder?: string }
/** Whether the script can write to the shared Drive folder (null when the backend has no such check yet). */
export const driveStatus = (): Promise<DriveStatus | null> =>
  fetch(probeUrl('drive'), { redirect: 'follow' })
    .then(r => r.json())
    .then(j => (j && typeof j.drive === 'boolean' ? j as DriveStatus : null))
    .catch(() => null);

export const post = async <T = any>(body: Record<string, unknown>): Promise<T> => {
  const res = await fetch(SHEET_API_URL, {
    method: 'POST',
    redirect: 'follow',
    // text/plain avoids a CORS preflight, which Apps Script does not answer
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  return res.json();
};

/* ------------------------------------------------------------------ */
/* Student session (token lives 6 h on the server)                     */
/* ------------------------------------------------------------------ */

const SESSION_KEY = 'wise_student_session';
export interface StudentSession { token: string; studentId: string }

export const loadSession = (): StudentSession | null => {
  try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); return s && s.token ? s : null; } catch { return null; }
};
export const saveSession = (s: StudentSession | null) => {
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* storage blocked */ }
};

export const studentCall = (op: string, data: Record<string, unknown> = {}) => post({ type: 'student', op, ...data });

/* ------------------------------------------------------------------ */
/* Staff key (the password used to sign in, checked by the server)     */
/* ------------------------------------------------------------------ */

const ADMIN_KEY = 'wise_admin_key';
export const getAdminKey = () => { try { return sessionStorage.getItem(ADMIN_KEY) || ''; } catch { return ''; } };
export const setAdminKey = (k: string | null) => {
  try { if (k) sessionStorage.setItem(ADMIN_KEY, k); else sessionStorage.removeItem(ADMIN_KEY); } catch { /* storage blocked */ }
};
export const adminCall = (op: string, data: Record<string, unknown> = {}) => post({ type: 'studentAdmin', op, adminKey: getAdminKey(), ...data });

/* ------------------------------------------------------------------ */
/* Evaluation scoring (mirrors code.gs)                                */
/* ------------------------------------------------------------------ */

export const DEFAULT_CRITERIA: EvalCategory[] = [
  { id: 'work', title: 'การปฏิบัติงาน', items: [] },
  { id: 'skill', title: 'ความรู้ความสามารถ', items: [] },
  { id: 'duty', title: 'ความรับผิดชอบต่อหน้าที่', items: [] },
  { id: 'person', title: 'ลักษณะส่วนบุคคล', items: [] },
];

export const SCORE_LABELS: Record<number, string> = { 5: 'ดีมาก', 4: 'ดี', 3: 'ปานกลาง', 2: 'พอใช้', 1: 'ควรปรับปรุง' };

/** A category with no sub-items is scored as one question. */
export const questionsOf = (criteria: EvalCategory[]) =>
  criteria.flatMap(cat => {
    const items = (cat.items || []).filter(it => it && String(it.title || '').trim());
    return items.length
      ? items.map(it => ({ id: `${cat.id}.${it.id}`, cat: cat.id, title: it.title }))
      : [{ id: cat.id, cat: cat.id, title: cat.title }];
  });

export const levelOf = (avg: number) => (avg >= 4.5 ? 'ดีมาก' : avg >= 3.5 ? 'ดี' : avg >= 2.5 ? 'ปานกลาง' : avg >= 1.5 ? 'พอใช้' : 'ควรปรับปรุง');

export const categoryScores = (criteria: EvalCategory[], scores: Record<string, number>) => {
  const qs = questionsOf(criteria);
  return criteria.map(cat => {
    const vals = qs.filter(q => q.cat === cat.id).map(q => Number(scores[q.id])).filter(v => v >= 1 && v <= 5);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { id: cat.id, title: cat.title, avg: Math.round(avg * 100) / 100, percent: Math.round((avg / 5) * 10000) / 100, count: vals.length };
  });
};

export const overallScore = (criteria: EvalCategory[], scores: Record<string, number>) => {
  const cats = categoryScores(criteria, scores).filter(c => c.count);
  const avg = cats.length ? Math.round((cats.reduce((a, c) => a + c.avg, 0) / cats.length) * 100) / 100 : 0;
  return { avg, percent: Math.round((avg / 5) * 10000) / 100, level: levelOf(avg) };
};

export const parseCriteria = (raw: unknown): EvalCategory[] | undefined => {
  try {
    const arr = typeof raw === 'string' ? (raw.trim() ? JSON.parse(raw) : null) : raw;
    if (!Array.isArray(arr) || !arr.length) return undefined;
    return arr.filter(c => c && c.id && c.title).map(c => ({
      id: String(c.id), title: String(c.title),
      items: Array.isArray(c.items) ? c.items.filter((i: any) => i && i.id).map((i: any) => ({ id: String(i.id), title: String(i.title || '') })) : [],
    }));
  } catch { return undefined; }
};

/* ------------------------------------------------------------------ */
/* Attendance summary                                                  */
/* ------------------------------------------------------------------ */

const toMin = (hhmm?: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const minOfDay = (ms: number) => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };
/** "2026-06-15" as a local date; full ISO timestamps (from Sheets) keep their instant. */
export const localDate = (s?: string) => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const attendanceSummary = (rows: AttendanceRow[], wp: Workplace | undefined, start?: string, end?: string, today?: string) => {
  const s = toMin(wp?.workStart), e = toMin(wp?.workEnd);
  let minutes = 0, late = 0, early = 0, noOut = 0;
  const present = new Set<string>();
  rows.forEach(r => {
    if (!r.inTime) return;
    present.add(r.date);
    if (r.outTime) minutes += Math.max(0, (r.outTime - r.inTime) / 60000);
    else if (r.date !== today) noOut++;
    if (s !== null && minOfDay(r.inTime) > s) late++;
    if (e !== null && r.outTime && minOfDay(r.outTime) < e) early++;
  });
  // Weekdays in the placement period, up to yesterday, with no check-in
  let absent = 0;
  const a = localDate(start), b = localDate(end);
  const t = localDate(today) || new Date();
  if (a) {
    const last = new Date(Math.min((b || t).getTime(), t.getTime() - 86400000));
    for (const d = new Date(a.getFullYear(), a.getMonth(), a.getDate()); d <= last; d.setDate(d.getDate() + 1)) {
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6 && !present.has(isoOf(d))) absent++;
    }
  }
  return { days: present.size, hours: Math.round((minutes / 60) * 10) / 10, late, early, noOut, absent };
};

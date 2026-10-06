
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Language, 
  UserRole, 
  Major, 
  InternshipSite, 
  DocumentForm, 
  FormCategory, 
  ScheduleEvent,
  LocalizedString,
  StudentStatusRecord,
  SiteSettings
} from './types';
import { SHEET_API_URL } from './config';
import { parseChecklist } from './checklist';
import { backendHasStudents, post as apiPost, getAdminKey, setAdminKey, parseCriteria } from './studentApi';
import EvaluationPage from './components/student/EvaluationPage';
import { fetchLive, saveSupervisor, LiveRow, FieldLock } from './liveSync';
import { useLiveSupervisors } from './useLiveSupervisors';
import DashboardPage from './DashboardPage';
import { TRANSLATIONS, INITIAL_SITES, INITIAL_FORMS, INITIAL_SCHEDULE, INITIAL_STUDENT_STATUSES } from './constants';
import StudentPortal from './components/StudentPortal';
import LanguageSwitcher from './components/LanguageSwitcher';
import LandingPage from './LandingPage';
import AdminPanel from './AdminPanel';
import SummaryPage from './SummaryPage';
import { 
  LogOut, 
  Search, 
  LayoutGrid,
  Sun,
  Moon,
  CalendarDays,
  FileText,
  Download,
  ArrowRight,
  Cloud,
  RefreshCw,
  Play,
  Flag,
  Files,
  Info,
  X,
  Copy,
  ClipboardList
} from 'lucide-react';

const CACHE_KEY = "wise_portal_last_sync";
const SETTINGS_KEY = "wise_site_settings";
const DEFAULT_TITLE = "WISE - Work Integrated Science Education Unit";

const settingsFromRows = (rows: any[]): SiteSettings => {
  const out: SiteSettings = {};
  if (!Array.isArray(rows)) return out;
  rows.forEach(r => {
    const k = String(r?.key || '');
    const v = String(r?.value || '');
    if (k === 'logo' || k === 'favicon' || k === 'siteTitle' || k === 'heroEmblem') (out as any)[k] = v;
    if (k === 'checklist') out.checklist = parseChecklist(v);
    if (k === 'evalCriteria') out.evalCriteria = parseCriteria(v);
  });
  return out;
};

/** Mentor evaluation link: #eval=TOKEN */
const hashEval = () => new URLSearchParams(window.location.hash.replace(/^#\??/, '')).get('eval') || '';

const hashView = (): 'summary' | 'stats' | null => {
  const params = new URLSearchParams(window.location.hash.replace(/^#\??/, ''));
  const v = params.get('view');
  return v === 'summary' || v === 'stats' ? v : null;
};
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 Minutes

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const savedLang = localStorage.getItem('wise_portal_lang');
      const validLangs = Object.values(Language);
      if (savedLang && validLangs.includes(savedLang as Language)) {
        return savedLang as Language;
      }
    } catch (e) {
      console.warn("Storage access failed during initialization:", e);
    }
    return Language.TH;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem('wise_portal_theme');
      return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
    } catch (e) {
      return 'light';
    }
  });

  const [viewState, setViewState] = useState<'landing' | 'dashboard' | 'summary' | 'stats'>(() => hashView() || 'landing');

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
  });
  
  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = sessionStorage.getItem('wise_role');
    return (savedRole as UserRole) || UserRole.STUDENT;
  });
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean }>({ x: 0, y: 0, visible: false });
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);

  // Data States
  const sanitizeData = useCallback((data: any[], prefix: string) => {
    if (!Array.isArray(data)) return [];
    const seen = new Set();
    return data.map((item, index) => {
      let id = item.id;
      // If ID is missing, but we have studentId, use it (specifically for studentStatuses) to prevent duplicates
      if (!id && prefix === 'st' && item.studentId) {
        id = `st-${item.studentId}`;
      }
      // If ID is missing, duplicate, or looks like a plain timestamp that might collide
      if (!id || seen.has(id)) {
        id = `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
      }
      seen.add(id);
      return { ...item, id };
    });
  }, []);

  const [sites, setSites] = useState<InternshipSite[]>(() => {
    try {
      const saved = localStorage.getItem('wise_sites');
      const data = saved ? JSON.parse(saved) : INITIAL_SITES;
      return sanitizeData(data, 'site');
    } catch (e) {
      console.warn("Failed to parse saved sites:", e);
      return sanitizeData(INITIAL_SITES, 'site');
    }
  });
  const [studentStatuses, setStudentStatuses] = useState<StudentStatusRecord[]>(() => {
    try {
      const saved = localStorage.getItem('wise_student_statuses');
      const data = saved ? JSON.parse(saved) : INITIAL_STUDENT_STATUSES;
      return sanitizeData(data, 'st');
    } catch (e) {
      console.warn("Failed to parse saved student statuses:", e);
      return sanitizeData(INITIAL_STUDENT_STATUSES, 'st');
    }
  });
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() => {
    try {
      const saved = localStorage.getItem('wise_schedules');
      const data = saved ? JSON.parse(saved) : INITIAL_SCHEDULE;
      return sanitizeData(data, 'sch');
    } catch (e) {
      console.warn("Failed to parse saved schedules:", e);
      return sanitizeData(INITIAL_SCHEDULE, 'sch');
    }
  });
  const [forms, setForms] = useState<DocumentForm[]>(() => {
    try {
      const saved = localStorage.getItem('wise_forms');
      const data = saved ? JSON.parse(saved) : INITIAL_FORMS;
      return sanitizeData(data, 'frm');
    } catch (e) {
      console.warn("Failed to parse saved forms:", e);
      return sanitizeData(INITIAL_FORMS, 'frm');
    }
  });
  // Kept in memory only: staff passwords are never cached on the device
  const [adminPasswords, setAdminPasswords] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    return saved ? parseInt(saved) : null;
  });
  const [activeMajor, setActiveMajor] = useState<Major | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Utility for resilient fetching from Google Apps Script
  const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...options,
        redirect: 'follow', // Crucial for GAS Web Apps
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 500));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  };

  const isFetchingRef = useRef(false);

  const fetchFromSheets = useCallback(async (force = false) => {
    if (!SHEET_API_URL || isFetchingRef.current) return;

    const now = Date.now();
    const lastSyncTime = localStorage.getItem(CACHE_KEY);
    if (!force && lastSyncTime && (now - parseInt(lastSyncTime)) < CACHE_EXPIRY) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      // Add cache buster to URL
      const url = `${SHEET_API_URL}${SHEET_API_URL.includes('?') ? '&' : '?'}cache_bust=${now}`;
      const response = await fetchWithRetry(url);
      const cloudData = await response.json();
      
      if (cloudData.sites) setSites(sanitizeData(cloudData.sites, 'site'));
      if (cloudData.schedules) setSchedules(sanitizeData(cloudData.schedules, 'sch'));
      if (cloudData.forms) setForms(sanitizeData(cloudData.forms, 'frm'));
      if (cloudData.studentStatuses) {
        const newStatuses = sanitizeData(cloudData.studentStatuses, 'st');
        setStudentStatuses(prev => {
          return newStatuses.map(incoming => {
            const existing = prev.find(p => p.id === incoming.id || (p.studentId && incoming.studentId && p.studentId === incoming.studentId));
            if (existing && existing.supervisor && (!incoming.supervisor || (existing.lastUpdated || 0) > (incoming.lastUpdated || 0))) {
              return { ...incoming, supervisor: existing.supervisor, lastUpdated: existing.lastUpdated };
            }
            return incoming;
          });
        });
      }
      if (cloudData.admins && Array.isArray(cloudData.admins)) {
        const passwords = cloudData.admins
          .map((a: any) => String(a.password || '').trim())
          .filter((p: string) => p.length > 0);
        setAdminPasswords(passwords);
      }
      if (Array.isArray(cloudData.settings)) {
        setSiteSettings(settingsFromRows(cloudData.settings));
      }

      const syncTime = Date.now();
      setLastSync(syncTime);
      localStorage.setItem(CACHE_KEY, syncTime.toString());
    } catch (error) {
      console.error("Failed to fetch from Google Sheets:", error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const formatStudentStatusForSync = (record: StudentStatusRecord) => {
    // Key order mapped to Google Sheets columns:
    // id, studentId, name, status, major, internshipType, location, position, term, academicYear, startDate, endDate, lastUpdated, remarks, supervisor
    return {
      id: record.id,
      studentId: record.studentId,
      name: record.name,
      status: record.status,
      major: record.major,
      internshipType: record.internshipType,
      location: record.location || '',
      position: record.position || '',
      term: record.term || '',
      academicYear: record.academicYear || '',
      startDate: record.startDate || '',
      endDate: record.endDate || '',
      lastUpdated: record.lastUpdated,
      remarks: record.remarks || '',
      supervisor: record.supervisor || ''
    };
  };

  const syncToSheets = useCallback(async (type: string, data: any[], action: 'all' | 'add' | 'update' | 'delete' = 'all', item?: any) => {
    if (!SHEET_API_URL) return;
    setIsSyncing(true);
    try {
      let finalData = data;
      let finalItem = item;

      // Format data if it's studentStatuses to ensure column order
      if (type === 'studentStatuses') {
        if (action === 'all' && Array.isArray(data)) {
          finalData = data.map(formatStudentStatusForSync);
        } else if (item) {
          finalItem = formatStudentStatusForSync(item as StudentStatusRecord);
        }
      }

      // Create payload based on action type
      // Writes carry the staff key; the server rejects them without it
      const payload = action === 'all'
        ? { type, data: finalData, adminKey: getAdminKey() }
        : { type, action, item: finalItem, adminKey: getAdminKey() };

      // Use text/plain to avoid CORS preflight (OPTIONS request) which GAS doesn't handle well
      const res = await fetchWithRetry(SHEET_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => null);
      if (result?.status === 'unauthorized') {
        window.dispatchEvent(new Event('wise-admin-unauthorized'));
        return;
      }
      const syncTime = Date.now();
      setLastSync(syncTime);
      localStorage.setItem(CACHE_KEY, syncTime.toString());
    } catch (error) {
      console.error(`Failed to sync ${type} (${action}) to Google Sheets:`, error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchFromSheets();
  }, [fetchFromSheets]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
      setActiveElement(e.target as HTMLElement);
    };
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') e.preventDefault();
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
      if (e.ctrlKey && e.key === 'u') e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCopy = () => {
    const selectedText = window.getSelection()?.toString();
    if (selectedText) navigator.clipboard.writeText(selectedText);
  };

  const handlePaste = async () => {
    if (activeElement && (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
      try {
        const text = await navigator.clipboard.readText();
        const start = activeElement.selectionStart || 0;
        const end = activeElement.selectionEnd || 0;
        const val = activeElement.value;
        activeElement.value = val.substring(0, start) + text + val.substring(end);
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (err) { console.warn("Paste failed:", err); }
    }
  };

  useEffect(() => {
    // Check initial search params/hash
    const initial = hashView();
    if (initial) setViewState(initial);

    window.history.replaceState({ view: window.history.state?.view || 'landing' }, '');
    const handlePopState = (event: PopStateEvent) => {
      setViewState(hashView() || event.state?.view || 'landing');
    };

    const handleHashChange = () => {
      const v = hashView();
      if (v) {
        setViewState(v);
      } else if (window.location.hash === '' || window.location.hash === '#') {
        setViewState('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => { localStorage.setItem('wise_portal_lang', lang); }, [lang]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('wise_portal_theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('wise_student_statuses', JSON.stringify(studentStatuses)); }, [studentStatuses]);
  useEffect(() => { localStorage.setItem('wise_sites', JSON.stringify(sites)); }, [sites]);
  useEffect(() => { localStorage.setItem('wise_schedules', JSON.stringify(schedules)); }, [schedules]);
  useEffect(() => { localStorage.setItem('wise_forms', JSON.stringify(forms)); }, [forms]);
  // Older versions cached staff passwords here; remove them
  useEffect(() => { try { localStorage.removeItem('wise_admin_passwords'); } catch { /* storage blocked */ } }, []);

  // After a page reload in a staff session, fetch the staff list again with the session key
  useEffect(() => {
    if (role !== UserRole.ADMIN || adminPasswords.length || !getAdminKey()) return;
    backendHasStudents().then(ok => {
      if (!ok) return;
      apiPost({ type: 'adminLogin', password: getAdminKey() })
        .then(r => { if (r?.status === 'success' && Array.isArray(r.admins)) setAdminPasswords(r.admins.map((p: any) => String(p))); })
        .catch(() => {});
    });
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Branding: persist and apply favicon + tab title
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(siteSettings)); } catch { /* quota */ }
    document.title = siteSettings.siteTitle?.trim() || DEFAULT_TITLE;
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (siteSettings.favicon) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = siteSettings.favicon;
    } else if (link) {
      link.remove();
    }
  }, [siteSettings]);

  const forceFetch = useCallback(() => fetchFromSheets(true), [fetchFromSheets]);

  // The server refused a write: the staff session is missing or the password changed
  useEffect(() => {
    const onUnauthorized = () => {
      alert('เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่ (การแก้ไขล่าสุดยังไม่ถูกบันทึก)');
      setAdminKey(null);
      setRole(UserRole.STUDENT);
      sessionStorage.removeItem('wise_role');
      setViewState('landing');
    };
    window.addEventListener('wise-admin-unauthorized', onUnauthorized);
    return () => window.removeEventListener('wise-admin-unauthorized', onUnauthorized);
  }, []);

  // Mentor evaluation links open a standalone form
  const [evalToken, setEvalToken] = useState(hashEval);
  useEffect(() => {
    const onHash = () => setEvalToken(hashEval());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const saveSiteSettings = useCallback(async (next: SiteSettings) => {
    setSiteSettings(next);
    await syncToSheets('settings', [
      { key: 'logo', value: next.logo || '' },
      { key: 'favicon', value: next.favicon || '' },
      { key: 'siteTitle', value: next.siteTitle || '' },
      { key: 'heroEmblem', value: next.heroEmblem || '' },
      { key: 'checklist', value: next.checklist?.length ? JSON.stringify(next.checklist) : '' },
      { key: 'evalCriteria', value: next.evalCriteria?.length ? JSON.stringify(next.evalCriteria) : '' },
    ], 'all');
  }, [syncToSheets]);

  /* ---------------- Live supervisor sync + field locks ---------------- */

  const [adminLiveActive, setAdminLiveActive] = useState(false);
  const [backendLive, setBackendLive] = useState<boolean | null>(null);
  // Values this browser just saved; ignore stale remote values for a short while
  const recentLocal = useRef<Record<string, { value: string; at: number }>>({});

  const mergeLiveRows = useCallback((rows: LiveRow[]) => {
    const byId = new Map<string, LiveRow>();
    const bySid = new Map<string, LiveRow>();
    rows.forEach(r => { if (r.id) byId.set(String(r.id), r); if (r.studentId) bySid.set(String(r.studentId), r); });
    setStudentStatuses(prev => {
      let changed = false;
      const next = prev.map(s => {
        const r = byId.get(String(s.id)) || bySid.get(String(s.studentId));
        if (!r) return s;
        const remote = String(r.supervisor || '');
        if (remote === (s.supervisor || '')) return s;
        const recent = recentLocal.current[s.id];
        if (recent && Date.now() - recent.at < 15000 && remote !== recent.value) return s;
        changed = true;
        return { ...s, supervisor: remote, lastUpdated: Number(r.lastUpdated) || s.lastUpdated };
      });
      return changed ? next : prev;
    });
  }, []);

  const live = useLiveSupervisors({
    enabled: viewState === 'summary' || (role === UserRole.ADMIN && adminLiveActive),
    onRows: mergeLiveRows,
  });
  const liveSupported = live.supported ?? backendLive;

  // One-shot backend capability check for admins (settings + locks need the new code.gs)
  useEffect(() => {
    if (role !== UserRole.ADMIN || backendLive !== null) return;
    fetchLive().then(s => setBackendLive(!!s)).catch(() => setBackendLive(false));
  }, [role, backendLive]);

  const handleSupervisorChange = useCallback(async (id: string, name: string, studentCode?: string): Promise<{ ok: boolean; lock?: FieldLock }> => {
    const before = studentStatuses.find(s => s.id === id || s.studentId === id);
    const updated = studentStatuses.map(s => (s.id === id || s.studentId === id) ? { ...s, supervisor: name, lastUpdated: Date.now() } : s);
    const target = updated.find(s => s.id === id || s.studentId === id);
    setStudentStatuses(updated);
    if (target) recentLocal.current[target.id] = { value: name, at: Date.now() };

    if (liveSupported) {
      setIsSyncing(true);
      try {
        const res = await saveSupervisor(target?.id || id, studentCode || target?.studentId || '', name);
        if (res.ok) return { ok: true };
        if ('lock' in res && res.lock) {
          // Someone else holds the field: roll back our optimistic value
          delete recentLocal.current[target?.id || id];
          setStudentStatuses(prev => prev.map(s => s.id === (target?.id || id) ? { ...s, supervisor: before?.supervisor || '' } : s));
          return { ok: false, lock: res.lock };
        }
      } catch (e) {
        console.error('saveSupervisor failed', e);
      } finally {
        setIsSyncing(false);
      }
    }
    if (target) await syncToSheets('studentStatuses', updated, 'update', target);
    return { ok: true };
  }, [studentStatuses, liveSupported, syncToSheets]);

  const currentT = useMemo(() => {
    const t = TRANSLATIONS[lang];
    return t || TRANSLATIONS[Language.TH];
  }, [lang]);

  const isRtl = lang === Language.AR;

  const handleAdminLogin = async (password: string): Promise<boolean> => {
    if (!password) return false;
    const normalizedPassword = password.trim();

    // New backend: the password is checked on the server and never downloaded
    if (await backendHasStudents()) {
      try {
        setIsSyncing(true);
        const r = await apiPost({ type: 'adminLogin', password: normalizedPassword });
        if (r?.status !== 'success') return false;
        if (Array.isArray(r.admins)) setAdminPasswords(r.admins.map((p: any) => String(p)));
        setAdminKey(normalizedPassword);
        setRole(UserRole.ADMIN);
        sessionStorage.setItem('wise_role', UserRole.ADMIN);
        setTimeout(() => {
          setViewState('dashboard');
          window.history.pushState({ view: 'dashboard' }, '');
        }, 400);
        return true;
      } catch (e) {
        console.error('Admin login failed:', e);
        return false;
      } finally {
        setIsSyncing(false);
      }
    }

    // ✅ If adminPasswords is empty, fetch fresh data first
    let passwords = adminPasswords;
    if (passwords.length === 0) {
      try {
        setIsSyncing(true);
        const now = Date.now();
        const response = await fetchWithRetry(`${SHEET_API_URL}${SHEET_API_URL.includes('?') ? '&' : '?'}cache_bust=${now}`);
        const cloudData = await response.json();
        if (cloudData.admins && Array.isArray(cloudData.admins)) {
          passwords = cloudData.admins
            .map((a: any) => String(a.password || '').trim())
            .filter((p: string) => p.length > 0);
          setAdminPasswords(passwords);
        }
      } catch (e) {
        console.error('Failed to fetch admin passwords:', e);
      } finally {
        setIsSyncing(false);
      }
    }

    // Check password against the freshly fetched passwords
    const isAuthorized = passwords.includes(normalizedPassword);
    if (isAuthorized) {
      setAdminKey(normalizedPassword);
      setRole(UserRole.ADMIN);
      sessionStorage.setItem('wise_role', UserRole.ADMIN);
      setTimeout(() => {
        setViewState('dashboard');
        window.history.pushState({ view: 'dashboard' }, '');
      }, 400);
      return true;
    }

    return false;
  };

  const handleEnterDashboard = () => {
    // FIX: Always reset to STUDENT role and clear admin session when entering via the Landing Page "Start Now" button.
    // This ensures that an Admin who navigated back to Home will be treated as a Student upon re-entering.
    setRole(UserRole.STUDENT);
    sessionStorage.removeItem('wise_role');
    setViewState('dashboard');
    window.history.pushState({ view: 'dashboard' }, '');
  };

  const handleLogout = () => {
    setAdminKey(null);
    setRole(UserRole.STUDENT);
    sessionStorage.removeItem('wise_role');
    setViewState('landing');
    if (window.history.state?.view === 'dashboard') window.history.back();
  };

  const getLocalized = (localized: LocalizedString) => {
    if (!localized) return '';
    return (localized as any)[lang] || localized['en'] || localized['th'] || '';
  };

  const filteredSites = sites.filter(s => {
    const localizedName = getLocalized(s.name).toLowerCase();
    const matchesMajor = activeMajor === 'all' || s.major === activeMajor;
    const matchesSearch = localizedName.includes(searchTerm.toLowerCase());
    return matchesMajor && matchesSearch;
  });

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => (a.rawStartDate || '').localeCompare(b.rawStartDate || ''));
  }, [schedules]);

  // Nearest upcoming/ongoing schedule item for the landing page
  const today = new Date().toISOString().split('T')[0];
  const upcomingEvent = sortedSchedules.find(s => (s.rawEndDate || s.rawStartDate || '') >= today);
  const nextEvent = upcomingEvent
    ? {
        label: getLocalized(upcomingEvent.event),
        date: (upcomingEvent.rawStartDate && upcomingEvent.rawStartDate > today ? upcomingEvent.rawStartDate : upcomingEvent.rawEndDate) || upcomingEvent.rawStartDate || '',
      }
    : null;

  const goLanding = () => {
    setViewState('landing');
    window.history.pushState({ view: 'landing' }, '', window.location.pathname);
  };

  if (evalToken) {
    return <EvaluationPage token={evalToken} logo={siteSettings.logo} />;
  }

  if (viewState === 'summary') {
    return (
      <SummaryPage
        students={studentStatuses}
        onBack={goLanding}
        onSupervisorChange={handleSupervisorChange}
        fetchFromSheets={forceFetch}
        isLoading={isLoading}
        isSyncing={isSyncing}
        locks={live.locks}
        liveSupported={live.supported}
        lastLiveSync={live.lastSyncAt}
        logo={siteSettings.logo}
      />
    );
  }

  if (viewState === 'stats') {
    return (
      <DashboardPage
        students={studentStatuses}
        schedules={schedules}
        onBack={goLanding}
        fetchFromSheets={forceFetch}
        isLoading={isLoading}
        logo={siteSettings.logo}
      />
    );
  }

  if (viewState === 'landing') {
    return (
      <>
        <LandingPage
          lang={lang} setLang={setLang} currentT={currentT} isRtl={isRtl}
          onEnterDashboard={handleEnterDashboard}
          onAdminLogin={handleAdminLogin as any}
          studentStatuses={studentStatuses}
          logo={siteSettings.logo}
          favicon={siteSettings.favicon}
          heroEmblem={siteSettings.heroEmblem}
          sitesCount={sites.filter(s => s.status !== 'archived').length}
          nextEvent={nextEvent}
        />
        {contextMenu.visible && (
          <div 
            className="fixed z-[9999] w-48 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl py-1.5 reveal-anim overflow-hidden"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button onClick={handleCopy} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Copy size={16} className="text-[#630330] dark:text-[#D4AF37]" />
              <span className="text-xs font-black uppercase tracking-widest">{lang === Language.TH ? 'คัดลอก' : 'Copy'}</span>
            </button>
            <button onClick={handlePaste} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <ClipboardList size={16} className="text-[#630330] dark:text-[#D4AF37]" />
              <span className="text-xs font-black uppercase tracking-widest">{lang === Language.TH ? 'วาง' : 'Paste'}</span>
            </button>
          </div>
        )}
      </>
    );
  }

  const isAdmin = role === UserRole.ADMIN;

  const majorChips: { id: Major | 'all', label: string, dot?: string }[] = [
    { id: 'all', label: currentT.allMajors },
    { id: Major.HALAL_FOOD, label: currentT.halalMajor, dot: 'bg-amber-500' },
    { id: Major.DIGITAL_TECH, label: currentT.digitalMajor, dot: 'bg-blue-500' },
    { id: Major.INFO_TECH, label: currentT.infoTechMajor, dot: 'bg-violet-500' },
    { id: Major.DATA_SCIENCE, label: currentT.dataScienceMajor, dot: 'bg-teal-500' },
  ];

  return (
    <div className={`${isAdmin ? 'h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950' : 'wp-root min-h-[100dvh]'} flex flex-col text-slate-900 dark:text-slate-100 transition-colors duration-300 ${isRtl ? 'rtl' : ''}`}>
      {!isAdmin && <div className="wl-pattern wl-bg wp-pattern" aria-hidden="true" />}
      {/* Thin top progress bar */}
      {(isLoading || isSyncing) && (
        <div className="fixed top-0 left-0 w-full h-0.5 z-[9999] pointer-events-none overflow-hidden">
          <div className="absolute top-0 h-full bg-[#630330] dark:bg-amber-400 animate-loading-bar"></div>
        </div>
      )}

      {isAdmin && (
      <header className="sticky top-0 z-[100] shrink-0 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800">
        <div className={`${isAdmin ? 'px-4 sm:px-6' : 'container mx-auto px-4'} h-full flex items-center justify-between gap-3`}>
          <button
            className="flex items-center gap-2.5 group"
            onClick={() => { setViewState('landing'); window.history.back(); }}
            title="กลับหน้าแรก"
          >
            {siteSettings.logo ? (
              <img src={siteSettings.logo} alt="โลโก้" className="h-8 max-w-[160px] object-contain" />
            ) : (
              <>
                <span className="w-8 h-8 rounded-lg bg-[#630330] text-[#D4AF37] flex items-center justify-center text-sm font-extrabold shadow-sm">W</span>
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">WISE</span>
              </>
            )}
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center h-6 px-2 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">ระบบหลังบ้าน</span>
            )}
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAdmin && (
              <div className="hidden xl:flex items-center gap-2 h-8 px-3 rounded-lg text-xs text-slate-500 dark:text-slate-400">
                {isLoading || isSyncing
                  ? <RefreshCw size={12} className="animate-spin text-amber-500" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                {isLoading ? 'กำลังโหลด…' : isSyncing ? 'กำลังบันทึก…' : 'บันทึกอัตโนมัติ'}
              </div>
            )}
            <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} variant="dropdown" tone="light" />
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition"
              title={theme === 'light' ? 'โหมดมืด' : 'โหมดสว่าง'}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              onClick={handleLogout}
              className="h-9 px-2.5 sm:px-3 flex items-center gap-2 rounded-lg text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-300 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition"
              title={currentT.logout}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{isAdmin ? 'ออกจากระบบ' : currentT.logout}</span>
            </button>
          </div>
        </div>
      </header>
      )}

      {isAdmin ? (
        <div className="flex-1 min-h-0 flex">
          <AdminPanel
            sites={sites} setSites={setSites}
            studentStatuses={studentStatuses} setStudentStatuses={setStudentStatuses}
            schedules={schedules} setSchedules={setSchedules}
            forms={forms} setForms={setForms}
            currentT={currentT} lang={lang}
            adminPasswords={adminPasswords} setAdminPasswords={setAdminPasswords}
            fetchFromSheets={forceFetch}
            syncToSheets={syncToSheets}
            isLoading={isLoading}
            isSyncing={isSyncing}
            lastSync={lastSync}
            siteSettings={siteSettings}
            onSaveSiteSettings={saveSiteSettings}
            backendLive={liveSupported}
            liveLocks={live.locks}
            setLiveActive={setAdminLiveActive}
            onSupervisorChange={handleSupervisorChange}
          />
        </div>
      ) : (
        <StudentPortal
          lang={lang}
          setLang={setLang}
          currentT={currentT}
          studentStatuses={studentStatuses}
          checklist={siteSettings.checklist}
          emblem={siteSettings.favicon || siteSettings.logo}
          emblemIsIcon={!!siteSettings.favicon}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          onLogout={handleLogout}
          onHome={() => { setViewState('landing'); window.history.back(); }}
          isRtl={isRtl}
          sites={sites}
          schedules={schedules}
          forms={forms}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeMajor={activeMajor}
          setActiveMajor={setActiveMajor}
          majorChips={majorChips}
        />
      )}
      {contextMenu.visible && (
        <div className="fixed z-[9999] w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1 reveal-anim overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button onClick={handleCopy} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><Copy size={15} className="text-slate-400" />{lang === Language.TH ? 'คัดลอก' : 'Copy'}</button>
          <button onClick={handlePaste} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ClipboardList size={15} className="text-slate-400" />{lang === Language.TH ? 'วาง' : 'Paste'}</button>
        </div>
      )}
    </div>
  );
};

export default App;

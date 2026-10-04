
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
import { fetchLive, saveSupervisor, LiveRow, FieldLock } from './liveSync';
import { useLiveSupervisors } from './useLiveSupervisors';
import DashboardPage from './DashboardPage';
import { TRANSLATIONS, INITIAL_SITES, INITIAL_FORMS, INITIAL_SCHEDULE, INITIAL_STUDENT_STATUSES } from './constants';
import InternshipCard from './components/InternshipCard';
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
    if (k === 'logo' || k === 'favicon' || k === 'siteTitle') (out as any)[k] = v;
  });
  return out;
};

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
  const [adminPasswords, setAdminPasswords] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wise_admin_passwords');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed to parse saved admin passwords:", e);
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    return saved ? parseInt(saved) : null;
  });
  const [activeMajor, setActiveMajor] = useState<Major | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDocHub, setShowDocHub] = useState(false);

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
      const payload = action === 'all' 
        ? { type, data: finalData } 
        : { type, action, item: finalItem };

      // Use text/plain to avoid CORS preflight (OPTIONS request) which GAS doesn't handle well
      await fetchWithRetry(SHEET_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
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
  useEffect(() => { localStorage.setItem('wise_admin_passwords', JSON.stringify(adminPasswords)); }, [adminPasswords]);

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

  const saveSiteSettings = useCallback(async (next: SiteSettings) => {
    setSiteSettings(next);
    await syncToSheets('settings', [
      { key: 'logo', value: next.logo || '' },
      { key: 'favicon', value: next.favicon || '' },
      { key: 'siteTitle', value: next.siteTitle || '' },
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

  const goLanding = () => {
    setViewState('landing');
    window.history.pushState({ view: 'landing' }, '', window.location.pathname);
  };

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

  const renderFormLink = (form: DocumentForm) => (
    <a
      key={form.id}
      href={form.url && !form.url.startsWith('PENDING') ? form.url : '#'}
      onClick={(e) => {
        if (!form.url || form.url === '#' || form.url.startsWith('PENDING')) {
          e.preventDefault();
          alert(lang === Language.TH ? 'ระบบกำลังประมวลผลไฟล์เอกสาร กรุณาลองใหม่ในภายหลัง' : 'System is processing the document.');
        }
      }}
      download={form.url?.startsWith('data:') ? `${getLocalized(form.title)}.pdf` : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
    >
      <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"><FileText size={17} /></div>
      <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{getLocalized(form.title)}</span>
      <Download size={16} className="text-slate-400 group-hover:text-[#630330] dark:group-hover:text-amber-300 transition" />
    </a>
  );

  return (
    <div className={`${isAdmin ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'} flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 ${isRtl ? 'rtl' : ''}`}>
      {/* Thin top progress bar */}
      {(isLoading || isSyncing) && (
        <div className="fixed top-0 left-0 w-full h-0.5 z-[9999] pointer-events-none overflow-hidden">
          <div className="absolute top-0 h-full bg-[#630330] dark:bg-amber-400 animate-loading-bar"></div>
        </div>
      )}

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
        <main className="container mx-auto px-4 py-6 sm:py-10 space-y-10 flex-grow max-w-6xl">
          {/* Schedule */}
          <section className="reveal-anim">
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays size={20} className="text-[#630330] dark:text-amber-400" /> {currentT.schedule}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Stay updated with key dates and deadlines</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
              {sortedSchedules.length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedSchedules.map((item) => {
                    const d = item.rawStartDate ? new Date(item.rawStartDate) : null;
                    const validD = d && !isNaN(d.getTime());
                    return (
                      <li key={item.id} className="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <div className="w-12 shrink-0 text-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <div className="text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-500 py-0.5">
                            {validD ? d!.toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-GB', { month: 'short' }) : '—'}
                          </div>
                          <div className="text-lg font-bold leading-7 tabular-nums">{validD ? d!.getDate() : '?'}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white break-words">{getLocalized(item.event)}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="inline-flex items-center gap-1"><Play size={9} className="text-emerald-500 fill-emerald-500" />{currentT.startDateLabel}: {getLocalized(item.startDate)}</span>
                            <span className="inline-flex items-center gap-1"><Flag size={9} className="text-rose-500 fill-rose-500" />{currentT.endDateLabel}: {getLocalized(item.endDate)}</span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-10 text-center text-sm text-slate-400">No upcoming events scheduled</div>
              )}
            </div>
          </section>

          {/* Document hub */}
          <section className="reveal-anim" style={{ animationDelay: '80ms' }}>
            <button
              onClick={() => setShowDocHub(true)}
              className="group w-full text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#630330] text-white hover:bg-[#6f0838] transition shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center"><Files size={22} className="text-[#D4AF37]" /></div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">{currentT.docHubTitle}</h3>
                  <p className="text-sm text-white/60">Document Hub · {forms.length} files available</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white text-[#630330] text-sm font-semibold self-start sm:self-auto group-hover:gap-3 transition-all">
                {currentT.docHubButton} <ArrowRight size={15} />
              </span>
            </button>
          </section>

          {/* Sites */}
          <section className="reveal-anim" style={{ animationDelay: '160ms' }}>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <LayoutGrid size={20} className="text-[#630330] dark:text-amber-400" /> {currentT.internshipSites}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Explore available opportunities</p>
              </div>
              <div className="relative w-full lg:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={currentT.searchPlaceholder}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-[#630330] focus:ring-4 focus:ring-[#630330]/10 transition"
                />
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mb-5">
              {majorChips.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveMajor(c.id)}
                  className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                    activeMajor === c.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {c.dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}
                  {c.label}
                </button>
              ))}
            </div>
            {filteredSites.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSites.map(site => <InternshipCard key={site.id} site={site} lang={lang} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Info size={28} className="text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">ไม่พบข้อมูลที่ค้นหา</p>
              </div>
            )}
          </section>
        </main>
      )}

      {showDocHub && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/40 backdrop-blur-[2px] wise-fade-in" onMouseDown={() => setShowDocHub(false)}>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 flex flex-col max-h-[90svh] wise-pop-in" onMouseDown={(e) => e.stopPropagation()}>
            <header className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-[#630330] text-[#D4AF37] flex items-center justify-center"><Files size={18} /></div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Document Hub</h3>
                <p className="text-xs text-slate-500">{currentT.docHubTitle}</p>
              </div>
              <button onClick={() => setShowDocHub(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={18} /></button>
            </header>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6">
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{currentT.appForms}</h4>
                <div className="grid gap-2">{forms.filter(f => f.category === FormCategory.APPLICATION).map(renderFormLink)}</div>
              </div>
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{currentT.monitoringForms}</h4>
                <div className="grid gap-2">{forms.filter(f => f.category === FormCategory.MONITORING).map(renderFormLink)}</div>
              </div>
            </div>
          </div>
        </div>
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

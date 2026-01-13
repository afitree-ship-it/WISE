
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Language, 
  UserRole, 
  Major, 
  InternshipSite, 
  DocumentForm, 
  FormCategory, 
  ScheduleEvent,
  LocalizedString,
  ApplicationStatus,
  StudentStatusRecord
} from './types';
import { TRANSLATIONS, INITIAL_SITES, INITIAL_FORMS, INITIAL_SCHEDULE, INITIAL_STUDENT_STATUSES } from './constants';
import InternshipCard from './components/InternshipCard';
import LandingPage from './LandingPage';
import LanguageSwitcher from './components/LanguageSwitcher';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  LogOut, 
  Plus, 
  Pencil, 
  Search, 
  Database, 
  Cpu, 
  Globe, 
  GraduationCap, 
  Salad, 
  ChevronDown,
  Trash,
  Copy,
  LayoutGrid,
  Sun,
  Moon,
  UserCircle,
  Timer,
  LayoutDashboard,
  Building2,
  X,
  FileText,
  CalendarDays,
  ExternalLink,
  Download,
  Link2,
  Info,
  Files,
  ArrowRight,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Play,
  Flag
} from 'lucide-react';

// --- CONFIGURATION ---
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycby-TUywvMFjsfpq629r1Fou59reZ4bBTghCxOHHpx8Cz9nxRPlha4Pxf2nS8QgHv13c/exec"; 

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
      return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const [viewState, setViewState] = useState<'landing' | 'dashboard'>('landing');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  
  // Data States
  const [sites, setSites] = useState<InternshipSite[]>(() => {
    const saved = localStorage.getItem('wise_sites');
    return saved ? JSON.parse(saved) : INITIAL_SITES;
  });
  const [studentStatuses, setStudentStatuses] = useState<StudentStatusRecord[]>(() => {
    const saved = localStorage.getItem('wise_student_statuses');
    return saved ? JSON.parse(saved) : INITIAL_STUDENT_STATUSES;
  });
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() => {
    const saved = localStorage.getItem('wise_schedules');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULE;
  });
  const [forms, setForms] = useState<DocumentForm[]>(() => {
    const saved = localStorage.getItem('wise_forms');
    return saved ? JSON.parse(saved) : INITIAL_FORMS;
  });

  // UI & Sync States
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [activeMajor, setActiveMajor] = useState<Major | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Accordion States (Admin only)
  const [isStudentStatusExpanded, setIsStudentStatusExpanded] = useState(false);
  const [isSitesExpanded, setIsSitesExpanded] = useState(false);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isFormsExpanded, setIsFormsExpanded] = useState(false);

  // Modal States
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingSite, setEditingSite] = useState<InternshipSite | null>(null);
  const [showAdminStatusModal, setShowAdminStatusModal] = useState(false);
  const [editingStatusRecord, setEditingStatusRecord] = useState<StudentStatusRecord | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEvent | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState<DocumentForm | null>(null);
  const [showDocHub, setShowDocHub] = useState(false);

  const fetchFromSheets = useCallback(async () => {
    if (!SHEET_API_URL) return;
    setIsLoading(true);
    try {
      const response = await fetch(SHEET_API_URL);
      const cloudData = await response.json();
      if (cloudData.sites) setSites(cloudData.sites);
      if (cloudData.schedules) setSchedules(cloudData.schedules);
      if (cloudData.forms) setForms(cloudData.forms);
      if (cloudData.studentStatuses) setStudentStatuses(cloudData.studentStatuses);
      setLastSync(Date.now());
    } catch (error) {
      console.error("Failed to fetch from Google Sheets:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncToSheets = useCallback(async (type: string, data: any[]) => {
    if (!SHEET_API_URL) return;
    setIsSyncing(true);
    try {
      await fetch(SHEET_API_URL, {
        method: 'POST',
        body: JSON.stringify({ type, data }),
      });
      setLastSync(Date.now());
    } catch (error) {
      console.error(`Failed to sync ${type} to Google Sheets:`, error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchFromSheets();
  }, [fetchFromSheets]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('wise_portal_theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('wise_student_statuses', JSON.stringify(studentStatuses)); }, [studentStatuses]);
  useEffect(() => { localStorage.setItem('wise_sites', JSON.stringify(sites)); }, [sites]);
  useEffect(() => { localStorage.setItem('wise_schedules', JSON.stringify(schedules)); }, [schedules]);
  useEffect(() => { localStorage.setItem('wise_forms', JSON.stringify(forms)); }, [forms]);

  const currentT = useMemo(() => {
    const t = role === UserRole.ADMIN ? TRANSLATIONS[Language.TH] : TRANSLATIONS[lang];
    return t || TRANSLATIONS[Language.TH];
  }, [lang, role]);

  const isRtl = lang === Language.AR && role !== UserRole.ADMIN;

  const handleAdminLogin = (password: string): boolean => {
    const validPasswords = ['fst111', '24725', '5990'];
    if (validPasswords.includes(password)) {
      setRole(UserRole.ADMIN);
      setLang(Language.TH); 
      setViewState('dashboard');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setRole(UserRole.STUDENT);
    setViewState('landing');
  };

  const getLocalized = (localized: LocalizedString) => {
    if (!localized) return '';
    if (role === UserRole.ADMIN) return localized.th || '';
    return (localized as any)[lang] || localized['en'] || localized['th'] || '';
  };

  const performBatchTranslation = async (items: { key: string, value: string, isDate?: boolean }[]) => {
    if (items.length === 0) return {};
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const prompt = `Translate to EN, AR, MS: ${items.map(i => `${i.key}:"${i.value}"${i.isDate ? '(date-standard)' : ''}`).join('|')}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are a professional translator for an educational portal. For 'date-standard' items: In 'th' (Thai), MUST use Buddhist Era year (BE = current year + 543). In 'en', 'ar', 'ms', MUST use Gregorian year (AD). Example: 2025 AD is 2568 BE. Return JSON with th, en, ar, ms keys.",
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 }, 
          responseSchema: {
            type: Type.OBJECT,
            properties: items.reduce((acc, curr) => ({
              ...acc,
              [curr.key]: {
                type: Type.OBJECT,
                properties: {
                  th: { type: Type.STRING },
                  en: { type: Type.STRING },
                  ar: { type: Type.STRING },
                  ms: { type: Type.STRING },
                },
                required: ["th", "en", "ar", "ms"]
              }
            }), {})
          },
        },
      });
      return JSON.parse(response.text ?? "{}");
    } catch (error) {
      return items.reduce((acc, curr) => ({
        ...acc,
        [curr.key]: { th: curr.value, en: curr.value, ar: curr.value, ms: curr.value }
      }), {});
    }
  };

  const filteredSites = sites.filter(s => {
    const localizedName = getLocalized(s.name).toLowerCase();
    const matchesMajor = activeMajor === 'all' || s.major === activeMajor;
    const matchesSearch = localizedName.includes(searchTerm.toLowerCase());
    return matchesMajor && matchesSearch;
  });

  // Sorted schedules for Student View - Sort by rawStartDate ascending
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      const dateA = a.rawStartDate || '';
      const dateB = b.rawStartDate || '';
      return dateA.localeCompare(dateB);
    });
  }, [schedules]);

  const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thEvent = formData.get('event_th') as string;
    const rawStart = formData.get('start_th') as string;
    const rawEnd = formData.get('end_th') as string;
    setIsTranslating(true);
    const results = await performBatchTranslation([
      { key: 'event', value: thEvent },
      { key: 'start', value: rawStart, isDate: true },
      { key: 'end', value: rawEnd, isDate: true }
    ]);
    setIsTranslating(false);
    const newEvent: ScheduleEvent = {
      id: editingSchedule?.id || Date.now().toString(),
      event: results['event'] || { th: thEvent, en: thEvent, ar: thEvent, ms: thEvent },
      startDate: results['start'] || { th: rawStart, en: rawStart, ar: rawStart, ms: rawStart },
      endDate: results['end'] || { th: rawEnd, en: rawEnd, ar: rawEnd, ms: rawEnd },
      rawStartDate: rawStart,
      rawEndDate: rawEnd,
      status: 'upcoming',
      createdAt: editingSchedule?.createdAt || Date.now()
    };
    let updated;
    if (editingSchedule) updated = schedules.map(s => s.id === editingSchedule.id ? newEvent : s);
    else updated = [newEvent, ...schedules];
    setSchedules(updated);
    syncToSheets('schedules', updated);
    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const handleSaveForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thTitle = formData.get('title') as string;
    const category = formData.get('category') as FormCategory;
    const url = formData.get('url') as string;
    setIsTranslating(true);
    const results = await performBatchTranslation([{ key: 'title', value: thTitle }]);
    setIsTranslating(false);
    const newForm: DocumentForm = {
      id: editingForm?.id || Date.now().toString(),
      title: results['title'] || { th: thTitle, en: thTitle, ar: thTitle, ms: thTitle },
      category,
      url: url.startsWith('http') ? url : `https://${url}`
    };
    let updated;
    if (editingForm) updated = forms.map(f => f.id === editingForm.id ? newForm : f);
    else updated = [newForm, ...forms];
    setForms(updated);
    syncToSheets('forms', updated);
    setShowFormModal(false);
    setEditingForm(null);
  };

  const handleSaveSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thName = formData.get('name_th') as string;
    const thLoc = formData.get('loc_th') as string;
    const thDesc = formData.get('desc_th') as string;
    const thPos = formData.get('pos_th') as string;
    setIsTranslating(true);
    const results = await performBatchTranslation([
      { key: 'name', value: thName }, { key: 'loc', value: thLoc },
      { key: 'desc', value: thDesc }, { key: 'pos', value: thPos }
    ]);
    setIsTranslating(false);
    const newSite: InternshipSite = {
      id: editingSite?.id || Date.now().toString(),
      name: results['name'],
      location: results['loc'],
      description: results['desc'],
      position: results['pos'],
      status: formData.get('status') as any,
      major: Major.HALAL_FOOD, 
      contactLink: formData.get('contact_link') as string || undefined,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      createdAt: editingSite?.createdAt || Date.now()
    };
    let updated;
    if (editingSite) updated = sites.map(s => s.id === editingSite.id ? newSite : s);
    else updated = [newSite, ...sites];
    setSites(updated);
    syncToSheets('sites', updated);
    setShowSiteModal(false);
    setEditingSite(null);
  };

  const handleSaveStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newRecord: StudentStatusRecord = {
      id: editingStatusRecord?.id || Date.now().toString(),
      studentId: formData.get('student_id') as string,
      name: formData.get('student_name') as string,
      status: formData.get('status') as ApplicationStatus,
      major: formData.get('major') as Major,
      lastUpdated: Date.now()
    };
    let updated;
    if (editingStatusRecord) updated = studentStatuses.map(s => s.id === editingStatusRecord.id ? newRecord : s);
    else updated = [newRecord, ...studentStatuses];
    setStudentStatuses(updated);
    syncToSheets('studentStatuses', updated);
    setShowAdminStatusModal(false);
    setEditingStatusRecord(null);
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ApplicationStatus.PREPARING: return 'bg-blue-100 text-blue-700 border-blue-200';
      case ApplicationStatus.ACCEPTED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ApplicationStatus.REJECTED: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING: return currentT.statusPending;
      case ApplicationStatus.PREPARING: return currentT.statusPreparing;
      case ApplicationStatus.ACCEPTED: return currentT.statusAccepted;
      case ApplicationStatus.REJECTED: return currentT.statusRejected;
      default: return '';
    }
  };

  if (viewState === 'landing') {
    return (
      <LandingPage 
        lang={lang}
        setLang={setLang}
        currentT={currentT}
        isRtl={isRtl}
        onEnterDashboard={() => setViewState('dashboard')}
        onAdminLogin={handleAdminLogin}
        studentStatuses={studentStatuses}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300 ${isRtl ? 'rtl' : ''}`}>
      {/* NAVBAR */}
      <div className="sticky top-0 z-50 w-full px-2 sm:px-4 py-3">
        <nav className="container mx-auto h-auto min-h-[70px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.25rem] px-4 sm:px-8 flex items-center justify-between border border-slate-100 dark:border-slate-800 shadow-xl py-2">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col cursor-pointer" onClick={() => setViewState('landing')}>
              <span className="block text-xl sm:text-2xl font-black leading-none uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#630330] via-[#8B1A4F] to-[#D4AF37]">
                WISE
              </span>
              <span className="block text-[7px] sm:text-[8px] text-[#D4AF37] font-black uppercase mt-0.5 tracking-tight opacity-90 hidden sm:block">
                Work-Integrated Science Education Unit
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-4">
            {role === UserRole.ADMIN && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                {isSyncing ? (
                  <RefreshCw size={12} className="text-[#D4AF37] animate-spin" />
                ) : SHEET_API_URL ? (
                  <Cloud size={12} className="text-emerald-500" />
                ) : (
                  <CloudOff size={12} className="text-slate-400" />
                )}
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                  {isSyncing ? "Saving..." : lastSync ? `Last Sync: ${new Date(lastSync).toLocaleTimeString()}` : "Cloud Ready"}
                </span>
              </div>
            )}
            {role === UserRole.STUDENT && (
              <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} variant="dropdown" />
            )}
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 transition-all"
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button 
                onClick={handleLogout} 
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-md"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </nav>
      </div>

      <main className={`container mx-auto px-4 py-6 space-y-8 flex-grow transition-all`}>
        {role === UserRole.ADMIN ? (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg"><Database size={20} /></div>
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white">สถานะการเชื่อมต่อ Google Sheets</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{SHEET_API_URL ? "เชื่อมต่อคลาวด์แล้ว" : "ไม่ได้ระบุ Web App URL"}</p>
                  </div>
               </div>
               <button onClick={fetchFromSheets} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-indigo-50 text-indigo-700 rounded-xl font-black uppercase text-[10px] transition-all">
                 {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} ดึงข้อมูลใหม่
               </button>
            </div>

            <section className={`rounded-2xl border transition-all overflow-hidden ${isStudentStatusExpanded ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40 p-4' : 'bg-white dark:bg-slate-900 border-slate-100 p-2'}`}>
               <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={() => setIsStudentStatusExpanded(!isStudentStatusExpanded)}>
                  <div className="flex items-center gap-2.5">
                     <div className="p-2 bg-amber-500 text-white rounded-lg"><Timer size={16} /></div>
                     <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white">จัดการสถานะนักศึกษา</h2>
                  </div>
                  <ChevronDown size={14} className={`transition-transform ${isStudentStatusExpanded ? '' : '-rotate-90'}`} />
               </div>
               {isStudentStatusExpanded && (
                 <div className="mt-4 space-y-3">
                    <button onClick={() => { setEditingStatusRecord(null); setShowAdminStatusModal(true); }} className="px-4 py-2 rounded-lg bg-amber-600 text-white font-black uppercase text-[10px] flex items-center gap-1.5"><Plus size={14} /> เพิ่มสถานะ</button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {studentStatuses.map(record => (
                        <div key={record.id} className="p-3 rounded-xl border border-amber-100 bg-white flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-[11px] leading-none">{record.name}</h4>
                            <p className="text-[9px] font-bold text-slate-400 mt-1">{record.studentId}</p>
                            <div className={`mt-1.5 px-1.5 py-0.5 rounded text-[7px] font-black uppercase border inline-block ${getStatusColor(record.status)}`}>{getStatusLabel(record.status)}</div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingStatusRecord(record); setShowAdminStatusModal(true); }} className="p-1.5 text-slate-400 hover:text-amber-500"><Pencil size={12} /></button>
                            <button onClick={() => {
                              const updated = studentStatuses.filter(s => s.id !== record.id);
                              setStudentStatuses(updated);
                              syncToSheets('studentStatuses', updated);
                            }} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
               )}
            </section>

            <section className={`rounded-2xl border transition-all overflow-hidden ${isSitesExpanded ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 p-4' : 'bg-white dark:bg-slate-900 border-slate-100 p-2'}`}>
              <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={() => setIsSitesExpanded(!isSitesExpanded)}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-600 text-white rounded-lg"><Database size={16} /></div>
                  <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white">ฐานข้อมูลสถานประกอบการ</h2>
                </div>
                <ChevronDown size={14} className={`transition-transform ${isSitesExpanded ? '' : '-rotate-90'}`} />
              </div>
              {isSitesExpanded && (
                <div className="mt-4 space-y-3">
                  <button onClick={() => { setEditingSite(null); setShowSiteModal(true); }} className="px-4 py-2 rounded-lg bg-rose-600 text-white font-black uppercase text-[10px] flex items-center gap-1.5"><Plus size={14} /> เพิ่มหน่วยงาน</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {sites.map(site => (
                      <div key={site.id} className="p-3 rounded-xl border border-rose-100 bg-white flex items-center justify-between group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white ${site.major === Major.HALAL_FOOD ? 'bg-amber-500' : 'bg-blue-600'}`}>
                            {site.major === Major.HALAL_FOOD ? <Salad size={14} /> : <Cpu size={14} />}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-900 text-[11px] truncate leading-tight">{getLocalized(site.name)}</h4>
                            <p className="text-[8px] font-bold text-slate-400 truncate">{getLocalized(site.location)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => { setEditingSite(site); setShowSiteModal(true); }} className="p-1 text-slate-400 hover:text-rose-500"><Pencil size={12} /></button>
                          <button onClick={() => {
                            const updated = sites.filter(s => s.id !== site.id);
                            setSites(updated);
                            syncToSheets('sites', updated);
                          }} className="p-1 text-slate-400 hover:text-rose-500"><Trash size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className={`rounded-2xl border transition-all overflow-hidden ${isScheduleExpanded ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40 p-4' : 'bg-white dark:bg-slate-900 border-slate-100 p-2'}`}>
              <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg"><CalendarDays size={16} /></div>
                  <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white">จัดการกำหนดการสำคัญ</h2>
                </div>
                <ChevronDown size={14} className={`transition-transform ${isScheduleExpanded ? '' : '-rotate-90'}`} />
              </div>
              {isScheduleExpanded && (
                <div className="mt-4 space-y-3">
                  <button onClick={() => { setEditingSchedule(null); setShowScheduleModal(true); }} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-black uppercase text-[10px] flex items-center gap-1.5"><Plus size={14} /> เพิ่มกำหนดการ</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {schedules.map(item => (
                      <div key={item.id} className="p-3 rounded-xl border border-emerald-100 bg-white flex flex-col gap-1.5 relative group">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => { setEditingSchedule(item); setShowScheduleModal(true); }} className="p-1 text-slate-400 hover:text-emerald-600"><Pencil size={12} /></button>
                          <button onClick={() => {
                            const updated = schedules.filter(s => s.id !== item.id);
                            setSchedules(updated);
                            syncToSheets('schedules', updated);
                          }} className="p-1 text-slate-400 hover:text-rose-500"><Trash size={12} /></button>
                        </div>
                        <h4 className="font-bold text-slate-900 text-[11px] pr-8">{getLocalized(item.event)}</h4>
                        <div className="flex flex-col text-[9px] font-bold text-slate-500">
                          <div>เริ่ม: {getLocalized(item.startDate)}</div>
                          <div>สิ้นสุด: {getLocalized(item.endDate)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className={`rounded-2xl border transition-all overflow-hidden ${isFormsExpanded ? 'bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-900/40 p-4' : 'bg-white dark:bg-slate-900 border-slate-100 p-2'}`}>
              <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={() => setIsFormsExpanded(!isFormsExpanded)}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg"><FileText size={16} /></div>
                  <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white">แบบฟอร์มและไฟล์สำคัญ</h2>
                </div>
                <ChevronDown size={14} className={`transition-transform ${isFormsExpanded ? '' : '-rotate-90'}`} />
              </div>
              {isFormsExpanded && (
                <div className="mt-4 space-y-3">
                  <button onClick={() => { setEditingForm(null); setShowFormModal(true); }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-black uppercase text-[10px] flex items-center gap-1.5"><Plus size={14} /> เพิ่มแบบฟอร์ม</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {forms.map(form => (
                      <div key={form.id} className="p-3 rounded-xl border border-indigo-100 bg-white flex items-center justify-between group">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Download size={12} /></div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-900 text-[11px] truncate leading-tight">{getLocalized(form.title)}</h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{form.category}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => { setEditingForm(form); setShowFormModal(true); }} className="p-1 text-slate-400 hover:text-indigo-600"><Pencil size={12} /></button>
                          <button onClick={() => {
                            const updated = forms.filter(f => f.id !== form.id);
                            setForms(updated);
                            syncToSheets('forms', updated);
                          }} className="p-1 text-slate-400 hover:text-rose-500"><Trash size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          /* STUDENT VIEW - OPTIMIZED SINGLE-ROW COMPACT LAYOUT FOR MOBILE */
          <div className="space-y-10 sm:space-y-14 relative">
            <section className="reveal-anim">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 dark:text-white leading-none">{currentT.schedule}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Stay updated with key dates and deadlines</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                {sortedSchedules.length > 0 ? (
                  sortedSchedules.map((item) => (
                    <div 
                      key={item.id} 
                      className="group relative flex flex-row items-center justify-between p-2 sm:p-5 
                        bg-white/70 dark:bg-slate-900/70 backdrop-blur-md 
                        border border-slate-100 dark:border-slate-800 
                        rounded-2xl transition-all duration-300
                        border-l-[6px] border-l-emerald-500 overflow-hidden
                        shadow-[0_0_15px_rgba(16,185,129,0.15)] 
                        hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                    >
                      {/* Left: Event Title with Universal Intense Pulse - Optimized for Wrapping */}
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 pr-1 sm:pr-4">
                         <div className="relative shrink-0 flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4">
                           <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                           <div className="absolute inset-0 w-full h-full rounded-full border border-emerald-400 animate-ping opacity-75"></div>
                           <div className="absolute -inset-1 w-full h-full rounded-full border border-emerald-500/30 animate-pulse"></div>
                         </div>
                         <h4 className="text-[10px] min-[360px]:text-[11px] sm:text-base font-black text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-3 break-words">
                           {getLocalized(item.event)}
                         </h4>
                      </div>

                      {/* Right: Flowing Timeline Path (Ultra Compact and Shrunk on Mobile) */}
                      <div className="flex items-center gap-0.5 sm:gap-3 flex-shrink-0">
                         {/* START COMPACT CHIP - EXTREMELY SHRUNK ON MOBILE */}
                         <div className="flex items-center gap-1 px-1 sm:px-3 py-1 sm:py-1.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-lg sm:rounded-xl border border-emerald-100 dark:border-emerald-800/40 transition-transform group-hover:scale-105">
                            <Play size={7} className="text-emerald-500 fill-emerald-500 shrink-0" />
                            <div className="flex flex-col leading-none">
                              <span className="hidden sm:block text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter mb-1">{currentT.startDateLabel}</span>
                              <span className="text-[8px] min-[400px]:text-[9px] sm:text-[12px] font-black text-emerald-900 dark:text-emerald-200 whitespace-nowrap">{getLocalized(item.startDate)}</span>
                            </div>
                         </div>
                         
                         {/* CONNECTING FLOWING LINE - HIDDEN ON MOBILE TO SAVE SPACE */}
                         <div className="hidden md:block w-16 h-[3px] relative overflow-hidden rounded-full">
                            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,185,129,0)_0%,rgba(16,185,129,1)_50%,rgba(16,185,129,0)_100%)] bg-[length:200%_100%] animate-flow-line"></div>
                         </div>

                         {/* END COMPACT CHIP - EXTREMELY SHRUNK ON MOBILE */}
                         <div className="flex items-center gap-1 px-1 sm:px-3 py-1 sm:py-1.5 bg-rose-50/80 dark:bg-rose-950/40 rounded-lg sm:rounded-xl border border-rose-100 dark:border-rose-800/40 transition-transform group-hover:scale-105">
                            <Flag size={7} className="text-rose-500 fill-rose-500 shrink-0" />
                            <div className="flex flex-col leading-none">
                              <span className="hidden sm:block text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter mb-1">{currentT.endDateLabel}</span>
                              <span className="text-[8px] min-[400px]:text-[9px] sm:text-[12px] font-black text-rose-900 dark:text-rose-200 whitespace-nowrap">{getLocalized(item.endDate)}</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-[12px] font-bold text-slate-400 uppercase border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-white/30">
                    No upcoming events scheduled
                  </div>
                )}
              </div>
            </section>

            <section className="reveal-anim" style={{ animationDelay: '100ms' }}>
              <div 
                onClick={() => setShowDocHub(true)}
                className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[1.5rem] p-6 sm:p-8 shadow-xl shadow-indigo-200/50 dark:shadow-none cursor-pointer hover:shadow-2xl transition-all"
              >
                <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Files size={180} />
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl text-white">
                       <FileText size={28} />
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left">
                       <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                         {currentT.docHubTitle}
                       </h3>
                       <div className="flex items-center gap-3 justify-center sm:justify-start">
                          <span className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Document Hub</span>
                          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                          <span className="text-white/60 text-[10px] font-bold uppercase tracking-tight">{forms.length} FILES AVAILABLE</span>
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3 bg-white text-indigo-700 rounded-full font-black uppercase text-[10px] shadow-lg group-hover:gap-5 transition-all">
                     {currentT.docHubButton} <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </section>

            <section className="reveal-anim" style={{ animationDelay: '200ms' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-5 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#630330] dark:bg-amber-500 text-white rounded-xl shadow-lg">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 dark:text-white leading-none">{currentT.internshipSites}</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Explore available opportunities</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                   <div className="relative mr-2">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                       type="text" 
                       placeholder={currentT.searchPlaceholder}
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-[#630330]/20 min-w-[240px]"
                     />
                   </div>
                  <button onClick={() => setActiveMajor('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${activeMajor === 'all' ? 'bg-[#630330] text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}>
                    {currentT.allMajors}
                  </button>
                  <button onClick={() => setActiveMajor(Major.HALAL_FOOD)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${activeMajor === Major.HALAL_FOOD ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}>
                    {currentT.halalMajor}
                  </button>
                  <button onClick={() => { setActiveMajor(Major.DIGITAL_TECH); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${activeMajor === Major.DIGITAL_TECH ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}>
                    {currentT.digitalMajor}
                  </button>
                </div>
              </div>
              {filteredSites.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredSites.map(site => <InternshipCard key={site.id} site={site} lang={lang} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Info size={40} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[12px]">ไม่พบข้อมูลที่ค้นหา</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* DOCUMENT HUB MODAL */}
      {showDocHub && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 bg-slate-950/80 backdrop-blur-2xl reveal-anim">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-3xl border border-white/10 flex flex-col max-h-[90svh]">
            <div className="p-8 sm:p-12 bg-indigo-600 text-white relative">
               <button 
                onClick={() => setShowDocHub(false)}
                className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
               >
                 <X size={24} />
               </button>
               <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl"><Files size={32} /></div>
                  <div>
                    <h3 className="text-3xl font-black uppercase leading-none">Document Hub</h3>
                    <p className="text-indigo-200 text-xs font-bold uppercase mt-1 tracking-widest">Electronic Document Service</p>
                  </div>
               </div>
            </div>
            <div className="flex-grow overflow-y-auto p-8 sm:p-12 space-y-10">
               <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    <h4 className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{currentT.appForms}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {forms.filter(f => f.category === FormCategory.APPLICATION).map(form => (
                      <a key={form.id} href={form.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-2xl transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm text-indigo-600"><FileText size={20} /></div>
                           <h5 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">{getLocalized(form.title)}</h5>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="hidden sm:inline-block text-[10px] font-black text-slate-300 uppercase">PDF / DOCX</span>
                           <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Download size={18} /></div>
                        </div>
                      </a>
                    ))}
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    <h4 className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{currentT.monitoringForms}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {forms.filter(f => f.category === FormCategory.MONITORING).map(form => (
                      <a key={form.id} href={form.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-2xl transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm text-indigo-600"><FileText size={20} /></div>
                           <h5 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">{getLocalized(form.title)}</h5>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="hidden sm:inline-block text-[10px] font-black text-slate-300 uppercase">PDF / DOCX</span>
                           <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Download size={18} /></div>
                        </div>
                      </a>
                    ))}
                  </div>
               </div>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{currentT.docHubContact}</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modals */}
      {showAdminStatusModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim">
          <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-2">
              <Timer size={20} className="text-amber-500" />
              {editingStatusRecord ? 'แก้ไขสถานะ' : 'เพิ่มข้อมูลติดตาม'}
            </h3>
            <form onSubmit={handleSaveStatus} className="space-y-4">
              <input name="student_id" defaultValue={editingStatusRecord?.studentId} required placeholder="รหัสนักศึกษา" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
              <input name="student_name" defaultValue={editingStatusRecord?.name} required placeholder="ชื่อ-นามสกุล" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <select name="major" defaultValue={editingStatusRecord?.major || Major.HALAL_FOOD} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-[11px] appearance-none">
                  <option value={Major.HALAL_FOOD}>{currentT.halalMajor}</option>
                  <option value={Major.DIGITAL_TECH}>{currentT.digitalMajor}</option>
                </select>
                <select name="status" defaultValue={editingStatusRecord?.status || ApplicationStatus.PENDING} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-[11px] appearance-none">
                  <option value={ApplicationStatus.PENDING}>{currentT.statusPending}</option>
                  <option value={ApplicationStatus.PREPARING}>{currentT.statusPreparing}</option>
                  <option value={ApplicationStatus.ACCEPTED}>{currentT.statusAccepted}</option>
                  <option value={ApplicationStatus.REJECTED}>{currentT.statusRejected}</option>
                </select>
              </div>
              <div className="flex gap-2.5 pt-4">
                <button type="button" onClick={() => setShowAdminStatusModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-400 font-bold uppercase text-[10px]">ยกเลิก</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold uppercase text-[10px] disabled:opacity-50">
                  {isSyncing ? 'กำลังบันทึกลงคลาวด์...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim">
          <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-2">
              <CalendarDays size={20} className="text-emerald-500" />
              {editingSchedule ? 'แก้ไขกำหนดการ' : 'เพิ่มกำหนดการใหม่'}
            </h3>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <input name="event_th" defaultValue={editingSchedule?.event.th} required placeholder="หัวข้อกิจกรรม (ไทย)" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">วันเริ่มต้น</label>
                  <input 
                    type="date"
                    name="start_th" 
                    defaultValue={editingSchedule?.rawStartDate} 
                    required 
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-[11px]" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">วันสิ้นสุด</label>
                  <input 
                    type="date"
                    name="end_th" 
                    defaultValue={editingSchedule?.rawEndDate} 
                    required 
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-[11px]" 
                  />
                </div>
              </div>
              <div className="flex gap-2.5 pt-4">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-400 font-bold uppercase text-[10px]">ยกเลิก</button>
                <button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold uppercase text-[10px] disabled:opacity-50">
                  {isTranslating ? 'กำลังแปลข้อมูล...' : isSyncing ? 'Saving...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim">
          <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-2">
              <FileText size={20} className="text-indigo-500" />
              {editingForm ? 'แก้ไขแบบฟอร์ม' : 'เพิ่มแบบฟอร์มใหม่'}
            </h3>
            <form onSubmit={handleSaveForm} className="space-y-4">
              <input name="title" defaultValue={editingForm?.title.th} required placeholder="ชื่อเอกสาร" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
              <select name="category" defaultValue={editingForm?.category || FormCategory.APPLICATION} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-[11px]">
                <option value={FormCategory.APPLICATION}>เอกสารสมัครงาน</option>
                <option value={FormCategory.MONITORING}>เอกสารระหว่างฝึกงาน</option>
              </select>
              <input name="url" defaultValue={editingForm?.url} required placeholder="ลิงก์ดาวน์โหลด" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
              <div className="flex gap-2.5 pt-4">
                <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-400 font-bold uppercase text-[10px]">ยกเลิก</button>
                <button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] disabled:opacity-50">
                  {isTranslating ? 'กำลังแปล...' : isSyncing ? 'Saving...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSiteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim">
          <div className="w-full max-w-[500px] bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-2">
              <Building2 size={20} className="text-rose-600" />
              {editingSite ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}
            </h3>
            <form onSubmit={handleSaveSite} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input name="name_th" defaultValue={editingSite?.name.th} required placeholder="ชื่อหน่วยงาน" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
                <input name="loc_th" defaultValue={editingSite?.location.th} required placeholder="จังหวัด" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
              </div>
              <textarea name="desc_th" defaultValue={editingSite?.description.th} required placeholder="รายละเอียด" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm min-h-[80px]"></textarea>
              <div className="grid grid-cols-2 gap-4">
                <input name="pos_th" defaultValue={editingSite?.position.th} required placeholder="ตำแหน่งงาน" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
                <select name="major" defaultValue={Major.HALAL_FOOD} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-[11px]">
                   <option value={Major.HALAL_FOOD}>ฮาลาล</option>
                   <option value={Major.DIGITAL_TECH}>ดิจิทัล</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">สถานะหน่วยงาน</label>
                <div className="grid grid-cols-3 gap-2">
                   <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all border border-transparent has-[:checked]:border-emerald-500">
                      <input type="radio" name="status" value="active" defaultChecked={!editingSite || editingSite.status === 'active'} className="hidden" />
                      <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">เปิดรับสมัคร</span>
                   </label>
                   <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all border border-transparent has-[:checked]:border-amber-500">
                      <input type="radio" name="status" value="senior_visited" defaultChecked={editingSite?.status === 'senior_visited'} className="hidden" />
                      <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">รุ่นพี่เคยมาแล้ว</span>
                   </label>
                   <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-transparent has-[:checked]:border-slate-400">
                      <input type="radio" name="status" value="archived" defaultChecked={editingSite?.status === 'archived'} className="hidden" />
                      <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">คลังข้อมูล</span>
                   </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="email" defaultValue={editingSite?.email} placeholder="อีเมลติดต่อ" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
                <input name="phone" defaultValue={editingSite?.phone} placeholder="เบอร์โทรศัพท์" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1"><Link2 size={10} /> ลิงก์เว็บไซต์ (URL)</label>
                <input name="contact_link" defaultValue={editingSite?.contactLink} placeholder="https://..." className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none outline-none font-bold text-sm" />
              </div>
              <div className="flex gap-2.5 pt-4">
                <button type="button" onClick={() => setShowSiteModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-400 font-bold uppercase text-[10px]">ยกเลิก</button>
                <button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold uppercase text-[10px] disabled:opacity-50">
                  {isTranslating ? 'กำลังแปล...' : isSyncing ? 'Saving...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
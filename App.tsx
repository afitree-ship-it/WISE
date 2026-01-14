
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
  Flag,
  Users,
  Briefcase,
  Filter,
  Clock,
  ClipboardList,
  ShieldCheck,
  ShieldX,
  Check
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
      return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
    } catch (e) {
      return 'light';
    }
  });

  const [viewState, setViewState] = useState<'landing' | 'dashboard'>('landing');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [adminActiveTab, setAdminActiveTab] = useState<'students' | 'sites' | 'schedule' | 'forms'>('students');
  
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
  
  const [adminStudentSearch, setAdminStudentSearch] = useState('');
  const [adminStudentStatusFilter, setAdminStudentStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  
  const [adminSiteSearch, setAdminSiteSearch] = useState('');
  const [adminSiteMajorFilter, setAdminSiteMajorFilter] = useState<Major | 'all'>('all');

  const [isTranslating, setIsTranslating] = useState(false);

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
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
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
          systemInstruction: "You are a professional translator for an educational portal. For 'date-standard' items: In 'th' (Thai), MUST use Buddhist Era year (BE = current year + 543). In 'en', 'ar', 'ms', MUST use Gregorian year (AD). Return JSON with th, en, ar, ms keys.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: items.reduce((acc, curr) => ({
              ...acc,
              [curr.key]: {
                type: Type.OBJECT,
                properties: { th: { type: Type.STRING }, en: { type: Type.STRING }, ar: { type: Type.STRING }, ms: { type: Type.STRING } },
                required: ["th", "en", "ar", "ms"]
              }
            }), {})
          },
        },
      });
      return JSON.parse(response.text ?? "{}");
    } catch (error) {
      return items.reduce((acc, curr) => ({ ...acc, [curr.key]: { th: curr.value, en: curr.value, ar: curr.value, ms: curr.value } }), {});
    }
  };

  const filteredSites = sites.filter(s => {
    const localizedName = getLocalized(s.name).toLowerCase();
    const matchesMajor = activeMajor === 'all' || s.major === activeMajor;
    const matchesSearch = localizedName.includes(searchTerm.toLowerCase());
    return matchesMajor && matchesSearch;
  });

  const filteredAdminStudents = useMemo(() => {
    let result = studentStatuses;
    if (adminStudentSearch) {
      const search = adminStudentSearch.toLowerCase();
      result = result.filter(s => 
        (s.name || "").toLowerCase().includes(search) || 
        String(s.studentId || "").toLowerCase().includes(search)
      );
    }
    if (adminStudentStatusFilter !== 'all') {
      result = result.filter(s => s.status === adminStudentStatusFilter);
    }
    return result;
  }, [studentStatuses, adminStudentSearch, adminStudentStatusFilter]);

  const filteredAdminSites = useMemo(() => {
    let result = sites;
    if (adminSiteSearch) {
      const search = adminSiteSearch.toLowerCase();
      result = result.filter(s => 
        getLocalized(s.name).toLowerCase().includes(search) || 
        getLocalized(s.location).toLowerCase().includes(search) ||
        getLocalized(s.position).toLowerCase().includes(search)
      );
    }
    if (adminSiteMajorFilter !== 'all') {
      result = result.filter(s => s.major === adminSiteMajorFilter);
    }
    return result;
  }, [sites, adminSiteSearch, adminSiteMajorFilter]);

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => (a.rawStartDate || '').localeCompare(b.rawStartDate || ''));
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
    let updated = editingSchedule ? schedules.map(s => s.id === editingSchedule.id ? newEvent : s) : [newEvent, ...schedules];
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
    let updated = editingForm ? forms.map(f => f.id === editingForm.id ? newForm : f) : [newForm, ...forms];
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
      major: formData.get('major') as Major, 
      contactLink: formData.get('contact_link') as string || undefined,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      createdAt: editingSite?.createdAt || Date.now()
    };
    let updated = editingSite ? sites.map(s => s.id === editingSite.id ? newSite : s) : [newSite, ...sites];
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
    let updated = editingStatusRecord ? studentStatuses.map(s => s.id === editingStatusRecord.id ? newRecord : s) : [newRecord, ...studentStatuses];
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
        lang={lang} setLang={setLang} currentT={currentT} isRtl={isRtl}
        onEnterDashboard={() => setViewState('dashboard')}
        onAdminLogin={handleAdminLogin}
        studentStatuses={studentStatuses}
      />
    );
  }

  const adminMenu = [
    { id: 'students', label: 'ติดตามสถานะ', icon: <Users size={20} />, color: 'amber' },
    { id: 'sites', label: 'สถานประกอบการ', icon: <Building2 size={20} />, color: 'rose' },
    { id: 'schedule', label: 'กำหนดการสำคัญ', icon: <CalendarDays size={20} />, color: 'emerald' },
    { id: 'forms', label: 'จัดการเอกสาร', icon: <FileText size={20} />, color: 'indigo' },
  ];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isRtl ? 'rtl' : ''} ${role === UserRole.ADMIN ? 'bg-[#e4d4bc] dark:bg-slate-950 overflow-hidden' : 'bg-[#F8FAFC] dark:bg-slate-900'}`}>
      {/* NAVBAR */}
      <div className="sticky top-0 z-[100] w-full px-2 sm:px-4 pt-2">
        <nav className="container mx-auto h-auto min-h-[64px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.25rem] px-4 sm:px-8 flex items-center justify-between border border-slate-100 dark:border-slate-800 py-1.5 shadow-xl shadow-slate-200/20 dark:shadow-none">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col cursor-pointer" onClick={() => setViewState('landing')}>
              <span className="block text-xl sm:text-2xl font-black leading-none uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#630330] via-[#8B1A4F] to-[#D4AF37]">
                WISE
              </span>
              {role === UserRole.ADMIN && <span className="text-[10px] font-black text-[#630330] uppercase tracking-widest leading-none mt-1">Admin Panel</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-4">
            {role === UserRole.ADMIN && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                {isSyncing ? <RefreshCw size={12} className="text-[#D4AF37] animate-spin" /> : <Cloud size={12} className="text-emerald-500" />}
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                  {isSyncing ? "Saving..." : lastSync ? `Synced: ${new Date(lastSync).toLocaleTimeString()}` : "Cloud Ready"}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white transition-all">
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button onClick={handleLogout} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-md">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </nav>
      </div>

      <div className={`container mx-auto px-2 sm:px-4 ${role === UserRole.ADMIN ? 'h-[calc(100vh-100px)] pt-4 pb-4' : 'py-4'} flex flex-col md:flex-row gap-6 flex-grow relative`}>
        {role === UserRole.ADMIN ? (
          <>
            {/* SIDEBAR NAVIGATION */}
            <aside className="w-full md:w-64 lg:w-72 flex-shrink-0 flex flex-col h-fit md:h-full overflow-y-auto hide-scrollbar z-[60]">
               <div className="flex flex-row md:flex-col gap-2 p-1.5 md:p-0 bg-[#e4d4bc]/80 dark:bg-slate-950/80 backdrop-blur-md md:bg-transparent rounded-2xl">
                  {adminMenu.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setAdminActiveTab(item.id as any)}
                      className={`
                        flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black uppercase text-[11px] min-[400px]:text-sm transition-all whitespace-nowrap md:w-full
                        ${adminActiveTab === item.id 
                          ? `bg-[#630330] text-white shadow-lg shadow-[#630330]/20` 
                          : 'bg-white/90 dark:bg-slate-900 text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800'
                        }
                      `}
                    >
                      <span className={`${adminActiveTab === item.id ? 'text-[#D4AF37]' : ''}`}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                  <div className="hidden md:block mt-4 p-5 rounded-2xl bg-gradient-to-br from-[#2A0114] to-[#630330] text-white shadow-xl shadow-[#2A0114]/20 border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] mb-1">WISE Portal</p>
                    <h4 className="font-bold text-xs leading-tight opacity-90">ระบบจัดการหลังบ้าน</h4>
                    <button onClick={fetchFromSheets} disabled={isLoading} className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase text-[#D4AF37] hover:text-white transition-all">
                      <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} /> รีเฟรชข้อมูล
                    </button>
                  </div>
               </div>
            </aside>

            {/* MAIN CONTENT AREA - Internal Scrolling */}
            <main className="flex-grow reveal-anim relative h-full flex flex-col overflow-hidden">
              <div className="bg-white/95 dark:bg-slate-900 rounded-[2.25rem] border border-slate-200/50 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full">
                
                {/* STATIC HEADER - Locked at top of content box */}
                <header className="flex-shrink-0 z-[50] px-6 sm:px-8 py-4 sm:py-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                      <div className={`p-2.5 sm:p-3 rounded-2xl bg-${adminActiveTab === 'students' ? 'amber' : adminActiveTab === 'sites' ? 'rose' : adminActiveTab === 'schedule' ? 'emerald' : 'indigo'}-50 dark:bg-slate-800 text-${adminActiveTab === 'students' ? 'amber' : adminActiveTab === 'sites' ? 'rose' : adminActiveTab === 'schedule' ? 'emerald' : 'indigo'}-600 shadow-inner`}>
                        {React.cloneElement(adminMenu.find(m => m.id === adminActiveTab)?.icon as React.ReactElement<any>, { size: 24 })}
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-2xl font-black uppercase text-slate-900 dark:text-white leading-none tracking-tight">{adminMenu.find(m => m.id === adminActiveTab)?.label}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Management Suite</p>
                      </div>
                   </div>

                   <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full sm:w-64 group">
                         <Search size={22} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors" />
                         <input 
                           type="text" 
                           placeholder="ค้นหา..." 
                           value={adminActiveTab === 'students' ? adminStudentSearch : adminSiteSearch}
                           onChange={(e) => adminActiveTab === 'students' ? setAdminStudentSearch(e.target.value) : setAdminSiteSearch(e.target.value)}
                           className="w-full pl-12 pr-5 py-3 bg-slate-50/50 dark:bg-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-700 rounded-xl outline-none font-bold text-sm sm:text-base focus:ring-2 focus:ring-[#D4AF37]/20 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-inner"
                         />
                      </div>
                      <button 
                        onClick={() => {
                          if(adminActiveTab === 'students') { setEditingStatusRecord(null); setShowAdminStatusModal(true); }
                          else if(adminActiveTab === 'sites') { setEditingSite(null); setShowSiteModal(true); }
                          else if(adminActiveTab === 'schedule') { setEditingSchedule(null); setShowScheduleModal(true); }
                          else { setEditingForm(null); setShowFormModal(true); }
                        }}
                        className={`w-full sm:w-auto px-8 py-3 rounded-xl bg-${adminMenu.find(m => m.id === adminActiveTab)?.color}-600 text-white font-black uppercase text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg shadow-${adminMenu.find(m => m.id === adminActiveTab)?.color}-600/20 transition-all hover:scale-105 active:scale-95`}
                      >
                        <Plus size={22} /> เพิ่มข้อมูล
                      </button>
                   </div>
                </header>

                {/* SCROLLABLE AREA */}
                <div className="flex-grow overflow-y-auto relative custom-scrollbar">
                   {/* Fog Effect Overlay */}
                   <div className="sticky top-0 left-0 right-0 h-8 bg-gradient-to-b from-white dark:from-slate-900 to-transparent z-[40] pointer-events-none opacity-80" />

                   <div className="px-6 sm:px-8 pb-12">
                    {/* STUDENTS TAB */}
                    {adminActiveTab === 'students' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Status Filters Strip */}
                        <div className="flex flex-wrap items-center gap-2 mb-2 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700 relative z-10">
                          <button 
                            onClick={() => setAdminStudentStatusFilter('all')}
                            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminStudentStatusFilter === 'all' ? 'bg-[#630330] text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                          >
                             ทั้งหมด ({studentStatuses.length})
                          </button>
                          {[
                            { id: ApplicationStatus.PENDING, label: currentT.statusPending, color: 'amber' },
                            { id: ApplicationStatus.PREPARING, label: currentT.statusPreparing, color: 'blue' },
                            { id: ApplicationStatus.ACCEPTED, label: currentT.statusAccepted, color: 'emerald' },
                            { id: ApplicationStatus.REJECTED, label: currentT.statusRejected, color: 'rose' }
                          ].map(st => {
                            const count = studentStatuses.filter(s => s.status === st.id).length;
                            return (
                              <button 
                                key={st.id}
                                onClick={() => setAdminStudentStatusFilter(st.id)}
                                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2
                                  ${adminStudentStatusFilter === st.id 
                                    ? `bg-${st.color}-500 text-white shadow-md` 
                                    : `text-slate-500 hover:bg-${st.color}-50 dark:hover:bg-${st.color}-950/20`
                                  }
                                `}
                              >
                                <div className={`w-2 h-2 rounded-full ${adminStudentStatusFilter === st.id ? 'bg-white' : `bg-${st.color}-400`}`} />
                                {st.label} ({count})
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {filteredAdminStudents.map(record => (
                            <div key={record.id} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between group hover:border-amber-200 hover:shadow-xl transition-all shadow-sm">
                              <div className="space-y-1 overflow-hidden pr-2">
                                <h4 className="font-black text-slate-900 dark:text-white text-base truncate">{record.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">ID: {record.studentId}</p>
                                <div className={`mt-2 px-3 py-1 rounded-full text-[9px] font-black uppercase border inline-block ${getStatusColor(record.status)}`}>{getStatusLabel(record.status)}</div>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button onClick={() => { setEditingStatusRecord(record); setShowAdminStatusModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-amber-500 rounded-xl transition-all"><Pencil size={18} /></button>
                                <button onClick={() => {
                                  if(confirm('ลบข้อมูลนี้?')) {
                                    const updated = studentStatuses.filter(s => s.id !== record.id);
                                    setStudentStatuses(updated);
                                    syncToSheets('studentStatuses', updated);
                                  }
                                }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                              </div>
                            </div>
                          ))}
                          {filteredAdminStudents.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-800/20 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                               <Filter size={48} className="text-slate-200 mb-6" />
                               <p className="text-slate-400 font-black uppercase text-xs tracking-widest">ไม่พบข้อมูลตามเงื่อนไข</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SITES TAB */}
                    {adminActiveTab === 'sites' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Major Filter Strip */}
                        <div className="flex flex-wrap items-center gap-2 mb-2 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700 relative z-10">
                          <button 
                            onClick={() => setAdminSiteMajorFilter('all')}
                            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === 'all' ? 'bg-[#630330] text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                          >
                             ทุกสาขา ({sites.length})
                          </button>
                          <button 
                            onClick={() => setAdminSiteMajorFilter(Major.HALAL_FOOD)}
                            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === Major.HALAL_FOOD ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'}`}
                          >
                             <Salad size={16} /> {currentT.halalMajor}
                          </button>
                          <button 
                            onClick={() => setAdminSiteMajorFilter(Major.DIGITAL_TECH)}
                            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === Major.DIGITAL_TECH ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-950/20'}`}
                          >
                             <Cpu size={16} /> {currentT.digitalMajor}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {filteredAdminSites.map(site => (
                            <div key={site.id} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between group hover:border-rose-200 hover:shadow-xl transition-all shadow-sm">
                              <div className="flex items-center gap-4 overflow-hidden">
                                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-white ${site.major === Major.HALAL_FOOD ? 'bg-amber-500' : 'bg-blue-600'} shadow-lg`}>
                                  {site.major === Major.HALAL_FOOD ? <Salad size={24} /> : <Cpu size={24} />}
                                </div>
                                <div className="overflow-hidden space-y-0.5">
                                  <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">{getLocalized(site.name)}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{getLocalized(site.location)}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button onClick={() => { setEditingSite(site); setShowSiteModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Pencil size={18} /></button>
                                <button onClick={() => {
                                  if(confirm('ลบหน่วยงานนี้?')) {
                                    const updated = sites.filter(s => s.id !== site.id);
                                    setSites(updated);
                                    syncToSheets('sites', updated);
                                  }
                                }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SCHEDULE TAB */}
                    {adminActiveTab === 'schedule' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {schedules.map(item => (
                          <div key={item.id} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col gap-4 relative group hover:border-emerald-200 hover:shadow-xl transition-all shadow-sm">
                            <div className="absolute top-4 right-4 flex gap-1">
                              <button onClick={() => { setEditingSchedule(item); setShowScheduleModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-emerald-500 rounded-xl transition-all"><Pencil size={18} /></button>
                              <button onClick={() => {
                                if(confirm('ลบกำหนดการ?')) {
                                  const updated = schedules.filter(s => s.id !== item.id);
                                  setSchedules(updated);
                                  syncToSheets('schedules', updated);
                                }
                              }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                            </div>
                            <h4 className="font-black text-slate-900 dark:text-white text-base sm:text-lg pr-12 leading-tight">{getLocalized(item.event)}</h4>
                            <div className="flex flex-col text-[11px] font-black uppercase text-slate-400 gap-1.5 mt-auto">
                              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div> START: {getLocalized(item.startDate)}</span>
                              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div> END: {getLocalized(item.endDate)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* FORMS TAB */}
                    {adminActiveTab === 'forms' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {forms.map(form => (
                          <div key={form.id} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between group hover:border-indigo-200 hover:shadow-xl transition-all shadow-sm">
                            <div className="flex items-center gap-4 overflow-hidden">
                              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl shadow-inner"><Download size={22} /></div>
                              <div className="overflow-hidden">
                                <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">{getLocalized(form.title)}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{form.category}</p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => { setEditingForm(form); setShowFormModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-indigo-500 rounded-xl transition-all"><Pencil size={18} /></button>
                              <button onClick={() => {
                                if(confirm('ลบเอกสาร?')) {
                                  const updated = forms.filter(f => f.id !== form.id);
                                  setForms(updated);
                                  syncToSheets('forms', updated);
                                }
                              }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                   </div>
                </div>
              </div>
            </main>
          </>
        ) : (
          /* STUDENT VIEW */
          <main className="container mx-auto px-4 py-6 space-y-10 flex-grow">
            <section className="reveal-anim">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20"><CalendarDays size={20} /></div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 dark:text-white leading-none">{currentT.schedule}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Stay updated with key dates and deadlines</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {sortedSchedules.length > 0 ? (
                  sortedSchedules.map((item) => (
                    <div key={item.id} className="group relative flex flex-row items-center justify-between p-2 sm:p-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-2xl transition-all duration-300 border-l-[6px] border-l-emerald-500 overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 pr-1 sm:pr-4">
                         <div className="relative shrink-0 flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4">
                           <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                           <div className="absolute inset-0 w-full h-full rounded-full border border-emerald-400 animate-ping opacity-75"></div>
                         </div>
                         <h4 className="text-[10px] min-[360px]:text-[11px] sm:text-base font-black text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-3 break-words">
                           {getLocalized(item.event)}
                         </h4>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-3 flex-shrink-0">
                         <div className="flex items-center gap-1 px-1 sm:px-3 py-1 sm:py-1.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-lg sm:rounded-xl border border-emerald-100 dark:border-emerald-800/40 transition-transform group-hover:scale-105">
                            <Play size={7} className="text-emerald-500 fill-emerald-500 shrink-0" />
                            <div className="flex flex-col leading-none">
                              <span className="hidden sm:block text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter mb-1">{currentT.startDateLabel}</span>
                              <span className="text-[8px] min-[400px]:text-[9px] sm:text-[12px] font-black text-emerald-900 dark:text-emerald-200 whitespace-nowrap">{getLocalized(item.startDate)}</span>
                            </div>
                         </div>
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
              <div onClick={() => setShowDocHub(true)} className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[1.5rem] p-6 sm:p-8 shadow-xl shadow-indigo-200/50 dark:shadow-none cursor-pointer hover:shadow-2xl transition-all">
                <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700"><Files size={180} /></div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl text-white"><FileText size={28} /></div>
                    <div className="space-y-1.5 text-center sm:text-left">
                       <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">{currentT.docHubTitle}</h3>
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
                  <div className="p-2.5 bg-[#630330] dark:bg-amber-500 text-white rounded-xl shadow-lg"><LayoutGrid size={20} /></div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 dark:text-white leading-none">{currentT.internshipSites}</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Explore available opportunities</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                   <div className="relative mr-2 w-full sm:w-auto">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input type="text" placeholder={currentT.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-[#630330]/20 min-w-[240px]" />
                   </div>
                  <button onClick={() => setActiveMajor('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${activeMajor === 'all' ? 'bg-[#630330] text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}>{currentT.allMajors}</button>
                  <button onClick={() => setActiveMajor(Major.HALAL_FOOD)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${activeMajor === Major.HALAL_FOOD ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}>{currentT.halalMajor}</button>
                  <button onClick={() => setActiveMajor(Major.DIGITAL_TECH)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${activeMajor === Major.DIGITAL_TECH ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}>{currentT.digitalMajor}</button>
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
          </main>
        )}
      </div>

      {/* DOCUMENT HUB MODAL */}
      {showDocHub && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 bg-slate-950/80 backdrop-blur-2xl reveal-anim">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-3xl border border-white/10 flex flex-col max-h-[90svh]">
            <div className="p-8 sm:p-12 bg-indigo-600 text-white relative">
               <button onClick={() => setShowDocHub(false)} className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={24} /></button>
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
                  <div className="flex items-center gap-2 px-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div><h4 className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{currentT.appForms}</h4></div>
                  <div className="grid grid-cols-1 gap-3">
                    {forms.filter(f => f.category === FormCategory.APPLICATION).map(form => (
                      <a key={form.id} href={form.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-2xl transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm text-indigo-600"><FileText size={20} /></div>
                           <h5 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">{getLocalized(form.title)}</h5>
                        </div>
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Download size={18} /></div>
                      </a>
                    ))}
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div><h4 className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{currentT.monitoringForms}</h4></div>
                  <div className="grid grid-cols-1 gap-3">
                    {forms.filter(f => f.category === FormCategory.MONITORING).map(form => (
                      <a key={form.id} href={form.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-2xl transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm text-indigo-600"><FileText size={20} /></div>
                           <h5 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">{getLocalized(form.title)}</h5>
                        </div>
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Download size={18} /></div>
                      </a>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modals */}
      {showAdminStatusModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim touch-auto">
          <div className="w-full max-w-[540px] bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90svh]">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-8 uppercase flex items-center gap-3"><Timer size={28} className="text-amber-500" />{editingStatusRecord ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มข้อมูลติดตาม'}</h3>
            <form onSubmit={handleSaveStatus} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">รหัสนักศึกษา</label>
                <input name="student_id" defaultValue={editingStatusRecord?.studentId} required placeholder="6XXXXXXXX" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-amber-500 outline-none font-bold text-xl transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ชื่อ-นามสกุล</label>
                <input name="student_name" defaultValue={editingStatusRecord?.name} required placeholder="ชื่อจริง - นามสกุล" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-amber-500 outline-none font-bold text-lg transition-all" />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ตัวเลือกสาขาวิชา</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: Major.HALAL_FOOD, label: currentT.halalMajor, icon: <Salad size={26} />, color: 'amber' },
                    { id: Major.DIGITAL_TECH, label: currentT.digitalMajor, icon: <Cpu size={26} />, color: 'indigo' }
                  ].map((mj) => (
                    <label key={mj.id} className="relative cursor-pointer group">
                      <input 
                        type="radio" 
                        name="major" 
                        value={mj.id} 
                        defaultChecked={editingStatusRecord?.major === mj.id || (!editingStatusRecord && mj.id === Major.HALAL_FOOD)} 
                        className="peer hidden" 
                      />
                      <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 text-center active:scale-95 relative
                        bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700
                        peer-checked:border-${mj.color}-500 peer-checked:bg-${mj.color}-50/60 dark:peer-checked:bg-${mj.color}-950/30 peer-checked:shadow-md
                      `}>
                        <div className={`absolute top-2 right-2 p-1 rounded-full bg-${mj.color}-500 text-white scale-0 peer-checked:scale-100 transition-transform`}>
                          <Check size={12} />
                        </div>
                        <div className={`text-slate-300 group-hover:scale-110 transition-transform peer-checked:text-${mj.color}-600 dark:peer-checked:text-${mj.color}-400 mb-3`}>{mj.icon}</div>
                        <span className={`text-base sm:text-lg font-black leading-tight text-slate-500 dark:text-slate-400 peer-checked:text-${mj.color}-700 dark:peer-checked:text-${mj.color}-300`}>{mj.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ตัวเลือก สถานะปัจจุบัน (คลิกเพื่อเลือก)</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: ApplicationStatus.PENDING, label: currentT.statusPending, color: 'amber', icon: <Clock size={24} /> },
                    { id: ApplicationStatus.PREPARING, label: currentT.statusPreparing, color: 'blue', icon: <ClipboardList size={24} /> },
                    { id: ApplicationStatus.ACCEPTED, label: currentT.statusAccepted, color: 'emerald', icon: <ShieldCheck size={24} /> },
                    { id: ApplicationStatus.REJECTED, label: currentT.statusRejected, color: 'rose', icon: <ShieldX size={24} /> }
                  ].map((st) => {
                    return (
                      <label key={st.id} className="relative cursor-pointer group">
                        <input 
                          type="radio" 
                          name="status" 
                          value={st.id} 
                          defaultChecked={editingStatusRecord?.status === st.id || (!editingStatusRecord && st.id === ApplicationStatus.PENDING)} 
                          className="peer hidden" 
                        />
                        <div className={`flex items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 active:scale-95 relative
                          bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700
                          peer-checked:border-${st.color}-500 peer-checked:bg-${st.color}-50/60 dark:peer-checked:bg-${st.color}-950/30 peer-checked:shadow-sm
                        `}>
                          <div className={`absolute top-2 right-2 p-1 rounded-full bg-${st.color}-500 text-white scale-0 peer-checked:scale-100 transition-transform`}>
                            <Check size={10} />
                          </div>
                          <div className={`text-slate-200 peer-checked:text-${st.color}-600 dark:peer-checked:text-${st.color}-400 transition-colors`}>{st.icon}</div>
                          <span className={`text-base font-black uppercase text-slate-500 dark:text-slate-400 peer-checked:text-${st.color}-700 dark:peer-checked:text-${st.color}-300 leading-tight`}>{st.label}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowAdminStatusModal(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-sm sm:text-base hover:bg-slate-50 transition-colors">ยกเลิก</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-5 rounded-2xl bg-[#630330] text-white font-black uppercase text-sm sm:text-base shadow-lg shadow-[#630330]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">{isSyncing ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim">
          <div className="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-[2rem] p-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-3"><CalendarDays size={24} className="text-emerald-500" />{editingSchedule ? 'แก้ไขกำหนดการ' : 'เพิ่มกำหนดการใหม่'}</h3>
            <form onSubmit={handleSaveSchedule} className="space-y-5">
              <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ชื่อกิจกรรม</label><input name="event_th" defaultValue={editingSchedule?.event.th} required placeholder="หัวข้อกิจกรรม" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-xl transition-all" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">วันเริ่มต้น</label><input type="date" name="start_th" defaultValue={editingSchedule?.rawStartDate} required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-lg transition-all" /></div>
                <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">วันสิ้นสุด</label><input type="date" name="end_th" defaultValue={editingSchedule?.rawEndDate} required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-lg transition-all" /></div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-xs">ยกเลิก</button>
                <button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-3.5 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs disabled:opacity-50">{isTranslating ? 'กำลังประมวลผล...' : 'บันทึกกำหนดการ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim">
          <div className="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-[2rem] p-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-3"><FileText size={24} className="text-indigo-500" />{editingForm ? 'แก้ไขแบบฟอร์ม' : 'เพิ่มแบบฟอร์มใหม่'}</h3>
            <form onSubmit={handleSaveForm} className="space-y-5">
              <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ชื่อเอกสาร</label><input name="title" defaultValue={editingForm?.title.th} required placeholder="Document Name" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-xl transition-all" /></div>
              <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">หมวดหมู่</label><select name="category" defaultValue={editingForm?.category || FormCategory.APPLICATION} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-lg border-2 border-transparent focus:border-indigo-500"><option value={FormCategory.APPLICATION}>เอกสารสมัครงาน (Application)</option><option value={FormCategory.MONITORING}>เอกสารระหว่างฝึกงาน (Monitoring)</option></select></div>
              <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ลิงก์ URL</label><input name="url" defaultValue={editingForm?.url} required placeholder="Download Link" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-xl transition-all" /></div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-xs">ยกเลิก</button>
                <button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-black uppercase text-xs disabled:opacity-50">{isTranslating ? 'กำลังประมวลผล...' : 'บันทึกเอกสาร'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSiteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim">
          <div className="w-full max-w-[540px] bg-white dark:bg-slate-900 rounded-[2rem] p-8 overflow-y-auto max-h-[90svh]">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-3"><Building2 size={24} className="text-rose-600" />{editingSite ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}</h3>
            <form onSubmit={handleSaveSite} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ชื่อหน่วยงาน</label><input name="name_th" defaultValue={editingSite?.name.th} required placeholder="Company Name" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-xl transition-all" /></div>
                <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">จังหวัด</label><input name="loc_th" defaultValue={editingSite?.location.th} required placeholder="City/Prov" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-xl transition-all" /></div>
              </div>
              <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">รายละเอียดงาน</label><textarea name="desc_th" defaultValue={editingSite?.description.th} required placeholder="Job details..." className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-xl transition-all min-h-[80px]"></textarea></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ตำแหน่ง</label><input name="pos_th" defaultValue={editingSite?.position.th} required placeholder="Ex: QA, Dev" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-xl transition-all" /></div>
                <div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">สาขาวิชา</label><select name="major" defaultValue={editingSite?.major || Major.HALAL_FOOD} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-lg border-2 border-transparent focus:border-rose-500"><option value={Major.HALAL_FOOD}>{currentT.halalMajor}</option><option value={Major.DIGITAL_TECH}>{currentT.digitalMajor}</option></select></div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">สถานะ</label>
                <div className="grid grid-cols-3 gap-3">
                   <label className="flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-emerald-50 transition-all border-2 border-transparent has-[:checked]:border-emerald-500"><input type="radio" name="status" value="active" defaultChecked={!editingSite || editingSite.status === 'active'} className="hidden" /><span className="text-[10px] font-black uppercase">เปิดรับ</span></label>
                   <label className="flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-amber-50 transition-all border-2 border-transparent has-[:checked]:border-amber-500"><input type="radio" name="status" value="senior_visited" defaultChecked={editingSite?.status === 'senior_visited'} className="hidden" /><span className="text-[10px] font-black uppercase">รุ่นพี่เคยไป</span></label>
                   <label className="flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-200 transition-all border-2 border-transparent has-[:checked]:border-slate-500"><input type="radio" name="status" value="archived" defaultChecked={editingSite?.status === 'archived'} className="hidden" /><span className="text-[10px] font-black uppercase">คลังข้อมูล</span></label>
                </div>
              </div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setShowSiteModal(false)} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-xs">ยกเลิก</button><button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-3.5 rounded-2xl bg-rose-600 text-white font-black uppercase text-xs disabled:opacity-50">{isTranslating ? 'กำลังบันทึก...' : 'บันทึกหน่วยงาน'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;


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
  StudentStatusRecord
} from './types';
import { TRANSLATIONS, INITIAL_SITES, INITIAL_FORMS, INITIAL_SCHEDULE, INITIAL_STUDENT_STATUSES } from './constants';
import InternshipCard from './components/InternshipCard';
import LandingPage from './LandingPage';
import AdminPanel from './AdminPanel';
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
  X
} from 'lucide-react';

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
  const [showDocHub, setShowDocHub] = useState(false);

  // History Management for Back Button support
  useEffect(() => {
    // Replace initial state
    window.history.replaceState({ view: 'landing' }, '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setViewState(event.state.view);
      } else {
        setViewState('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      window.history.pushState({ view: 'dashboard' }, '');
      return true;
    }
    return false;
  };

  const handleEnterDashboard = () => {
    setViewState('dashboard');
    window.history.pushState({ view: 'dashboard' }, '');
  };

  const handleLogout = () => {
    setRole(UserRole.STUDENT);
    setViewState('landing');
    // If we were on a pushed state, go back or replace
    if (window.history.state && window.history.state.view === 'dashboard') {
      window.history.back();
    }
  };

  const getLocalized = (localized: LocalizedString) => {
    if (!localized) return '';
    if (role === UserRole.ADMIN) return localized.th || '';
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

  if (viewState === 'landing') {
    return (
      <LandingPage 
        lang={lang} setLang={setLang} currentT={currentT} isRtl={isRtl}
        onEnterDashboard={handleEnterDashboard}
        onAdminLogin={handleAdminLogin}
        studentStatuses={studentStatuses}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isRtl ? 'rtl' : ''} ${role === UserRole.ADMIN ? 'bg-[#FFF8E7] dark:bg-slate-950 overflow-hidden' : 'bg-[#FFF8E7] dark:bg-slate-900'}`}>
      {/* NAVBAR */}
      <div className="sticky top-0 z-[100] w-full px-2 sm:px-4 pt-2">
        <nav className="container mx-auto h-auto min-h-[64px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.25rem] px-4 sm:px-8 flex items-center justify-between border border-slate-100 dark:border-slate-800 py-1.5 shadow-xl shadow-slate-200/20 dark:shadow-none">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col cursor-pointer" onClick={() => { setViewState('landing'); window.history.back(); }}>
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
          <AdminPanel 
            sites={sites} setSites={setSites}
            studentStatuses={studentStatuses} setStudentStatuses={setStudentStatuses}
            schedules={schedules} setSchedules={setSchedules}
            forms={forms} setForms={setForms}
            currentT={currentT} lang={lang}
            fetchFromSheets={fetchFromSheets}
            syncToSheets={syncToSheets}
            isLoading={isLoading}
            isSyncing={isSyncing}
            lastSync={lastSync}
          />
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
                    <div key={item.id} className="group relative flex flex-row items-center justify-between p-2 sm:p-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-2xl transition-all duration-300 border-l-[6px] border-l-emerald-500 overflow-hidden shadow-lg hover:shadow-xl dark:shadow-none">
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
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
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
    </div>
  );
};

export default App;

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
import LanguageSwitcher from './components/LanguageSwitcher';
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

  // Persist language choice
  useEffect(() => {
    localStorage.setItem('wise_portal_lang', lang);
  }, [lang]);

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
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isRtl ? 'rtl' : ''} ${role === UserRole.ADMIN ? 'bg-[#e4d4bc] dark:bg-slate-950 overflow-hidden' : 'bg-[#FFF8E7] dark:bg-slate-900'}`}>
      {/* Navbar Container: overflow visible to allow dropdowns */}
      <div className="sticky top-0 z-[100] w-full px-2 sm:px-4 pt-2">
        <nav className="container mx-auto h-auto min-h-[72px] navbar-luxe-container rounded-[1.5rem] px-4 sm:px-8 flex items-center justify-between border border-white/20 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.3)] group">
          
          {/* Decorative Tech Layers */}
          <div className="absolute inset-0 z-0 pointer-events-none rounded-[1.5rem] overflow-hidden">
             <div className="navbar-tech-circuit"></div>
             <div className="navbar-scan-beam animate-scan-line"></div>
             <div className="navbar-glow-orb -top-20 -left-20 opacity-60"></div>
             <div className="navbar-glow-orb -bottom-20 -right-20 opacity-40"></div>
             <div className="absolute top-2 left-1/4 w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse-soft"></div>
             <div className="absolute bottom-2 left-2/3 w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse-soft delay-700"></div>
             <div className="absolute -bottom-6 left-0 w-[200%] h-14 opacity-[0.25] animate-navbar-wave">
                <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="w-full h-full filter drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                  <path fill="#D4AF37" d="M0,160 C320,300 420,10 720,160 C1020,310 1120,20 1440,160 C1760,300 1860,10 2160,160 C2460,310 2560,20 2880,160 V320 H0 Z"></path>
                </svg>
             </div>
             <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
          </div>

          <div className="relative z-[110] flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col cursor-pointer group/logo" onClick={() => { setViewState('landing'); window.history.back(); }}>
              <div className="flex flex-col">
                <span className="block text-2xl sm:text-3xl font-black leading-none uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-white to-[#D4AF37] drop-shadow-sm">
                  WISE
                </span>
                {role === UserRole.ADMIN ? (
                  <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest leading-none mt-1 opacity-80">Admin Panel</span>
                ) : (
                  <div className="h-0.5 w-full bg-gradient-to-r from-[#D4AF37] via-white/50 to-transparent opacity-60 mt-1"></div>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-[110] flex items-center gap-1.5 sm:gap-4">
            {role === UserRole.ADMIN && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-inner">
                {isSyncing ? <RefreshCw size={12} className="text-[#D4AF37] animate-spin" /> : <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>}
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">
                  {isSyncing ? "Syncing..." : "LIVE SECURE"}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-1.5 sm:gap-3">
              {role === UserRole.STUDENT && (
                <div className="mr-1 filter drop-shadow-lg">
                  <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} variant="dropdown" />
                </div>
              )}

              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/10 backdrop-blur-xl text-white/80 rounded-2xl border border-white/20 hover:bg-white/25 hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              
              <button 
                onClick={handleLogout} 
                className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-rose-500/30 backdrop-blur-xl text-rose-300 border border-rose-400/30 rounded-2xl hover:bg-rose-600 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-xl group/logout"
              >
                <LogOut size={18} className="group-hover/logout:-translate-x-1 transition-transform" />
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
                              <span className="text-[8px] min(400px):text-[9px] sm:text-[12px] font-black text-emerald-900 dark:text-emerald-200 whitespace-nowrap">{getLocalized(item.startDate)}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-1 px-1 sm:px-3 py-1 sm:py-1.5 bg-rose-50/80 dark:bg-rose-950/40 rounded-lg sm:rounded-xl border border-rose-100 dark:border-rose-800/40 transition-transform group-hover:scale-105">
                            <Flag size={7} className="text-rose-500 fill-rose-500 shrink-0" />
                            <div className="flex flex-col leading-none">
                              <span className="hidden sm:block text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter mb-1">{currentT.endDateLabel}</span>
                              <span className="text-[8px] min(400px):text-[9px] sm:text-[12px] font-black text-rose-900 dark:text-rose-200 whitespace-nowrap">{getLocalized(item.endDate)}</span>
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
                     <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                      <a 
                        key={form.id} 
                        href={form.url && !form.url.startsWith('PENDING') ? form.url : '#'} 
                        onClick={(e) => {
                          if (!form.url || form.url === '#' || form.url.startsWith('PENDING')) {
                            e.preventDefault();
                            alert(lang === Language.TH ? 'ระบบกำลังประมวลผลไฟล์เอกสาร กรุณาลองใหม่ในภายหลัง' : 'System is processing the document, please try again later.');
                          }
                        }}
                        download={form.url && form.url.startsWith('data:') ? `${getLocalized(form.title)}.pdf` : undefined}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-2xl transition-all"
                      >
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
                      <a 
                        key={form.id} 
                        href={form.url && !form.url.startsWith('PENDING') ? form.url : '#'} 
                        onClick={(e) => {
                          if (!form.url || form.url === '#' || form.url.startsWith('PENDING')) {
                            e.preventDefault();
                            alert(lang === Language.TH ? 'ระบบกำลังประมวลผลไฟล์เอกสาร กรุณาลองใหม่ในภายหลัง' : 'System is processing the document, please try again later.');
                          }
                        }}
                        download={form.url && form.url.startsWith('data:') ? `${getLocalized(form.title)}.pdf` : undefined}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-2xl transition-all"
                      >
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
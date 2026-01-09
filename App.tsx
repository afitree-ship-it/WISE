
import React, { useState, useEffect } from 'react';
import { 
  Language, 
  UserRole, 
  Major, 
  InternshipSite, 
  DocumentForm, 
  FormCategory, 
  ScheduleEvent,
  LocalizedString
} from './types';
import { TRANSLATIONS, INITIAL_SITES, INITIAL_FORMS, INITIAL_SCHEDULE } from './constants';
import LanguageSwitcher from './components/LanguageSwitcher';
import InternshipCard from './components/InternshipCard';
import { 
  LogOut, 
  Plus, 
  FileDown, 
  Pencil, 
  Trash2, 
  Binary, 
  Fingerprint, 
  LockKeyhole, 
  X, 
  Search, 
  Database, 
  ChevronRight, 
  ClipboardCheck, 
  Navigation, 
  Filter, 
  Cpu, 
  Globe, 
  Briefcase, 
  GraduationCap, 
  Microscope, 
  Salad, 
  Code, 
  ShieldCheck, 
  Building2, 
  Atom, 
  AlertCircle, 
  ChevronDown 
} from 'lucide-react';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const savedLang = localStorage.getItem('wise_portal_lang');
    return (savedLang as Language) || Language.TH;
  });

  const [viewState, setViewState] = useState<'landing' | 'dashboard'>('landing');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [sites, setSites] = useState<InternshipSite[]>(INITIAL_SITES);
  const [forms, setForms] = useState<DocumentForm[]>(INITIAL_FORMS);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>(INITIAL_SCHEDULE);
  const [activeMajor, setActiveMajor] = useState<Major | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Admin States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isNavLangOpen, setIsNavLangOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('wise_portal_lang', lang);
  }, [lang]);

  // Admin forces Thai context; Users see their selected language
  const currentT = role === UserRole.ADMIN ? TRANSLATIONS[Language.TH] : TRANSLATIONS[lang];
  const isRtl = lang === Language.AR && role !== UserRole.ADMIN;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassInput === 'fst111') {
      setRole(UserRole.ADMIN);
      setLang(Language.TH); 
      setShowAdminModal(false);
      setAdminPassInput('');
      setLoginError(false);
      setViewState('dashboard');
    } else {
      setLoginError(true);
      setAdminPassInput('');
    }
  };

  const handleLogout = () => {
    setRole(UserRole.STUDENT);
    setViewState('landing');
    setShowAdminModal(false);
    setIsNavLangOpen(false);
  };

  const getLocalized = (localized: LocalizedString) => {
    return localized[lang] || localized['en'] || localized['th'];
  };

  const filteredSites = sites.filter(s => {
    const localizedName = getLocalized(s.name).toLowerCase();
    const localizedLoc = getLocalized(s.location).toLowerCase();
    const matchesMajor = activeMajor === 'all' || s.major === activeMajor;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch = localizedName.includes(searchTerm.toLowerCase()) || 
                          localizedLoc.includes(searchTerm.toLowerCase());
    return matchesMajor && matchesStatus && matchesSearch;
  });

  const scrollingIcons = [
    { icon: <Cpu size={24} />, label: 'Tech' },
    { icon: <Salad size={24} />, label: 'Halal Food' },
    { icon: <Code size={24} />, label: 'Digital' },
    { icon: <Microscope size={24} />, label: 'Research' },
    { icon: <Briefcase size={24} />, label: 'Internship' },
    { icon: <ShieldCheck size={24} />, label: 'Safety' },
    { icon: <GraduationCap size={24} />, label: 'Education' },
    { icon: <Building2 size={24} />, label: 'Enterprise' },
    { icon: <Atom size={24} />, label: 'Science' },
    { icon: <Globe size={24} />, label: 'Standard' },
  ];

  if (viewState === 'landing') {
    return (
      <div className={`min-h-[100svh] w-full flex flex-col items-center luxe-mangosteen-bg relative overflow-hidden ${isRtl ? 'rtl' : ''}`}>
        <div className="bg-video-wrap"><video autoPlay loop muted playsInline><source src="https://assets.mixkit.co/videos/preview/mixkit-business-people-working-in-a-busy-office-33824-large.mp4" type="video/mp4" /></video></div>
        <div className="video-overlay"></div>
        <div className="islamic-tech-watermark"></div>
        
        <div className="tech-waves-container">
          <div className="tech-wave tech-wave-1 opacity-20"></div>
          <div className="tech-wave tech-wave-2 opacity-10"></div>
        </div>
        
        <div className="flex-grow flex flex-col items-center justify-center w-full max-w-4xl z-10 px-6 py-10 space-y-12 reveal-anim">
          <div className="flex flex-col items-center space-y-8">
             <img 
               src="https://raw.githubusercontent.com/FST-Fatoni/assets/main/fst_logo_full.png" 
               alt="Faculty Logo" 
               className="h-24 sm:h-36 md:h-44 w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
               onError={(e) => { e.currentTarget.style.display = 'none'; }}
             />
             <div className="px-6 py-2.5 glass-polish rounded-full border border-white/10 shadow-2xl backdrop-blur-3xl">
               <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                 <span className="text-[11px] sm:text-xs font-bold uppercase text-white leading-none">
                   {lang === Language.TH ? "คณะวิทยาศาสตร์และเทคโนโลยี" : "Faculty of Science and Technology"}
                 </span>
                 <div className="hidden sm:block w-1.5 h-1.5 bg-[#D4AF37] rounded-full opacity-40"></div>
                 <span className="text-[11px] sm:text-xs font-bold uppercase text-[#D4AF37] leading-none">
                   {lang === Language.TH ? "มหาวิทยาลัยฟาฏอนี" : (lang === Language.AR ? "جامعة فطاني" : "Fatoni University")}
                 </span>
               </div>
             </div>
          </div>

          <div className="space-y-4 text-center">
            <h2 className="text-white/40 font-bold text-[10px] uppercase leading-none">
              {currentT.title}
            </h2>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.2] drop-shadow-lg px-2">
              {currentT.landingHeading}
            </h1>
          </div>

          <div className="flex flex-col items-center w-full gap-10">
            <div className="transform transition-all duration-500">
              <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} />
            </div>
            <div className="flex flex-col items-center space-y-8">
              <button 
                onClick={() => setViewState('dashboard')}
                className="start-btn-glow group relative px-14 sm:px-24 py-5 bg-white text-[#630330] rounded-full font-bold uppercase text-lg sm:text-xl transition-all hover:translate-y-[-5px] active:scale-95 shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-4 sm:gap-6">
                  {currentT.startNow} 
                  <ChevronRight size={24} className={`${isRtl ? 'rotate-180' : ''} group-hover:translate-x-2 transition-transform duration-500`} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              </button>

              <button 
                onClick={() => {
                  setLoginError(false);
                  setShowAdminModal(true);
                }}
                className="hexagon-outline group"
                title="Admin Access"
              >
                <div className="flex flex-col items-center">
                  <LockKeyhole size={20} className="text-[#D4AF37]/70 group-hover:text-[#D4AF37] transition-colors duration-500" />
                  <span className="text-[8px] font-bold uppercase text-[#D4AF37]/50 group-hover:text-[#D4AF37] mt-1">Admin</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="w-full pb-10 sm:pb-16 pt-4 overflow-hidden opacity-30 z-10">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-16 sm:gap-32">
            {[...scrollingIcons, ...scrollingIcons].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 text-[#D4AF37]">
                <div className="p-4 rounded-3xl glass-polish border border-white/5 shadow-xl">
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold uppercase">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {showAdminModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl reveal-anim">
            <div className="w-full max-w-[340px] flex flex-col items-center relative p-10 rounded-[2.5rem] border border-white/10 bg-white/5 shadow-3xl">
              <button onClick={() => setShowAdminModal(false)} className="absolute top-6 right-6 p-2.5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all">
                <X size={24} />
              </button>
              <div className="inline-flex p-6 rounded-3xl bg-[#D4AF37]/10 text-[#D4AF37] mb-6">
                <Fingerprint size={48} className="animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase mb-1">Authorization</h3>
              <p className="text-[10px] text-[#D4AF37]/50 font-bold uppercase mb-8 text-center">Faculty Personnel Only (Thai Only)</p>
              <form onSubmit={handleAdminLogin} className="w-full space-y-6">
                <div className="relative">
                  <input 
                    type="password" 
                    autoFocus 
                    placeholder="••••••" 
                    value={adminPassInput} 
                    onChange={e => {
                      setAdminPassInput(e.target.value);
                      if (loginError) setLoginError(false);
                    }} 
                    className={`w-full px-4 py-4 rounded-2xl bg-white/5 border-2 outline-none font-bold text-center text-4xl transition-all
                      ${loginError ? 'border-rose-500 text-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 'border-white/10 focus:border-[#D4AF37] text-[#D4AF37]'}`}
                  />
                  {loginError && (
                    <div className="absolute -bottom-7 left-0 right-0 flex items-center justify-center gap-2 text-rose-500 text-[10px] font-bold uppercase animate-pulse">
                      <AlertCircle size={12} /> รหัสผ่านไม่ถูกต้อง
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full bg-[#630330] text-white py-4.5 rounded-2xl font-bold uppercase text-[11px] shadow-2xl hover:bg-[#7a0b3d] transition-all transform active:scale-95">Verify Access</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-[#F9FAFB] ${isRtl ? 'rtl' : ''}`}>
      <nav className="sticky top-0 z-50 px-4 py-4">
        <div className="container mx-auto h-20 bg-white/95 backdrop-blur-md rounded-3xl px-6 sm:px-8 flex items-center justify-between border border-slate-100 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-[#630330] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#63033022]"><Binary size={22} /></div>
            <div className="hidden sm:block">
              <span className="block text-xl font-bold text-slate-900 leading-none uppercase">WISE Portal</span>
              <span className="block text-[9px] text-[#D4AF37] font-bold uppercase mt-1">Fatoni University</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            {role !== UserRole.ADMIN && (
              <div className="relative">
                 <button onClick={() => setIsNavLangOpen(!isNavLangOpen)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 transition-all font-bold shadow-sm">
                   <Globe size={18} className="text-[#630330]" />
                   <span className="text-[11px] font-bold uppercase">{lang.toUpperCase()}</span>
                   <ChevronDown size={14} className={`transition-transform duration-300 ${isNavLangOpen ? 'rotate-180' : ''}`} />
                 </button>
                 {isNavLangOpen && (
                   <div className="absolute right-0 top-full mt-3 p-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[60] min-w-[160px] reveal-anim">
                     {(Object.keys(Language) as Array<keyof typeof Language>).map((key) => (
                       <button
                         key={key}
                         onClick={() => {
                           setLang(Language[key]);
                           setIsNavLangOpen(false);
                         }}
                         className={`w-full text-left px-4 py-3 rounded-xl text-[12px] font-bold uppercase transition-all flex items-center justify-between
                           ${lang === Language[key] ? 'bg-[#630330] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                       >
                         {Language[key].toUpperCase()}
                         {lang === Language[key] && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                       </button>
                     ))}
                   </div>
                 )}
              </div>
            )}
            <button onClick={handleLogout} className="w-11 h-11 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 sm:py-10 flex-grow space-y-12">
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-6 sm:p-10 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-[#630330] text-white rounded-2xl shadow-xl"><Database size={24} /></div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 uppercase">{currentT.internshipSites}</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">Database of Academic Placements</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 flex-grow max-w-3xl">
              <div className="relative flex-grow group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#630330] transition-colors" size={18} />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4.5 rounded-[1.25rem] bg-slate-50 border-none text-sm font-bold focus:ring-4 focus:ring-[#63033011] transition-all shadow-sm" />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[1.25rem]">
                <button onClick={() => setStatusFilter('active')} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${statusFilter === 'active' ? 'bg-[#630330] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Recruiting</button>
                <button onClick={() => setStatusFilter('archived')} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${statusFilter === 'archived' ? 'bg-[#D4AF37] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>History</button>
                <button onClick={() => setStatusFilter('all')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${statusFilter === 'all' ? 'bg-slate-200 text-slate-600' : 'text-slate-400'}`}><Filter size={14} /></button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredSites.map(site => (
              <InternshipCard key={site.id} site={site} lang={role === UserRole.ADMIN ? Language.TH : lang} />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Navigation size={22} className="text-[#630330]" />
              <h3 className="text-xl font-bold text-slate-900 uppercase">{currentT.schedule}</h3>
            </div>
            <div className="bg-white p-8 sm:p-12 rounded-[3rem] border border-slate-100 shadow-xl space-y-12">
              {schedule.map((ev, idx) => (
                <div key={ev.id} className="flex gap-6 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#630330] text-white flex items-center justify-center font-bold text-lg">{idx + 1}</div>
                  <div className="flex-grow p-6 rounded-[2rem] bg-slate-50 border border-transparent hover:border-[#D4AF37] transition-all">
                    <span className="text-[11px] font-bold text-[#D4AF37] uppercase">{getLocalized(ev.date)}</span>
                    <h4 className="text-lg font-bold text-slate-800">{getLocalized(ev.event)}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
             <div className="flex items-center gap-3 px-2">
               <ClipboardCheck size={22} className="text-[#D4AF37]" />
               <h3 className="text-xl font-bold text-slate-900 uppercase">{currentT.forms}</h3>
             </div>
             <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border-t-8 border-t-[#630330] shadow-xl space-y-4">
                  <span className="text-[11px] font-bold text-[#630330] uppercase">{currentT.appForms}</span>
                  {forms.filter(f => f.category === FormCategory.APPLICATION).map(form => (
                    <a key={form.id} href={form.url} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl font-bold text-xs hover:bg-[#630330] hover:text-white transition-all">{form.title} <FileDown size={18}/></a>
                  ))}
                </div>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-4">
                  <span className="text-[11px] font-bold text-[#D4AF37] uppercase">{currentT.monitoringForms}</span>
                  {forms.filter(f => f.category === FormCategory.MONITORING).map(form => (
                    <a key={form.id} href={form.url} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl font-bold text-xs text-white border border-white/5 hover:bg-[#D4AF37] hover:text-[#630330] transition-all">{form.title} <FileDown size={18}/></a>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </main>

      <footer className="py-20 bg-white border-t border-slate-100 mt-20">
        <div className="container mx-auto px-6 text-center opacity-30">
          <div className="text-slate-900 font-bold text-2xl uppercase mb-6 tracking-widest">WISE PORTAL</div>
          <p className="text-slate-400 text-[10px] font-bold uppercase">Faculty of Science and Technology, Fatoni University.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;

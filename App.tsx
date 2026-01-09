
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
  ChevronDown,
  Sparkles
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
    if (role === UserRole.ADMIN) return localized.th;
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
        
        <div className="flex-grow flex flex-col items-center justify-center w-full max-w-4xl z-10 px-6 py-10 reveal-anim pt-10 sm:pt-20">
          <div className="flex flex-col items-center space-y-6 sm:space-y-12">
             
             {/* University Identity Tag (Moved to Top) */}
             <div className="px-6 sm:px-8 py-2.5 sm:py-3 glass-polish rounded-full border border-white/10 shadow-2xl backdrop-blur-3xl transform hover:scale-105 transition-all">
               <div className="flex flex-row items-center gap-2 sm:gap-6 whitespace-nowrap overflow-hidden">
                 <span className="text-[8.5px] sm:text-xs font-bold uppercase text-white tracking-normal sm:tracking-widest opacity-90">
                   {lang === Language.TH ? "คณะวิทยาศาสตร์และเทคโนโลยี" : (lang === Language.AR ? "كلية العلوم والتكنولوجيا" : "Faculty of Science and Technology")}
                 </span>
                 <div className="w-1 h-1 sm:w-2 sm:h-2 bg-[#D4AF37] rounded-full opacity-40"></div>
                 <span className="text-[8.5px] sm:text-xs font-bold uppercase text-[#D4AF37] tracking-normal sm:tracking-widest">
                   {lang === Language.TH ? "มหาวิทยาลัยฟาฏอนี" : (lang === Language.AR ? "جامعة فطاني" : "Fatoni University")}
                 </span>
               </div>
             </div>

             {/* --- Center Modern WISE Identity --- */}
             <div className="relative flex flex-col items-center group text-center max-w-full">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[100px] w-80 h-80 bg-[#D4AF37] rounded-full"></div>
                
                {/* Main Heading WISE */}
                <h2 className="relative text-7xl sm:text-[10rem] md:text-[11rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-[#D4AF37] leading-tight transition-all duration-700 group-hover:scale-105 drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)] select-none">
                  WISE
                </h2>

                {/* Subtitles Container - Strict 1 Row per language */}
                <div className="relative flex flex-col items-center -mt-4 sm:-mt-8 space-y-2 px-4 w-full overflow-hidden">
                  <div className="h-px w-20 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mb-1"></div>
                  
                  <span className="text-white text-[10px] sm:text-xl md:text-2xl font-extrabold tracking-tight uppercase opacity-95 drop-shadow-lg leading-none whitespace-nowrap">
                    Work-Integrated Science Education Unit
                  </span>
                  
                  <span className="text-[#D4AF37] text-[9px] sm:text-base md:text-lg font-semibold opacity-90 drop-shadow-md leading-none whitespace-nowrap">
                    หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน
                  </span>

                  <div className="h-px w-14 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent mt-1"></div>
                </div>
             </div>
          </div>

          <div className="mt-16 space-y-10 text-center w-full">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-2xl px-2 opacity-90">
              {currentT.landingHeading}
            </h1>

            <div className="flex flex-col items-center w-full gap-12">
              <div className="transform transition-all duration-500 hover:scale-105">
                <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} />
              </div>
              
              <div className="flex flex-col items-center space-y-8">
                <button 
                  onClick={() => setViewState('dashboard')}
                  className="start-btn-glow group relative px-16 sm:px-28 py-6 bg-white text-[#630330] rounded-full font-black uppercase text-lg sm:text-xl transition-all hover:translate-y-[-5px] active:scale-95 shadow-[0_30px_70px_rgba(0,0,0,0.5)] overflow-hidden"
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
                    <span className="text-[9px] font-bold uppercase text-[#D4AF37]/50 group-hover:text-[#D4AF37] mt-1">Admin</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee Footer */}
        <div className="w-full pb-10 sm:pb-16 mt-auto overflow-hidden opacity-30 z-10">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-16 sm:gap-32">
            {[...scrollingIcons, ...scrollingIcons].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 text-[#D4AF37]">
                <div className="p-5 rounded-[2rem] glass-polish border border-white/5 shadow-xl">
                  {item.icon}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {showAdminModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl reveal-anim">
            <div className="w-full max-w-[360px] flex flex-col items-center relative p-12 rounded-[3rem] border border-white/10 bg-white/5 shadow-3xl">
              <button onClick={() => setShowAdminModal(false)} className="absolute top-8 right-8 p-3 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all">
                <X size={26} />
              </button>
              <div className="inline-flex p-7 rounded-[2rem] bg-[#D4AF37]/10 text-[#D4AF37] mb-8 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                <Fingerprint size={56} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white uppercase mb-1">Authorization</h3>
              <p className="text-[11px] text-[#D4AF37]/50 font-bold uppercase mb-10 text-center tracking-normal">Staff Authentication Required</p>
              <form onSubmit={handleAdminLogin} className="w-full space-y-8">
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
                    className={`w-full px-4 py-5 rounded-2xl bg-white/5 border-2 outline-none font-bold text-center text-4xl transition-all tracking-normal
                      ${loginError ? 'border-rose-500 text-rose-500 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'border-white/10 focus:border-[#D4AF37] text-[#D4AF37]'}`}
                  />
                  {loginError && (
                    <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center gap-2 text-rose-500 text-[11px] font-bold uppercase animate-pulse">
                      <AlertCircle size={14} /> Incorrect Access Key
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full bg-[#630330] text-white py-5 rounded-[1.25rem] font-bold uppercase text-[12px] shadow-2xl hover:bg-[#7a0b3d] transition-all transform active:scale-95">Verify & Login</button>
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
        <div className="container mx-auto h-20 bg-white/95 backdrop-blur-md rounded-3xl px-6 sm:px-10 flex items-center justify-between border border-slate-100 shadow-xl">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-[#630330] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#63033022] transform transition-transform hover:rotate-6"><Binary size={24} /></div>
            <div className="hidden sm:block">
              <span className="block text-2xl font-black text-slate-900 leading-none uppercase tracking-normal">WISE</span>
              <span className="block text-[10px] text-[#D4AF37] font-bold uppercase mt-1 tracking-normal">FST Education Hub</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8">
            {role !== UserRole.ADMIN && (
              <div className="relative">
                 <button onClick={() => setIsNavLangOpen(!isNavLangOpen)} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 transition-all font-bold shadow-sm">
                   <Globe size={18} className="text-[#630330]" />
                   <span className="text-[12px] font-bold uppercase tracking-normal">{lang.toUpperCase()}</span>
                   <ChevronDown size={14} className={`transition-transform duration-300 ${isNavLangOpen ? 'rotate-180' : ''}`} />
                 </button>
                 {isNavLangOpen && (
                   <div className="absolute right-0 top-full mt-4 p-2.5 bg-white rounded-2xl border border-slate-100 shadow-3xl z-[60] min-w-[180px] reveal-anim">
                     {(Object.keys(Language) as Array<keyof typeof Language>).map((key) => (
                       <button
                         key={key}
                         onClick={() => {
                           setLang(Language[key]);
                           setIsNavLangOpen(false);
                         }}
                         className={`w-full text-left px-5 py-4 rounded-xl text-[13px] font-bold uppercase transition-all flex items-center justify-between tracking-normal
                           ${lang === Language[key] ? 'bg-[#630330] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                       >
                         {Language[key].toUpperCase()}
                         {lang === Language[key] && <div className="w-2 h-2 bg-white rounded-full"></div>}
                       </button>
                     ))}
                   </div>
                 )}
              </div>
            )}
            <button onClick={handleLogout} className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><LogOut size={22} /></button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 sm:py-14 flex-grow space-y-16">
        <section className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-8 sm:p-14 space-y-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-[#630330] text-white rounded-[1.5rem] shadow-2xl"><Database size={28} /></div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-normal">{currentT.internshipSites}</h2>
                <p className="text-[12px] font-bold text-slate-400 uppercase mt-1 tracking-normal">{currentT.title}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-5 flex-grow max-w-4xl">
              <div className="relative flex-grow group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#630330] transition-colors" size={20} />
                <input type="text" placeholder="Search by organization or location..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 rounded-[1.5rem] bg-slate-50 border-none text-sm font-bold focus:ring-4 focus:ring-[#63033011] transition-all shadow-sm tracking-normal" />
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[1.5rem]">
                <button onClick={() => setStatusFilter('active')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-bold uppercase transition-all tracking-normal ${statusFilter === 'active' ? 'bg-[#630330] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Active</button>
                <button onClick={() => setStatusFilter('archived')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-bold uppercase transition-all tracking-normal ${statusFilter === 'archived' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>History</button>
                <button onClick={() => setStatusFilter('all')} className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-[11px] font-bold uppercase transition-all tracking-normal ${statusFilter === 'all' ? 'bg-slate-200 text-slate-600' : 'text-slate-400'}`}><Filter size={16} /></button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {filteredSites.map(site => (
              <InternshipCard key={site.id} site={site} lang={lang} />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-4 px-4">
              <Navigation size={26} className="text-[#630330]" />
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-normal">{currentT.schedule}</h3>
            </div>
            <div className="bg-white p-10 sm:p-16 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-14">
              {schedule.map((ev, idx) => (
                <div key={ev.id} className="flex gap-8 items-center group">
                  <div className="w-14 h-14 rounded-2xl bg-[#630330] text-white flex items-center justify-center font-black text-xl shadow-xl transition-all group-hover:scale-110">{idx + 1}</div>
                  <div className="flex-grow p-8 rounded-[2.5rem] bg-slate-50 border border-transparent group-hover:border-[#D4AF37] group-hover:bg-white transition-all shadow-sm hover:shadow-xl">
                    <span className="text-[12px] font-bold text-[#D4AF37] uppercase tracking-normal">{getLocalized(ev.date)}</span>
                    <h4 className="text-xl font-bold text-slate-800 mt-1">{getLocalized(ev.event)}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-8">
             <div className="flex items-center gap-4 px-4">
               <ClipboardCheck size={26} className="text-[#D4AF37]" />
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-normal">{currentT.forms}</h3>
             </div>
             <div className="space-y-8">
                <div className="bg-white p-10 rounded-[3rem] border-t-[10px] border-t-[#630330] shadow-2xl space-y-5">
                  <span className="text-[12px] font-bold text-[#630330] uppercase tracking-normal">{currentT.appForms}</span>
                  {forms.filter(f => f.category === FormCategory.APPLICATION).map(form => (
                    <a key={form.id} href={form.url} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl font-bold text-sm hover:bg-[#630330] hover:text-white transition-all shadow-sm hover:shadow-lg">{form.title} <FileDown size={20}/></a>
                  ))}
                </div>
                <div className="bg-slate-900 p-10 rounded-[3rem] shadow-3xl space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                  <span className="text-[12px] font-bold text-[#D4AF37] uppercase tracking-normal">{currentT.monitoringForms}</span>
                  {forms.filter(f => f.category === FormCategory.MONITORING).map(form => (
                    <a key={form.id} href={form.url} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl font-bold text-sm text-white border border-white/5 hover:bg-[#D4AF37] hover:text-[#630330] transition-all shadow-sm">{form.title} <FileDown size={20}/></a>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </main>

      <footer className="py-24 bg-white border-t border-slate-100 mt-24">
        <div className="container mx-auto px-6 text-center">
          <div className="text-slate-900 font-black text-4xl uppercase mb-8 tracking-normal opacity-20">WISE</div>
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-normal opacity-50">Faculty of Science and Technology, Fatoni University.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;

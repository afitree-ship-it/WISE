import React, { useState, useEffect, useMemo } from 'react';
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
import { GoogleGenAI, Type } from "@google/genai";
import { 
  LogOut, 
  Plus, 
  FileDown, 
  Pencil, 
  Fingerprint, 
  LockKeyhole, 
  X, 
  Search, 
  Database, 
  ChevronRight, 
  ClipboardCheck, 
  Navigation, 
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
  Save,
  Trash,
  Loader2,
  Sparkles,
  Calendar,
  ArrowRight,
  LucideIcon
} from 'lucide-react';

const TechMeteorShower: React.FC = () => {
  const meteors = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${2.5 + Math.random() * 3}s`,
    }));
  }, []);

  return (
    <div className="meteor-container">
      {meteors.map((m) => (
        <div 
          key={m.id} 
          className="tech-meteor"
          style={{
            left: m.left,
            animation: `tech-shoot-up ${m.duration} ease-out ${m.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
};

const ModernWaves: React.FC = () => {
  return (
    <div className="waves-container">
      <div className="wave-layer animate-wave-slow bob-slow opacity-20">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="wave-svg">
          <path className="wave-line" stroke="#D4AF37" d="M0,160 C320,300 420,10 720,160 C1020,310 1120,20 1440,160"></path>
          <path className="wave-line" stroke="#D4AF37" d="M1440,160 C1760,300 1860,10 2160,160 C2460,310 2560,20 2880,160"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-mid bob-mid opacity-10">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="wave-svg">
          <path className="wave-line" stroke="#FFFFFF" d="M0,192 C240,120 480,240 720,192 C960,144 1200,240 1440,192"></path>
          <path className="wave-line" stroke="#FFFFFF" d="M1440,192 C1680,120 1920,240 2160,192 C2400,144 2640,240 2880,192"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-slow bob-slow opacity-30">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="wave-svg">
          <path fill="#7A0B3D" fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,138.7C960,160,1056,224,1152,245.3C1248,267,1344,245,1392,234.7L1440,224V320H0Z"></path>
          <path fill="#7A0B3D" fillOpacity="1" d="M1440,160L1488,176C1536,192,1632,224,1728,224C1824,224,1920,192,2016,165.3C2112,139,2208,117,2304,138.7C2400,160,2496,224,2592,245.3C2688,267,2784,245,2832,234.7L2880,224V320H1440Z"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-mid bob-mid opacity-20" style={{ marginBottom: '5px' }}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="wave-svg">
          <path fill="#D4AF37" fillOpacity="1" d="M0,224L60,202.7C120,181,240,139,360,144C480,149,600,203,720,202.7C840,203,960,149,1080,128C1200,107,1320,117,1380,122.7L1440,128V320H0Z"></path>
          <path fill="#D4AF37" fillOpacity="1" d="M1440,224L1500,202.7C1560,181,1680,139,1800,144C1920,149,2040,203,2160,202.7C2280,203,2400,149,2520,128C2640,107,2760,117,2820,122.7L2880,128V320H1440Z"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-fast bob-fast opacity-40">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="wave-svg">
          <path fill="#630330" fillOpacity="1" d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,208C1248,171,1344,117,1392,90.7L1440,64V320H0Z"></path>
          <path fill="#630330" fillOpacity="1" d="M1440,288L1488,272C1536,256,1632,224,1728,197.3C1824,171,1920,149,2016,165.3C2112,181,2208,235,2304,250.7C2400,267,2496,245,2592,208C2688,171,2784,117,2832,90.7L2880,64V320H0Z"></path>
        </svg>
      </div>
    </div>
  );
};

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
  const [statusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Admin Modal States
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isNavLangOpen, setIsNavLangOpen] = useState(false);

  // Management States
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingSite, setEditingSite] = useState<InternshipSite | null>(null);
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEvent | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState<DocumentForm | null>(null);

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
      setShowAdminLogin(false);
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
    setShowAdminLogin(false);
    setIsNavLangOpen(false);
  };

  const getLocalized = (localized: LocalizedString) => {
    if (role === UserRole.ADMIN) return localized.th;
    return (localized as any)[lang] || localized['en'] || localized['th'];
  };

  const performBatchTranslation = async (items: { key: string, value: string, isDate?: boolean }[]) => {
    if (items.length === 0) return {};
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const prompt = `Translate to EN, AR, MS. For isDate:true use human-readable format (TH use BE). Return JSON.
      Items: ${items.map(i => `${i.key}:"${i.value}" (date:${!!i.isDate})`).join(', ')}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
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
      console.error("Batch AI error:", error);
      return items.reduce((acc, curr) => ({
        ...acc,
        [curr.key]: { th: curr.value, en: curr.value, ar: curr.value, ms: curr.value }
      }), {});
    }
  };

  const filteredSites = sites.filter(s => {
    const localizedName = getLocalized(s.name).toLowerCase();
    const matchesMajor = activeMajor === 'all' || s.major === activeMajor;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch = localizedName.includes(searchTerm.toLowerCase());
    return matchesMajor && matchesStatus && matchesSearch;
  });

  const handleSaveSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thName = formData.get('name_th') as string;
    const thLoc = formData.get('loc_th') as string;
    const thDesc = formData.get('desc_th') as string;

    const itemsToTranslate = [];
    if (!editingSite || editingSite.name.th !== thName) itemsToTranslate.push({ key: 'name', value: thName });
    if (!editingSite || editingSite.location.th !== thLoc) itemsToTranslate.push({ key: 'loc', value: thLoc });
    if (!editingSite || editingSite.description.th !== thDesc) itemsToTranslate.push({ key: 'desc', value: thDesc });

    let results: Record<string, any> = {};
    if (itemsToTranslate.length > 0) {
      setIsTranslating(true);
      results = await performBatchTranslation(itemsToTranslate);
      setIsTranslating(false);
    }

    const newSite: InternshipSite = {
      id: editingSite?.id || Date.now().toString(),
      name: results['name'] || editingSite?.name || { th: thName, en: thName, ar: thName, ms: thName },
      location: results['loc'] || editingSite?.location || { th: thLoc, en: thLoc, ar: thLoc, ms: thLoc },
      description: results['desc'] || editingSite?.description || { th: thDesc, en: thDesc, ar: thDesc, ms: thDesc },
      status: formData.get('status') as 'active' | 'archived',
      major: formData.get('major') as Major,
      contactLink: formData.get('url') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    };

    if (editingSite) {
      setSites(sites.map(s => s.id === editingSite.id ? newSite : s));
    } else {
      setSites([newSite, ...sites]);
    }
    setShowSiteModal(false);
    setEditingSite(null);
  };

  const handleDeleteSite = (id: string) => {
    if (confirm('ยืนยันการลบข้อมูลสถานประกอบการนี้?')) {
      setSites(sites.filter(s => s.id !== id));
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thEvent = formData.get('event_th') as string;
    const startRaw = formData.get('start_date') as string;
    const endRaw = formData.get('end_date') as string;

    const itemsToTranslate = [];
    if (!editingSchedule || editingSchedule.event.th !== thEvent) itemsToTranslate.push({ key: 'event', value: thEvent });
    if (!editingSchedule) {
      itemsToTranslate.push({ key: 'start', value: startRaw, isDate: true });
      itemsToTranslate.push({ key: 'end', value: endRaw, isDate: true });
    }

    let results: Record<string, any> = {};
    if (itemsToTranslate.length > 0) {
      setIsTranslating(true);
      results = await performBatchTranslation(itemsToTranslate);
      setIsTranslating(false);
    }

    const newEv: ScheduleEvent = {
      id: editingSchedule?.id || Date.now().toString(),
      event: results['event'] || editingSchedule?.event || { th: thEvent, en: thEvent, ar: thEvent, ms: thEvent },
      startDate: results['start'] || editingSchedule?.startDate || { th: startRaw, en: startRaw, ar: startRaw, ms: startRaw },
      endDate: results['end'] || editingSchedule?.endDate || { th: endRaw, en: endRaw, ar: endRaw, ms: endRaw },
      status: formData.get('status') as 'upcoming' | 'past',
    };

    if (editingSchedule) {
      setSchedule(schedule.map(s => s.id === editingSchedule.id ? newEv : s));
    } else {
      setSchedule([...schedule, newEv]);
    }
    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const handleSaveForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newForm: DocumentForm = {
      id: editingForm?.id || Date.now().toString(),
      title: formData.get('title') as string,
      url: formData.get('url') as string,
      category: formData.get('category') as FormCategory,
    };
    if (editingForm) {
      setForms(forms.map(f => f.id === editingForm.id ? newForm : f));
    } else {
      setForms([...forms, newForm]);
    }
    setShowFormModal(false);
    setEditingForm(null);
  };

  const scrollingIcons: { icon: LucideIcon, label: string }[] = [
    { icon: Cpu, label: 'Tech' },
    { icon: Salad, label: 'Halal Food' },
    { icon: Code, label: 'Digital' },
    { icon: Microscope, label: 'Research' },
    { icon: Briefcase, label: 'Internship' },
    { icon: ShieldCheck, label: 'Safety' },
    { icon: GraduationCap, label: 'Education' },
    { icon: Building2, label: 'Enterprise' },
    { icon: Atom, label: 'Science' },
    { icon: Globe, label: 'Standard' },
  ];

  if (viewState === 'landing') {
    return (
      <div className={`min-h-[100svh] w-full flex flex-col items-center luxe-mangosteen-bg relative overflow-hidden ${isRtl ? 'rtl' : ''}`}>
        <div className="bg-video-wrap"><video autoPlay loop muted playsInline><source src="https://assets.mixkit.co/videos/preview/mixkit-business-people-working-in-a-busy-office-33824-large.mp4" type="video/mp4" /></video></div>
        <div className="video-overlay"></div>
        <div className="islamic-tech-watermark"></div>
        <TechMeteorShower />
        <ModernWaves />
        
        <div className="flex-grow flex flex-col items-center justify-center w-full max-w-4xl z-20 px-6 py-4 reveal-anim pt-2 sm:pt-10">
          <div className="flex flex-col items-center space-y-4 sm:space-y-8">
             <div className="px-4 sm:px-8 py-2 sm:py-3 glass-polish rounded-full border border-white/10 shadow-2xl backdrop-blur-3xl transform hover:scale-105 transition-all">
               <div className="flex flex-row items-center gap-2 sm:gap-6 whitespace-nowrap overflow-hidden">
                 <span className="text-[8px] sm:text-xs font-bold uppercase text-white tracking-normal opacity-90">
                   {lang === Language.TH ? "คณะวิทยาศาสตร์และเทคโนโลยี" : (lang === Language.AR ? "كلية العلوم والتكنولوجيا" : "Faculty of Science and Technology")}
                 </span>
                 <div className="w-1 h-1 sm:w-2 sm:h-2 bg-[#D4AF37] rounded-full opacity-40"></div>
                 <span className="text-[8px] sm:text-xs font-bold uppercase text-[#D4AF37] tracking-normal">
                   {lang === Language.TH ? "มหาวิทยาลัยฟาฏอนี" : (lang === Language.AR ? "جامعة فطاني" : "Fatoni University")}
                 </span>
               </div>
             </div>

             <div className="relative flex flex-col items-center group text-center max-w-full">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[100px] w-60 h-60 sm:w-80 sm:h-80 bg-[#D4AF37] rounded-full"></div>
                <h2 className="relative text-6xl sm:text-[10rem] md:text-[11rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-[#D4AF37] leading-tight transition-all duration-700 group-hover:scale-105 drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)] select-none">
                  WISE
                </h2>
                <div className="relative flex flex-col items-center -mt-2 sm:-mt-8 space-y-2 px-4 w-full overflow-hidden">
                  <div className="h-px w-20 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mb-1"></div>
                  <span className="text-[#D4AF37] text-[9px] sm:text-xl md:text-2xl font-extrabold tracking-tight uppercase opacity-95 drop-shadow-lg leading-none whitespace-nowrap">
                    Work-Integrated Science Education Unit
                  </span>
                  <span className="text-[#D4AF37] text-[8px] sm:text-base md:text-lg font-semibold opacity-90 drop-shadow-md leading-none whitespace-nowrap">
                    หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน
                  </span>
                  <div className="h-px w-14 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent mt-1"></div>
                </div>
             </div>
          </div>

          <div className="mt-4 sm:mt-8 space-y-6 sm:space-y-8 text-center w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h1 className="text-[14px] min-[380px]:text-base min-[420px]:text-lg sm:text-5xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-2xl px-2 opacity-90 tracking-tight whitespace-nowrap">
              {currentT.landingHeading}
            </h1>

            <div className="flex flex-col items-center w-full gap-6 sm:gap-10">
              <div className="transform transition-all duration-500 hover:scale-105 scale-90 sm:scale-100">
                <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} />
              </div>
              
              <div className="flex flex-col items-center space-y-6 sm:space-y-8">
                <button 
                  onClick={() => setViewState('dashboard')}
                  className="group relative px-8 sm:px-16 py-3.5 sm:py-5 bg-white text-[#630330] rounded-full font-black uppercase text-sm sm:text-lg transition-all hover:translate-y-[-5px] active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
                  <span className="relative z-10 flex items-center gap-3 sm:gap-5 tracking-wider">
                    {currentT.startNow} 
                    <div className="p-1 rounded-full bg-[#630330]/5 group-hover:bg-[#630330] group-hover:text-white transition-all duration-300">
                      <ChevronRight size={18} className={`${isRtl ? 'rotate-180' : ''} group-hover:translate-x-1 transition-transform duration-500`} />
                    </div>
                  </span>
                  <div className="absolute -inset-2 bg-white/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </button>

                <button 
                  onClick={() => {
                    setLoginError(false);
                    setShowAdminLogin(true);
                  }}
                  className="flex items-center gap-2 mt-2 opacity-30 hover:opacity-100 transition-all duration-500 group"
                  title="Staff Access"
                >
                  <LockKeyhole size={12} className="text-[#D4AF37] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase text-[#D4AF37] tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">Staff Access</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full pb-8 sm:pb-20 mt-auto overflow-hidden opacity-30 z-10">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-12 sm:gap-32">
            {[...scrollingIcons, ...scrollingIcons].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 sm:gap-3 text-[#D4AF37]">
                  <div className="p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] glass-polish border border-white/5 shadow-xl">
                    <Icon size={20} />
                  </div>
                  <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {showAdminLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl reveal-anim overflow-y-auto">
            <div className="w-full max-w-[420px] my-auto flex flex-col items-center relative p-8 sm:p-14 rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 bg-white/5 shadow-3xl">
              <button onClick={() => setShowAdminLogin(false)} className="absolute top-6 right-6 sm:top-8 sm:right-8 p-3 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all">
                <X size={24} />
              </button>
              <div className="inline-flex p-6 sm:p-7 rounded-[1.5rem] sm:rounded-[2rem] bg-[#D4AF37]/10 text-[#D4AF37] mb-6 sm:mb-8 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                <Fingerprint size={48} className="animate-pulse" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white uppercase mb-1 text-center">เจ้าหน้าที่ (Staff Access)</h3>
              <p className="text-[10px] sm:text-[11px] text-[#D4AF37]/60 font-bold uppercase mb-8 sm:mb-10 text-center tracking-widest">การตรวจสอบความปลอดภัย</p>
              <form onSubmit={handleAdminLogin} className="w-full space-y-6 sm:space-y-8">
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
                    className={`w-full px-4 py-6 sm:py-7 rounded-2xl bg-white/5 border-2 outline-none font-bold text-center text-5xl sm:text-6xl transition-all
                      ${loginError ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-white/10 focus:border-[#D4AF37] text-[#D4AF37]'}`}
                  />
                  {loginError && (
                    <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-2 text-rose-500 text-[10px] font-bold uppercase animate-bounce">
                      <AlertCircle size={12} /> รหัสผ่านไม่ถูกต้อง
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-[#630330] hover:bg-[#7a0b3d] text-white py-5 sm:py-7 rounded-2xl font-black uppercase text-sm sm:text-base shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all active:scale-[0.97] active:brightness-90 transform outline-none focus:ring-4 focus:ring-[#63033044]"
                >
                  ยืนยันและดำเนินการต่อ
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-[#F9FAFB] ${isRtl ? 'rtl' : ''}`}>
      <div className="sticky top-0 z-50 w-full">
        <div className="absolute inset-0 bg-[#F9FAFB]/60 backdrop-blur-2xl [mask-image:linear-gradient(to_bottom,black_70%,transparent)] pointer-events-none h-32 -mb-32"></div>
        <nav className="relative px-4 py-4 sm:pt-6 sm:pb-2">
          <div className="container mx-auto h-auto min-h-[112px] bg-white/95 backdrop-blur-md rounded-[2.5rem] px-6 sm:px-12 flex items-center justify-between border border-slate-100 shadow-2xl py-4 transition-all duration-300">
            <div className="flex items-center gap-4 sm:gap-10">
              <div className="flex flex-col transform transition-all duration-300 hover:scale-[1.02]">
                <span className="block text-4xl font-black leading-none uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#630330] via-[#8B1A4F] to-[#D4AF37]">
                  WISE
                </span>
                <span className="block text-[11px] text-[#D4AF37] font-extrabold uppercase mt-1.5 tracking-tight opacity-95">
                  Work-Integrated Science Education
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-8">
              {role !== UserRole.ADMIN && (
                <div className="relative">
                   <button onClick={() => setIsNavLangOpen(!isNavLangOpen)} className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 transition-all font-bold shadow-sm">
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
              <button onClick={handleLogout} className="w-14 h-14 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-rose-500/10 active:scale-90"><LogOut size={24} /></button>
            </div>
          </div>
        </nav>
      </div>

      <main className="container mx-auto px-4 py-8 sm:py-14 flex-grow space-y-16">
        <section className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-8 sm:p-14 space-y-12 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-[#630330] text-white rounded-[1.5rem] shadow-2xl"><Database size={28} /></div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-normal">{currentT.internshipSites}</h2>
                <p className="text-[12px] font-bold text-slate-400 uppercase mt-1 tracking-normal">{currentT.title}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-5 flex-grow max-w-4xl">
              {role === UserRole.ADMIN && (
                <button 
                  onClick={() => { setEditingSite(null); setShowSiteModal(true); }}
                  className="px-8 py-5 rounded-[1.5rem] bg-[#D4AF37] text-white font-black uppercase text-sm flex items-center justify-center gap-3 shadow-lg transform transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  <Plus size={20} /> เพิ่มสถานประกอบการ
                </button>
              )}
              <div className="flex-grow flex items-center gap-3 bg-slate-50 p-2 rounded-[1.5rem] shadow-inner overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveMajor('all')} className={`px-6 py-3 rounded-xl text-[11px] font-bold uppercase transition-all tracking-normal whitespace-nowrap ${activeMajor === 'all' ? 'bg-[#630330] text-white' : 'text-slate-400'}`}>ทุกสาขา</button>
                <button onClick={() => setActiveMajor(Major.HALAL_FOOD)} className={`px-6 py-3 rounded-xl text-[11px] font-bold uppercase transition-all tracking-normal whitespace-nowrap ${activeMajor === Major.HALAL_FOOD ? 'bg-[#D4AF37] text-white' : 'text-slate-400'}`}>อาหารฮาลาล</button>
                <button onClick={() => setActiveMajor(Major.DIGITAL_TECH)} className={`px-6 py-3 rounded-xl text-[11px] font-bold uppercase transition-all tracking-normal whitespace-nowrap ${activeMajor === Major.DIGITAL_TECH ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>ดิจิทัล</button>
              </div>
              <div className="relative flex-grow group max-w-md">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="ค้นหาชื่อหน่วยงาน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 rounded-[1.5rem] bg-slate-50 border-none text-sm font-bold focus:ring-4 focus:ring-[#63033011]" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {filteredSites.map(site => (
              <div key={site.id} className="relative group">
                <InternshipCard site={site} lang={lang} />
                {role === UserRole.ADMIN && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={() => { setEditingSite(site); setShowSiteModal(true); }}
                      className="p-2.5 bg-white/90 backdrop-blur-md text-[#630330] rounded-xl shadow-lg hover:bg-[#630330] hover:text-white transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSite(site.id)}
                      className="p-2.5 bg-white/90 backdrop-blur-md text-rose-500 rounded-xl shadow-lg hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <Navigation size={26} className="text-[#630330]" />
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-normal">{currentT.schedule}</h3>
              </div>
              {role === UserRole.ADMIN && (
                <button 
                  onClick={() => { setEditingSchedule(null); setShowScheduleModal(true); }}
                  className="p-3 bg-[#D4AF37] text-white rounded-2xl hover:bg-[#b8952c] transition-all"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
            <div className="bg-white p-10 sm:p-14 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-10">
              {schedule.map((ev, idx) => (
                <div key={ev.id} className="flex gap-8 items-center group relative">
                  <div className="w-14 h-14 rounded-2xl bg-[#630330] text-white flex items-center justify-center font-black text-xl shadow-xl">{idx + 1}</div>
                  <div className="flex-grow p-8 rounded-[2.5rem] bg-slate-50 border border-transparent hover:border-[#D4AF37] hover:bg-white transition-all shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-bold text-[#D4AF37] uppercase tracking-normal">
                        {getLocalized(ev.startDate)}
                      </span>
                      {getLocalized(ev.startDate) !== getLocalized(ev.endDate) && (
                        <>
                          <ArrowRight size={10} className="text-slate-300" />
                          <span className="text-[12px] font-bold text-[#D4AF37] uppercase tracking-normal">
                            {getLocalized(ev.endDate)}
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="text-xl font-bold text-slate-800">{getLocalized(ev.event)}</h4>
                  </div>
                  {role === UserRole.ADMIN && (
                    <div className="flex flex-col gap-2 ml-4">
                      <button onClick={() => { setEditingSchedule(ev); setShowScheduleModal(true); }} className="p-2 text-slate-400 hover:text-[#630330] transition-colors"><Pencil size={18} /></button>
                      <button onClick={() => setSchedule(schedule.filter(s => s.id !== ev.id))} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash size={18} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 space-y-8">
             <div className="flex items-center justify-between px-4">
               <div className="flex items-center gap-4">
                 <ClipboardCheck size={26} className="text-[#D4AF37]" />
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-normal">{currentT.forms}</h3>
               </div>
               {role === UserRole.ADMIN && (
                 <button 
                   onClick={() => { setEditingForm(null); setShowFormModal(true); }}
                   className="p-3 bg-[#630330] text-white rounded-2xl hover:bg-[#7a0b3d] transition-all"
                 >
                   <Plus size={20} />
                 </button>
               )}
             </div>
             <div className="space-y-8">
                <div className="bg-white p-10 rounded-[3rem] border-t-[10px] border-t-[#630330] shadow-2xl space-y-5">
                  <span className="text-[12px] font-bold text-[#630330] uppercase tracking-normal">{currentT.appForms}</span>
                  {forms.filter(f => f.category === FormCategory.APPLICATION).map(form => (
                    <div key={form.id} className="flex items-center gap-3">
                      <a href={form.url} target="_blank" rel="noopener noreferrer" className="flex-grow flex items-center justify-between p-5 bg-slate-50 rounded-2xl font-bold text-sm hover:bg-[#630330] hover:text-white transition-all shadow-sm">
                        {form.title} <FileDown size={20}/>
                      </a>
                      {role === UserRole.ADMIN && (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingForm(form); setShowFormModal(true); }} className="p-3 text-slate-400 hover:text-[#630330]"><Pencil size={16}/></button>
                          <button onClick={() => setForms(forms.filter(f => f.id !== form.id))} className="p-3 text-slate-400 hover:text-rose-500"><Trash size={16}/></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="bg-slate-900 p-10 rounded-[3rem] shadow-3xl space-y-5 relative overflow-hidden">
                  <span className="text-[12px] font-bold text-[#D4AF37] uppercase tracking-normal">{currentT.monitoringForms}</span>
                  {forms.filter(f => f.category === FormCategory.MONITORING).map(form => (
                    <div key={form.id} className="flex items-center gap-3">
                      <a href={form.url} target="_blank" rel="noopener noreferrer" className="flex-grow flex items-center justify-between p-5 bg-white/5 rounded-2xl font-bold text-sm text-white border border-white/5 hover:bg-[#D4AF37] hover:text-[#630330] transition-all shadow-sm">
                        {form.title} <FileDown size={20}/>
                      </a>
                      {role === UserRole.ADMIN && (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingForm(form); setShowFormModal(true); }} className="p-3 text-white/30 hover:text-[#D4AF37]"><Pencil size={16}/></button>
                          <button onClick={() => setForms(forms.filter(f => f.id !== form.id))} className="p-3 text-white/30 hover:text-rose-500"><Trash size={16}/></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </main>

      {showSiteModal && (
        <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-3xl animate-in zoom-in-95 duration-200 my-4 sm:my-8 max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white z-20 pb-4 flex items-center justify-between border-b border-slate-100 mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl font-black text-[#630330] uppercase tracking-normal">{editingSite ? 'แก้ไขข้อมูลหน่วยงาน' : 'เพิ่มสถานประกอบการใหม่'}</h3>
              <button onClick={() => setShowSiteModal(false)} className="p-2 sm:p-3 rounded-full hover:bg-slate-100 transition-colors"><X /></button>
            </div>
            {isTranslating && (
              <div className="absolute inset-0 z-[30] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                <Loader2 size={40} className="text-[#630330] animate-spin" />
                <div className="flex items-center gap-2 text-[#630330] font-black uppercase text-sm animate-pulse">
                  <Sparkles size={16} /> กำลังบันทึกข้อมูลและแปลภาษา...
                </div>
              </div>
            )}
            <form onSubmit={handleSaveSite} className="space-y-8 sm:space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                <div className="space-y-6">
                  <span className="block text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">ข้อมูลทั่วไป (ภาษาไทย)</span>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">ชื่อหน่วยงาน / องค์กร</label>
                    <input name="name_th" defaultValue={editingSite?.name.th} required className="w-full px-5 py-4 rounded-xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-[#D4AF37]" placeholder="ระบุชื่อบริษัทหรือหน่วยงาน" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">สถานที่ตั้ง</label>
                    <input name="loc_th" defaultValue={editingSite?.location.th} required className="w-full px-5 py-4 rounded-xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-[#D4AF37]" placeholder="ระบุจังหวัด หรือที่อยู่เบื้องต้น" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">รายละเอียดงาน/สวัสดิการ</label>
                    <textarea name="desc_th" defaultValue={editingSite?.description.th} required className="w-full h-32 px-5 py-4 rounded-xl bg-slate-50 border-none text-sm font-bold" placeholder="ระบุรายละเอียดการฝึกงานเบื้องต้น" />
                  </div>
                </div>
                <div className="space-y-6">
                  <span className="block text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">การตั้งค่าสาขาวิชาและสถานะ</span>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">เลือกสาขาวิชา</label>
                    <select name="major" defaultValue={editingSite?.major} className="w-full px-5 py-4 rounded-xl bg-slate-50 border-none text-sm font-bold">
                      <option value={Major.HALAL_FOOD}>วิจัยและพัฒนาผลิตภัณฑ์อาหารฮาลาล</option>
                      <option value={Major.DIGITAL_TECH}>เทคโนโลยีและวิทยาการดิจิทัล</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">สถานะการเปิดรับ</label>
                    <select name="status" defaultValue={editingSite?.status} className="w-full px-5 py-4 rounded-xl bg-slate-50 border-none text-sm font-bold">
                      <option value="active">กำลังเปิดรับสมัคร</option>
                      <option value="archived">ประวัติการฝึกงาน</option>
                    </select>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <input name="url" defaultValue={editingSite?.contactLink} placeholder="ลิงก์เว็บไซต์ (https://...)" className="w-full px-5 py-4 rounded-xl bg-slate-50 border-none text-sm font-bold" />
                    <input name="email" defaultValue={editingSite?.email} placeholder="อีเมลติดต่อ" className="w-full px-5 py-4 rounded-xl bg-slate-50 border-none text-sm font-bold" />
                    <input name="phone" defaultValue={editingSite?.phone} placeholder="เบอร์โทรศัพท์" className="w-full px-5 py-4 rounded-xl bg-slate-50 border-none text-sm font-bold" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowSiteModal(false)} className="order-2 sm:order-1 px-8 py-4 rounded-xl font-bold text-slate-400 uppercase text-xs hover:bg-slate-50 transition-colors">ยกเลิก</button>
                <button type="submit" disabled={isTranslating} className="order-1 sm:order-2 px-12 py-4 rounded-xl bg-[#630330] text-white font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 hover:bg-[#7a0b3d] active:scale-[0.97] transition-all disabled:opacity-50">
                  <Save size={16} /> {isTranslating ? 'กำลังบันทึก...' : 'บันทึกข้อมูลทันที'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[2rem] p-8 shadow-3xl my-auto animate-in zoom-in-95 duration-200 relative">
            {isTranslating && (
              <div className="absolute inset-0 z-[30] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 rounded-[2rem]">
                <Loader2 size={30} className="text-[#630330] animate-spin" />
                <span className="text-[#630330] font-bold text-xs animate-pulse">กำลังประมวลผลกำหนดการ...</span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-6">
               <Calendar size={24} className="text-[#D4AF37]" />
               <h3 className="text-xl font-black text-[#630330] uppercase">{editingSchedule ? 'แก้ไขกำหนดการ' : 'เพิ่มกำหนดการใหม่'}</h3>
            </div>
            <form onSubmit={handleSaveSchedule} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-2 tracking-widest">หัวข้อกิจกรรม</label>
                  <input name="event_th" defaultValue={editingSchedule?.event.th} required placeholder="ระบุหัวข้อกิจกรรม" className="w-full px-5 py-4 rounded-xl bg-slate-50 text-sm font-bold border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-2 tracking-widest">วันที่เริ่ม</label>
                    <input type="date" name="start_date" required className="w-full px-5 py-4 rounded-xl bg-slate-50 text-sm font-bold border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-2 tracking-widest">วันที่สิ้นสุด</label>
                    <input type="date" name="end_date" required className="w-full px-5 py-4 rounded-xl bg-slate-50 text-sm font-bold border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-2 tracking-widest">สถานะปัจจุบัน</label>
                  <select name="status" defaultValue={editingSchedule?.status} className="w-full px-5 py-4 rounded-xl bg-slate-50 text-sm font-bold border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all">
                    <option value="upcoming">รอการดำเนินการ (Upcoming)</option>
                    <option value="past">ดำเนินการเสร็จสิ้น (Past)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="text-slate-400 font-bold uppercase text-xs px-4 py-2">ยกเลิก</button>
                <button type="submit" disabled={isTranslating} className="px-10 py-4 bg-[#630330] text-white rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50">
                   {isTranslating ? 'กำลังบันทึก...' : 'บันทึกด่วน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[2rem] p-8 shadow-3xl my-auto animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-[#630330] uppercase mb-6">{editingForm ? 'แก้ไขไฟล์เอกสาร' : 'เพิ่มเอกสารใหม่'}</h3>
            <form onSubmit={handleSaveForm} className="space-y-6">
              <div className="space-y-4">
                <input name="title" defaultValue={editingForm?.title} required placeholder="ชื่อเอกสาร" className="w-full px-5 py-4 rounded-xl bg-slate-50 text-sm font-bold" />
                <input name="url" defaultValue={editingForm?.url} required placeholder="ลิงก์ไฟล์ (Google Drive, etc.)" className="w-full px-5 py-4 rounded-xl bg-slate-50 text-sm font-bold" />
                <select name="category" defaultValue={editingForm?.category} className="w-full px-5 py-4 rounded-xl bg-slate-50 text-sm font-bold">
                  <option value={FormCategory.APPLICATION}>เอกสารประกอบการสมัคร</option>
                  <option value={FormCategory.MONITORING}>เอกสารระหว่างการฝึกงาน</option>
                </select>
              </div>
              <div className="flex justify-end gap-4 pt-2">
                <button type="button" onClick={() => setShowFormModal(false)} className="text-slate-400 font-bold uppercase text-xs px-4 py-2">ยกเลิก</button>
                <button type="submit" className="px-10 py-4 bg-[#630330] text-white rounded-xl font-black uppercase text-xs shadow-lg">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

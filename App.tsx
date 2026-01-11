
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Copy,
  LayoutGrid,
  Sun,
  Moon,
  LucideIcon,
  Check,
  UserCircle,
  Activity,
  History,
  Timer
} from 'lucide-react';

const MouseGlow: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const isDesktop = window.innerWidth >= 1024;
      const zoomFactor = isDesktop ? 0.74 : 1;

      requestAnimationFrame(() => {
        const x = e.clientX / zoomFactor;
        const y = e.clientY / zoomFactor;
        
        document.documentElement.style.setProperty('--mouse-x', `${x}px`);
        document.documentElement.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <div className="mouse-glow" />;
};

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
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path className="wave-line" stroke="#D4AF37" d="M0,160 C320,300 420,10 720,160 C1020,310 1120,20 1440,160 C1760,300 1860,10 2160,160 C2460,310 2560,20 2880,160"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-mid bob-mid opacity-10">
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path className="wave-line" stroke="#FFFFFF" d="M0,192 C240,120 480,240 720,192 C960,144 1200,240 1440,192 C1680,120 1920,240 2160,192 C2400,144 2640,240 2880,192"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-slow bob-slow opacity-30">
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path fill="#7A0B3D" fillOpacity="1" d="M0,160 L120,170.7 C240,181,480,203,720,202.7 C960,203,1200,181,1320,170.7 L1440,160 L1560,170.7 C1680,181,1920,203,2160,202.7 C2400,203,2640,181,2760,170.7 L2880,160 V320 H0 Z"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-mid bob-mid opacity-20" style={{ marginBottom: '2px' }}>
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path fill="#D4AF37" fillOpacity="1" d="M0,224 L120,213.3 C240,203,480,181,720,181.3 C960,181,1200,203,1320,213.3 L1440,224 L1560,213.3 C1680,203,1920,181,2160,181.3 C2400,203,2640,181,2760,213.3 L2880,224 V320 H0 Z"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-fast bob-fast opacity-50">
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path fill="#630330" fillOpacity="1" d="M0,288 L120,277.3 C240,267,480,245,720,245.3 C960,245,1200,267,1320,277.3 L1440,288 L1560,277.3 C1680,267,1920,245,2160,245.3 C2400,245,2640,267,2760,277.3 L2880,288 V320 H0 Z"></path>
        </svg>
      </div>
    </div>
  );
};

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
  const [sites, setSites] = useState<InternshipSite[]>(INITIAL_SITES);
  const [forms, setForms] = useState<DocumentForm[]>(INITIAL_FORMS);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>(INITIAL_SCHEDULE);
  const [studentStatuses, setStudentStatuses] = useState<StudentStatusRecord[]>(() => {
    const saved = localStorage.getItem('wise_student_statuses');
    return saved ? JSON.parse(saved) : INITIAL_STUDENT_STATUSES;
  });
  const [activeMajor, setActiveMajor] = useState<Major | 'all'>('all');
  const [adminStudentActiveMajor, setAdminStudentActiveMajor] = useState<Major | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminStudentSearchTerm, setAdminStudentSearchTerm] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Accordion/Section states for Admin usability
  const [isStudentStatusExpanded, setIsStudentStatusExpanded] = useState(true);
  const [isSitesExpanded, setIsSitesExpanded] = useState(true);

  // Status Search State (for students)
  const [showStatusCheckModal, setShowStatusCheckModal] = useState(false);
  const [searchStudentId, setSearchStudentId] = useState('');
  const [foundStatus, setFoundStatus] = useState<StudentStatusRecord | null | undefined>(undefined);

  // Position Memory State
  const [frequentPositions, setFrequentPositions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wise_frequent_positions');
      return saved ? JSON.parse(saved) : ['เจ้าหน้าที่ควบคุมคุณภาพ', 'นักพัฒนาซอฟต์แวร์', 'นักวิจัยอาหาร', 'เจ้าหน้าที่ไอที'];
    } catch (e) {
      return [];
    }
  });

  // Custom Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  // Admin Modal States
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isNavLangOpen, setIsNavLangOpen] = useState(false);

  // Management States
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingSite, setEditingSite] = useState<InternshipSite | null>(null);
  const [modalMajor, setModalMajor] = useState<Major>(Major.HALAL_FOOD);
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEvent | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState<DocumentForm | null>(null);

  const [showAdminStatusModal, setShowAdminStatusModal] = useState(false);
  const [editingStatusRecord, setEditingStatusRecord] = useState<StudentStatusRecord | null>(null);

  useEffect(() => {
    if (editingSite) {
      setModalMajor(editingSite.major);
    } else {
      setModalMajor(Major.HALAL_FOOD);
    }
  }, [editingSite, showSiteModal]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('wise_portal_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('wise_frequent_positions', JSON.stringify(frequentPositions));
  }, [frequentPositions]);

  useEffect(() => {
    localStorage.setItem('wise_student_statuses', JSON.stringify(studentStatuses));
  }, [studentStatuses]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const isDevKey = 
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'u');
      
      if (isDevKey) {
        e.preventDefault();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
      return false;
    };

    const handleClick = () => {
      setContextMenu(null);
    };

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('wise_portal_lang', lang);
    } catch (e) {
      console.warn("Could not save language preference:", e);
    }
  }, [lang]);

  const currentT = useMemo(() => {
    const t = role === UserRole.ADMIN ? TRANSLATIONS[Language.TH] : TRANSLATIONS[lang];
    return t || TRANSLATIONS[Language.TH];
  }, [lang, role]);

  const isRtl = lang === Language.AR && role !== UserRole.ADMIN;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassInput === 'fst111') {
      setRole(UserRole.ADMIN);
      setLang(Language.TH); 
      setTheme('light'); 
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
    if (!localized) return '';
    if (role === UserRole.ADMIN) return localized.th || '';
    return (localized as any)[lang] || localized['en'] || localized['th'] || '';
  };

  const performBatchTranslation = async (items: { key: string, value: string, isDate?: boolean }[]) => {
    if (items.length === 0) return {};
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const prompt = `Translate to EN, AR, MS: ${items.map(i => `${i.key}:"${i.value}"${i.isDate ? '(date)' : ''}`).join('|')}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Translate to English, Arabic, Malay. Return JSON. For dates, use human-readable formats. Disable thinking for speed.",
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
      console.error("Batch AI error:", error);
      return items.reduce((acc, curr) => ({
        ...acc,
        [curr.key]: { th: curr.value, en: curr.value, ar: curr.value, ms: curr.value }
      }), {});
    }
  };

  const filteredSites = sites.filter(s => {
    const localizedName = getLocalized(s.name).toLowerCase();
    const localizedLoc = getLocalized(s.location).toLowerCase();
    const localizedPos = getLocalized(s.position).toLowerCase();
    const majorLabel = s.major === Major.HALAL_FOOD ? currentT.halalMajor : currentT.digitalMajor;
    const searchableString = `${localizedName} ${localizedLoc} ${majorLabel} ${localizedPos}`.toLowerCase();

    const matchesMajor = activeMajor === 'all' || s.major === activeMajor;
    const matchesSearch = searchableString.includes(searchTerm.toLowerCase());
    
    return matchesMajor && matchesSearch;
  });

  const filteredAdminStudentStatuses = studentStatuses.filter(s => {
    const term = adminStudentSearchTerm.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(term) || s.studentId.toLowerCase().includes(term);
    const matchesMajor = adminStudentActiveMajor === 'all' || s.major === adminStudentActiveMajor;
    return matchesSearch && matchesMajor;
  });

  const handleSaveSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thName = formData.get('name_th') as string;
    const thLoc = formData.get('loc_th') as string;
    const thDesc = formData.get('desc_th') as string;
    const thPos = formData.get('pos_th') as string;
    
    let rawUrl = (formData.get('url') as string).trim();
    if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `https://${rawUrl}`;
    }

    if (thPos && !frequentPositions.includes(thPos)) {
      setFrequentPositions(prev => [thPos, ...prev].slice(0, 20));
    }

    const itemsToTranslate = [];
    if (!editingSite || editingSite.name.th !== thName) itemsToTranslate.push({ key: 'name', value: thName });
    if (!editingSite || editingSite.location.th !== thLoc) itemsToTranslate.push({ key: 'loc', value: thLoc });
    if (!editingSite || editingSite.description.th !== thDesc) itemsToTranslate.push({ key: 'desc', value: thDesc });
    if (!editingSite || editingSite.position.th !== thPos) itemsToTranslate.push({ key: 'pos', value: thPos });

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
      position: results['pos'] || editingSite?.position || { th: thPos, en: thPos, ar: thPos, ms: thPos },
      status: formData.get('status') as 'active' | 'archived',
      major: modalMajor,
      contactLink: rawUrl,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      createdAt: editingSite?.createdAt || Date.now()
    };

    if (editingSite) {
      setSites(sites.map(s => s.id === editingSite.id ? newSite : s));
    } else {
      setSites([newSite, ...sites]);
    }
    setShowSiteModal(false);
    setEditingSite(null);
  };

  const handleSaveStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sId = formData.get('student_id') as string;
    const name = formData.get('student_name') as string;
    const status = formData.get('status') as ApplicationStatus;
    const major = formData.get('major') as Major;

    const newRecord: StudentStatusRecord = {
      id: editingStatusRecord?.id || Date.now().toString(),
      studentId: sId,
      name: name,
      status: status,
      major: major,
      lastUpdated: Date.now()
    };

    if (editingStatusRecord) {
      setStudentStatuses(studentStatuses.map(s => s.id === editingStatusRecord.id ? newRecord : s));
    } else {
      setStudentStatuses([newRecord, ...studentStatuses]);
    }
    setShowAdminStatusModal(false);
    setEditingStatusRecord(null);
  };

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const found = studentStatuses.find(s => s.studentId === searchStudentId);
    setFoundStatus(found || null);
  };

  const handleDeleteSite = (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลหน่วยงานนี้?')) {
      setSites(sites.filter(s => s.id !== id));
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thEvent = formData.get('event_th') as string;
    const startDateRaw = formData.get('start_date') as string;
    const endDateRaw = formData.get('end_date') as string;

    const formatReadable = (ds: string) => {
      if (!ds) return '';
      const d = new Date(ds);
      return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const startReadable = formatReadable(startDateRaw);
    const endReadable = formatReadable(endDateRaw);

    const itemsToTranslate = [];
    if (!editingSchedule || editingSchedule.event.th !== thEvent) {
      itemsToTranslate.push({ key: 'event', value: thEvent });
    }
    if (!editingSchedule || editingSchedule.startDate.th !== startReadable) {
      itemsToTranslate.push({ key: 'start', value: startReadable, isDate: true });
    }
    if (!editingSchedule || editingSchedule.endDate.th !== endReadable) {
      itemsToTranslate.push({ key: 'end', value: endReadable, isDate: true });
    }

    let results: Record<string, any> = {};
    if (itemsToTranslate.length > 0) {
      setIsTranslating(true);
      results = await performBatchTranslation(itemsToTranslate);
      setIsTranslating(false);
    }

    const newEvent: ScheduleEvent = {
      id: editingSchedule?.id || Date.now().toString(),
      event: results['event'] || editingSchedule?.event || { th: thEvent, en: thEvent, ar: thEvent, ms: thEvent },
      startDate: results['start'] || editingSchedule?.startDate || { th: startReadable, en: startDateRaw, ar: startDateRaw, ms: startDateRaw },
      endDate: results['end'] || editingSchedule?.endDate || { th: endReadable, en: endDateRaw, ar: endDateRaw, ms: endDateRaw },
      status: formData.get('status') as 'upcoming' | 'past'
    };

    if (editingSchedule) {
      setSchedule(schedule.map(s => s.id === editingSchedule.id ? newEvent : s));
    } else {
      setSchedule([...schedule, newEvent]);
    }
    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const handleCopy = () => {
    const text = window.getSelection()?.toString();
    if (text) {
      navigator.clipboard.writeText(text);
    }
    setContextMenu(null);
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
      <div className={`min-h-[100svh] w-full flex flex-col items-center luxe-mangosteen-bg relative overflow-hidden desktop-zoom-74 ${isRtl ? 'rtl' : ''}`}>
        <MouseGlow />
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
              
              <div className="flex flex-col items-center w-full">
                <div className="flex flex-row items-center justify-center gap-3 sm:gap-4">
                  {/* Main Entry Button */}
                  <button 
                    onClick={() => setViewState('dashboard')}
                    className="group relative px-8 sm:px-14 py-4 sm:py-5 bg-white text-[#630330] rounded-full font-black uppercase text-base sm:text-xl transition-all hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
                  >
                    <div className="absolute inset-0 rounded-full border-2 border-white/0 group-hover:border-white/50 group-hover:animate-ring-expand pointer-events-none"></div>
                    <span className="relative z-10 flex items-center gap-2 sm:gap-4 tracking-tight whitespace-nowrap">
                      {currentT.startNow} 
                      <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#630330]/5 group-hover:bg-[#630330] group-hover:text-white transition-all duration-500">
                        <ChevronRight size={18} className={isRtl ? 'rotate-180' : ''} />
                      </div>
                    </span>
                  </button>

                  {/* Smaller Status Check Button */}
                  <button 
                    onClick={() => {
                      setSearchStudentId('');
                      setFoundStatus(undefined);
                      setShowStatusCheckModal(true);
                    }}
                    className="group relative px-5 sm:px-8 py-4 sm:py-5 bg-[#D4AF37] hover:bg-[#b8952c] text-[#2A0114] rounded-full font-bold uppercase text-[10px] sm:text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
                  >
                    <span className="flex items-center gap-2 tracking-tight whitespace-nowrap">
                      <Timer size={16} className="group-hover:rotate-12 transition-transform" />
                      {currentT.checkStatus}
                    </span>
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setLoginError(false);
                    setShowAdminLogin(true);
                  }}
                  className="flex items-center gap-2 mt-8 opacity-30 hover:opacity-100 transition-all duration-500 group"
                  title="Staff Access"
                >
                  <LockKeyhole size={12} className="text-[#D4AF37] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase text-[#D4AF37] tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">Staff Access</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Student Status Check Modal */}
        {showStatusCheckModal && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-xl reveal-anim">
            <div className="w-full max-w-[480px] bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-3xl relative">
               <button onClick={() => setShowStatusCheckModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors">
                 <X size={20} className="text-slate-400" />
               </button>
               <div className="flex flex-col items-center mb-10">
                 <div className="p-4 bg-[#D4AF37]/10 rounded-2xl mb-4">
                   <Timer size={32} className="text-[#D4AF37]" />
                 </div>
                 <h3 className="text-xl font-black text-[#2A0114] uppercase text-center">{currentT.statusTitle}</h3>
                 <p className="text-[12px] text-slate-400 font-bold uppercase mt-1">{currentT.statusCheckPrompt}</p>
               </div>

               <form onSubmit={handleCheckStatus} className="space-y-6">
                 <div className="relative group">
                   <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors">
                     <UserCircle size={24} />
                   </div>
                   <input 
                    type="text" 
                    placeholder={currentT.studentIdPlaceholder}
                    value={searchStudentId}
                    onChange={e => setSearchStudentId(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:border-[#D4AF37] focus:bg-white rounded-2xl outline-none font-bold text-lg transition-all"
                   />
                 </div>
                 <button type="submit" className="w-full bg-[#2A0114] text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl shadow-[#2A0114]/20 transform active:scale-[0.98] transition-all">
                   {currentT.searchButton}
                 </button>
               </form>

               <div className="mt-10 min-h-[120px]">
                 {foundStatus === undefined ? null : foundStatus === null ? (
                   <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-2xl">
                     <AlertCircle size={20} />
                     <p className="text-[11px] font-bold uppercase">{currentT.noStatusFound}</p>
                   </div>
                 ) : (
                   <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 reveal-anim">
                     <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#2A0114] shadow-sm border border-slate-100">
                         <GraduationCap size={24} />
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{currentT.studentLabel}</p>
                         <h4 className="font-bold text-slate-900 leading-tight">{foundStatus.name}</h4>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{foundStatus.major === Major.HALAL_FOOD ? currentT.halalMajor : currentT.digitalMajor}</p>
                       </div>
                     </div>
                     <div className={`w-full py-4 px-6 rounded-xl border flex flex-col gap-1 ${getStatusColor(foundStatus.status)} shadow-sm`}>
                       <span className="text-[9px] font-black uppercase opacity-60">{currentT.currentStatusLabel}</span>
                       <span className="text-sm font-black uppercase">{getStatusLabel(foundStatus.status)}</span>
                     </div>
                     <div className="mt-4 flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase justify-end">
                       <Activity size={10} /> {currentT.lastUpdated}: {new Date(foundStatus.lastUpdated).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* Floating Marquee Icons */}
        <div 
          className="w-full pb-8 sm:pb-20 mt-auto overflow-hidden opacity-30 z-10"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
          }}
        >
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
    <div className={`min-h-screen flex flex-col bg-[#F9FAFB] dark:bg-slate-950 transition-colors duration-300 ${isRtl ? 'rtl' : ''}`}>
      {contextMenu && (
        <div 
          className="fixed z-[999] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-xl py-2 min-w-[120px] reveal-anim"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={handleCopy}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Copy size={16} className="text-[#630330] dark:text-[#D4AF37]" />
            คัดลอก (Copy)
          </button>
        </div>
      )}

      <div className="sticky top-0 z-50 w-full">
        <div className="absolute inset-0 bg-[#F9FAFB]/60 dark:bg-slate-950/60 backdrop-blur-2xl [mask-image:linear-gradient(to_bottom,black_70%,transparent)] pointer-events-none h-32 -mb-32"></div>
        <nav className="relative px-4 py-4 sm:pt-6 sm:pb-2">
          <div className="container mx-auto h-auto min-h-[112px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[2.5rem] px-6 sm:px-12 flex items-center justify-between border border-slate-100 dark:border-slate-800 shadow-2xl py-4 transition-all duration-300">
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
            <div className="flex items-center gap-3 sm:gap-6">
              {role !== UserRole.ADMIN && (
                <div className="flex items-center gap-2 sm:gap-4">
                  <button 
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="w-14 h-14 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-90"
                  >
                    {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
                  </button>

                  <div className="relative">
                    <button onClick={() => setIsNavLangOpen(!isNavLangOpen)} className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-bold shadow-sm">
                      <Globe size={18} className="text-[#630330] dark:text-[#D4AF37]" />
                      <span className="text-[12px] font-bold uppercase hidden sm:inline">{lang.toUpperCase()}</span>
                      <ChevronDown size={14} className={`transition-transform duration-300 ${isNavLangOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isNavLangOpen && (
                      <div className="absolute right-0 top-full mt-4 p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-3xl z-[60] min-w-[180px] reveal-anim">
                        {(Object.keys(Language) as Array<keyof typeof Language>).map((key) => (
                          <button
                            key={key}
                            onClick={() => {
                              setLang(Language[key]);
                              setIsNavLangOpen(false);
                            }}
                            className={`w-full text-left px-5 py-4 rounded-xl text-[13px] font-bold uppercase transition-all flex items-center justify-between tracking-normal
                              ${lang === Language[key] ? 'bg-[#630330] text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            {Language[key].toUpperCase()}
                            {lang === Language[key] && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <button onClick={handleLogout} className="w-14 h-14 flex items-center justify-center bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-rose-500/10 active:scale-90"><LogOut size={24} /></button>
            </div>
          </div>
        </nav>
      </div>

      <main className={`container mx-auto px-4 ${role === UserRole.ADMIN ? 'py-4 sm:py-6 space-y-4' : 'py-8 sm:py-14 space-y-16'} flex-grow transition-all`}>
        {/* Admin Student Status Management Section */}
        {role === UserRole.ADMIN && (
          <section className={`rounded-[1.5rem] border border-amber-200 shadow-lg transition-all overflow-hidden ${isStudentStatusExpanded ? 'bg-amber-100/40 p-5 sm:p-6' : 'bg-white p-3'}`}>
             <div className="flex items-center justify-between gap-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
                  onClick={() => setIsStudentStatusExpanded(!isStudentStatusExpanded)}
                >
                   <div className="p-2 sm:p-3 bg-amber-500 text-white rounded-xl shadow-md flex-shrink-0"><Timer size={20} /></div>
                   <div>
                     <h2 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                       จัดการสถานะนักศึกษา
                       <ChevronDown size={18} className={`transition-transform duration-500 text-slate-400 group-hover:text-amber-600 ${isStudentStatusExpanded ? '' : '-rotate-90'}`} />
                     </h2>
                     {isStudentStatusExpanded && <p className="text-[10px] font-bold text-amber-700/60 uppercase tracking-tight">ระบบติดตามความคืบหน้าการสมัครรายบุคคล</p>}
                   </div>
                </div>
                
                {!isStudentStatusExpanded && (
                  <button onClick={() => { setEditingStatusRecord(null); setShowAdminStatusModal(true); }} className="w-8 h-8 rounded-full bg-[#2A0114] text-white flex items-center justify-center shadow-lg transform transition-all hover:scale-110 active:scale-95">
                    <Plus size={16} />
                  </button>
                )}
             </div>

             {isStudentStatusExpanded && (
               <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex flex-col lg:flex-row items-stretch gap-3">
                     <div className="relative flex-grow flex items-center group">
                        <div className="absolute left-5 top-0 bottom-0 flex items-center pointer-events-none z-10 text-slate-400 group-focus-within:text-amber-500">
                          <Search size={18} />
                        </div>
                        <input 
                          type="text" 
                          placeholder={currentT.adminStudentSearchPlaceholder}
                          value={adminStudentSearchTerm}
                          onChange={e => setAdminStudentSearchTerm(e.target.value)}
                          className="w-full pl-14 pr-6 py-3 rounded-xl bg-white border border-amber-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
                        />
                     </div>
                     <button onClick={() => { setEditingStatusRecord(null); setShowAdminStatusModal(true); }} className="px-6 py-3 rounded-xl bg-[#2A0114] text-white font-black uppercase text-[11px] flex items-center justify-center gap-2 shadow-md transform transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
                       <Plus size={16} /> เพิ่มข้อมูลสถานะ
                     </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-white/70 rounded-2xl border border-amber-200/50">
                    <button 
                      onClick={() => setAdminStudentActiveMajor('all')} 
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-tight
                        ${adminStudentActiveMajor === 'all' ? 'bg-[#2A0114] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <LayoutGrid size={14} />
                      <span className="flex-grow text-left leading-tight line-clamp-1">{currentT.allMajors}</span>
                    </button>
                    <button 
                      onClick={() => setAdminStudentActiveMajor(Major.HALAL_FOOD)} 
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-tight
                        ${adminStudentActiveMajor === Major.HALAL_FOOD ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Salad size={14} />
                      <span className="flex-grow text-left leading-tight line-clamp-1">{currentT.halalMajor}</span>
                    </button>
                    <button 
                      onClick={() => setAdminStudentActiveMajor(Major.DIGITAL_TECH)} 
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-tight
                        ${adminStudentActiveMajor === Major.DIGITAL_TECH ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Code size={14} />
                      <span className="flex-grow text-left leading-tight line-clamp-1">{currentT.digitalMajor}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredAdminStudentStatuses.length === 0 ? (
                      <div className="col-span-full py-10 border-2 border-dashed border-amber-200 rounded-2xl flex flex-col items-center justify-center text-amber-300">
                        <AlertCircle size={24} className="mb-2 opacity-50" />
                        <p className="font-bold uppercase text-[9px] tracking-widest">ไม่พบข้อมูลนักศึกษา</p>
                      </div>
                    ) : (
                      filteredAdminStudentStatuses.map(record => (
                        <div key={record.id} className="p-4 rounded-[1.25rem] border border-amber-200 bg-white hover:shadow-md transition-all group relative">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                                <UserCircle size={16} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 leading-tight text-xs">{record.name}</h4>
                                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-tight">{record.studentId}</p>
                              </div>
                            </div>
                            <div className="flex gap-0.5">
                              <button onClick={() => { setEditingStatusRecord(record); setShowAdminStatusModal(true); }} className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                              <button onClick={() => setStudentStatuses(studentStatuses.filter(s => s.id !== record.id))} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><Trash size={12} /></button>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border mb-2 inline-block ${getStatusColor(record.status)}`}>
                            {getStatusLabel(record.status)}
                          </div>
                          <div className="text-[8px] font-bold uppercase text-slate-400 mb-1 line-clamp-1">{record.major === Major.HALAL_FOOD ? currentT.halalMajor : currentT.digitalMajor}</div>
                          <div className="flex items-center gap-1 text-[8px] text-slate-300 font-bold uppercase">
                            <History size={10} /> {new Date(record.lastUpdated).toLocaleDateString('th-TH')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
             )}
          </section>
        )}

        {/* Internship Database Section */}
        <section className={`rounded-[1.5rem] border transition-all overflow-hidden ${role === UserRole.ADMIN ? (isSitesExpanded ? 'bg-rose-100/40 border-rose-200 p-5 sm:p-6' : 'bg-white border-slate-200 p-3') : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6 sm:p-14'}`}>
          <div className="flex items-center justify-between gap-4">
            <div 
              className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
              onClick={() => setIsSitesExpanded(!isSitesExpanded)}
            >
              <div className={`p-2 sm:p-3 text-white rounded-xl shadow-md flex-shrink-0 ${role === UserRole.ADMIN ? 'bg-rose-600' : 'bg-[#630330] dark:bg-[#7a0b3d]'}`}><Database size={20} /></div>
              <div>
                <h2 className={`text-base sm:text-xl font-black uppercase tracking-tight flex items-center gap-2 ${role === UserRole.ADMIN ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  {currentT.internshipSites}
                  {(role === UserRole.ADMIN) && (
                    <ChevronDown size={18} className={`transition-transform duration-500 text-slate-400 group-hover:text-rose-600 ${isSitesExpanded ? '' : '-rotate-90'}`} />
                  )}
                </h2>
                {isSitesExpanded && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">{currentT.title}</p>}
              </div>
            </div>
            
            {role === UserRole.ADMIN && !isSitesExpanded && (
              <button onClick={() => { setEditingSite(null); setShowSiteModal(true); }} className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg transform transition-all hover:scale-110 active:scale-95">
                <Plus size={16} />
              </button>
            )}
          </div>
          
          {isSitesExpanded && (
            <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className={`flex flex-col lg:flex-row items-stretch gap-3 ${role !== UserRole.ADMIN ? 'lg:items-center' : ''}`}>
                <div className="relative flex-grow flex items-center group">
                  <div className={`absolute left-5 top-0 bottom-0 flex items-center pointer-events-none z-10 text-slate-400 group-focus-within:text-rose-500`}>
                    <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder={currentT.searchPlaceholder} 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className={`w-full pl-14 pr-6 py-3 rounded-xl bg-white border border-rose-200 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-rose-500/5 transition-all outline-none`} 
                  />
                </div>
                {role === UserRole.ADMIN && (
                  <button onClick={() => { setEditingSite(null); setShowSiteModal(true); }} className="px-6 py-3 rounded-xl bg-amber-500 text-white font-black uppercase text-[11px] flex items-center justify-center gap-2 shadow-md transform transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
                    <Plus size={16} /> {currentT.addSite}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-white/70 dark:bg-slate-900/50 rounded-2xl border border-rose-200/50 dark:border-slate-800">
                <button 
                  onClick={() => setActiveMajor('all')} 
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-tight
                    ${activeMajor === 'all' ? 'bg-[#630330] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
                >
                  <LayoutGrid size={14} />
                  <span className="flex-grow text-left leading-tight line-clamp-1">{currentT.allMajors}</span>
                </button>
                <button 
                  onClick={() => setActiveMajor(Major.HALAL_FOOD)} 
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-tight
                    ${activeMajor === Major.HALAL_FOOD ? 'bg-amber-500 text-[#2A0114] shadow-md' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
                >
                  <Salad size={14} />
                  <span className="flex-grow text-left leading-tight line-clamp-1">{currentT.halalMajor}</span>
                </button>
                <button 
                  onClick={() => setActiveMajor(Major.DIGITAL_TECH)} 
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-tight
                    ${activeMajor === Major.DIGITAL_TECH ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
                >
                  <Code size={14} />
                  <span className="flex-grow text-left leading-tight line-clamp-1">{currentT.digitalMajor}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredSites.length === 0 ? (
                  <div className="col-span-full py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                    <Briefcase size={40} className="mb-3 opacity-20" />
                    <p className="font-bold uppercase text-[9px] tracking-[0.2em]">{currentT.noStatusFound}</p>
                  </div>
                ) : (
                  filteredSites.map(site => (
                    <div key={site.id} className="relative group">
                      <InternshipCard site={site} lang={lang} />
                      {role === UserRole.ADMIN && (
                        <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button onClick={() => { setEditingSite(site); setShowSiteModal(true); }} className="p-1.5 bg-white/95 text-[#630330] rounded-lg shadow-md hover:bg-[#630330] hover:text-white transition-all"><Pencil size={12} /></button>
                          <button onClick={() => handleDeleteSite(site.id)} className="p-1.5 bg-white/95 text-rose-500 rounded-lg shadow-md hover:bg-rose-500 hover:text-white transition-all"><Trash size={12} /></button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Navigation size={22} className="text-[#630330] dark:text-amber-500" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{currentT.schedule}</h3>
              </div>
              {role === UserRole.ADMIN && (
                <button onClick={() => { setEditingSchedule(null); setShowScheduleModal(true); }} className="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all"><Plus size={18} /></button>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900/50 p-6 sm:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
              {schedule.map((ev, idx) => (
                <div key={ev.id} className="flex gap-4 items-center group relative">
                  <div className="w-10 h-10 rounded-xl bg-[#630330] dark:bg-[#7a0b3d] text-white flex items-center justify-center font-black text-lg shadow-lg flex-shrink-0">{idx + 1}</div>
                  <div className="flex-grow p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-amber-500 dark:hover:border-amber-500 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">{getLocalized(ev.startDate)}</span>
                      {getLocalized(ev.startDate) !== getLocalized(ev.endDate) && (
                        <>
                          <ArrowRight size={10} className="text-slate-300" />
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">{getLocalized(ev.endDate)}</span>
                        </>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-white">{getLocalized(ev.event)}</h4>
                  </div>
                  {role === UserRole.ADMIN && (
                    <div className="flex flex-col gap-1 ml-2">
                      <button onClick={() => { setEditingSchedule(ev); setShowScheduleModal(true); }} className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setSchedule(schedule.filter(s => s.id !== ev.id))} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><Trash size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="lg:col-span-5 space-y-6">
             <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                 <ClipboardCheck size={22} className="text-amber-500" />
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{currentT.forms}</h3>
               </div>
               {role === UserRole.ADMIN && (
                 <button onClick={() => { setEditingForm(null); setShowFormModal(true); }} className="p-2 bg-[#630330] text-white rounded-xl hover:bg-rose-700 transition-all"><Plus size={18} /></button>
               )}
             </div>
             
             <div className="bg-white dark:bg-slate-900/50 p-6 sm:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
               <div className="space-y-4">
                 <p className="text-[9px] font-black uppercase text-[#630330] dark:text-amber-500 tracking-[0.15em]">{currentT.appForms}</p>
                 {forms.filter(f => f.category === FormCategory.APPLICATION).map(form => (
                   <a key={form.id} href={form.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-[#630330] dark:hover:border-amber-500 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                     <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{form.title}</span>
                     <FileDown size={18} className="text-slate-300 group-hover:text-[#630330] dark:group-hover:text-amber-500 transition-colors" />
                   </a>
                 ))}
               </div>
               <div className="space-y-4">
                 <p className="text-[9px] font-black uppercase text-[#630330] dark:text-amber-500 tracking-[0.15em]">{currentT.monitoringForms}</p>
                 {forms.filter(f => f.category === FormCategory.MONITORING).map(form => (
                   <a key={form.id} href={form.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-[#630330] dark:hover:border-amber-500 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                     <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{form.title}</span>
                     <FileDown size={18} className="text-slate-300 group-hover:text-[#630330] dark:group-hover:text-amber-500 transition-colors" />
                   </a>
                 ))}
               </div>
             </div>
          </div>
        </div>
      </main>

      {/* Admin Status Management Modal */}
      {showAdminStatusModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim">
          <div className="w-full max-w-[500px] bg-white rounded-[2rem] p-6 sm:p-10 shadow-2xl">
            <h3 className="text-xl font-black text-[#2A0114] mb-6">{editingStatusRecord ? 'แก้ไขสถานะนักศึกษา' : 'เพิ่มข้อมูลติดตามสถานะ'}</h3>
            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">รหัสนักศึกษา</label>
                <input name="student_id" defaultValue={editingStatusRecord?.studentId} required placeholder="เช่น 406123456" className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-amber-500 outline-none font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">ชื่อ-นามสกุล</label>
                <input name="student_name" defaultValue={editingStatusRecord?.name} required placeholder="ชื่อนักศึกษา" className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-amber-500 outline-none font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">สาขาวิชา</label>
                <select name="major" defaultValue={editingStatusRecord?.major || Major.HALAL_FOOD} className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-amber-500 outline-none font-bold">
                  <option value={Major.HALAL_FOOD}>{currentT.halalMajor}</option>
                  <option value={Major.DIGITAL_TECH}>{currentT.digitalMajor}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">สถานะการสมัคร</label>
                <select name="status" defaultValue={editingStatusRecord?.status || ApplicationStatus.PENDING} className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-amber-500 outline-none font-bold">
                  <option value={ApplicationStatus.PENDING}>{currentT.statusPending}</option>
                  <option value={ApplicationStatus.PREPARING}>{currentT.statusPreparing}</option>
                  <option value={ApplicationStatus.ACCEPTED}>{currentT.statusAccepted}</option>
                  <option value={ApplicationStatus.REJECTED}>{currentT.statusRejected}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAdminStatusModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 font-black uppercase text-[11px] text-slate-400 hover:bg-slate-50 transition-all">ยกเลิก</button>
                <button type="submit" className="flex-2 px-8 py-3 rounded-xl bg-[#2A0114] text-white font-black uppercase text-[11px] shadow-lg active:scale-[0.98] transition-all">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internship Site Management Modal */}
      {showSiteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md reveal-anim overflow-y-auto">
          <div className="w-full max-w-[700px] my-auto bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative">
            <button onClick={() => setShowSiteModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-all text-slate-400"><X size={20} /></button>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-rose-600 text-white rounded-xl shadow-lg"><Building2 size={24} /></div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase">{editingSite ? 'แก้ไขข้อมูลหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ฐานข้อมูลสถานประกอบการ WISE</p>
              </div>
            </div>
            
            <form onSubmit={handleSaveSite} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">ชื่อหน่วยงาน (ภาษาไทย)</label>
                  <input name="name_th" defaultValue={editingSite?.name.th} required className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-600 outline-none font-bold text-slate-800 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">สถานที่ตั้ง (จังหวัด)</label>
                  <input name="loc_th" defaultValue={editingSite?.location.th} required className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-600 outline-none font-bold text-slate-800 transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">ตำแหน่งงานที่รับสมัคร</label>
                <div className="relative">
                  <input 
                    name="pos_th" 
                    list="frequent-positions" 
                    defaultValue={editingSite?.position.th} 
                    required 
                    placeholder="เช่น Full Stack Developer, นักวิจัยอาหาร..."
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-600 outline-none font-bold text-slate-800 transition-all" 
                  />
                  <datalist id="frequent-positions">
                    {frequentPositions.map(pos => <option key={pos} value={pos} />)}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">รายละเอียดการฝึกงาน</label>
                <textarea name="desc_th" defaultValue={editingSite?.description.th} required className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-600 outline-none font-bold text-slate-800 min-h-[100px] transition-all"></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">สาขาวิชา</label>
                  <select value={modalMajor} onChange={e => setModalMajor(e.target.value as Major)} className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-600 outline-none font-bold text-slate-800">
                    <option value={Major.HALAL_FOOD}>สาขาวิชาวิจัยและพัฒนาผลิตภัณฑ์อาหารฮาลาล</option>
                    <option value={Major.DIGITAL_TECH}>สาขาวิชาเทคโนโลยีและวิทยาการดิจิทัล</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">สถานะ</label>
                  <select name="status" defaultValue={editingSite?.status || 'active'} className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-600 outline-none font-bold text-slate-800">
                    <option value="active">เปิดรับสมัคร</option>
                    <option value="archived">ประวัติการฝึก</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">อีเมลติดต่อ</label>
                  <input name="email" type="email" defaultValue={editingSite?.email} className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-600 outline-none font-bold text-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                 <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">เบอร์โทรศัพท์</label>
                  <input name="phone" defaultValue={editingSite?.phone} className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-600 outline-none font-bold text-slate-800" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">ลิงก์เว็บไซต์/เพจ</label>
                  <input name="url" defaultValue={editingSite?.contactLink} placeholder="เช่น facebook.com/comp" className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-600 outline-none font-bold text-slate-800" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button type="button" onClick={() => setShowSiteModal(false)} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-400 font-black uppercase text-[11px] hover:bg-slate-50 transition-all">ยกเลิก</button>
                <button type="submit" disabled={isTranslating} className="flex-[2] py-3.5 rounded-xl bg-rose-600 text-white font-black uppercase text-[11px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                  {isTranslating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {isTranslating ? 'กำลังประมวลผลแปลภาษา...' : 'บันทึกข้อมูลหน่วยงาน'}
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

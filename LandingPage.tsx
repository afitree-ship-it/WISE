
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { 
  Language, 
  Major, 
  StudentStatusRecord, 
  ApplicationStatus,
  Translation,
  InternshipType
} from './types';
import LanguageSwitcher from './components/LanguageSwitcher';
import { 
  X, 
  ChevronRight, 
  Timer, 
  LockKeyhole, 
  Fingerprint, 
  GraduationCap, 
  UserCircle, 
  AlertCircle, 
  Activity,
  CheckCircle2,
  Clock,
  ClipboardList,
  ShieldCheck,
  ShieldX,
  Search,
  Briefcase,
  Calendar,
  MapPin,
  AlertTriangle,
  Lock,
  Check,
  ShieldAlert,
  RefreshCw,
  Zap
} from 'lucide-react';

interface LandingPageProps {
  lang: Language;
  setLang: (lang: Language) => void;
  currentT: Translation;
  isRtl: boolean;
  onEnterDashboard: () => void;
  onAdminLogin: (password: string) => Promise<boolean>;
  studentStatuses: StudentStatusRecord[];
  logo?: string;
  favicon?: string;
  sitesCount?: number;
  nextEvent?: { label: string; date: string } | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  lang, 
  setLang, 
  currentT, 
  isRtl, 
  onEnterDashboard, 
  onAdminLogin,
  studentStatuses,
  logo,
  favicon,
  sitesCount = 0,
  nextEvent = null
}) => {
  const [showStatusCheckModal, setShowStatusCheckModal] = useState(false);
  const [searchStudentId, setSearchStudentId] = useState('');
  const [foundStatuses, setFoundStatuses] = useState<StudentStatusRecord[] | null | undefined>(undefined);
  
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem('wise_failed_attempts') || '0');
  });
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(() => {
    const lockedUntil = parseInt(localStorage.getItem('wise_locked_until') || '0');
    const now = Date.now();
    return lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  });

  const facultyName = lang === Language.TH ? 'คณะวิทยาศาสตร์และเทคโนโลยี' : lang === Language.AR ? 'كلية العلوم والتكنولوجيا' : lang === Language.MS ? 'Fakulti Sains dan Teknologi' : 'Faculty of Science and Technology';
  const universityName = lang === Language.TH ? 'มหาวิทยาลัยฟาฏอนี' : lang === Language.AR ? 'جامعة فطاني' : lang === Language.MS ? 'Universiti Fatoni' : 'Fatoni University';
  const t3 = {
    [Language.TH]: { enter: 'เข้าสู่ระบบ', staff: 'เจ้าหน้าที่', sites: 'สถานประกอบการ', students: 'นักศึกษาปีนี้' },
    [Language.EN]: { enter: 'Enter site', staff: 'Staff', sites: 'partner sites', students: 'students this year' },
    [Language.AR]: { enter: 'دخول', staff: 'الموظفون', sites: 'جهة تدريب', students: 'طالب هذا العام' },
    [Language.MS]: { enter: 'Masuk', staff: 'Kakitangan', sites: 'tempat latihan', students: 'pelajar tahun ini' },
  }[lang] || { enter: 'เข้าสู่ระบบ', staff: 'เจ้าหน้าที่', sites: 'สถานประกอบการ', students: 'นักศึกษาปีนี้' };
  const emblem = favicon || logo;

  // Rotating tagline under the heading
  const taglines = {
    [Language.TH]: ['ค้นหาสถานประกอบการที่ใช่สำหรับคุณ', 'ดาวน์โหลดแบบฟอร์มครบในที่เดียว', 'ติดตามสถานะได้ทุกที่ ทุกเวลา'],
    [Language.EN]: ['Find the right placement for you', 'Every form you need, in one place', 'Track your status anytime, anywhere'],
    [Language.AR]: ['اعثر على جهة التدريب المناسبة لك', 'جميع النماذج في مكان واحد', 'تابع حالتك في أي وقت ومن أي مكان'],
    [Language.MS]: ['Cari tempat latihan yang sesuai', 'Semua borang dalam satu tempat', 'Semak status anda bila-bila masa'],
  }[lang] || [];
  const [taglineIdx, setTaglineIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTaglineIdx(i => i + 1), 3200);
    return () => clearInterval(id);
  }, []);

  // Fit the EN and TH lockup lines (and the divider) to the exact width of the word WISE
  const lockupRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = lockupRef.current;
    if (!el) return;
    const fit = () => {
      const target = el.querySelector('[data-fit-target]')?.getBoundingClientRect().width || 0;
      if (!target) return;
      const rule = el.querySelector<HTMLElement>('[data-fit-rule]');
      if (rule) rule.style.width = `${target}px`;
      el.querySelectorAll<HTMLElement>('[data-fit]').forEach(span => {
        const line = span.parentElement as HTMLElement;
        line.style.fontSize = '20px';
        const w = span.getBoundingClientRect().width;
        if (w) line.style.fontSize = `${(20 * target / w).toFixed(2)}px`;
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.querySelector('[data-fit-target]') as Element);
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  // Thai heading breaks before "และ" for a balanced two-line title
  const headingLines = lang === Language.TH && currentT.landingHeading.includes('และ')
    ? [currentT.landingHeading.slice(0, currentT.landingHeading.indexOf('และ')).trim(), currentT.landingHeading.slice(currentT.landingHeading.indexOf('และ'))]
    : [currentT.landingHeading.replace(/-/g, '‑')];

  const locale = lang === Language.TH ? 'th-TH' : lang === Language.AR ? 'ar' : lang === Language.MS ? 'ms-MY' : 'en-US';
  const shortDate = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };
  const eventCountdown = (() => {
    const d = nextEvent ? new Date(nextEvent.date) : null;
    if (!d || isNaN(d.getTime())) return '';
    const days = Math.ceil((d.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    const label = { [Language.TH]: 'กำหนดการถัดไป', [Language.EN]: 'Next up', [Language.AR]: 'الموعد القادم', [Language.MS]: 'Seterusnya' }[lang] || 'Next up';
    if (days <= 0) return `${label} · ${lang === Language.TH ? 'วันนี้' : 'today'}`;
    return `${label} · ${lang === Language.TH ? `อีก ${days} วัน` : `in ${days} days`}`;
  })();

  // Subtle parallax of the arch following the cursor (desktop only)
  const archRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 14;
        const y = (e.clientY / window.innerHeight - 0.5) * 10;
        if (archRef.current) archRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const isTH = lang === Language.TH;
  const L = {
    hint: isTH ? 'กรอกรหัสนักศึกษา แล้วกดค้นหาเพื่อดูสถานะล่าสุด' : 'Enter your student ID to see your latest status',
    notFoundHint: isTH ? 'ตรวจสอบรหัสอีกครั้ง หรือติดต่อเจ้าหน้าที่ WISE' : 'Double-check your ID or contact WISE staff',
    supervisor: isTH ? 'อาจารย์นิเทศ' : 'Supervisor',
    step1: isTH ? 'ส่งข้อมูล' : 'Submitted',
    step2: isTH ? 'จัดเตรียมเอกสาร' : 'Preparing',
    step3: isTH ? 'ตอบรับแล้ว' : 'Accepted',
    step3No: isTH ? 'ไม่ผ่าน' : 'Not accepted',
  };

  const openStatusCheck = () => {
    setSearchStudentId('');
    setFoundStatuses(undefined);
    setShowStatusCheckModal(true);
  };

  useEffect(() => {
    if (!showStatusCheckModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowStatusCheckModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showStatusCheckModal]);

  const initials = (name: string) => {
    const parts = String(name || '').replace(/^(นางสาว|นาย|นาง|น\.ส\.|Mr\.?|Ms\.?|Mrs\.?)\s*/i, '').trim().split(/\s+/);
    const first = (p?: string) => (p || '').replace(/^[เแโใไ]/, '').charAt(0);
    return (first(parts[0]) + first(parts[1])) || '?';
  };

  const trainingProgress = (start?: string, end?: string) => {
    const a = start ? new Date(start) : null, b = end ? new Date(end) : null;
    if (!a || !b || isNaN(a.getTime()) || isNaN(b.getTime()) || b <= a) return null;
    const now = new Date();
    const day = 86400000;
    const totalWeeks = Math.max(1, Math.ceil((b.getTime() - a.getTime()) / (7 * day)));
    if (now < a) {
      const days = Math.ceil((a.getTime() - now.getTime()) / day);
      return { pct: 0, label: isTH ? `เริ่มฝึกอีก ${days} วัน` : `Starts in ${days} days` };
    }
    if (now > b) return { pct: 100, label: isTH ? 'ฝึกครบแล้ว' : 'Completed' };
    const week = Math.min(totalWeeks, Math.ceil((now.getTime() - a.getTime() + 1) / (7 * day)));
    return { pct: Math.round(((now.getTime() - a.getTime()) / (b.getTime() - a.getTime())) * 100), label: isTH ? `สัปดาห์ที่ ${week} จาก ${totalWeeks}` : `Week ${week} of ${totalWeeks}` };
  };
  const studentsThisYear = React.useMemo(() => {
    const be = String(new Date().getFullYear() + 543);
    return studentStatuses.filter(s => String(s.academicYear || '').trim() === be).length;
  }, [studentStatuses]);

  const maxAttempts = 5;
  const lockoutDuration = 60; // seconds
  const shakeRef = useRef<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Pre-warm the Google Apps Script to reduce cold start delay
    const preWarm = () => {
      const url = "https://script.google.com/macros/s/AKfycbycrXhJfdb5sp11tOGZZbM3Xx1DFqNwzyQ_VUVKeo2BJSMhO1GMxD73YXsKyDot_o3X/exec";
      fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
    };
    preWarm();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let timer: any;
    if (lockoutTimeLeft > 0) {
      timer = setInterval(() => {
        setLockoutTimeLeft(prev => {
          const next = prev - 1;
          if (next <= 0) {
            localStorage.removeItem('wise_locked_until');
            setFailedAttempts(0);
            localStorage.setItem('wise_failed_attempts', '0');
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lockoutTimeLeft > 0 || isVerifying || loginSuccess) return;

    setIsVerifying(true);
    setLoginError(false);
    
    // Start optimistic UI / Scanning feeling
    const startTime = Date.now();
    
    const success = await onAdminLogin(adminPassInput);
    
    // Calculate elapsed time to ensure user sees at least some feedback if the response is too fast, 
    // but keep it very short for "fast" feeling.
    const elapsedTime = Date.now() - startTime;
    const minFeedbackTime = 150; 
    const waitTime = Math.max(0, minFeedbackTime - elapsedTime);

    setTimeout(() => {
      if (success) {
        setLoginSuccess(true);
        // Instant visual feedback for success before component unmounts
        setIsVerifying(false);
      } else {
        setIsVerifying(false);
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        localStorage.setItem('wise_failed_attempts', newAttempts.toString());
        setLoginError(true);
        setAdminPassInput('');
        
        shakeRef.current = true;
        setTimeout(() => { shakeRef.current = false; }, 500);

        if (newAttempts >= maxAttempts) {
          const lockedUntil = Date.now() + (lockoutDuration * 1000);
          localStorage.setItem('wise_locked_until', lockedUntil.toString());
          setLockoutTimeLeft(lockoutDuration);
        }
      }
    }, waitTime);
  };

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchStudentId.trim();
    if (!query) return;

    const matches = studentStatuses
      .filter(s => 
        String(s.studentId).trim() === query || 
        String(s.studentId).replace(/-/g, '').trim() === query.replace(/-/g, '').trim()
      )
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
    
    setFoundStatuses(matches.length > 0 ? matches : null);
  };

  const getStatusInfo = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING: 
        return { 
          color: 'bg-amber-500', 
          bg: 'bg-amber-50', 
          text: 'text-amber-700', 
          border: 'border-amber-200',
          icon: <Clock size={20} className="sm:w-6 sm:h-6" />,
          step: 1
        };
      case ApplicationStatus.PREPARING: 
        return { 
          color: 'bg-blue-500', 
          bg: 'bg-blue-50', 
          text: 'text-blue-700', 
          border: 'border-blue-200',
          icon: <ClipboardList size={20} className="sm:w-6 sm:h-6" />,
          step: 2
        };
      case ApplicationStatus.ACCEPTED: 
        return { 
          color: 'bg-emerald-500', 
          bg: 'bg-emerald-50', 
          text: 'text-emerald-700', 
          border: 'border-emerald-200',
          icon: <ShieldCheck size={20} className="sm:w-6 sm:h-6" />,
          step: 3
        };
      case ApplicationStatus.REJECTED: 
        return { 
          color: 'bg-rose-500', 
          bg: 'bg-rose-50', 
          text: 'text-rose-700', 
          border: 'border-rose-200',
          icon: <ShieldX size={20} className="sm:w-6 sm:h-6" />,
          step: 3
        };
      default: 
        return { 
          color: 'bg-slate-500', 
          bg: 'bg-slate-50', 
          text: 'text-slate-700', 
          border: 'border-slate-200',
          icon: <Activity size={20} className="sm:w-6 sm:h-6" />,
          step: 0
        };
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

  const getInternshipTypeLabel = (type: InternshipType) => {
    const isIntern = type === InternshipType.INTERNSHIP;
    switch (lang) {
      case Language.TH: return isIntern ? 'ฝึกงาน' : 'สหกิจศึกษา';
      case Language.AR: return isIntern ? 'تدريب ميداني' : 'التعليم التعاوني';
      case Language.MS: return isIntern ? 'Latihan Industri' : 'Pendidikan Ko-operatif';
      default: return isIntern ? 'Internship' : 'Co-op';
    }
  };

  const getMajorLabel = (m: Major) => {
    switch(m) {
      case Major.HALAL_FOOD: return currentT.halalMajor;
      case Major.DIGITAL_TECH: return currentT.digitalMajor;
      case Major.INFO_TECH: return currentT.infoTechMajor;
      case Major.DATA_SCIENCE: return currentT.dataScienceMajor;
      default: return '';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className={`wl fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden touch-auto ${isRtl ? 'rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Floating pill nav: faculty logo + staff access */}
      <header className="wise-rise sticky top-[max(12px,env(safe-area-inset-top))] z-30 mx-auto mt-3 sm:mt-5 w-[calc(100%-24px)] sm:w-[min(1180px,calc(100%-48px))] flex items-center justify-between gap-3 p-1.5 sm:p-2 ps-2 sm:ps-2.5 rounded-full bg-white/75 backdrop-blur-xl border border-[#efe4d2] shadow-[0_14px_34px_-22px_rgba(99,3,48,0.35)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-[#630330] overflow-hidden flex items-center justify-center">
            {emblem ? (
              <img src={emblem} alt="" className={`w-full h-full bg-white ${favicon ? 'object-contain p-0.5' : 'object-cover object-left'}`} />
            ) : (
              <span className="wl-latin text-[10px] font-extrabold text-[#e8cf7a]">FST</span>
            )}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] sm:text-[14px] font-medium text-[#630330]">{facultyName}</span>
            <span className="hidden sm:block truncate text-[11.5px] font-light text-[#8b7380]">{universityName}</span>
          </span>
        </div>
        <button
          onClick={() => { setLoginError(false); setLoginSuccess(false); setShowAdminLogin(true); }}
          className="shrink-0 flex items-center justify-center gap-2 h-10 w-10 sm:w-auto sm:px-4 rounded-full bg-white border border-[#e5d6c0] text-[13px] font-medium text-[#630330] hover:bg-[#630330] hover:text-white hover:border-[#630330] transition"
          title="Staff Access"
        >
          <LockKeyhole size={15} />
          <span className="hidden sm:inline">{t3.staff}</span>
        </button>
      </header>

      <main className="relative mx-auto w-full max-w-[720px] lg:max-w-none lg:w-[min(1180px,calc(100%-48px))] px-[22px] sm:px-10 lg:px-0 pt-9 sm:pt-14 pb-12 lg:py-0 lg:min-h-[calc(100svh-90px)] grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
        <div className="min-w-0 flex flex-col items-start">
          {/* Lockup: EN and TH lines are fitted to the exact width of the word WISE */}
          <div ref={lockupRef} className="wl-lockup" dir="ltr">
            <h2 className="wl-wise wise-rise select-none" style={{ animationDelay: '120ms' }}>
              <span data-fit-target className="inline-block">WISE</span><em>.</em>
            </h2>
            <div className="wl-line wl-en wise-rise" style={{ animationDelay: '260ms' }}>
              <span data-fit>Work-Integrated Science Education Unit</span>
            </div>
            <div className="wl-rule" data-fit-rule><i /></div>
            <div className="wl-line wl-th wise-rise" style={{ animationDelay: '380ms' }}>
              <span data-fit>หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน</span>
            </div>
          </div>

          <h1 className={`wise-rise mt-7 sm:mt-8 font-medium leading-[1.25] text-[#2a0a17] [text-wrap:balance] ${
            lang === Language.MS ? 'text-[26px] sm:text-[clamp(28px,2.8vw,40px)]' : 'text-[30px] sm:text-[clamp(30px,3.2vw,46px)]'
          }`} style={{ animationDelay: '480ms' }}>
            {headingLines.map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>)}
          </h1>

          {/* Rotating tagline */}
          <div className="wise-rise mt-2.5 h-7 flex items-center overflow-hidden" style={{ animationDelay: '560ms' }} aria-live="polite">
            <span key={`${lang}-${taglineIdx}`} className="wise-tagline inline-flex items-center gap-2 text-[14px] sm:text-[16px] font-light text-[#7d6470]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
              {taglines[taglineIdx % taglines.length]}
            </span>
          </div>

          <div className="wise-rise mt-6 mb-5" style={{ animationDelay: '640ms' }}>
            <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} className="!bg-white !border-[#ecdfcc] shadow-[0_8px_20px_-10px_rgba(99,3,48,0.25)]" />
          </div>

          <div className="wise-rise grid grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-[460px]" style={{ animationDelay: '740ms' }}>
            <button
              onClick={onEnterDashboard}
              className="group h-[52px] sm:h-14 rounded-[15px] sm:rounded-2xl bg-[#630330] text-white font-medium text-[15px] sm:text-base flex items-center justify-center gap-2 shadow-[0_16px_34px_-14px_rgba(99,3,48,0.6)] hover:bg-[#7a0b3d] hover:-translate-y-0.5 active:translate-y-0 transition"
            >
              {t3.enter}
              <ChevronRight size={18} className={`transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
            </button>
            <button
              onClick={openStatusCheck}
              className="wise-sheen group relative overflow-hidden h-[52px] sm:h-14 rounded-[15px] sm:rounded-2xl bg-gradient-to-b from-[#f0d78a] to-[#cfa73a] text-[#2A0114] font-medium text-[15px] sm:text-base flex items-center justify-center gap-2 shadow-[0_14px_34px_-12px_rgba(212,175,55,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition"
            >
              <Search size={17} className="group-hover:scale-110 transition-transform" />
              {currentT.checkStatus}
            </button>
          </div>
        </div>

        {/* Double arch */}
        <div className="wise-rise min-w-0" style={{ animationDelay: '300ms' }} aria-hidden="true">
          <div ref={archRef} className="wl-arches transition-transform duration-700 ease-out will-change-transform" dir="ltr">
            <div className="wl-back" />
            <div className="wl-arch">
              <div className="wl-pattern" /><div className="in" /><div className="in2" />
              {emblem ? <div className="emb"><img src={emblem} alt="" /></div> : <div className="wm">WISE</div>}
            </div>
            <div className="wl-seal">
              <svg viewBox="0 0 120 120">
                <defs><path id="wl-circ" d="M60 60 m-48 0 a48 48 0 1 1 96 0 a48 48 0 1 1 -96 0" /></defs>
                <circle cx="60" cy="60" r="58" fill="#fff" stroke="#e8cf7a" />
                <text fontFamily="Plus Jakarta Sans" fontSize="10.5" fontWeight="700" letterSpacing="3.2" fill="#630330">
                  <textPath href="#wl-circ">{`WISE · FST · FATONI · ${new Date().getFullYear() + 543} · WISE · FST ·`}</textPath>
                </text>
              </svg>
              <i>W</i>
            </div>
            {nextEvent && nextEvent.date && (
              <div className="wl-float wl-float--a" dir={isRtl ? 'rtl' : 'ltr'}>
                <small className="block text-[12px] text-[#8b7380]">{eventCountdown}</small>
                <div className="n my-2">{shortDate(nextEvent.date)}</div>
                <b className="block text-[14px] sm:text-[14.5px] font-medium leading-snug line-clamp-2">{nextEvent.label}</b>
              </div>
            )}
            {sitesCount > 0 && (
              <div className="wl-float wl-float--b" dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="n">{sitesCount}</div>
                <b className="block mt-1 text-[14px] sm:text-[14.5px] font-medium">{t3.sites}</b>
                {studentsThisYear > 0 && <small className="block text-[12px] text-[#8b7380] mt-0.5">{studentsThisYear} {t3.students}</small>}
                <div className="flex gap-[3px] mt-2.5 h-1.5 rounded-full overflow-hidden">
                  <i className="block flex-[38] bg-[#eb6834]" /><i className="block flex-[30] bg-[#2a78d6]" /><i className="block flex-[34] bg-[#4a3aa7]" /><i className="block flex-[26] bg-[#1baf7a]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showStatusCheckModal && (
        <div
          className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center sm:p-6 bg-[#12000a]/80 backdrop-blur-xl wise-fade-in touch-auto"
          onMouseDown={() => setShowStatusCheckModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="wise-pop-in w-full sm:max-w-[560px] max-h-[92svh] overflow-y-auto custom-scrollbar rounded-t-[28px] sm:rounded-[28px] bg-[#2a0114]/95 border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative"
          >
            {/* Soft gold glow + pattern */}
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
              <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#D4AF37]/15 blur-3xl" />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#7A0B3D]/60 blur-3xl" />
            </div>

            <div className="relative p-5 sm:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#E8CF7A] flex items-center justify-center">
                  <Timer size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">{currentT.statusTitle}</h3>
                  <p className="text-[13px] text-white/55 mt-0.5">{currentT.statusCheckPrompt}</p>
                </div>
                <button onClick={() => setShowStatusCheckModal(false)} className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition" aria-label="close">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCheckStatus} className="flex items-center gap-2 p-1.5 rounded-2xl bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]">
                <UserCircle size={20} className="ml-2.5 text-slate-300 shrink-0" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={currentT.studentIdPlaceholder}
                  value={searchStudentId}
                  onChange={e => { setSearchStudentId(e.target.value); if (foundStatuses === null) setFoundStatuses(undefined); }}
                  className="flex-1 min-w-0 h-11 sm:h-12 bg-transparent outline-none text-[15px] sm:text-base font-semibold text-[#2a0114] placeholder:text-slate-400 placeholder:font-normal"
                  autoFocus
                />
                {searchStudentId && (
                  <button type="button" onClick={() => { setSearchStudentId(''); setFoundStatuses(undefined); }} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100" aria-label="clear">
                    <X size={15} />
                  </button>
                )}
                <button type="submit" className="h-11 sm:h-12 px-4 sm:px-5 rounded-xl bg-[#630330] hover:bg-[#7a0b3d] text-white text-sm font-semibold flex items-center gap-2 transition active:scale-[0.97]">
                  <Search size={16} /> <span className="hidden min-[380px]:inline">{currentT.searchButton}</span>
                </button>
              </form>

              <div className="mt-5 sm:mt-6 space-y-3">
                {foundStatuses === undefined ? (
                  <div className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-dashed border-white/15 text-white/50 text-[13px]">
                    <Fingerprint size={20} className="text-[#D4AF37]/70 shrink-0" />
                    {L.hint}
                  </div>
                ) : foundStatuses === null ? (
                  <div className="wise-pop-in flex items-start gap-3 px-4 py-4 rounded-2xl bg-rose-500/10 border border-rose-400/25 text-rose-200">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">{currentT.noStatusFound}</p>
                      <p className="text-[12px] text-rose-200/70 mt-0.5">{L.notFoundHint}</p>
                    </div>
                  </div>
                ) : (
                  foundStatuses.map((record, i) => {
                    const info = getStatusInfo(record.status);
                    const rejected = record.status === ApplicationStatus.REJECTED;
                    const progress = trainingProgress(record.startDate, record.endDate);
                    const steps = rejected ? [L.step1, L.step2, L.step3No] : [L.step1, L.step2, L.step3];
                    return (
                      <div key={record.id} className="wise-pop-in rounded-[22px] bg-white text-[#1a0a10] p-4 sm:p-5 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.6)]" style={{ animationDelay: `${i * 80}ms` }}>
                        {/* Header */}
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#630330]/[0.07] text-[#630330] flex items-center justify-center text-[15px] font-bold">
                            {initials(record.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[15px] sm:text-base leading-snug break-words">{record.name}</h4>
                            <p className="text-[12px] text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
                              <span className="font-mono">{record.studentId}</span>
                              <span className="text-slate-300">·</span>
                              <span>{getMajorLabel(record.major)}</span>
                            </p>
                          </div>
                        </div>
                        <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold ${info.bg} ${info.text}`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${info.color}`} />
                          <span className="min-w-0">{getStatusLabel(record.status)}</span>
                        </div>

                        {/* Stepper */}
                        <div className="mt-5 grid grid-cols-3 gap-1.5">
                          {steps.map((label, idx) => {
                            const reached = info.step >= idx + 1;
                            const color = rejected && idx === 2 ? 'bg-rose-500' : 'bg-[#630330]';
                            return (
                              <div key={idx} className="min-w-0">
                                <div className={`h-1.5 rounded-full ${reached ? color : 'bg-slate-100'} transition-colors`} />
                                <p className={`mt-1.5 text-[10.5px] sm:text-[11px] leading-tight truncate ${reached ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{label}</p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Placement details */}
                        {(record.location || record.position || record.supervisor) && (
                          <div className="mt-4 rounded-2xl bg-slate-50 divide-y divide-slate-100">
                            {record.location && (
                              <div className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                                <MapPin size={15} className="text-[#630330]/60 shrink-0" />
                                <span className="min-w-0 truncate font-medium">{record.location}</span>
                                <span className="ml-auto shrink-0 text-[11px] text-slate-400">{getInternshipTypeLabel(record.internshipType)}</span>
                              </div>
                            )}
                            {record.position && (
                              <div className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                                <Briefcase size={15} className="text-[#630330]/60 shrink-0" />
                                <span className="min-w-0 truncate">{record.position}</span>
                              </div>
                            )}
                            {record.supervisor && (
                              <div className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                                <UserCircle size={15} className="text-[#630330]/60 shrink-0" />
                                <span className="text-slate-500 shrink-0">{L.supervisor}</span>
                                <span className="min-w-0 truncate font-medium ml-auto">{record.supervisor}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Training period progress */}
                        {record.startDate && record.endDate && progress && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-[12px] text-slate-500">
                              <span className="font-medium text-slate-700">{progress.label}</span>
                              <span>{formatDate(record.startDate)} – {formatDate(record.endDate)}</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#630330] to-[#a3174f] wise-grow" style={{ width: `${progress.pct}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1.5"><Activity size={12} /> {currentT.lastUpdated} {new Date(record.lastUpdated).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {record.remarks && <span className="text-rose-500 truncate max-w-full">{record.remarks}</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl reveal-anim overflow-y-auto touch-auto">
          <div className={`w-full max-w-[420px] my-auto flex flex-col items-center relative p-6 sm:p-14 rounded-[2rem] sm:rounded-[3rem] border transition-all duration-300 ${loginSuccess ? 'border-emerald-500/50 bg-emerald-950/20' : lockoutTimeLeft > 0 ? 'border-rose-900 bg-rose-950/20' : 'border-white/10 bg-white/5'} shadow-3xl ${shakeRef.current ? 'animate-shake' : ''}`}>
            <button onClick={() => setShowAdminLogin(false)} className="absolute top-4 right-4 sm:top-8 sm:right-8 p-2 sm:p-3 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
            
            <div className={`inline-flex p-4 sm:p-7 rounded-full ${loginSuccess ? 'bg-emerald-500/20 text-emerald-400 scale-110' : lockoutTimeLeft > 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-[#D4AF37]/10 text-[#D4AF37]'} mb-4 sm:mb-8 shadow-[0_0_50px_rgba(212,175,55,0.1)] relative transition-all duration-700`}>
              {loginSuccess ? <ShieldCheck size={40} className="sm:w-[48px] sm:h-[48px]" /> : lockoutTimeLeft > 0 ? <Lock size={40} className="sm:w-[48px] sm:h-[48px]" /> : <Fingerprint size={40} className={`${isVerifying ? 'opacity-20 scale-95' : ''} sm:w-[48px] sm:h-[48px] transition-all duration-700`} />}
              {isVerifying && !loginSuccess && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-full h-full absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                    {/* Clearer Background Track */}
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray="289"
                      strokeDashoffset="0"
                      className="text-[#D4AF37] opacity-10"
                    />
                    {/* Dynamic Loading Line */}
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeDasharray="289"
                      strokeDashoffset="289"
                      strokeLinecap="round"
                      className="text-[#D4AF37] animate-loading-line-dynamic drop-shadow-[0_0_12px_rgba(212,175,55,0.8)]"
                    />
                  </svg>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#D4AF37]/0 via-[#D4AF37]/15 to-[#D4AF37]/0 animate-spin-slow"></div>
                </div>
              )}
            </div>
            
            <h3 className="text-lg sm:text-2xl font-black text-white uppercase mb-2 text-center tracking-tighter opacity-90">
              {loginSuccess ? 'ACCESS GRANTED' : lockoutTimeLeft > 0 ? 'SYSTEM LOCKED' : 'SECURE AUTHENTICATION'}
            </h3>
            
            {failedAttempts > 0 && lockoutTimeLeft === 0 && !loginSuccess && (
              <p className="text-rose-400 text-[10px] font-black uppercase mb-4 tracking-wider text-center">
                จำนวนครั้งที่เหลือ: {maxAttempts - failedAttempts}
              </p>
            )}

            {lockoutTimeLeft > 0 && (
              <div className="w-full text-center mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-pulse">
                <p className="text-rose-500 text-xs font-black uppercase mb-2 tracking-widest flex items-center justify-center gap-2">
                  <AlertTriangle size={14} /> SECURITY PROTOCOL ACTIVE
                </p>
                <p className="text-white text-3xl font-black">00:{lockoutTimeLeft < 10 ? `0${lockoutTimeLeft}` : lockoutTimeLeft}</p>
                <p className="text-rose-400 text-[9px] font-bold uppercase mt-2">Temporary lockout due to repeated failures.</p>
              </div>
            )}
            
            <form onSubmit={handleAdminSubmit} className="w-full space-y-4 sm:space-y-6">
              <div className="relative group overflow-hidden rounded-xl sm:rounded-2xl">
                <input 
                  type="password" 
                  autoFocus={!isMobile}
                  disabled={lockoutTimeLeft > 0 || isVerifying || loginSuccess}
                  placeholder="••••••" 
                  value={adminPassInput} 
                  onChange={e => {
                    setAdminPassInput(e.target.value);
                    if (loginError) setLoginError(false);
                  }} 
                  className={`w-full px-4 py-4 sm:py-7 rounded-xl sm:rounded-2xl bg-white/5 border-2 outline-none font-black text-center text-4xl sm:text-6xl tracking-[0.2em] transition-all duration-500
                    ${loginSuccess ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : lockoutTimeLeft > 0 ? 'border-rose-900/50 text-rose-900 opacity-50' : loginError ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-white/10 focus:border-[#D4AF37] text-[#D4AF37]'}`}
                />
                {(isVerifying || loginSuccess) && (
                   <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent animate-scan-beam-slow"></div>
                )}
                {isVerifying && !loginSuccess && (
                  <div className="absolute inset-0 bg-[#D4AF37]/5 pointer-events-none animate-pulse-soft"></div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  type="submit" 
                  disabled={lockoutTimeLeft > 0 || !adminPassInput || isVerifying || loginSuccess}
                  className={`group/btn w-full py-4 sm:py-6 rounded-xl sm:rounded-2xl font-black uppercase text-xs sm:text-base shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3
                    ${loginSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/30' : lockoutTimeLeft > 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : isVerifying ? 'bg-slate-700 text-white shadow-xl' : 'bg-[#630330] hover:bg-[#7a0b3d] text-white hover:shadow-mangosteen'}`}
                >
                  {loginSuccess ? (
                    <>
                      <Zap size={20} className="animate-bounce" />
                      กำลังเข้าระบบ...
                    </>
                  ) : isVerifying ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      กำลังเข้าระบบ...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={20} className="group-hover/btn:scale-110 transition-transform" />
                      {lang === Language.TH ? 'ยืนยันตัวตน' : 'VERIFY ACCESS'}
                    </>
                  )}
                </button>
                
                {loginError && !lockoutTimeLeft && (
                   <p className="text-rose-500 text-[10px] font-bold uppercase text-center tracking-widest flex items-center justify-center gap-2 animate-bounce">
                     <ShieldAlert size={14} /> รหัสผิดพลาด
                   </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
        @keyframes loading-line-dynamic {
          0% { stroke-dashoffset: 280; transform: rotate(0deg); }
          50% { stroke-dashoffset: 75; transform: rotate(180deg); }
          100% { stroke-dashoffset: 280; transform: rotate(720deg); }
        }
        .animate-loading-line-dynamic {
          animation: loading-line-dynamic 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-origin: center;
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @keyframes scan-beam-slow {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        .animate-scan-beam-slow {
          animation: scan-beam-slow 2s ease-in-out infinite;
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        .animate-pulse-soft {
          animation: pulse-soft 3s ease-in-out infinite;
        }
        .shadow-mangosteen {
          box-shadow: 0 10px 30px -5px rgba(99, 3, 48, 0.4);
        }
      `}</style>
    </div>
  );
};

export default LandingPage;

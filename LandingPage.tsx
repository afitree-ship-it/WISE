
import React, { useState, useEffect, useRef } from 'react';
import { 
  Language, 
  Major, 
  StudentStatusRecord, 
  ApplicationStatus,
  Translation,
  InternshipType
} from './types';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useFitLockup } from './useFitLockup';
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
  Zap,
  Eye,
  EyeOff,
  KeyRound
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
  heroEmblem?: string;
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
  heroEmblem,
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
  const [showPass, setShowPass] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [shake, setShake] = useState(false);

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
  const archEmblem = heroEmblem || emblem;

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
  useFitLockup(lockupRef);

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

  // Background pattern: brighter around the cursor
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--wl-mx', `${e.clientX}px`);
        el.style.setProperty('--wl-my', `${e.clientY}px`);
        el.style.setProperty('--wl-spot', '1');
      });
    };
    const onLeave = () => el.style.setProperty('--wl-spot', '0');
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => { window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(raf); };
  }, []);

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
  const AL = lang === Language.TH ? {
    title: 'เข้าสู่ระบบเจ้าหน้าที่', sub: 'สำหรับผู้ดูแลระบบและอาจารย์ที่ได้รับสิทธิ์', label: 'รหัสผ่าน', placeholder: 'กรอกรหัสผ่าน',
    show: 'แสดงรหัสผ่าน', hide: 'ซ่อนรหัสผ่าน', submit: 'เข้าสู่ระบบ', checking: 'กำลังตรวจสอบ...', entering: 'กำลังเข้าสู่ระบบ...',
    success: 'ยืนยันตัวตนสำเร็จ', successSub: 'กำลังพาไปยังหน้าจัดการ', wrong: 'รหัสผ่านไม่ถูกต้อง', caps: 'Caps Lock เปิดอยู่',
    left: (n: number) => `เหลืออีก ${n} ครั้ง`, lockedTitle: 'ระงับการเข้าสู่ระบบชั่วคราว', lockedSub: 'กรอกรหัสผิดครบ 5 ครั้ง',
    tryAgainIn: 'ลองใหม่ได้ในอีก', foot: 'ผิดครบ 5 ครั้ง ระบบจะล็อกไว้ 1 นาที',
  } : {
    title: 'Staff sign in', sub: 'For administrators and authorised staff', label: 'Password', placeholder: 'Enter password',
    show: 'Show password', hide: 'Hide password', submit: 'Sign in', checking: 'Checking...', entering: 'Signing in...',
    success: 'Verified', successSub: 'Opening the admin panel', wrong: 'Incorrect password.', caps: 'Caps Lock is on',
    left: (n: number) => `${n} attempt${n === 1 ? '' : 's'} left`, lockedTitle: 'Sign-in paused', lockedSub: 'Too many incorrect attempts',
    tryAgainIn: 'Try again in', foot: 'After 5 wrong attempts, sign-in is locked for 1 minute',
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    // The Apps Script backend is woken by App's capability probe
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
        
        setShake(true);
        setTimeout(() => setShake(false), 450);

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
    <div ref={rootRef} className={`wl fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden touch-auto ${isRtl ? 'rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="wl-pattern wl-bg wl-bg-base" aria-hidden="true" />
      <div className="wl-pattern wl-bg wl-bg-spot" aria-hidden="true" />
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
            <span className="ar-accent hidden sm:block truncate text-[11.5px] font-light text-[#8b7380]">{universityName}</span>
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

      <main className="relative z-10 mx-auto w-full max-w-[720px] lg:max-w-none lg:w-[min(1180px,calc(100%-48px))] px-[22px] sm:px-10 lg:px-0 pt-9 sm:pt-14 pb-12 lg:py-0 lg:min-h-[calc(100svh-90px)] grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
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
            <span key={`${lang}-${taglineIdx}`} className="ar-accent wise-tagline inline-flex items-center gap-2 text-[14px] sm:text-[16px] font-light text-[#7d6470]">
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
              {archEmblem ? <div className="emb"><img src={archEmblem} alt="" /></div> : <div className="wm">WISE</div>}
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
                <small className="ar-accent block text-[12px] text-[#8b7380]">{eventCountdown}</small>
                <div className="n my-2">{shortDate(nextEvent.date)}</div>
                <b className="block text-[14px] sm:text-[14.5px] font-medium leading-snug line-clamp-2">{nextEvent.label}</b>
              </div>
            )}
            {sitesCount > 0 && (
              <div className="wl-float wl-float--b" dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="n">{sitesCount}</div>
                <b className="block mt-1 text-[14px] sm:text-[14.5px] font-medium">{t3.sites}</b>
                {studentsThisYear > 0 && <small className="ar-accent block text-[12px] text-[#8b7380] mt-0.5">{studentsThisYear} {t3.students}</small>}
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
        <div
          className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center sm:p-6 bg-[#12000a]/80 backdrop-blur-xl wise-fade-in touch-auto"
          onMouseDown={() => { if (!isVerifying && !loginSuccess) setShowAdminLogin(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-login-title"
            onMouseDown={(e) => e.stopPropagation()}
            className={`wise-pop-in w-full sm:max-w-[420px] max-h-[92svh] overflow-y-auto custom-scrollbar rounded-t-[28px] sm:rounded-[28px] bg-[#2a0114]/95 border shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative transition-colors ${loginSuccess ? 'border-emerald-400/40' : lockoutTimeLeft > 0 ? 'border-rose-400/30' : 'border-white/10'} ${shake ? 'animate-shake' : ''}`}
          >
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
              <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#D4AF37]/15 blur-3xl" />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#7A0B3D]/60 blur-3xl" />
            </div>

            <div className="relative p-6 sm:p-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-12 h-12 shrink-0 rounded-2xl border flex items-center justify-center transition-colors ${loginSuccess ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300' : lockoutTimeLeft > 0 ? 'bg-rose-500/15 border-rose-400/30 text-rose-300' : 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#E8CF7A]'}`}>
                  {loginSuccess ? <ShieldCheck size={22} /> : lockoutTimeLeft > 0 ? <Lock size={22} /> : <LockKeyhole size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 id="admin-login-title" className="text-lg sm:text-xl font-bold text-white leading-tight">
                    {loginSuccess ? AL.success : lockoutTimeLeft > 0 ? AL.lockedTitle : AL.title}
                  </h3>
                  <p className="text-[13px] text-white/55 mt-0.5">
                    {loginSuccess ? AL.successSub : lockoutTimeLeft > 0 ? AL.lockedSub : AL.sub}
                  </p>
                </div>
                <button onClick={() => setShowAdminLogin(false)} disabled={isVerifying || loginSuccess} className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition disabled:opacity-30" aria-label="close">
                  <X size={18} />
                </button>
              </div>

              {lockoutTimeLeft > 0 ? (
                <div className="mt-6 rounded-2xl bg-rose-500/10 border border-rose-400/25 p-5 text-center">
                  <p className="text-[12px] text-rose-200/80">{AL.tryAgainIn}</p>
                  <p className="mt-1 text-4xl font-bold tabular-nums text-white">
                    {Math.floor(lockoutTimeLeft / 60)}:{String(lockoutTimeLeft % 60).padStart(2, '0')}
                  </p>
                  <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-rose-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(lockoutTimeLeft / lockoutDuration) * 100}%` }} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAdminSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="admin-pass" className="block text-[12px] font-medium text-white/70 mb-1.5">{AL.label}</label>
                    <div className={`flex items-center gap-1 p-1.5 rounded-2xl bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-2 transition ${loginSuccess ? 'ring-emerald-400' : loginError ? 'ring-rose-400' : 'ring-transparent focus-within:ring-[#D4AF37]'}`}>
                      <KeyRound size={18} className="ml-2.5 text-slate-300 shrink-0" />
                      <input
                        id="admin-pass"
                        type={showPass ? 'text' : 'password'}
                        autoFocus={!isMobile}
                        autoComplete="current-password"
                        disabled={isVerifying || loginSuccess}
                        placeholder={AL.placeholder}
                        value={adminPassInput}
                        onChange={e => { setAdminPassInput(e.target.value); if (loginError) setLoginError(false); }}
                        onKeyUp={e => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))}
                        onKeyDown={e => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))}
                        className="flex-1 min-w-0 h-11 sm:h-12 px-1 bg-transparent outline-none text-base font-semibold text-[#2a0114] placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition" aria-label={showPass ? AL.hide : AL.show} title={showPass ? AL.hide : AL.show}>
                        {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>

                    <div className="min-h-[20px] mt-2 text-[12px]">
                      {loginError ? (
                        <p className="flex items-center gap-1.5 text-rose-300"><ShieldAlert size={14} /> {AL.wrong} {AL.left(maxAttempts - failedAttempts)}</p>
                      ) : capsOn ? (
                        <p className="flex items-center gap-1.5 text-amber-300"><AlertTriangle size={14} /> {AL.caps}</p>
                      ) : failedAttempts > 0 ? (
                        <p className="text-white/45">{AL.left(maxAttempts - failedAttempts)}</p>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!adminPassInput || isVerifying || loginSuccess}
                    className={`w-full h-12 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:cursor-not-allowed ${loginSuccess ? 'bg-emerald-500 text-white' : 'bg-[#630330] hover:bg-[#7a0b3d] text-white disabled:bg-white/10 disabled:text-white/40'}`}
                  >
                    {loginSuccess ? <><Check size={18} /> {AL.entering}</> : isVerifying ? <><RefreshCw size={17} className="animate-spin" /> {AL.checking}</> : <><ChevronRight size={18} /> {AL.submit}</>}
                  </button>

                  {failedAttempts > 0 && !loginSuccess && (
                    <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
                      {Array.from({ length: maxAttempts }).map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < failedAttempts ? 'bg-rose-400' : 'bg-white/20'}`} />
                      ))}
                    </div>
                  )}
                </form>
              )}

              <p className="mt-6 pt-4 border-t border-white/10 text-[11px] text-white/40 flex items-center gap-1.5">
                <ShieldCheck size={13} className="shrink-0" /> {AL.foot}
              </p>
            </div>
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

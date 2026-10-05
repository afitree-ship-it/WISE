import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Language, Major, InternshipSite, DocumentForm, FormCategory, ScheduleEvent, LocalizedString, Translation,
  StudentStatusRecord, ApplicationStatus, InternshipType,
} from '../types';
import InternshipCard from './InternshipCard';
import LanguageSwitcher from './LanguageSwitcher';
import { localize } from '../localize';
import { useFitLockup } from '../useFitLockup';
import { ChecklistStep, DEFAULT_CHECKLIST } from '../checklist';
import {
  CalendarDays, FileText, Download, Search, Building2, ArrowRight, ChevronDown, X, Info, Check, Moon, Sun, LogOut,
  ListChecks, Users, Briefcase, GraduationCap, Sparkles, ExternalLink, RotateCcw,
} from 'lucide-react';

type Tab = 'all' | 'check' | 'schedule' | 'docs' | 'sites';
const CHECK_KEY = 'wise_student_checklist';

const STRINGS = {
  [Language.TH]: {
    faculty: 'คณะวิทยาศาสตร์และเทคโนโลยี', logout: 'ออกจากระบบ',
    tabs: { all: 'ทั้งหมด', check: 'เช็กลิสต์', schedule: 'กำหนดการ', docs: 'เอกสาร', sites: 'สถานที่ฝึก' } as Record<Tab, string>,
    nextUp: 'กำหนดการถัดไป', noNext: 'ยังไม่มีกำหนดการใหม่', today: 'วันนี้', inDays: (n: number) => `อีก ${n} วัน`,
    ongoing: 'กำลังดำเนินการ', past: 'ผ่านไปแล้ว', to: 'ถึง',
    myProgress: 'ความคืบหน้าของฉัน', doneOf: (a: number, b: number) => `ทำไปแล้ว ${a} จาก ${b} ขั้น`,
    savedLocal: 'เช็กลิสต์จำไว้ในเครื่องนี้', nextTask: 'สิ่งที่ต้องทำต่อไป', allDone: 'ครบทุกขั้นแล้ว ยอดเยี่ยม!', reset: 'เริ่มใหม่',
    todo: 'สิ่งที่ต้องทำ', todoSub: 'ติ๊กเมื่อทำเสร็จ เอกสารที่ต้องใช้อยู่ข้างแต่ละรายการ',
    groups: ['ก่อนออกฝึก', 'ระหว่างฝึก', 'หลังฝึก'],
    openForms: (n: number) => `เอกสาร ${n}`, seeSites: 'ดูสถานที่', schedule: 'กำหนดการ', scheduleSub: 'วันสำคัญและกำหนดส่งเอกสาร',
    showPast: (n: number) => `แสดงที่ผ่านมาแล้ว (${n})`, hidePast: 'ซ่อนที่ผ่านมาแล้ว', noEvents: 'ยังไม่มีกำหนดการ',
    docsSub: 'ดาวน์โหลดแบบฟอร์มที่ต้องใช้ในแต่ละขั้นตอน', noForms: 'ยังไม่มีเอกสารในหมวดนี้',
    processing: 'ระบบกำลังประมวลผลไฟล์เอกสาร กรุณาลองใหม่ภายหลัง',
    sitesSub: 'ที่เปิดรับตอนนี้ และทุกที่ที่รุ่นพี่ WISE เคยไปฝึก',
    srcOpen: 'เปิดรับสมัคร', srcSenior: 'รุ่นพี่เคยไป', srcAll: 'ทั้งหมด',
    seniors: (n: number) => `รุ่นพี่ ${n} คน`, seniorWent: 'รุ่นพี่เคยไปฝึก', years: 'ปีการศึกษา', positions: 'ตำแหน่งที่รุ่นพี่เคยทำ',
    intern: 'ฝึกงาน', coop: 'สหกิจศึกษา', noSites: 'ไม่พบสถานที่ที่ค้นหา', clear: 'ล้างตัวกรอง',
    found: (n: number) => `${n} แห่ง`, alsoOpen: 'เปิดรับอยู่ด้วย', website: 'เว็บไซต์',
    seniorNote: 'ข้อมูลรวมจากนักศึกษาที่ได้รับการตอบรับในปีที่ผ่านมา ไม่แสดงชื่อรายบุคคล',
  },
  [Language.EN]: {
    faculty: 'Faculty of Science and Technology', logout: 'Log out',
    tabs: { all: 'All', check: 'Checklist', schedule: 'Schedule', docs: 'Documents', sites: 'Sites' } as Record<Tab, string>,
    nextUp: 'Next up', noNext: 'No upcoming dates yet', today: 'Today', inDays: (n: number) => `in ${n} days`,
    ongoing: 'Ongoing', past: 'Past', to: 'to',
    myProgress: 'My progress', doneOf: (a: number, b: number) => `${a} of ${b} steps done`,
    savedLocal: 'Saved on this device', nextTask: 'Next task', allDone: 'All steps done. Great work!', reset: 'Reset',
    todo: 'To-do', todoSub: 'Tick each step when done. Related documents sit beside each item.',
    groups: ['Before placement', 'During placement', 'After placement'],
    openForms: (n: number) => `${n} docs`, seeSites: 'See sites', schedule: 'Schedule', scheduleSub: 'Key dates and document deadlines',
    showPast: (n: number) => `Show past (${n})`, hidePast: 'Hide past', noEvents: 'No events scheduled',
    docsSub: 'Download the forms you need at each step', noForms: 'No documents in this category yet',
    processing: 'This document is still being processed. Please try again later.',
    sitesSub: 'Open placements now, plus every site WISE seniors have trained at',
    srcOpen: 'Open now', srcSenior: 'Seniors went', srcAll: 'All',
    seniors: (n: number) => `${n} seniors`, seniorWent: 'Seniors trained here', years: 'Years', positions: 'Roles seniors held',
    intern: 'Internship', coop: 'Co-op', noSites: 'No sites match your search', clear: 'Clear filters',
    found: (n: number) => `${n} sites`, alsoOpen: 'Also open now', website: 'Website',
    seniorNote: 'Aggregated from accepted students in past years. No individual names are shown.',
  },
  [Language.AR]: {
    faculty: 'كلية العلوم والتكنولوجيا', logout: 'تسجيل الخروج',
    tabs: { all: 'الكل', check: 'قائمة المهام', schedule: 'المواعيد', docs: 'النماذج', sites: 'جهات التدريب' } as Record<Tab, string>,
    nextUp: 'الموعد القادم', noNext: 'لا توجد مواعيد قادمة', today: 'اليوم', inDays: (n: number) => `بعد ${n} يوم`,
    ongoing: 'جارٍ', past: 'انتهى', to: 'إلى',
    myProgress: 'تقدّمي', doneOf: (a: number, b: number) => `أنجزت ${a} من ${b} خطوات`,
    savedLocal: 'محفوظة على هذا الجهاز', nextTask: 'المهمة التالية', allDone: 'أنجزت جميع الخطوات!', reset: 'إعادة',
    todo: 'المهام', todoSub: 'ضع علامة عند الإنجاز، والنماذج بجانب كل مهمة',
    groups: ['قبل التدريب', 'أثناء التدريب', 'بعد التدريب'],
    openForms: (n: number) => `${n} نماذج`, seeSites: 'عرض الجهات', schedule: 'المواعيد', scheduleSub: 'التواريخ المهمة ومواعيد التسليم',
    showPast: (n: number) => `عرض السابقة (${n})`, hidePast: 'إخفاء السابقة', noEvents: 'لا توجد مواعيد',
    docsSub: 'حمّل النماذج المطلوبة في كل مرحلة', noForms: 'لا توجد نماذج في هذا القسم',
    processing: 'جارٍ تجهيز الملف، يرجى المحاولة لاحقًا.',
    sitesSub: 'الجهات المتاحة الآن وكل الجهات التي تدرّب فيها طلاب WISE السابقون',
    srcOpen: 'متاحة الآن', srcSenior: 'ذهب إليها السابقون', srcAll: 'الكل',
    seniors: (n: number) => `${n} طلاب سابقين`, seniorWent: 'تدرّب هنا طلاب سابقون', years: 'السنوات', positions: 'الأدوار السابقة',
    intern: 'تدريب ميداني', coop: 'تعليم تعاوني', noSites: 'لا توجد نتائج مطابقة', clear: 'مسح عوامل التصفية',
    found: (n: number) => `${n} جهة`, alsoOpen: 'متاحة الآن أيضًا', website: 'الموقع',
    seniorNote: 'بيانات مجمّعة من الطلاب المقبولين سابقًا، دون عرض الأسماء.',
  },
  [Language.MS]: {
    faculty: 'Fakulti Sains dan Teknologi', logout: 'Log keluar',
    tabs: { all: 'Semua', check: 'Senarai semak', schedule: 'Jadual', docs: 'Dokumen', sites: 'Tempat latihan' } as Record<Tab, string>,
    nextUp: 'Seterusnya', noNext: 'Tiada tarikh akan datang', today: 'Hari ini', inDays: (n: number) => `${n} hari lagi`,
    ongoing: 'Sedang berjalan', past: 'Telah lepas', to: 'hingga',
    myProgress: 'Kemajuan saya', doneOf: (a: number, b: number) => `${a} daripada ${b} langkah selesai`,
    savedLocal: 'Disimpan pada peranti ini', nextTask: 'Tugasan seterusnya', allDone: 'Semua langkah selesai!', reset: 'Set semula',
    todo: 'Perlu dibuat', todoSub: 'Tandakan apabila selesai. Dokumen berkaitan ada di sebelah setiap item.',
    groups: ['Sebelum latihan', 'Semasa latihan', 'Selepas latihan'],
    openForms: (n: number) => `${n} dokumen`, seeSites: 'Lihat tempat', schedule: 'Jadual', scheduleSub: 'Tarikh penting dan tarikh akhir',
    showPast: (n: number) => `Tunjuk lepas (${n})`, hidePast: 'Sembunyi lepas', noEvents: 'Tiada acara dijadualkan',
    docsSub: 'Muat turun borang yang diperlukan', noForms: 'Tiada dokumen dalam kategori ini',
    processing: 'Dokumen sedang diproses. Sila cuba lagi kemudian.',
    sitesSub: 'Tempat yang dibuka sekarang dan semua tempat senior WISE pernah berlatih',
    srcOpen: 'Dibuka', srcSenior: 'Senior pernah pergi', srcAll: 'Semua',
    seniors: (n: number) => `${n} senior`, seniorWent: 'Senior pernah berlatih di sini', years: 'Tahun', positions: 'Jawatan senior',
    intern: 'Latihan industri', coop: 'Ko-op', noSites: 'Tiada tempat sepadan', clear: 'Kosongkan penapis',
    found: (n: number) => `${n} tempat`, alsoOpen: 'Juga dibuka sekarang', website: 'Laman web',
    seniorNote: 'Data terkumpul daripada pelajar yang diterima sebelum ini. Tiada nama ditunjukkan.',
  },
};

const MAJOR_DOT: Record<string, string> = {
  [Major.HALAL_FOOD]: 'bg-amber-500', [Major.DIGITAL_TECH]: 'bg-blue-500', [Major.INFO_TECH]: 'bg-violet-500', [Major.DATA_SCIENCE]: 'bg-teal-500',
};

const DAY = 86400000;
const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c.getTime(); };
const parseDate = (s?: string) => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
type EventState = { kind: 'past' | 'ongoing' | 'upcoming'; days: number };
const eventState = (ev: ScheduleEvent): EventState | null => {
  const a = parseDate(ev.rawStartDate), b = parseDate(ev.rawEndDate) || a;
  if (!a || !b) return null;
  const now = startOfDay(new Date());
  if (startOfDay(b) < now) return { kind: 'past', days: 0 };
  if (startOfDay(a) <= now) return { kind: 'ongoing', days: Math.round((startOfDay(b) - now) / DAY) };
  return { kind: 'upcoming', days: Math.round((startOfDay(a) - now) / DAY) };
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[().,]/g, '').trim();

interface SeniorSite {
  key: string; name: string; count: number; years: string[]; majors: Major[]; positions: string[];
  intern: number; coop: number; site?: InternshipSite;
}

interface StudentPortalProps {
  lang: Language;
  setLang: (l: Language) => void;
  currentT: Translation;
  isRtl: boolean;
  sites: InternshipSite[];
  schedules: ScheduleEvent[];
  forms: DocumentForm[];
  studentStatuses: StudentStatusRecord[];
  checklist?: ChecklistStep[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeMajor: Major | 'all';
  setActiveMajor: (m: Major | 'all') => void;
  majorChips: { id: Major | 'all'; label: string; dot?: string }[];
  emblem?: string;
  emblemIsIcon?: boolean;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
  onHome: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({
  lang, setLang, currentT, isRtl, sites, schedules, forms, studentStatuses, checklist, searchTerm, setSearchTerm,
  activeMajor, setActiveMajor, majorChips, emblem, emblemIsIcon, theme, onToggleTheme, onLogout, onHome,
}) => {
  const S = STRINGS[lang] || STRINGS[Language.TH];
  const loc = (l?: LocalizedString | string) => localize(l as any, lang);
  const locale = lang === Language.TH ? 'th-TH' : lang === Language.AR ? 'ar' : lang === Language.MS ? 'ms-MY' : 'en-GB';
  const fmt = (d: Date | null, o: Intl.DateTimeFormatOptions) => (d ? d.toLocaleDateString(locale, o) : '');
  const lockupRef = useRef<HTMLDivElement>(null);
  useFitLockup(lockupRef);

  const [tab, setTab] = useState<Tab>('all');
  const [showPast, setShowPast] = useState(false);
  const [source, setSource] = useState<'open' | 'senior' | 'all'>('all');
  const show = (t: Tab) => tab === 'all' || tab === t;
  const go = (t: Tab) => {
    setTab(t);
    requestAnimationFrame(() => document.getElementById('wp-right')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  /* ---------- checklist (stored per device) ---------- */
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(CHECK_KEY) || '{}'); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(CHECK_KEY, JSON.stringify(done)); } catch { /* storage blocked */ } }, [done]);
  const STEPS = (checklist?.length ? checklist : DEFAULT_CHECKLIST).filter(s => (s.title.th || s.title.en || '').trim());
  const doneCount = STEPS.filter(s => done[s.id]).length;
  const nextStep = STEPS.find(s => !done[s.id]);

  /* ---------- schedule ---------- */
  const timeline = useMemo(() => {
    const items = [...schedules]
      .sort((a, b) => (a.rawStartDate || '').localeCompare(b.rawStartDate || ''))
      .map(ev => ({ ev, st: eventState(ev) }));
    return { current: items.filter(i => i.st?.kind !== 'past'), past: items.filter(i => i.st?.kind === 'past').reverse() };
  }, [schedules]);
  const next = timeline.current.find(i => i.st);
  const nextDate = next ? parseDate(next.st?.kind === 'ongoing' ? next.ev.rawEndDate || next.ev.rawStartDate : next.ev.rawStartDate) : null;
  const badge = (st: EventState | null) => {
    if (!st) return null;
    if (st.kind === 'past') return { text: S.past, cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400' };
    if (st.kind === 'ongoing') return { text: S.ongoing, cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' };
    return { text: st.days === 0 ? S.today : S.inDays(st.days), cls: st.days <= 7 ? 'bg-[#D4AF37]/15 text-[#8a6a14] dark:text-[#e8cf7a]' : 'bg-[#630330]/[0.06] text-[#630330] dark:bg-white/5 dark:text-[#e8cf7a]' };
  };

  /* ---------- sites: open now + every place seniors trained ---------- */
  const seniorSites = useMemo<SeniorSite[]>(() => {
    const map = new Map<string, SeniorSite & { names: Record<string, number>; pos: Record<string, number> }>();
    studentStatuses.forEach(r => {
      if (r.status !== ApplicationStatus.ACCEPTED) return;
      const raw = String(r.location || '').trim();
      if (!raw) return;
      const key = norm(raw);
      const g = map.get(key) || { key, name: raw, count: 0, years: [], majors: [], positions: [], intern: 0, coop: 0, names: {}, pos: {} };
      g.count++;
      g.names[raw] = (g.names[raw] || 0) + 1;
      const y = String(r.academicYear || '').trim();
      if (y && !g.years.includes(y)) g.years.push(y);
      if (r.major && !g.majors.includes(r.major)) g.majors.push(r.major);
      const p = String(r.position || '').trim();
      if (p) g.pos[p] = (g.pos[p] || 0) + 1;
      if (r.internshipType === InternshipType.COOP) g.coop++; else g.intern++;
      map.set(key, g);
    });
    // Sites marked "senior visited" in the database count too, even without status records
    sites.forEach(s => {
      if (s.status === 'active') return;
      const names = [s.name?.th, s.name?.en, loc(s.name)].filter(Boolean).map(n => norm(String(n)));
      const hit = [...map.values()].find(g => names.includes(g.key));
      if (hit) { hit.site = s; return; }
      if (s.status === 'senior_visited') {
        const nm = loc(s.name);
        map.set(norm(nm), { key: norm(nm), name: nm, count: 0, years: [], majors: [s.major], positions: loc(s.position) ? [loc(s.position)] : [], intern: 0, coop: 0, site: s, names: {}, pos: {} });
      }
    });
    // Link to an open site with the same name, if any
    return [...map.values()].map(g => {
      const open = sites.find(s => s.status === 'active' && [s.name?.th, s.name?.en].filter(Boolean).some(n => norm(String(n)) === g.key));
      const best = Object.entries(g.names).sort((a, b) => b[1] - a[1])[0]?.[0] || g.name;
      const positions = g.positions.length ? g.positions : Object.entries(g.pos).sort((a, b) => b[1] - a[1]).map(([p]) => p);
      return { key: g.key, name: best, count: g.count, years: g.years.sort(), majors: g.majors, positions, intern: g.intern, coop: g.coop, site: open || g.site };
    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [studentStatuses, sites, lang]);

  const q = searchTerm.trim().toLowerCase();
  const openSites = useMemo(() => sites.filter(s => s.status === 'active'
    && (activeMajor === 'all' || s.major === activeMajor)
    && (!q || [loc(s.name), loc(s.position), loc(s.location)].some(v => v.toLowerCase().includes(q)))), [sites, activeMajor, q, lang]);
  const seniorList = useMemo(() => seniorSites.filter(g =>
    (activeMajor === 'all' || g.majors.includes(activeMajor as Major))
    && (!q || [g.name, ...g.positions, g.site ? loc(g.site.location) : ''].some(v => v.toLowerCase().includes(q)))), [seniorSites, activeMajor, q, lang]);
  const totalSeniors = seniorSites.reduce((n, g) => n + g.count, 0);

  /* ---------- helpers ---------- */
  const onFormClick = (e: React.MouseEvent, form: DocumentForm) => {
    if (!form.url || form.url === '#' || form.url.startsWith('PENDING')) { e.preventDefault(); alert(S.processing); }
  };
  const appForms = forms.filter(f => f.category === FormCategory.APPLICATION);
  const monitorForms = forms.filter(f => f.category === FormCategory.MONITORING);

  const sectionTitle = (icon: React.ReactNode, title: string, sub?: string, right?: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-[21px] sm:text-[23px] font-medium text-[#2a0a17] dark:text-white">
          <span className="w-8 h-8 shrink-0 rounded-lg bg-[#630330] text-[#e8cf7a] flex items-center justify-center">{icon}</span>{title}
        </h2>
        {sub && <p className="mt-1 text-[13.5px] font-light text-[#7d6470] dark:text-slate-400">{sub}</p>}
      </div>
      {right}
    </div>
  );

  const stepLinkBtn = (step: ChecklistStep) => {
    const cls = 'shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] bg-[#630330]/[0.06] dark:bg-white/5 text-[#630330] dark:text-[#e8cf7a] hover:bg-[#630330] hover:text-white transition';
    if (step.link === 'sites') return <button onClick={() => go('sites')} className={cls}><Building2 size={14} />{S.seeSites}</button>;
    if (step.link === 'app' && appForms.length) return <button onClick={() => go('docs')} className={cls}><Download size={14} />{S.openForms(appForms.length)}</button>;
    if (step.link === 'monitor' && monitorForms.length) return <button onClick={() => go('docs')} className={cls}><Download size={14} />{S.openForms(monitorForms.length)}</button>;
    if (step.link === 'deadline' && next && nextDate) return <span className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] bg-[#D4AF37]/15 text-[#8a6a14] dark:text-[#e8cf7a]"><CalendarDays size={14} />{fmt(nextDate, { day: 'numeric', month: 'short' })}</span>;
    return null;
  };

  const ringR = 50, ringC = 2 * Math.PI * ringR;

  return (
    <div className="wp relative z-10 flex-grow lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* ================= LEFT: same identity as the landing ================= */}
      <aside className="wp-left relative overflow-hidden flex flex-col px-5 sm:px-10 lg:px-12 pt-[max(18px,env(safe-area-inset-top))] pb-7 lg:pb-10">
        <div className="wl-pattern opacity-[0.07]" aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-2">
          <button onClick={onHome} className="flex items-center gap-2.5 min-w-0" title="หน้าแรก">
            {emblem ? (
              <span className="w-10 h-10 shrink-0 rounded-full bg-white ring-1 ring-[#efe4d2] dark:ring-white/10 overflow-hidden flex items-center justify-center">
                <img src={emblem} alt="" className={`w-full h-full ${emblemIsIcon ? 'object-contain p-0.5' : 'object-cover object-left'}`} />
              </span>
            ) : <span className="wl-latin w-10 h-10 shrink-0 rounded-full bg-[#630330] text-[#e8cf7a] flex items-center justify-center text-[11px] font-extrabold">FST</span>}
            <span className="hidden sm:block truncate text-[14px] text-[#630330] dark:text-[#e8cf7a]">{S.faculty}</span>
          </button>
          <div className="flex items-center gap-1">
            <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} variant="dropdown" tone="light" />
            <button onClick={onToggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full text-[#6e5560] dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5 transition" aria-label="theme">
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button onClick={onLogout} className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 rounded-full text-[14px] text-[#630330] dark:text-[#e8cf7a] bg-[#630330]/[0.07] dark:bg-white/5 hover:bg-[#630330] hover:text-white transition" title={S.logout}>
              <LogOut size={16} className={isRtl ? 'rotate-180' : ''} /><span className="hidden sm:inline">{S.logout}</span>
            </button>
          </div>
        </div>

        <div ref={lockupRef} className="wp-lockup wl-lockup relative mt-8 lg:mt-12 self-start" dir="ltr">
          <div className="wl-wise wp-wise select-none"><span data-fit-target className="inline-block">WISE</span><em>.</em></div>
          <div className="wl-line wl-en"><span data-fit>Work-Integrated Science Education Unit</span></div>
          <div className="wl-rule" data-fit-rule><i /></div>
          <div className="wl-line wl-th"><span data-fit>หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน</span></div>
        </div>
        <p className="relative mt-5 text-[19px] sm:text-[22px] font-medium text-[#2a0a17] dark:text-white">{currentT.landingHeading}</p>

        {/* Quick stats: jump straight to a tab */}
        <div className="relative mt-5 flex w-fit max-w-full rounded-2xl bg-white/75 dark:bg-white/[0.04] border border-[#efe4d2] dark:border-white/10 divide-x rtl:divide-x-reverse divide-[#efe4d2] dark:divide-white/10 overflow-hidden">
          {[
            { t: 'sites' as Tab, n: sites.filter(s => s.status === 'active').length, label: S.srcOpen, src: 'open' as const },
            { t: 'sites' as Tab, n: seniorSites.length, label: S.srcSenior, src: 'senior' as const },
            { t: 'docs' as Tab, n: forms.length, label: S.tabs.docs, src: null },
          ].map((x, i) => (
            <button key={i} onClick={() => { if (x.src) setSource(x.src); go(x.t); }}
              className="flex items-baseline gap-2 px-4 sm:px-5 py-3 hover:bg-[#faf6ef] dark:hover:bg-white/5 transition">
              <span className="wl-latin text-[22px] font-extrabold leading-none text-[#630330] dark:text-white tabular-nums">{x.n}</span>
              <span className="text-[12.5px] font-light text-[#7d6470] dark:text-slate-400 whitespace-nowrap">{x.label}</span>
            </button>
          ))}
        </div>

        {/* Arch: next deadline */}
        <div className="wp-arch relative mt-7 shrink-0 h-[270px] sm:h-[300px] rounded-t-[200px] rounded-b-[26px] bg-[#630330] text-white overflow-hidden shadow-[0_40px_70px_-35px_rgba(99,3,48,0.7)]">
          <div className="wl-pattern opacity-[0.18]" />
          <div className="absolute inset-x-4 top-4 bottom-0 rounded-t-[190px] border border-[#e8cf7a]/40" />
          <div className="absolute w-[460px] h-[460px] left-1/2 -top-[220px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.45),transparent_62%)]" />
          <div className="wp-arch-in relative h-full flex flex-col items-center justify-end text-center px-6 pt-16 pb-6">
            <span className="text-[12.5px] text-[#e8cf7a]">{S.nextUp}</span>
            {next && nextDate ? (
              <>
                <span className="wp-arch-num wl-latin mt-1 text-[60px] font-extrabold leading-none tabular-nums">{nextDate.getDate()}</span>
                <span className="mt-1 text-[14px] text-white/80">{fmt(nextDate, { month: 'long', year: 'numeric' })}</span>
                <p className="mt-2 text-[17px] font-medium leading-snug line-clamp-2 [text-wrap:balance]">{loc(next.ev.event)}</p>
                {badge(next.st) && <span className="mt-3 inline-flex items-center h-7 px-3 rounded-full bg-[#D4AF37] text-[#2a0114] text-[12.5px] font-medium">{badge(next.st)!.text}</span>}
              </>
            ) : <p className="mt-3 mb-4 text-[15px] font-light text-white/75">{S.noNext}</p>}
          </div>
        </div>
      </aside>

      {/* ================= RIGHT: content ================= */}
      <div id="wp-right" className="min-w-0 scroll-mt-0 px-4 sm:px-8 lg:px-11 pb-16">
        {/* Tabs */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-8 lg:-mx-11 px-4 sm:px-8 lg:px-11 pt-[max(14px,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-[var(--wp-bg)] via-[var(--wp-bg)] to-transparent">
          <div className="flex items-center gap-1 p-1 w-fit max-w-full overflow-x-auto hide-scrollbar rounded-full bg-white/90 dark:bg-[#1c0c14]/90 backdrop-blur border border-[#efe4d2] dark:border-white/10 shadow-[0_10px_24px_-18px_rgba(99,3,48,0.45)]">
            {(Object.keys(S.tabs) as Tab[]).map(t => (
              <button key={t} ref={el => {
                // Keep the active tab visible inside the strip (horizontal only, never scrolls the page)
                const strip = el?.parentElement;
                if (el && strip && tab === t) {
                  const l = el.offsetLeft - strip.offsetLeft, r = l + el.offsetWidth;
                  if (l < strip.scrollLeft) strip.scrollLeft = l - 8;
                  else if (r > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = r - strip.clientWidth + 8;
                }
              }} onClick={() => go(t)} className={`shrink-0 h-9 px-4 rounded-full text-[13.5px] transition ${tab === t ? 'bg-[#630330] text-white' : 'text-[#6e5560] dark:text-slate-300 hover:bg-[#faf6ef] dark:hover:bg-white/5'}`}>
                {S.tabs[t]}
              </button>
            ))}
          </div>
        </div>

        {/* ---------- Checklist (style 9) ---------- */}
        {show('check') && (
          <section className="pt-4 grid xl:grid-cols-[250px_minmax(0,1fr)] gap-4">
            <div className="relative overflow-hidden rounded-[26px] bg-[#630330] text-white p-5 flex xl:flex-col items-center gap-5 xl:gap-3 xl:text-center xl:self-start xl:sticky xl:top-[76px]">
              <div className="wl-pattern opacity-[0.14]" />
              <div className="relative w-[112px] h-[112px] xl:w-[150px] xl:h-[150px] shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r={ringR} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="10" />
                  <circle cx="60" cy="60" r={ringR} fill="none" stroke="#d4af37" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={ringC} strokeDashoffset={ringC * (1 - doneCount / STEPS.length)} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center wl-latin font-extrabold text-[34px] xl:text-[44px]">{doneCount}<span className="text-[18px] xl:text-[22px] opacity-60">/{STEPS.length}</span></span>
              </div>
              <div className="relative min-w-0">
                <p className="text-[12.5px] text-[#e8cf7a]">{S.myProgress}</p>
                <p className="text-[17px] font-medium leading-snug">{S.doneOf(doneCount, STEPS.length)}</p>
                <div className="mt-3 p-3 rounded-2xl bg-white/10 text-start text-[13.5px] leading-snug">
                  {nextStep ? (<><span className="block text-[12px] text-[#e8cf7a]">{S.nextTask}</span>{loc(nextStep.title as LocalizedString)}</>) : <span className="inline-flex items-center gap-1.5"><Sparkles size={15} className="text-[#e8cf7a]" />{S.allDone}</span>}
                </div>
                <p className="mt-2 text-[11.5px] font-light text-white/55">{S.savedLocal}</p>
              </div>
            </div>

            <div className="rounded-[26px] bg-white/85 dark:bg-white/[0.03] border border-[#efe4d2] dark:border-white/10 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-[20px] font-medium text-[#2a0a17] dark:text-white"><ListChecks size={20} className="text-[#a8862a]" />{S.todo}</h2>
                  <p className="text-[13px] font-light text-[#7d6470] dark:text-slate-400">{S.todoSub}</p>
                </div>
                {doneCount > 0 && <button onClick={() => setDone({})} className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-[12.5px] text-[#9b8590] hover:bg-[#faf6ef] dark:hover:bg-white/5"><RotateCcw size={13} />{S.reset}</button>}
              </div>
              {[0, 1, 2].map(g => (
                <div key={g}>
                  <p className="mt-4 mb-1 flex items-center gap-3 text-[12.5px] text-[#a8862a] after:content-[''] after:flex-1 after:h-px after:bg-[#efe4d2] dark:after:bg-white/10">{S.groups[g]}</p>
                  {STEPS.filter(s => s.group === g).map(step => {
                    const isDone = !!done[step.id];
                    const isNext = nextStep?.id === step.id;
                    const title = loc(step.title as LocalizedString), hint = loc(step.hint as LocalizedString);
                    return (
                      <div key={step.id} className={`flex items-center gap-3 px-2 py-2.5 rounded-2xl transition ${isNext ? 'bg-[#D4AF37]/10' : ''}`}>
                        <button
                          onClick={() => setDone(d => ({ ...d, [step.id]: !d[step.id] }))}
                          className={`w-7 h-7 shrink-0 rounded-lg border-[1.5px] flex items-center justify-center transition ${isDone ? 'bg-[#630330] border-[#630330] text-white' : isNext ? 'border-[#D4AF37] bg-white dark:bg-transparent' : 'border-[#d9c9b0] dark:border-white/20 bg-white dark:bg-transparent'}`}
                          aria-pressed={isDone}
                          aria-label={title}
                        >
                          {isDone && <Check size={15} strokeWidth={3} />}
                        </button>
                        <button onClick={() => setDone(d => ({ ...d, [step.id]: !d[step.id] }))} className="flex-1 min-w-0 text-start">
                          <span className={`block text-[15px] leading-snug ${isDone ? 'text-[#a8949e] line-through' : 'text-[#2a0a17] dark:text-white'}`}>{title}</span>
                          <span className="block text-[12.5px] font-light text-[#7d6470] dark:text-slate-400">{hint}</span>
                        </button>
                        {!isDone && stepLinkBtn(step)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Schedule ---------- */}
        {show('schedule') && (
          <section className="pt-10">
            {sectionTitle(<CalendarDays size={17} />, S.schedule, S.scheduleSub)}
            {timeline.current.length + timeline.past.length === 0 ? (
              <div className="py-10 text-center rounded-3xl border border-dashed border-[#e5d6c0] dark:border-white/10 text-[14px] font-light text-[#9b8590]">{S.noEvents}</div>
            ) : (
              <div className="grid gap-2">
                {timeline.current.length === 0 && (
                  <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-[#efe4d2] dark:border-white/10 text-[14px] font-light text-[#7d6470] dark:text-slate-400"><CalendarDays size={18} className="text-[#D4AF37]" />{S.noNext}</div>
                )}
                {[...timeline.current, ...(showPast ? timeline.past : [])].map(({ ev, st }) => {
                  const a = parseDate(ev.rawStartDate);
                  const b = badge(st);
                  const hi = next?.ev.id === ev.id;
                  return (
                    <div key={ev.id} className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl border transition ${hi ? 'bg-white dark:bg-[#211019] border-[#D4AF37]/60' : 'bg-white/75 dark:bg-white/[0.03] border-[#efe4d2] dark:border-white/10'} ${st?.kind === 'past' ? 'opacity-65' : ''}`}>
                      <div className="w-[52px] shrink-0 text-center">
                        <span className="wl-latin block text-[24px] font-extrabold leading-none text-[#630330] dark:text-white tabular-nums">{a ? a.getDate() : '?'}</span>
                        <span className="text-[11.5px] text-[#a8862a]">{a ? fmt(a, { month: 'short' }) : '—'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-[#2a0a17] dark:text-white leading-snug break-words">{loc(ev.event)}</p>
                        <p className="text-[12.5px] font-light text-[#7d6470] dark:text-slate-400">{loc(ev.startDate)}{loc(ev.endDate) && loc(ev.endDate) !== loc(ev.startDate) ? ` ${S.to} ${loc(ev.endDate)}` : ''}</p>
                      </div>
                      {b && <span className={`hidden min-[420px]:inline-flex shrink-0 items-center h-7 px-2.5 rounded-full text-[12px] ${b.cls}`}>{b.text}</span>}
                    </div>
                  );
                })}
                {timeline.past.length > 0 && (
                  <button onClick={() => setShowPast(v => !v)} className="justify-self-start inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] text-[#7d6470] dark:text-slate-400 hover:bg-white dark:hover:bg-white/5">
                    <ChevronDown size={15} className={`transition-transform ${showPast ? 'rotate-180' : ''}`} />{showPast ? S.hidePast : S.showPast(timeline.past.length)}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* ---------- Documents ---------- */}
        {show('docs') && (
          <section className="pt-10">
            {sectionTitle(<FileText size={17} />, currentT.docHubTitle, S.docsSub)}
            <div className="grid md:grid-cols-2 gap-3">
              {[{ list: appForms, title: currentT.appForms }, { list: monitorForms, title: currentT.monitoringForms }].map(({ list, title }) => (
                <div key={title} className="rounded-3xl bg-white/85 dark:bg-white/[0.03] border border-[#efe4d2] dark:border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-[15px] font-medium text-[#2a0a17] dark:text-white">{title}</h3>
                    <span className="wl-latin text-[12px] font-semibold text-[#a8862a]">{list.length}</span>
                  </div>
                  {list.length ? list.map(form => (
                    <a key={form.id} href={form.url && !form.url.startsWith('PENDING') ? form.url : '#'} onClick={(e) => onFormClick(e, form)}
                      download={form.url?.startsWith('data:') ? `${loc(form.title)}.pdf` : undefined} target="_blank" rel="noopener noreferrer"
                      className="group flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#faf6ef] dark:hover:bg-white/5 transition">
                      <FileText size={17} className="shrink-0 text-[#a8862a]" />
                      <span className="flex-1 min-w-0 text-[14px] text-[#2a0a17] dark:text-slate-100 leading-snug">{loc(form.title)}</span>
                      <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#630330]/[0.07] dark:bg-white/5 text-[#630330] dark:text-[#e8cf7a] group-hover:bg-[#630330] group-hover:text-white transition"><Download size={15} /></span>
                    </a>
                  )) : <p className="px-2 py-5 text-center text-[13px] font-light text-[#9b8590]">{S.noForms}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Sites: open now vs. seniors' history ---------- */}
        {show('sites') && (
          <section className="pt-10">
            {sectionTitle(<Building2 size={17} />, currentT.internshipSites, S.sitesSub,
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#a8862a]" />
                <input type="search" placeholder={currentT.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-11 ps-10 pe-9 rounded-full bg-white dark:bg-white/5 border border-[#e5d6c0] dark:border-white/10 text-[14px] text-[#2a0a17] dark:text-white placeholder:text-[#a8949e] outline-none focus:border-[#630330] dark:focus:border-[#D4AF37] focus:ring-4 focus:ring-[#630330]/10 transition" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute end-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[#9b8590] hover:bg-[#faf6ef] dark:hover:bg-white/10" aria-label="clear"><X size={14} /></button>}
              </div>
            )}

            {/* Source switch: clearly different colour for each source */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                { id: 'open', label: S.srcOpen, n: openSites.length, icon: <Briefcase size={16} />, on: 'bg-[#630330] text-white border-[#630330]' },
                { id: 'senior', label: S.srcSenior, n: seniorList.length, icon: <Users size={16} />, on: 'bg-gradient-to-b from-[#f3dc93] to-[#d9b44c] text-[#2a0114] border-[#d9b44c]' },
                { id: 'all', label: S.srcAll, n: openSites.length + seniorList.length, icon: <Building2 size={16} />, on: 'bg-[#2a0a17] text-white border-[#2a0a17] dark:bg-white dark:text-[#2a0a17]' },
              ] as const).map(o => (
                <button key={o.id} onClick={() => setSource(o.id)}
                  className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-2xl border text-start transition ${source === o.id ? o.on : 'bg-white/80 dark:bg-white/[0.03] border-[#efe4d2] dark:border-white/10 text-[#6e5560] dark:text-slate-300 hover:border-[#D4AF37]'}`}>
                  <span className="hidden sm:flex w-8 h-8 shrink-0 rounded-lg bg-black/5 dark:bg-white/10 items-center justify-center">{o.icon}</span>
                  <span className="min-w-0">
                    <span className="wl-latin block text-[18px] font-extrabold leading-none tabular-nums">{o.n}</span>
                    <span className="block text-[12px] leading-tight mt-0.5 truncate">{o.label}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar mb-4 -mx-1 px-1">
              {majorChips.map(c => (
                <button key={c.id} onClick={() => setActiveMajor(c.id)}
                  className={`shrink-0 h-8 px-3.5 rounded-full text-[12.5px] transition flex items-center gap-1.5 ${activeMajor === c.id ? 'bg-[#630330] text-white' : 'bg-white/80 dark:bg-white/5 text-[#6e5560] dark:text-slate-300 border border-[#efe4d2] dark:border-white/10 hover:border-[#D4AF37]'}`}>
                  {c.dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}{c.label}
                </button>
              ))}
            </div>

            {source !== 'senior' && openSites.length > 0 && (
              <>
                {source === 'all' && <p className="mb-2 flex items-center gap-2 text-[13px] text-[#630330] dark:text-[#e8cf7a]"><Briefcase size={14} />{S.srcOpen} · {S.found(openSites.length)}</p>}
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {openSites.map(site => <InternshipCard key={site.id} site={site} lang={lang} />)}
                </div>
              </>
            )}

            {source !== 'open' && seniorList.length > 0 && (
              <>
                {source === 'all' && <p className="mb-2 flex items-center gap-2 text-[13px] text-[#8a6a14] dark:text-[#e8cf7a]"><Users size={14} />{S.srcSenior} · {S.found(seniorList.length)}</p>}
                <div className="grid sm:grid-cols-2 gap-3">
                  {seniorList.map(g => {
                    const link = g.site?.contactLink?.trim();
                    const href = link ? (/^https?:\/\//i.test(link) ? link : `https://${link}`) : undefined;
                    const isOpen = g.site?.status === 'active';
                    return (
                      <div key={g.key} className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#fbf3df] to-[#f5e6c2] dark:from-[#2a1d0c] dark:to-[#1f1408] border border-[#ead39a] dark:border-[#D4AF37]/25">
                        <div className="absolute -end-6 -top-6 w-28 h-28 rounded-full border-[10px] border-[#D4AF37]/15" aria-hidden="true" />
                        <div className="relative flex items-start gap-3">
                          <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/80 dark:bg-white/10 flex flex-col items-center justify-center">
                            <span className="wl-latin text-[22px] font-extrabold leading-none text-[#8a6a14] dark:text-[#e8cf7a]">{g.count || '–'}</span>
                            <Users size={12} className="mt-0.5 text-[#a8862a]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] text-[#8a6a14] dark:text-[#e8cf7a]">{g.count ? S.seniors(g.count) : S.seniorWent}</p>
                            <h3 className="text-[16.5px] font-medium leading-snug text-[#2a0a17] dark:text-white break-words">{g.name}</h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {g.majors.map(m => <span key={m} className={`w-2 h-2 rounded-full ${MAJOR_DOT[m] || 'bg-slate-400'}`} />)}
                              {g.intern > 0 && <span className="text-[11.5px] px-2 h-5 inline-flex items-center rounded-full bg-white/70 dark:bg-white/10 text-[#6e5560] dark:text-slate-300">{S.intern} {g.intern}</span>}
                              {g.coop > 0 && <span className="text-[11.5px] px-2 h-5 inline-flex items-center rounded-full bg-white/70 dark:bg-white/10 text-[#6e5560] dark:text-slate-300">{S.coop} {g.coop}</span>}
                              {isOpen && <span className="text-[11.5px] px-2 h-5 inline-flex items-center gap-1 rounded-full bg-[#630330] text-white"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{S.alsoOpen}</span>}
                            </div>
                          </div>
                        </div>
                        {g.positions.length > 0 && (
                          <div className="relative mt-3">
                            <p className="text-[11.5px] text-[#a8862a] mb-1">{S.positions}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {g.positions.slice(0, 4).map(p => <span key={p} className="inline-flex items-center gap-1 text-[12.5px] px-2.5 h-7 rounded-full bg-white/80 dark:bg-white/10 text-[#630330] dark:text-[#e8cf7a]"><GraduationCap size={12} />{p}</span>)}
                              {g.positions.length > 4 && <span className="text-[12px] px-2 h-7 inline-flex items-center text-[#8a6a14]">+{g.positions.length - 4}</span>}
                            </div>
                          </div>
                        )}
                        <div className="relative mt-3 flex items-center justify-between gap-2">
                          {g.years.length > 0 ? <span className="text-[12px] text-[#7d6470] dark:text-slate-400">{S.years} <span className="wl-latin font-semibold text-[#8a6a14] dark:text-[#e8cf7a]">{g.years.join(' · ')}</span></span> : <span />}
                          {href && <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] text-[#630330] dark:text-[#e8cf7a] hover:underline">{S.website}<ExternalLink size={12} /></a>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-light text-[#9b8590]"><Info size={13} />{S.seniorNote}</p>
              </>
            )}

            {((source === 'open' && !openSites.length) || (source === 'senior' && !seniorList.length) || (source === 'all' && !openSites.length && !seniorList.length)) && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-3xl border border-dashed border-[#e5d6c0] dark:border-white/10">
                <Info size={24} className="text-[#D4AF37]" />
                <p className="text-[14px] font-light text-[#9b8590]">{S.noSites}</p>
                {(searchTerm || activeMajor !== 'all') && <button onClick={() => { setSearchTerm(''); setActiveMajor('all'); }} className="h-9 px-4 rounded-full bg-[#630330] text-white text-[13px]">{S.clear}</button>}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default StudentPortal;

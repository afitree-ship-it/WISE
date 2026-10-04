import React, { useEffect, useMemo, useState } from 'react';
import { Language, Major, InternshipSite, DocumentForm, FormCategory, ScheduleEvent, LocalizedString, Translation } from '../types';
import InternshipCard from './InternshipCard';
import { localize } from '../localize';
import { CalendarDays, FileText, Download, Search, Building2, ArrowRight, ChevronDown, X, Info, ClipboardCheck, FilePen } from 'lucide-react';

export const PORTAL_SECTIONS = ['wp-schedule', 'wp-docs', 'wp-sites'] as const;

/** Tracks which portal section is currently in view (for the header nav). */
export const useActiveSection = (enabled: boolean) => {
  const [active, setActive] = useState<string>(PORTAL_SECTIONS[0]);
  useEffect(() => {
    if (!enabled) return;
    const els = PORTAL_SECTIONS.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-35% 0px -55% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [enabled]);
  return active;
};

export const scrollToSection = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const STRINGS = {
  [Language.TH]: {
    eyebrow: 'หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน',
    intro: 'กำหนดการ เอกสาร และสถานประกอบการสำหรับการฝึกงานและสหกิจศึกษา รวมไว้ในที่เดียว',
    navSchedule: 'กำหนดการ', navDocs: 'เอกสาร', navSites: 'สถานประกอบการ',
    events: 'กำหนดการใหม่', files: 'แบบฟอร์ม', sites: 'สถานประกอบการ',
    nextUp: 'กำหนดการถัดไป', noNext: 'ยังไม่มีกำหนดการใหม่', allSchedule: 'ดูกำหนดการทั้งหมด',
    today: 'วันนี้', inDays: (n: number) => `อีก ${n} วัน`, ongoing: 'กำลังดำเนินการ', past: 'ผ่านไปแล้ว', upcoming: 'ใกล้ถึง',
    scheduleSub: 'วันสำคัญและกำหนดส่งเอกสาร', docsSub: 'ดาวน์โหลดแบบฟอร์มที่ต้องใช้ในแต่ละขั้นตอน', sitesSub: 'ค้นหาสถานที่ฝึกที่เหมาะกับสาขาของคุณ',
    noEvents: 'ยังไม่มีกำหนดการ', noForms: 'ยังไม่มีเอกสารในหมวดนี้', noSites: 'ไม่พบสถานประกอบการที่ค้นหา', clear: 'ล้างตัวกรอง',
    showPast: (n: number) => `แสดงกำหนดการที่ผ่านมาแล้ว (${n})`, hidePast: 'ซ่อนกำหนดการที่ผ่านมาแล้ว',
    processing: 'ระบบกำลังประมวลผลไฟล์เอกสาร กรุณาลองใหม่ภายหลัง', found: (n: number) => `${n} แห่ง`, to: 'ถึง',
  },
  [Language.EN]: {
    eyebrow: 'Work-Integrated Science Education Unit',
    intro: 'Schedules, documents and placement sites for internship and co-op, all in one place.',
    navSchedule: 'Schedule', navDocs: 'Documents', navSites: 'Sites',
    events: 'Upcoming', files: 'Forms', sites: 'Sites',
    nextUp: 'Next up', noNext: 'No upcoming dates yet', allSchedule: 'See full schedule',
    today: 'Today', inDays: (n: number) => `in ${n} days`, ongoing: 'Ongoing', past: 'Past', upcoming: 'Upcoming',
    scheduleSub: 'Key dates and document deadlines', docsSub: 'Download the forms you need at each step', sitesSub: 'Find a placement that fits your major',
    noEvents: 'No events scheduled', noForms: 'No documents in this category yet', noSites: 'No sites match your search', clear: 'Clear filters',
    showPast: (n: number) => `Show past dates (${n})`, hidePast: 'Hide past dates',
    processing: 'This document is still being processed. Please try again later.', found: (n: number) => `${n} sites`, to: 'to',
  },
  [Language.AR]: {
    eyebrow: 'وحدة تعليم العلوم المتكامل مع العمل',
    intro: 'المواعيد والنماذج وجهات التدريب الميداني والتعليم التعاوني في مكان واحد.',
    navSchedule: 'المواعيد', navDocs: 'النماذج', navSites: 'جهات التدريب',
    events: 'مواعيد قادمة', files: 'نماذج', sites: 'جهات تدريب',
    nextUp: 'الموعد القادم', noNext: 'لا توجد مواعيد قادمة', allSchedule: 'عرض جميع المواعيد',
    today: 'اليوم', inDays: (n: number) => `بعد ${n} يوم`, ongoing: 'جارٍ', past: 'انتهى', upcoming: 'قريبًا',
    scheduleSub: 'التواريخ المهمة ومواعيد تسليم الوثائق', docsSub: 'حمّل النماذج المطلوبة في كل مرحلة', sitesSub: 'ابحث عن جهة تدريب تناسب تخصصك',
    noEvents: 'لا توجد مواعيد', noForms: 'لا توجد نماذج في هذا القسم', noSites: 'لا توجد نتائج مطابقة', clear: 'مسح عوامل التصفية',
    showPast: (n: number) => `عرض المواعيد السابقة (${n})`, hidePast: 'إخفاء المواعيد السابقة',
    processing: 'جارٍ تجهيز الملف، يرجى المحاولة لاحقًا.', found: (n: number) => `${n} جهة`, to: 'إلى',
  },
  [Language.MS]: {
    eyebrow: 'Unit Pendidikan Sains Bersepadu Kerja',
    intro: 'Jadual, dokumen dan tempat latihan untuk latihan industri dan ko-op, semuanya di satu tempat.',
    navSchedule: 'Jadual', navDocs: 'Dokumen', navSites: 'Tempat latihan',
    events: 'Akan datang', files: 'Borang', sites: 'Tempat latihan',
    nextUp: 'Seterusnya', noNext: 'Tiada tarikh akan datang', allSchedule: 'Lihat jadual penuh',
    today: 'Hari ini', inDays: (n: number) => `${n} hari lagi`, ongoing: 'Sedang berjalan', past: 'Telah lepas', upcoming: 'Akan datang',
    scheduleSub: 'Tarikh penting dan tarikh akhir dokumen', docsSub: 'Muat turun borang yang diperlukan', sitesSub: 'Cari tempat latihan yang sesuai dengan jurusan anda',
    noEvents: 'Tiada acara dijadualkan', noForms: 'Tiada dokumen dalam kategori ini', noSites: 'Tiada tempat latihan sepadan', clear: 'Kosongkan penapis',
    showPast: (n: number) => `Tunjuk tarikh lepas (${n})`, hidePast: 'Sembunyi tarikh lepas',
    processing: 'Dokumen sedang diproses. Sila cuba lagi kemudian.', found: (n: number) => `${n} tempat`, to: 'hingga',
  },
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

interface StudentPortalProps {
  lang: Language;
  currentT: Translation;
  isRtl: boolean;
  sites: InternshipSite[];
  schedules: ScheduleEvent[];
  forms: DocumentForm[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeMajor: Major | 'all';
  setActiveMajor: (m: Major | 'all') => void;
  majorChips: { id: Major | 'all'; label: string; dot?: string }[];
}

const StudentPortal: React.FC<StudentPortalProps> = ({
  lang, currentT, isRtl, sites, schedules, forms, searchTerm, setSearchTerm, activeMajor, setActiveMajor, majorChips,
}) => {
  const S = STRINGS[lang] || STRINGS[Language.TH];
  const loc = (l?: LocalizedString) => localize(l, lang);
  const locale = lang === Language.TH ? 'th-TH' : lang === Language.AR ? 'ar' : lang === Language.MS ? 'ms-MY' : 'en-GB';
  const [showPast, setShowPast] = useState(false);

  const timeline = useMemo(() => {
    const items = [...schedules]
      .sort((a, b) => (a.rawStartDate || '').localeCompare(b.rawStartDate || ''))
      .map(ev => ({ ev, st: eventState(ev) }));
    return {
      current: items.filter(i => i.st?.kind !== 'past'),
      past: items.filter(i => i.st?.kind === 'past').reverse(),
    };
  }, [schedules]);
  const next = timeline.current.find(i => i.st);

  const filteredSites = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sites.filter(s => {
      if (activeMajor !== 'all' && s.major !== activeMajor) return false;
      if (!q) return true;
      return [loc(s.name), loc(s.position), loc(s.location)].some(v => v.toLowerCase().includes(q));
    });
  }, [sites, searchTerm, activeMajor, lang]);
  const openSites = sites.filter(s => s.status === 'active').length;

  const stateLabel = (st: EventState | null) => {
    if (!st) return null;
    if (st.kind === 'past') return { text: S.past, cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400' };
    if (st.kind === 'ongoing') return { text: S.ongoing, cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' };
    return { text: st.days === 0 ? S.today : S.inDays(st.days), cls: st.days <= 7 ? 'bg-[#D4AF37]/15 text-[#8a6a14] dark:text-[#e8cf7a]' : 'bg-[#630330]/[0.06] text-[#630330] dark:bg-white/5 dark:text-[#e8cf7a]' };
  };

  const fmt = (d: Date | null, opts: Intl.DateTimeFormatOptions) => (d ? d.toLocaleDateString(locale, opts) : '');

  const sectionHead = (icon: React.ReactNode, title: string, sub: string, right?: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-[22px] sm:text-[26px] font-medium text-[#2a0a17] dark:text-white leading-tight">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-[#630330] text-[#e8cf7a] flex items-center justify-center">{icon}</span>
          {title}
        </h2>
        <p className="mt-1.5 text-[14px] font-light text-[#7d6470] dark:text-slate-400">{sub}</p>
      </div>
      {right}
    </div>
  );

  const renderEvent = ({ ev, st }: { ev: ScheduleEvent; st: EventState | null }, highlight: boolean) => {
    const a = parseDate(ev.rawStartDate);
    const badge = stateLabel(st);
    const muted = st?.kind === 'past';
    return (
      <li key={ev.id} className={`flex items-center gap-3.5 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition ${
        highlight
          ? 'bg-white dark:bg-[#211019] border-[#D4AF37]/60 shadow-[0_14px_30px_-20px_rgba(99,3,48,0.45)]'
          : 'bg-white/70 dark:bg-white/[0.03] border-[#efe4d2] dark:border-white/10'
      } ${muted ? 'opacity-70' : ''}`}>
        <div className={`w-14 shrink-0 rounded-xl overflow-hidden text-center ${highlight ? 'bg-[#630330] text-white' : 'bg-[#faf6ef] dark:bg-white/5 text-[#630330] dark:text-[#e8cf7a] ring-1 ring-inset ring-[#efe4d2] dark:ring-white/10'}`}>
          <div className={`text-[10.5px] py-0.5 ${highlight ? 'bg-[#D4AF37] text-[#2a0114] font-medium' : 'text-[#a8862a]'}`}>{a ? fmt(a, { month: 'short' }) : '—'}</div>
          <div className="wl-latin text-[22px] font-extrabold leading-8 tabular-nums">{a ? a.getDate() : '?'}</div>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[15px] sm:text-base font-medium text-[#2a0a17] dark:text-white leading-snug break-words">{loc(ev.event)}</h4>
          <p className="mt-0.5 text-[12.5px] font-light text-[#7d6470] dark:text-slate-400">
            {loc(ev.startDate)}{loc(ev.endDate) && loc(ev.endDate) !== loc(ev.startDate) ? ` ${S.to} ${loc(ev.endDate)}` : ''}
          </p>
        </div>
        {badge && <span className={`hidden min-[420px]:inline-flex shrink-0 items-center h-7 px-2.5 rounded-full text-[12px] font-medium ${badge.cls}`}>{badge.text}</span>}
      </li>
    );
  };

  const onFormClick = (e: React.MouseEvent, form: DocumentForm) => {
    if (!form.url || form.url === '#' || form.url.startsWith('PENDING')) {
      e.preventDefault();
      alert(S.processing);
    }
  };

  const formGroup = (cat: FormCategory, title: string, icon: React.ReactNode) => {
    const list = forms.filter(f => f.category === cat);
    return (
      <div className="rounded-3xl bg-white/80 dark:bg-white/[0.03] border border-[#efe4d2] dark:border-white/10 p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 text-[#a8862a] dark:text-[#e8cf7a] flex items-center justify-center">{icon}</span>
          <h3 className="text-[15px] font-medium text-[#2a0a17] dark:text-white">{title}</h3>
          <span className="wl-latin ms-auto text-[12px] font-semibold text-[#a8862a]">{list.length}</span>
        </div>
        {list.length ? (
          <div className="grid gap-1.5">
            {list.map(form => (
              <a
                key={form.id}
                href={form.url && !form.url.startsWith('PENDING') ? form.url : '#'}
                onClick={(e) => onFormClick(e, form)}
                download={form.url?.startsWith('data:') ? `${loc(form.title)}.pdf` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#faf6ef] dark:hover:bg-white/5 transition"
              >
                <FileText size={17} className="shrink-0 text-[#630330]/50 dark:text-[#e8cf7a]/60" />
                <span className="flex-1 min-w-0 text-[14px] text-[#2a0a17] dark:text-slate-100 leading-snug">{loc(form.title)}</span>
                <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#630330] dark:text-[#e8cf7a] bg-[#630330]/[0.06] dark:bg-white/5 group-hover:bg-[#630330] group-hover:text-white transition">
                  <Download size={15} />
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-[13px] font-light text-[#9b8590]">{S.noForms}</p>
        )}
      </div>
    );
  };

  const nextDate = next ? parseDate(next.st?.kind === 'ongoing' ? next.ev.rawEndDate || next.ev.rawStartDate : next.ev.rawStartDate) : null;
  const nextBadge = next ? stateLabel(next.st) : null;

  const tiles = [
    { id: 'wp-schedule', icon: <CalendarDays size={18} />, n: timeline.current.length, label: S.events },
    { id: 'wp-docs', icon: <FileText size={18} />, n: forms.length, label: S.files },
    { id: 'wp-sites', icon: <Building2 size={18} />, n: sites.length, label: S.sites },
  ];

  return (
    <main className="wp relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 pb-16 flex-grow">
      {/* Hero */}
      <section className="pt-8 sm:pt-12 grid lg:grid-cols-[1.25fr_0.75fr] gap-6 lg:gap-10 items-stretch">
        <div className="wise-rise min-w-0 flex flex-col justify-center">
          <p className="flex items-center gap-2.5 text-[12.5px] sm:text-[13px] text-[#a8862a]">
            <span className="w-7 h-px bg-[#D4AF37] shrink-0" />
            <span className="truncate">{S.eyebrow}</span>
          </p>
          <h1 className="mt-3 text-[32px] sm:text-[44px] font-medium leading-[1.2] text-[#2a0a17] dark:text-white [text-wrap:balance]">
            {currentT.landingHeading}<span className="text-[#D4AF37]">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] sm:text-[16px] font-light leading-relaxed text-[#7d6470] dark:text-slate-400">{S.intro}</p>
          <div className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-3 max-w-xl">
            {tiles.map(t => (
              <button
                key={t.id}
                onClick={() => scrollToSection(t.id)}
                className="group text-start p-3 sm:p-4 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-[#efe4d2] dark:border-white/10 hover:border-[#D4AF37] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-22px_rgba(99,3,48,0.5)] transition"
              >
                <span className="w-8 h-8 rounded-lg bg-[#630330]/[0.07] dark:bg-white/5 text-[#630330] dark:text-[#e8cf7a] flex items-center justify-center group-hover:bg-[#630330] group-hover:text-[#e8cf7a] transition">{t.icon}</span>
                <span className="wl-latin block mt-2.5 text-[24px] sm:text-[28px] font-extrabold leading-none text-[#630330] dark:text-white tabular-nums">{t.n}</span>
                <span className="block mt-1 text-[12px] sm:text-[13px] font-light text-[#7d6470] dark:text-slate-400 leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Next-up arch card */}
        <div className="wise-rise relative min-h-[240px] sm:min-h-[300px] rounded-t-[160px] rounded-b-[28px] bg-[#630330] text-white overflow-hidden shadow-[0_40px_70px_-35px_rgba(99,3,48,0.7)]" style={{ animationDelay: '150ms' }}>
          <div className="wl-pattern opacity-[0.18]" />
          <div className="absolute inset-x-4 top-4 bottom-0 rounded-t-[150px] border border-[#e8cf7a]/40" />
          <div className="absolute w-[420px] h-[420px] left-1/2 -top-[200px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.45),transparent_62%)]" />
          <div className="relative h-full flex flex-col items-center justify-end text-center px-6 pt-14 sm:pt-20 pb-6">
            <span className="text-[12.5px] text-[#e8cf7a]">{S.nextUp}</span>
            {next && nextDate ? (
              <>
                <span className="wl-latin mt-2 text-[56px] font-extrabold leading-none tabular-nums">{nextDate.getDate()}</span>
                <span className="mt-1 text-[15px] text-white/80">{fmt(nextDate, { month: 'long', year: 'numeric' })}</span>
                <p className="mt-3 text-[16px] font-medium leading-snug line-clamp-2 [text-wrap:balance]">{loc(next.ev.event)}</p>
                {nextBadge && <span className="mt-3 inline-flex items-center h-7 px-3 rounded-full bg-[#D4AF37] text-[#2a0114] text-[12.5px] font-medium">{nextBadge.text}</span>}
              </>
            ) : (
              <p className="mt-3 mb-6 text-[15px] font-light text-white/75">{S.noNext}</p>
            )}
            <button onClick={() => scrollToSection('wp-schedule')} className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-white/75 hover:text-white transition">
              {S.allSchedule} <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section id="wp-schedule" className="scroll-mt-24 pt-14 sm:pt-16">
        {sectionHead(<CalendarDays size={18} />, currentT.schedule, S.scheduleSub)}
        {timeline.current.length + timeline.past.length === 0 ? (
          <div className="py-12 text-center rounded-3xl border border-dashed border-[#e5d6c0] dark:border-white/10 text-[14px] font-light text-[#9b8590]">{S.noEvents}</div>
        ) : (
          <>
            {timeline.current.length === 0 && (
              <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-[#efe4d2] dark:border-white/10 text-[14px] font-light text-[#7d6470] dark:text-slate-400">
                <CalendarDays size={18} className="shrink-0 text-[#D4AF37]" /> {S.noNext}
              </div>
            )}
            <ul className="grid gap-2.5 empty:hidden">
              {timeline.current.map(i => renderEvent(i, i === next))}
              {showPast && timeline.past.map(i => renderEvent(i, false))}
            </ul>
            {timeline.past.length > 0 && (
              <button onClick={() => setShowPast(v => !v)} className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] text-[#7d6470] dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 transition">
                <ChevronDown size={15} className={`transition-transform ${showPast ? 'rotate-180' : ''}`} />
                {showPast ? S.hidePast : S.showPast(timeline.past.length)}
              </button>
            )}
          </>
        )}
      </section>

      {/* Documents */}
      <section id="wp-docs" className="scroll-mt-24 pt-14 sm:pt-16">
        {sectionHead(<FileText size={18} />, currentT.docHubTitle, S.docsSub)}
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
          {formGroup(FormCategory.APPLICATION, currentT.appForms, <FilePen size={16} />)}
          {formGroup(FormCategory.MONITORING, currentT.monitoringForms, <ClipboardCheck size={16} />)}
        </div>
      </section>

      {/* Sites */}
      <section id="wp-sites" className="scroll-mt-24 pt-14 sm:pt-16">
        {sectionHead(
          <Building2 size={18} />,
          currentT.internshipSites,
          `${S.sitesSub} · ${currentT.activeSites} ${openSites}`,
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#a8862a]" />
            <input
              type="search"
              placeholder={currentT.searchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-11 ps-10 pe-9 rounded-full bg-white dark:bg-white/5 border border-[#e5d6c0] dark:border-white/10 text-[14px] text-[#2a0a17] dark:text-white placeholder:text-[#a8949e] outline-none focus:border-[#630330] dark:focus:border-[#D4AF37] focus:ring-4 focus:ring-[#630330]/10 transition"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute end-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[#9b8590] hover:bg-[#faf6ef] dark:hover:bg-white/10" aria-label="clear">
                <X size={14} />
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar mb-5 -mx-1 px-1">
          {majorChips.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveMajor(c.id)}
              className={`shrink-0 h-9 px-4 rounded-full text-[13px] transition flex items-center gap-2 ${
                activeMajor === c.id
                  ? 'bg-[#630330] text-white shadow-[0_8px_18px_-10px_rgba(99,3,48,0.7)]'
                  : 'bg-white/80 dark:bg-white/5 text-[#6e5560] dark:text-slate-300 border border-[#efe4d2] dark:border-white/10 hover:border-[#D4AF37]'
              }`}
            >
              {c.dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}
              {c.label}
            </button>
          ))}
          <span className="ms-auto shrink-0 ps-3 text-[12.5px] font-light text-[#9b8590]">{S.found(filteredSites.length)}</span>
        </div>
        {filteredSites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredSites.map(site => <InternshipCard key={site.id} site={site} lang={lang} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-14 rounded-3xl border border-dashed border-[#e5d6c0] dark:border-white/10">
            <Info size={26} className="text-[#D4AF37]" />
            <p className="text-[14px] font-light text-[#9b8590]">{S.noSites}</p>
            {(searchTerm || activeMajor !== 'all') && (
              <button onClick={() => { setSearchTerm(''); setActiveMajor('all'); }} className="h-9 px-4 rounded-full bg-[#630330] text-white text-[13px]">{S.clear}</button>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default StudentPortal;

export const PORTAL_NAV = (lang: Language) => {
  const S = STRINGS[lang] || STRINGS[Language.TH];
  return [
    { id: 'wp-schedule', label: S.navSchedule },
    { id: 'wp-docs', label: S.navDocs },
    { id: 'wp-sites', label: S.navSites },
  ];
};

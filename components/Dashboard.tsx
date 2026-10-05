import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  Users, CheckCircle2, UserCheck, Activity, Building2, CalendarDays, AlertCircle, Clock, CalendarX, ChevronRight, MapPin, Briefcase, GraduationCap
} from 'lucide-react';
import { StudentStatusRecord, ApplicationStatus, Major, InternshipType, ScheduleEvent, LocalizedString, Language } from '../types';
import { localize } from '../localize';
import { STATUS_META, STATUS_ORDER, MAJOR_META, MAJOR_LIST, TYPE_META, TYPE_LIST, TypeIcon, Segmented, selectCls, card } from './admin/ui';
import { parseISO, formatTH, TH_MONTHS_SHORT } from './admin/DatePicker';

export interface DashboardFilters {
  years: string[];
  terms: string[];
  majors: string[];
}

interface DashboardProps {
  students: StudentStatusRecord[];
  schedules?: ScheduleEvent[];
  mode: 'admin' | 'public';
  filters: DashboardFilters;
  onFiltersChange: (f: DashboardFilters) => void;
  onOpenStudent?: (s: StudentStatusRecord) => void;
}

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

const useTooltip = () => {
  const [tip, setTip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const show = useCallback((e: React.MouseEvent, content: React.ReactNode) => setTip({ x: e.clientX, y: e.clientY, content }), []);
  const hide = useCallback(() => setTip(null), []);
  const node = tip ? (
    <div
      className="fixed z-[500] pointer-events-none px-3 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs shadow-xl"
      style={{ left: Math.min(tip.x + 14, window.innerWidth - 220), top: tip.y + 14 }}
    >
      {tip.content}
    </div>
  ) : null;
  return { show, hide, node };
};

const TipRow: React.FC<{ color?: string; label: string; value: React.ReactNode }> = ({ color, label, value }) => (
  <div className="flex items-center gap-2 whitespace-nowrap">
    {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}
    <span className="opacity-80">{label}</span>
    <span className="ml-auto pl-3 font-semibold tabular-nums">{value}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const Panel: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ title, subtitle, right, className = '', children }) => (
  <section className={`${card} p-5 ${className}`}>
    <header className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </header>
    {children}
  </section>
);

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string; className?: string }> = ({ icon, label, value, sub, accent = 'text-slate-900 dark:text-white', className = '' }) => (
  <div className={`${card} p-4 sm:p-5 ${className}`}>
    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
      <span className="text-xs font-medium">{label}</span>
      <span className="text-slate-400">{icon}</span>
    </div>
    <div className={`mt-2 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${accent}`}>{value}</div>
    {sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
  </div>
);

const Section: React.FC<{ n: number; title: string; hint?: string; children: React.ReactNode }> = ({ n, title, hint, children }) => (
  <section className="space-y-3">
    <h2 className="flex items-center gap-2.5">
      <span className="w-6 h-6 shrink-0 rounded-md bg-[#630330] text-white dark:bg-amber-400 dark:text-slate-900 text-xs font-bold flex items-center justify-center tabular-nums">{n}</span>
      <span className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</span>
      {hint && <span className="hidden sm:inline text-xs text-slate-400">{hint}</span>}
      <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
    </h2>
    {children}
  </section>
);

const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);

const getLocalized = (l?: LocalizedString) => localize(l, Language.TH);

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

const Donut: React.FC<{ data: { key: string; label: string; value: number; color: string }[]; total: number; tip: ReturnType<typeof useTooltip> }> = ({ data, total, tip }) => {
  const R = 52, C = 2 * Math.PI * R, GAP = total > 0 && data.filter(d => d.value > 0).length > 1 ? 2.5 : 0;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0 -rotate-90">
      <circle cx="70" cy="70" r={R} fill="none" strokeWidth="16" className="stroke-slate-100 dark:stroke-slate-800" />
      {total > 0 && data.map(d => {
        const len = (d.value / total) * C;
        const seg = (
          <circle
            key={d.key}
            cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth="16"
            strokeDasharray={`${Math.max(len - GAP, 0)} ${C}`}
            strokeDashoffset={-offset}
            className="transition-[stroke-width] hover:[stroke-width:20] cursor-default"
            onMouseMove={(e) => tip.show(e, <TipRow color={d.color} label={d.label} value={`${d.value} คน · ${pct(d.value, total)}%`} />)}
            onMouseLeave={tip.hide}
          />
        );
        offset += len;
        return seg;
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const Dashboard: React.FC<DashboardProps> = ({ students, schedules = [], mode, filters, onFiltersChange, onOpenStudent }) => {
  const tip = useTooltip();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [openAttn, setOpenAttn] = useState<string | null>(null);

  const yearOptions = useMemo(
    () => Array.from(new Set(students.map(s => String(s.academicYear || '').trim()).filter(y => /^\d+$/.test(y)))).sort((a, b) => b.localeCompare(a)),
    [students]
  );

  const scoped = useMemo(() => students.filter(s => {
    const y = String(s.academicYear || '').trim();
    const t = String(s.term || '').trim();
    return (filters.years.length === 0 || filters.years.includes(y))
      && (filters.terms.length === 0 || filters.terms.includes(t))
      && (filters.majors.length === 0 || filters.majors.includes(s.major));
  }), [students, filters]);

  const d = useMemo(() => {
    const total = scoped.length;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const byStatus: Record<string, number> = {};
    const byMajor: Record<string, Record<string, number>> = {};
    const byType: Record<string, number> = {};
    const typeAccepted: Record<string, number> = {}, typeActive: Record<string, number> = {};
    const typeByMajor: Record<string, Record<string, number>> = {};
    const typeLocations: Record<string, Record<string, number>> = {};
    const locations: Record<string, number> = {};
    const supervisors: Record<string, number> = {};
    const months: Record<string, number> = {};
    let withSup = 0, active = 0;
    scoped.forEach(s => {
      const st = s.status || ApplicationStatus.PENDING;
      byStatus[st] = (byStatus[st] || 0) + 1;
      byMajor[s.major] = byMajor[s.major] || {};
      byMajor[s.major][st] = (byMajor[s.major][st] || 0) + 1;
      const ty = s.internshipType === InternshipType.COOP ? InternshipType.COOP : InternshipType.INTERNSHIP;
      byType[ty] = (byType[ty] || 0) + 1;
      if (st === ApplicationStatus.ACCEPTED) typeAccepted[ty] = (typeAccepted[ty] || 0) + 1;
      typeByMajor[ty] = typeByMajor[ty] || {};
      typeByMajor[ty][s.major] = (typeByMajor[ty][s.major] || 0) + 1;
      if (s.location && s.location.trim()) { typeLocations[ty] = typeLocations[ty] || {}; typeLocations[ty][s.location.trim()] = 1; }
      if (s.location) locations[s.location.trim()] = (locations[s.location.trim()] || 0) + 1;
      if (s.supervisor && s.supervisor.trim()) { withSup++; supervisors[s.supervisor.trim()] = (supervisors[s.supervisor.trim()] || 0) + 1; }
      const a = parseISO(s.startDate), b = parseISO(s.endDate);
      if (a) {
        const k = `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}`;
        months[k] = (months[k] || 0) + 1;
        if (a <= today && (!b || b >= today) && st === ApplicationStatus.ACCEPTED) { active++; typeActive[ty] = (typeActive[ty] || 0) + 1; }
      }
    });
    const accepted = byStatus[ApplicationStatus.ACCEPTED] || 0;
    const topLocations = Object.entries(locations).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topSupervisors = Object.entries(supervisors).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const monthKeys = Object.keys(months).sort();
    // Fill gaps between first and last month so the time axis is continuous
    const timeline: { key: string; label: string; value: number }[] = [];
    if (monthKeys.length) {
      const [fy, fm] = monthKeys[0].split('-').map(Number);
      const [ly, lm] = monthKeys[monthKeys.length - 1].split('-').map(Number);
      for (let y = fy, m = fm; y < ly || (y === ly && m <= lm); m++) {
        if (m > 12) { m = 1; y++; if (y > ly) break; }
        const k = `${y}-${String(m).padStart(2, '0')}`;
        timeline.push({ key: k, label: `${TH_MONTHS_SHORT[m - 1]} ${String(y + 543).slice(2)}`, value: months[k] || 0 });
        if (timeline.length > 24) break;
      }
    }
    const distinctLocations = Object.keys(locations).length;

    // Needs attention (admin)
    const staleCutoff = Date.now() - 14 * 86400000;
    const noSupervisor = scoped.filter(s => s.status === ApplicationStatus.ACCEPTED && !(s.supervisor && s.supervisor.trim()));
    const stalePending = scoped.filter(s => (s.status === ApplicationStatus.PENDING || !s.status) && (s.lastUpdated || 0) < staleCutoff);
    const noDates = scoped.filter(s => s.status === ApplicationStatus.ACCEPTED && !s.startDate);

    return { total, byStatus, byMajor, byType, typeAccepted, typeActive, typeByMajor, typeLocations, accepted, withSup, active, topLocations, topSupervisors, timeline, distinctLocations, noSupervisor, stalePending, noDates };
  }, [scoped]);

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...schedules]
      .filter(s => !s.rawEndDate || s.rawEndDate >= today)
      .sort((a, b) => (a.rawStartDate || '').localeCompare(b.rawStartDate || ''))
      .slice(0, 5);
  }, [schedules]);

  const toggle = (key: keyof DashboardFilters, v: string) => {
    const cur = filters[key];
    onFiltersChange({ ...filters, [key]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  };

  const statusData = STATUS_ORDER.map(st => ({ key: st, label: STATUS_META[st].label, value: d.byStatus[st] || 0, color: STATUS_META[st].hex }));
  const maxMajor = Math.max(1, ...MAJOR_LIST.map(m => Object.values(d.byMajor[m] || {}).reduce((a, b) => a + b, 0)));
  const maxMonth = Math.max(1, ...d.timeline.map(t => t.value));
  const maxLoc = Math.max(1, ...d.topLocations.map(l => l[1]));
  const maxSup = Math.max(1, ...d.topSupervisors.map(l => l[1]));

  const chip = (active: boolean) =>
    `shrink-0 h-8 px-3 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`;

  const typeTotal = TYPE_LIST.reduce((n, t) => n + (d.byType[t] || 0), 0);
  const attention = [
    { key: 'sup', icon: <UserCheck size={16} />, label: 'ตอบรับแล้ว แต่ยังไม่มีอาจารย์นิเทศ', list: d.noSupervisor, tone: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30' },
    { key: 'stale', icon: <Clock size={16} />, label: 'รอตรวจสอบนานเกิน 14 วัน', list: d.stalePending, tone: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/30' },
    { key: 'dates', icon: <CalendarX size={16} />, label: 'ตอบรับแล้ว แต่ยังไม่ระบุวันฝึก', list: d.noDates, tone: 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-500/10 dark:border-sky-500/30' },
  ];
  const openList = attention.find(a => a.key === openAttn);
  const n0 = mode === 'admin' ? 1 : 0;

  return (
    <div ref={wrapRef} className="space-y-7">
      {tip.node}

      {/* Filters */}
      <div className={`${card} p-3 flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3`}>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 lg:pl-1">แสดงข้อมูลของ</span>
        <div className="relative w-full sm:w-48">
          <select
            value={filters.years.length === 1 ? filters.years[0] : filters.years.length === 0 ? 'all' : 'multi'}
            onChange={(e) => onFiltersChange({ ...filters, years: e.target.value === 'all' ? [] : [e.target.value] })}
            className={selectCls}
            aria-label="ปีการศึกษา"
          >
            <option value="all">ทุกปีการศึกษา</option>
            {filters.years.length > 1 && <option value="multi">{filters.years.join(', ')}</option>}
            {yearOptions.map(y => <option key={y} value={y}>ปีการศึกษา {y}</option>)}
          </select>
          <ChevronRight size={15} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
        </div>
        <Segmented
          value={filters.terms.length === 1 ? filters.terms[0] : 'all'}
          onChange={(v) => onFiltersChange({ ...filters, terms: v === 'all' ? [] : [v] })}
          className="h-10"
          options={[{ value: 'all', label: 'ทุกเทอม' }, { value: '1', label: 'เทอม 1' }, { value: '2', label: 'เทอม 2' }]}
        />
        <div className="flex flex-wrap gap-1.5">
          <button className={chip(filters.majors.length === 0)} onClick={() => onFiltersChange({ ...filters, majors: [] })}>ทุกสาขา</button>
          {MAJOR_LIST.map(m => (
            <button key={m} className={chip(filters.majors.includes(m))} onClick={() => toggle('majors', m)} title={MAJOR_META[m].full}>
              <span className={`w-2 h-2 rounded-full ${MAJOR_META[m].dot}`} />{MAJOR_META[m].short}
            </button>
          ))}
        </div>
      </div>

      {/* 1 — what needs action (admin only) */}
      {mode === 'admin' && (
        <Section n={1} title="สิ่งที่ต้องดำเนินการ" hint="กดเพื่อดูรายชื่อ แล้วกดชื่อเพื่อแก้ไข">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {attention.map(a => {
              const on = openAttn === a.key;
              const none = a.list.length === 0;
              return (
                <button key={a.key} onClick={() => setOpenAttn(on ? null : a.key)} disabled={none} aria-expanded={on}
                  className={`text-left rounded-xl border p-4 flex items-center gap-3 transition ${none ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70' : a.tone} ${on ? 'ring-2 ring-offset-1 ring-current dark:ring-offset-slate-950' : ''}`}>
                  <span className="shrink-0">{none ? <CheckCircle2 size={16} className="text-emerald-500" /> : a.icon}</span>
                  <span className="flex-1 min-w-0 text-sm leading-snug">{a.label}</span>
                  <span className={`text-2xl font-bold tabular-nums ${none ? 'text-slate-300 dark:text-slate-600' : ''}`}>{a.list.length}</span>
                  {!none && <ChevronRight size={15} className={`shrink-0 transition ${on ? 'rotate-90' : ''}`} />}
                </button>
              );
            })}
          </div>
          {openList && openList.list.length > 0 && (
            <div className={`${card} p-2 max-h-64 overflow-y-auto custom-scrollbar`}>
              <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-0.5">
                {openList.list.slice(0, 60).map(s => (
                  <li key={s.id}>
                    <button onClick={() => onOpenStudent?.(s)} className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                      <span className="truncate text-slate-700 dark:text-slate-200">{s.name}</span>
                      <span className="text-xs text-slate-400 font-mono shrink-0">{s.studentId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* 2 — headline numbers */}
      <Section n={n0 + 1} title="ตัวเลขสำคัญ">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={`${card} p-4 sm:p-5`}>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400"><span className="text-xs font-medium">นักศึกษาทั้งหมด</span><Users size={16} className="text-slate-400" /></div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{d.total}</div>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {TYPE_LIST.map(t => (d.byType[t] ? <div key={t} className={TYPE_META[t].bar} style={{ width: `${pct(d.byType[t], typeTotal)}%` }} /> : null))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500 dark:text-slate-400">
              {TYPE_LIST.map(t => <span key={t} className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${TYPE_META[t].dot}`} />{TYPE_META[t].short} {d.byType[t] || 0}</span>)}
            </div>
          </div>
          <Stat icon={<CheckCircle2 size={16} />} label="ตอบรับแล้ว" value={<>{d.accepted}<span className="ml-1.5 text-base font-semibold text-emerald-600 dark:text-emerald-400">{pct(d.accepted, d.total)}%</span></>} sub="ของนักศึกษาทั้งหมด" />
          <Stat icon={<Activity size={16} />} label="กำลังฝึกอยู่ตอนนี้" value={d.active} sub="อยู่ในช่วงวันฝึก ณ วันนี้" />
          <Stat icon={<UserCheck size={16} />} label="มีอาจารย์นิเทศแล้ว" value={<>{d.withSup}<span className="text-base font-medium text-slate-400">/{d.total}</span></>} sub={`ครอบคลุม ${pct(d.withSup, d.total)}%`} />
        </div>
      </Section>

      {/* 3 — who goes where, and how far along */}
      <Section n={n0 + 2} title="รูปแบบการฝึก และ สถานะการสมัคร">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="ฝึกงาน เทียบ สหกิจศึกษา" subtitle="จำนวนนักศึกษาในแต่ละรูปแบบ">
            <div className="space-y-4">
              {TYPE_LIST.map(t => {
                const m = TYPE_META[t];
                const n = d.byType[t] || 0;
                return (
                  <div key={t} className="flex items-center gap-4">
                    <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${m.soft} ${m.text}`}><TypeIcon type={t} size={20} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`text-sm font-semibold ${m.text}`}>{m.label}</span>
                        <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{n}<span className="ml-1 text-xs font-medium text-slate-400">คน · {pct(n, typeTotal)}%</span></span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full rounded-full ${m.bar}`} style={{ width: `${pct(n, typeTotal)}%` }} /></div>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">ตอบรับแล้ว {d.typeAccepted[t] || 0} · กำลังฝึก {d.typeActive[t] || 0} · สถานที่ {Object.keys(d.typeLocations[t] || {}).length} แห่ง</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="สถานะการสมัคร" subtitle="นักศึกษาอยู่ขั้นตอนไหน">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Donut data={statusData} total={d.total} tip={tip} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{d.total}</span>
                  <span className="text-[11px] text-slate-400">คน</span>
                </div>
              </div>
              <ul className="flex-1 w-full space-y-2.5">
                {statusData.map(s => (
                  <li key={s.key} className="flex items-center gap-2.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
                    <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-white">{s.value}</span>
                    <span className="w-10 text-right text-xs tabular-nums text-slate-400">{pct(s.value, d.total)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>
      </Section>

      {/* 4 — by major and over time */}
      <Section n={n0 + 3} title="แยกตามสาขา และ ช่วงเวลา">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <Panel title="แต่ละสาขา" subtitle="จำนวนนักศึกษา แยกฝึกงาน / สหกิจ" className="xl:col-span-2"
            right={<div className="flex gap-3">{TYPE_LIST.map(t => <span key={t} className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className={`w-2 h-2 rounded-sm ${TYPE_META[t].bar}`} />{TYPE_META[t].short}</span>)}</div>}>
            <div className="space-y-3.5">
              {MAJOR_LIST.map(m => {
                const n = Object.values(d.byMajor[m] || {}).reduce((a, b) => a + b, 0);
                return (
                  <div key={m} className="grid grid-cols-[96px_1fr_32px] items-center gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${MAJOR_META[m].dot}`} />{MAJOR_META[m].short}</div>
                      <div className="text-[11px] text-slate-400 truncate">{MAJOR_META[m].full}</div>
                    </div>
                    <div className="h-5 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full flex" style={{ width: `${(n / maxMajor) * 100}%` }}>
                        {TYPE_LIST.map(t => {
                          const v = d.typeByMajor[t]?.[m] || 0;
                          return v ? <div key={t} className={`h-full ${TYPE_META[t].bar} hover:opacity-80`} style={{ width: `${(v / n) * 100}%` }}
                            onMouseMove={(e) => tip.show(e, <TipRow color={TYPE_META[t].hex} label={`${MAJOR_META[m].short} · ${TYPE_META[t].label}`} value={`${v} คน`} />)} onMouseLeave={tip.hide} /> : null;
                        })}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-right text-slate-900 dark:text-white">{n}</span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="เริ่มฝึกในแต่ละเดือน" subtitle="จำนวนนักศึกษาตามเดือนที่เริ่มฝึก" className="xl:col-span-3">
            {d.timeline.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">ยังไม่มีข้อมูลวันเริ่มฝึก</p>
            ) : (
              <div className="flex items-end gap-1.5 h-44 pt-4">
                {d.timeline.map(t => (
                  <div key={t.key} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1.5 group"
                    onMouseMove={(e) => tip.show(e, <TipRow label={t.label} value={`${t.value} คน`} />)} onMouseLeave={tip.hide}>
                    <span className={`text-[11px] tabular-nums text-slate-500 transition ${t.value ? 'opacity-100' : 'opacity-0'}`}>{t.value || ''}</span>
                    <div className="w-full max-w-[36px] rounded-t-[4px] bg-[#630330] dark:bg-amber-400 group-hover:opacity-80 transition" style={{ height: `${(t.value / maxMonth) * 100}%`, minHeight: t.value ? 3 : 0 }} />
                    <span className="text-[10px] text-slate-400 whitespace-nowrap truncate max-w-full">{t.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </Section>

      {/* 5 — places, supervisors, dates */}
      <Section n={n0 + 4} title="สถานที่ฝึก อาจารย์นิเทศ และกำหนดการ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="สถานที่ฝึกยอดนิยม" subtitle={`จากทั้งหมด ${d.distinctLocations} แห่ง`} right={<Building2 size={16} className="text-slate-400" />}>
            {d.topLocations.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">ยังไม่มีข้อมูลสถานที่</p>
            ) : (
              <ul className="space-y-3">
                {d.topLocations.map(([loc, n]) => (
                  <li key={loc}>
                    <div className="flex items-center justify-between gap-3 text-sm mb-1">
                      <span className="truncate text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><MapPin size={12} className="text-slate-400 shrink-0" />{loc}</span>
                      <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{n}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-slate-700 dark:bg-slate-300" style={{ width: `${(n / maxLoc) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="ภาระงานอาจารย์นิเทศ" subtitle="จำนวนนักศึกษาที่ดูแล" right={<UserCheck size={16} className="text-slate-400" />}>
            {d.topSupervisors.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">ยังไม่มีการระบุอาจารย์นิเทศ</p>
            ) : (
              <ul className="space-y-3">
                {d.topSupervisors.map(([name, n]) => (
                  <li key={name}>
                    <div className="flex items-center justify-between gap-3 text-sm mb-1">
                      <span className="truncate text-slate-700 dark:text-slate-200">{name}</span>
                      <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{n}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[#630330] dark:bg-amber-400" style={{ width: `${(n / maxSup) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="กำหนดการที่กำลังจะมาถึง" subtitle="วันสำคัญถัดไป" right={<CalendarDays size={16} className="text-slate-400" />}>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">ไม่มีกำหนดการ</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map(ev => {
                  const sd = parseISO(ev.rawStartDate);
                  return (
                    <li key={ev.id} className="flex items-center gap-3">
                      <div className="w-11 shrink-0 text-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-500">{sd ? TH_MONTHS_SHORT[sd.getMonth()] : '—'}</div>
                        <div className="text-base font-bold leading-6 tabular-nums text-slate-900 dark:text-white">{sd ? sd.getDate() : '?'}</div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{getLocalized(ev.event)}</p>
                        <p className="text-xs text-slate-400">{ev.rawStartDate ? formatTH(ev.rawStartDate) : ''}{ev.rawEndDate ? ` – ${formatTH(ev.rawEndDate)}` : ''}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </Section>
    </div>
  );
};

export default Dashboard;

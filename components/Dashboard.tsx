import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  Users, CheckCircle2, UserCheck, Activity, Building2, CalendarDays, AlertCircle, Clock, CalendarX, ChevronRight, MapPin, Briefcase, GraduationCap
} from 'lucide-react';
import { StudentStatusRecord, ApplicationStatus, Major, InternshipType, ScheduleEvent, LocalizedString } from '../types';
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

const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);

const getLocalized = (l?: LocalizedString) => (l ? l.th || l.en || '' : '');

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

  return (
    <div ref={wrapRef} className="space-y-4">
      {tip.node}

      {/* Filters — one row above the charts */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-4">
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
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          <button className={chip(filters.majors.length === 0)} onClick={() => onFiltersChange({ ...filters, majors: [] })}>ทุกสาขา</button>
          {MAJOR_LIST.map(m => (
            <button key={m} className={chip(filters.majors.includes(m))} onClick={() => toggle('majors', m)}>
              <span className={`w-2 h-2 rounded-full ${MAJOR_META[m].dot}`} />{MAJOR_META[m].short}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat icon={<Users size={16} />} label="นักศึกษาทั้งหมด" value={d.total} sub={`ฝึกงาน ${d.byType[InternshipType.INTERNSHIP] || 0} · สหกิจ ${d.byType[InternshipType.COOP] || 0}`} />
        <Stat icon={<CheckCircle2 size={16} />} label="อัตราตอบรับ" value={`${pct(d.accepted, d.total)}%`} sub={`ตอบรับแล้ว ${d.accepted} คน`} accent="text-emerald-600 dark:text-emerald-400" />
        <Stat icon={<Activity size={16} />} label="กำลังฝึกอยู่ตอนนี้" value={d.active} sub="อยู่ในช่วงวันฝึก ณ วันนี้" />
        <Stat icon={<UserCheck size={16} />} label="มีอาจารย์นิเทศ" value={<>{d.withSup}<span className="text-base font-medium text-slate-400">/{d.total}</span></>} sub={`ครอบคลุม ${pct(d.withSup, d.total)}%`} />
        <Stat className="col-span-2 lg:col-span-1" icon={<Building2 size={16} />} label="สถานประกอบการ" value={d.distinctLocations} sub="แห่งที่มีนักศึกษาฝึก" />
      </div>

      {/* Internship vs co-op */}
      <Panel title="ฝึกงาน และ สหกิจศึกษา" subtitle="จำนวนนักศึกษาแยกตามรูปแบบการฝึก">
        <div className="h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mb-4">
          {TYPE_LIST.map(t => {
            const n = d.byType[t] || 0;
            return n ? (
              <div key={t} className={`h-full ${TYPE_META[t].bar} first:rounded-l-full last:rounded-r-full hover:opacity-85 transition`} style={{ width: `${pct(n, d.total)}%` }}
                onMouseMove={(e) => tip.show(e, <TipRow color={TYPE_META[t].hex} label={TYPE_META[t].label} value={`${n} คน · ${pct(n, d.total)}%`} />)} onMouseLeave={tip.hide} />
            ) : null;
          })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TYPE_LIST.map(t => {
            const m = TYPE_META[t];
            const n = d.byType[t] || 0;
            const majors = d.typeByMajor[t] || {};
            const maxM = Math.max(1, ...MAJOR_LIST.map(mj => majors[mj] || 0));
            return (
              <div key={t} className={`rounded-xl p-4 ${m.soft}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`flex items-center gap-1.5 text-sm font-semibold ${m.text}`}><TypeIcon type={t} size={15} />{m.label}</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{n}<span className="ml-1 text-sm font-medium text-slate-400">คน · {pct(n, d.total)}%</span></p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'ตอบรับแล้ว', v: d.typeAccepted[t] || 0 },
                    { label: 'กำลังฝึก', v: d.typeActive[t] || 0 },
                    { label: 'สถานที่', v: Object.keys(d.typeLocations[t] || {}).length },
                  ].map(x => (
                    <div key={x.label} className="rounded-lg bg-white/70 dark:bg-slate-900/50 py-2">
                      <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{x.v}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{x.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  {MAJOR_LIST.map(mj => {
                    const v = majors[mj] || 0;
                    return (
                      <div key={mj} className="grid grid-cols-[64px_1fr_24px] items-center gap-2 text-[11px]">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><span className={`w-1.5 h-1.5 rounded-full ${MAJOR_META[mj].dot}`} />{MAJOR_META[mj].short}</span>
                        <div className="h-1.5 rounded-full bg-white/80 dark:bg-slate-800 overflow-hidden"><div className={`h-full ${m.bar}`} style={{ width: `${(v / maxM) * 100}%` }} /></div>
                        <span className="text-right tabular-nums text-slate-500">{v}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Status + by major */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Panel title="สถานะการสมัคร" subtitle="สัดส่วนนักศึกษาตามสถานะ" className="xl:col-span-2">
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

        <Panel
          title="แยกตามสาขาวิชา"
          subtitle="จำนวนนักศึกษาและสถานะในแต่ละสาขา"
          className="xl:col-span-3"
          right={
            <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 justify-end">
              {STATUS_ORDER.map(st => (
                <span key={st} className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-2 h-2 rounded-sm" style={{ background: STATUS_META[st].hex }} />{STATUS_META[st].label}</span>
              ))}
            </div>
          }
        >
          <div className="space-y-4">
            {MAJOR_LIST.map(m => {
              const row = d.byMajor[m] || {};
              const n = Object.values(row).reduce((a, b) => a + b, 0);
              return (
                <div key={m} className="grid grid-cols-[88px_1fr_36px] sm:grid-cols-[140px_1fr_40px] items-center gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${MAJOR_META[m].dot}`} />{MAJOR_META[m].short}</div>
                    <div className="hidden sm:block text-[11px] text-slate-400 truncate">{MAJOR_META[m].full}</div>
                  </div>
                  <div className="h-6 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full flex gap-[2px]" style={{ width: `${(n / maxMajor) * 100}%` }}>
                      {STATUS_ORDER.map(st => row[st] ? (
                        <div key={st} className="h-full first:rounded-l-md last:rounded-r-md transition-opacity hover:opacity-80"
                          style={{ width: `${(row[st] / n) * 100}%`, background: STATUS_META[st].hex }}
                          onMouseMove={(e) => tip.show(e, <div className="space-y-1"><p className="font-semibold">{MAJOR_META[m].short} · {MAJOR_META[m].full}</p><TipRow color={STATUS_META[st].hex} label={STATUS_META[st].label} value={`${row[st]} คน`} /></div>)}
                          onMouseLeave={tip.hide}
                        />
                      ) : null)}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-right text-slate-900 dark:text-white">{n}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Timeline + type */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Panel title="เริ่มฝึกในแต่ละเดือน" subtitle="จำนวนนักศึกษาตามเดือนที่เริ่มฝึก" className="xl:col-span-3">
          {d.timeline.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">ยังไม่มีข้อมูลวันเริ่มฝึก</p>
          ) : (
            <div className="flex items-end gap-1.5 h-44 pt-4">
              {d.timeline.map(t => (
                <div key={t.key} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1.5 group"
                  onMouseMove={(e) => tip.show(e, <TipRow label={t.label} value={`${t.value} คน`} />)} onMouseLeave={tip.hide}>
                  <span className={`text-[11px] tabular-nums text-slate-500 transition ${t.value === maxMonth ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{t.value}</span>
                  <div className="w-full max-w-[36px] rounded-t-[4px] bg-[#630330] dark:bg-amber-400 group-hover:opacity-80 transition" style={{ height: `${(t.value / maxMonth) * 100}%`, minHeight: t.value ? 3 : 0 }} />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap truncate max-w-full">{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="สถานที่ฝึกยอดนิยม" subtitle="จำนวนนักศึกษาต่อสถานประกอบการ" className="xl:col-span-2">
          {d.topLocations.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">ยังไม่มีข้อมูลสถานที่</p>
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
      </div>

      <div className={`grid grid-cols-1 ${mode === 'admin' ? 'xl:grid-cols-3' : 'xl:grid-cols-2'} gap-4`}>
        {mode === 'admin' && (
          <Panel title="ต้องติดตาม" subtitle="รายการที่ควรดำเนินการต่อ">
            <div className="space-y-2">
              {[
                { icon: <UserCheck size={15} />, label: 'ตอบรับแล้วแต่ยังไม่มีอาจารย์นิเทศ', list: d.noSupervisor, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300' },
                { icon: <Clock size={15} />, label: 'รอตรวจสอบนานเกิน 14 วัน', list: d.stalePending, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300' },
                { icon: <CalendarX size={15} />, label: 'ตอบรับแล้วแต่ยังไม่ระบุวันฝึก', list: d.noDates, tone: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300' },
              ].map(item => (
                <details key={item.label} className="group rounded-lg border border-slate-200 dark:border-slate-800 open:bg-slate-50/60 dark:open:bg-slate-800/30">
                  <summary className="flex items-center gap-3 p-3 cursor-pointer list-none">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.tone}`}>{item.icon}</span>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{item.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{item.list.length}</span>
                    <ChevronRight size={15} className="text-slate-400 transition group-open:rotate-90" />
                  </summary>
                  {item.list.length > 0 && (
                    <ul className="px-3 pb-3 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {item.list.slice(0, 30).map(s => (
                        <li key={s.id}>
                          <button onClick={() => onOpenStudent?.(s)} className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-xs hover:bg-white dark:hover:bg-slate-800">
                            <span className="truncate text-slate-700 dark:text-slate-200">{s.name}</span>
                            <span className="text-slate-400 font-mono shrink-0">{s.studentId}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              ))}
            </div>
          </Panel>
        )}

        <Panel title="ภาระงานอาจารย์นิเทศ" subtitle="จำนวนนักศึกษาที่ดูแล">
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

      <div className={`${card} px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400`}>
        <span className="flex items-center gap-1.5"><Briefcase size={13} /> ฝึกงาน {d.byType[InternshipType.INTERNSHIP] || 0} คน ({pct(d.byType[InternshipType.INTERNSHIP] || 0, d.total)}%)</span>
        <span className="flex items-center gap-1.5"><GraduationCap size={13} /> สหกิจศึกษา {d.byType[InternshipType.COOP] || 0} คน ({pct(d.byType[InternshipType.COOP] || 0, d.total)}%)</span>
        {d.stalePending.length > 0 && mode === 'admin' && <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400"><AlertCircle size={13} /> มี {d.stalePending.length} รายการรอตรวจสอบนาน</span>}
      </div>
    </div>
  );
};

export default Dashboard;

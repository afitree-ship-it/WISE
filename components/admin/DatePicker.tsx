import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ArrowRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Thai date helpers (values are always ISO YYYY-MM-DD strings)        */
/* ------------------------------------------------------------------ */

export const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseISO = (s?: string): Date | null => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Normalises any stored date string (ISO with time, etc.) to YYYY-MM-DD or ''. */
export const normalizeISO = (s?: string) => {
  const d = parseISO(s);
  return d ? toISO(d) : '';
};

export const formatTH = (s?: string, short = true) => {
  const d = parseISO(s);
  if (!d) return '';
  return `${d.getDate()} ${(short ? TH_MONTHS_SHORT : TH_MONTHS)[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const addMonths = (iso: string, n: number) => {
  const d = parseISO(iso) || new Date();
  const r = new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
  return toISO(r);
};

export const durationLabel = (start?: string, end?: string) => {
  const a = parseISO(start), b = parseISO(end);
  if (!a || !b || b < a) return '';
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  let rem = b.getDate() - a.getDate() + 1;
  if (rem < 0) { months -= 1; rem += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
  if (months <= 0) return `${days} วัน`;
  if (rem >= 28) { months += 1; rem = 0; }
  return rem > 0 ? `${months} เดือน ${rem} วัน` : `${months} เดือน`;
};

const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.getTime() === b.getTime();

/* ------------------------------------------------------------------ */
/* Popover (portal, fixed; bottom sheet on small screens)              */
/* ------------------------------------------------------------------ */

const Popover: React.FC<{
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ anchor, open, onClose, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; mobile: boolean } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = ref.current?.getBoundingClientRect();
      if (!a) return;
      const mobile = window.innerWidth < 640;
      if (mobile) { setPos({ top: 0, left: 0, mobile }); return; }
      const w = p?.width || 320, h = p?.height || 360;
      let top = a.bottom + 6;
      if (top + h > window.innerHeight - 8 && a.top - h - 6 > 8) top = a.top - h - 6;
      top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
      let left = a.left;
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
      setPos({ top, left: Math.max(8, left), mobile });
    };
    place();
    const raf = requestAnimationFrame(place);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    if (ro && ref.current) ro.observe(ref.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.current?.contains(t)) return;
      onCloseRef.current();
    };
    // Capture on window so Escape closes only the picker, not an enclosing modal
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, anchor]);

  if (!open) return null;
  const mobile = pos?.mobile;
  return createPortal(
    <>
      {mobile && <div className="fixed inset-0 z-[590] bg-slate-950/30 wise-fade-in" />}
      <div
        ref={ref}
        onMouseDown={(e) => e.stopPropagation()}
        className={`fixed z-[600] bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 wise-pop-in ${
          mobile ? 'left-0 right-0 bottom-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)]' : 'rounded-xl'
        }`}
        style={mobile ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      >
        {children}
      </div>
    </>,
    document.body
  );
};

/* ------------------------------------------------------------------ */
/* Calendar month grid                                                 */
/* ------------------------------------------------------------------ */

interface CalendarProps {
  view: Date; // first of month being shown
  onViewChange: (d: Date) => void;
  start: Date | null;
  end: Date | null;
  hover: Date | null;
  onHover: (d: Date | null) => void;
  onPick: (d: Date) => void;
  min?: Date | null;
  showNav?: 'both' | 'prev' | 'next' | 'none';
  rangeMode: boolean;
}

const Calendar: React.FC<CalendarProps> = ({ view, onViewChange, start, end, hover, onHover, onPick, min, showNav = 'both', rangeMode }) => {
  const [mode, setMode] = useState<'days' | 'months' | 'years'>('days');
  const today = useMemo(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }, []);
  const y = view.getFullYear(), m = view.getMonth();
  const [yearPage, setYearPage] = useState(y - 5);
  useEffect(() => setYearPage(y - 5), [y]);

  const cells = useMemo(() => {
    const first = new Date(y, m, 1);
    const offset = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(y, m, d));
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [y, m]);

  const rangeEnd = end || (rangeMode && start && hover && hover > start ? hover : null);

  const navBtn = 'w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition';

  return (
    <div className="w-[17.5rem]">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8">
          {(showNav === 'both' || showNav === 'prev') && mode === 'days' && (
            <button type="button" className={navBtn} onClick={() => onViewChange(new Date(y, m - 1, 1))} aria-label="เดือนก่อนหน้า"><ChevronLeft size={16} /></button>
          )}
          {mode === 'years' && <button type="button" className={navBtn} onClick={() => setYearPage(p => p - 12)} aria-label="ก่อนหน้า"><ChevronLeft size={16} /></button>}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMode(mode === 'months' ? 'days' : 'months')} className={`h-8 px-2.5 rounded-lg text-sm font-semibold transition ${mode === 'months' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'} text-slate-900 dark:text-white`}>
            {TH_MONTHS[m]}
          </button>
          <button type="button" onClick={() => setMode(mode === 'years' ? 'days' : 'years')} className={`h-8 px-2.5 rounded-lg text-sm font-semibold transition tabular-nums ${mode === 'years' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'} text-slate-900 dark:text-white`}>
            {y + 543}
          </button>
        </div>
        <div className="w-8 flex justify-end">
          {(showNav === 'both' || showNav === 'next') && mode === 'days' && (
            <button type="button" className={navBtn} onClick={() => onViewChange(new Date(y, m + 1, 1))} aria-label="เดือนถัดไป"><ChevronRight size={16} /></button>
          )}
          {mode === 'years' && <button type="button" className={navBtn} onClick={() => setYearPage(p => p + 12)} aria-label="ถัดไป"><ChevronRight size={16} /></button>}
        </div>
      </div>

      {mode === 'months' && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {TH_MONTHS_SHORT.map((label, i) => (
            <button key={i} type="button" onClick={() => { onViewChange(new Date(y, i, 1)); setMode('days'); }}
              className={`h-11 rounded-lg text-sm font-medium transition ${i === m ? 'bg-[#630330] text-white dark:bg-amber-400 dark:text-slate-900' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === 'years' && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, i) => yearPage + i).map(yr => (
            <button key={yr} type="button" onClick={() => { onViewChange(new Date(yr, m, 1)); setMode('days'); }}
              className={`h-11 rounded-lg text-sm font-medium tabular-nums transition ${yr === y ? 'bg-[#630330] text-white dark:bg-amber-400 dark:text-slate-900' : yr === today.getFullYear() ? 'ring-1 ring-inset ring-slate-300 dark:ring-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {yr + 543}
            </button>
          ))}
        </div>
      )}

      {mode === 'days' && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {TH_DAYS.map((d, i) => (
              <div key={d} className={`h-7 flex items-center justify-center text-[11px] font-medium ${i === 0 ? 'text-rose-400' : 'text-slate-400'}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7" onMouseLeave={() => onHover(null)}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="h-10" />;
              const disabled = !!min && d < min;
              const isStart = sameDay(d, start);
              const isEnd = sameDay(d, rangeEnd);
              const inRange = !!start && !!rangeEnd && d > start && d < rangeEnd;
              const isToday = sameDay(d, today);
              const selected = isStart || isEnd;
              return (
                <div key={i} className={`h-10 flex items-center justify-center relative ${inRange ? 'bg-[#630330]/[0.07] dark:bg-amber-400/10' : ''} ${isStart && rangeEnd && !isEnd ? 'bg-gradient-to-r from-transparent from-50% to-[#630330]/[0.07] dark:to-amber-400/10 to-50%' : ''} ${isEnd && start && !isStart ? 'bg-gradient-to-l from-transparent from-50% to-[#630330]/[0.07] dark:to-amber-400/10 to-50%' : ''}`}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(d)}
                    onMouseEnter={() => onHover(d)}
                    className={`w-9 h-9 rounded-full text-sm tabular-nums transition relative ${
                      selected
                        ? 'bg-[#630330] text-white font-semibold dark:bg-amber-400 dark:text-slate-900'
                        : disabled
                          ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                          : `hover:bg-slate-100 dark:hover:bg-slate-800 ${d.getDay() === 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`
                    } ${isToday && !selected ? 'ring-1 ring-inset ring-[#630330]/40 dark:ring-amber-400/50 font-semibold' : ''}`}
                  >
                    {d.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Trigger styling                                                      */
/* ------------------------------------------------------------------ */

const triggerCls = (open: boolean) =>
  `w-full min-h-10 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 text-sm text-left flex items-center gap-2 transition outline-none ${
    open
      ? 'border-[#630330] ring-4 ring-[#630330]/10 dark:border-amber-400 dark:ring-amber-400/10'
      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
  }`;

/* ------------------------------------------------------------------ */
/* Single date                                                         */
/* ------------------------------------------------------------------ */

export const DatePicker: React.FC<{
  value: string;
  onChange: (v: string) => void;
  name?: string;
  placeholder?: string;
  min?: string;
}> = ({ value, onChange, name, placeholder = 'เลือกวันที่', min }) => {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const sel = parseISO(value);
  const [view, setView] = useState<Date>(() => { const d = sel || new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [hover, setHover] = useState<Date | null>(null);

  useEffect(() => { if (open) { const d = parseISO(value) || new Date(); setView(new Date(d.getFullYear(), d.getMonth(), 1)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <button ref={anchor} type="button" onClick={() => setOpen(o => !o)} className={triggerCls(open)}>
        <CalendarIcon size={15} className="text-slate-400 shrink-0" />
        <span className={`flex-1 truncate ${value ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>{value ? formatTH(value, false) : placeholder}</span>
        {value && (
          <span role="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); onChange(''); }} className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="ล้าง"><X size={14} /></span>
        )}
      </button>
      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)}>
        <div className="p-3 flex flex-col items-center">
          <Calendar view={view} onViewChange={setView} start={sel} end={null} hover={hover} onHover={setHover} rangeMode={false}
            min={parseISO(min)} onPick={(d) => { onChange(toISO(d)); setOpen(false); }} />
          <div className="w-full flex justify-between pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => { onChange(toISO(new Date())); setOpen(false); }} className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#630330] dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800">วันนี้</button>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">ล้าง</button>
          </div>
        </div>
      </Popover>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Date range                                                          */
/* ------------------------------------------------------------------ */

export interface RangePreset {
  label: string;
  get: (start: string) => [string, string];
}

export const DateRangePicker: React.FC<{
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  startName?: string;
  endName?: string;
  presets?: RangePreset[];
  placeholder?: string;
}> = ({ start, end, onChange, startName, endName, presets = [], placeholder = 'เลือกช่วงวันที่' }) => {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState<Date | null>(null);
  const [picking, setPicking] = useState<'start' | 'end'>('start');
  const [view, setView] = useState<Date>(() => new Date());
  const [twoUp, setTwoUp] = useState(false);

  const s = parseISO(start), e = parseISO(end);

  useEffect(() => {
    if (!open) return;
    const base = s || new Date();
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
    setPicking(s && !e ? 'end' : 'start');
    setTwoUp(window.innerWidth >= (presets.length ? 940 : 760));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (d: Date) => {
    if (picking === 'start' || !s) {
      onChange(toISO(d), '');
      setPicking('end');
    } else {
      if (d < s) { onChange(toISO(d), ''); setPicking('end'); return; }
      onChange(start, toISO(d));
      setPicking('start');
      setTimeout(() => setOpen(false), 180);
    }
  };

  const dur = durationLabel(start, end);
  const next = new Date(view.getFullYear(), view.getMonth() + 1, 1);

  return (
    <>
      {startName && <input type="hidden" name={startName} value={start} />}
      {endName && <input type="hidden" name={endName} value={end} />}
      <button ref={anchor} type="button" onClick={() => setOpen(o => !o)} className={triggerCls(open)}>
        <CalendarIcon size={15} className="text-slate-400 shrink-0" />
        {start || end ? (
          <span className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-900 dark:text-slate-100">{start ? formatTH(start) : 'เริ่ม?'}</span>
            <ArrowRight size={13} className="text-slate-400" />
            <span className={end ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>{end ? formatTH(end) : 'สิ้นสุด?'}</span>
            {dur && <span className="ml-1 px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400">{dur}</span>}
          </span>
        ) : (
          <span className="flex-1 text-slate-400">{placeholder}</span>
        )}
        {(start || end) && (
          <span role="button" tabIndex={-1} onClick={(ev) => { ev.stopPropagation(); onChange('', ''); }} className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="ล้าง"><X size={14} /></span>
        )}
      </button>

      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col sm:flex-row">
          {presets.length > 0 && (
            <div className="flex sm:flex-col gap-1 p-2 sm:p-3 sm:w-40 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800 overflow-x-auto hide-scrollbar">
              <p className="hidden sm:block text-[11px] font-semibold text-slate-400 px-2 pb-1">ช่วงเวลาด่วน</p>
              {presets.map(p => (
                <button key={p.label} type="button"
                  onClick={() => { const [a, b] = p.get(start); onChange(a, b); setPicking('start'); setOpen(false); }}
                  className="shrink-0 h-8 px-2.5 rounded-lg text-xs font-medium text-left text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap">
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <button type="button" onClick={() => setPicking('start')} className={`flex-1 text-left px-3 py-1.5 rounded-lg border transition ${picking === 'start' ? 'border-[#630330] dark:border-amber-400 bg-[#630330]/[0.04] dark:bg-amber-400/10' : 'border-slate-200 dark:border-slate-700'}`}>
                <span className="block text-[10px] text-slate-400">วันเริ่ม</span>
                <span className="block text-sm font-medium text-slate-900 dark:text-white">{start ? formatTH(start) : '—'}</span>
              </button>
              <ArrowRight size={14} className="text-slate-300 shrink-0" />
              <button type="button" onClick={() => start && setPicking('end')} className={`flex-1 text-left px-3 py-1.5 rounded-lg border transition ${picking === 'end' ? 'border-[#630330] dark:border-amber-400 bg-[#630330]/[0.04] dark:bg-amber-400/10' : 'border-slate-200 dark:border-slate-700'}`}>
                <span className="block text-[10px] text-slate-400">วันสิ้นสุด</span>
                <span className="block text-sm font-medium text-slate-900 dark:text-white">{end ? formatTH(end) : '—'}</span>
              </button>
            </div>
            <div className="flex gap-5 justify-center">
              <Calendar view={view} onViewChange={setView} start={s} end={e} hover={hover} onHover={setHover} onPick={pick} rangeMode={picking === 'end'} showNav={twoUp ? 'prev' : 'both'} />
              {twoUp && (
                <Calendar view={next} onViewChange={(d) => setView(new Date(d.getFullYear(), d.getMonth() - 1, 1))} start={s} end={e} hover={hover} onHover={setHover} onPick={pick} rangeMode={picking === 'end'} showNav="next" />
              )}
            </div>
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">{picking === 'end' && !end ? 'เลือกวันสิ้นสุด' : dur ? `รวม ${dur}` : 'เลือกวันเริ่ม'}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => { onChange('', ''); setPicking('start'); }} className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">ล้าง</button>
                <button type="button" onClick={() => setOpen(false)} className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#630330] text-white dark:bg-amber-400 dark:text-slate-900">เสร็จ</button>
              </div>
            </div>
          </div>
        </div>
      </Popover>
    </>
  );
};

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X, ArrowRight } from 'lucide-react';

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
/* Typed dates: dd/mm/yyyy with a Buddhist-Era year (Gregorian accepted) */
/* ------------------------------------------------------------------ */

const TH_WEEKDAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const toText = (iso?: string) => {
  const d = parseISO(iso);
  return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}` : '';
};

/** '' = empty, null = not a valid date, otherwise ISO */
const parseText = (t: string): string | null => {
  const s = t.trim();
  if (!s) return '';
  const m = /^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{2}|\d{4})$/.exec(s);
  if (!m) return null;
  let y = Number(m[3]);
  if (y < 100) y += 2500;          // "69" -> 2569
  if (y > 2400) y -= 543;          // Buddhist Era -> Gregorian
  const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[1])) return null;
  return toISO(d);
};

/** Inserts the slashes while typing digits: 1506 -> 15/06/ */
const autoSlash = (raw: string, prev: string) => {
  if (raw.length < prev.length) return raw;
  if (/^\d{2}$/.test(raw)) return `${raw}/`;
  if (/^\d{1,2}\/\d{2}$/.test(raw)) return `${raw}/`;
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
  return raw.slice(0, 10);
};

/* ------------------------------------------------------------------ */
/* Calendar month grid                                                 */
/* ------------------------------------------------------------------ */

interface CalendarProps {
  view: Date; // first of month being shown
  onViewChange: (d: Date) => void;
  selected: Date | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  /** When set, hovering previews the range from rangeStart to the hovered day */
  previewRange?: boolean;
  onPick: (d: Date) => void;
  min?: Date | null;
}

const Calendar: React.FC<CalendarProps> = ({ view, onViewChange, selected, rangeStart, rangeEnd, previewRange, onPick, min }) => {
  const today = useMemo(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }, []);
  const [hover, setHover] = useState<Date | null>(null);
  const y = view.getFullYear(), m = view.getMonth();

  const years = useMemo(() => {
    const set = new Set<number>();
    for (let yr = today.getFullYear() - 8; yr <= today.getFullYear() + 4; yr++) set.add(yr);
    set.add(y);
    return Array.from(set).sort((a, b) => a - b);
  }, [today, y]);

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

  const rs = rangeStart || null;
  const re = rangeEnd || (previewRange && rs && hover && hover > rs ? hover : null);

  const navBtn = 'w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition';
  const selCls = 'h-9 pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#630330] dark:focus:border-amber-400 cursor-pointer appearance-none w-full';
  const chev = <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />;

  return (
    <div className="w-[19rem] max-w-full">
      <div className="flex items-center gap-1.5 mb-2">
        <button type="button" className={navBtn} onClick={() => onViewChange(new Date(y, m - 1, 1))} aria-label="เดือนก่อนหน้า"><ChevronLeft size={17} /></button>
        <span className="relative flex-1 min-w-0">
          <select aria-label="เดือน" value={m} onChange={e => onViewChange(new Date(y, Number(e.target.value), 1))} className={selCls}>
            {TH_MONTHS.map((label, i) => <option key={i} value={i}>{label}</option>)}
          </select>
          {chev}
        </span>
        <span className="relative w-[5.5rem] shrink-0">
          <select aria-label="ปี พ.ศ." value={y} onChange={e => onViewChange(new Date(Number(e.target.value), m, 1))} className={`${selCls} tabular-nums`}>
            {years.map(yr => <option key={yr} value={yr}>{yr + 543}</option>)}
          </select>
          {chev}
        </span>
        <button type="button" className={navBtn} onClick={() => onViewChange(new Date(y, m + 1, 1))} aria-label="เดือนถัดไป"><ChevronRight size={17} /></button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {TH_DAYS.map((d, i) => (
          <div key={d} className={`h-7 flex items-center justify-center text-[11px] font-medium ${i === 0 ? 'text-rose-400' : 'text-slate-400'}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" onMouseLeave={() => setHover(null)}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-10" />;
          const disabled = !!min && d < min;
          const isSel = sameDay(d, selected);
          const isStart = sameDay(d, rs);
          const isEnd = sameDay(d, re);
          const inRange = !!rs && !!re && d > rs && d < re;
          const isToday = sameDay(d, today);
          const strong = isSel || isStart || isEnd;
          return (
            <div key={i} className={`h-10 flex items-center justify-center relative ${inRange ? 'bg-[#630330]/[0.07] dark:bg-amber-400/10' : ''} ${isStart && re && !isEnd ? 'bg-gradient-to-r from-transparent from-50% to-[#630330]/[0.07] dark:to-amber-400/10 to-50%' : ''} ${isEnd && rs && !isStart ? 'bg-gradient-to-l from-transparent from-50% to-[#630330]/[0.07] dark:to-amber-400/10 to-50%' : ''}`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(d)}
                onMouseEnter={() => setHover(d)}
                aria-label={formatTH(toISO(d), false)}
                aria-pressed={isSel}
                className={`w-9 h-9 rounded-full text-sm tabular-nums transition relative ${
                  isSel
                    ? 'bg-[#630330] text-white font-semibold dark:bg-amber-400 dark:text-slate-900'
                    : strong
                      ? 'bg-[#630330]/15 text-[#630330] font-semibold dark:bg-amber-400/20 dark:text-amber-200'
                      : disabled
                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        : `hover:bg-slate-100 dark:hover:bg-slate-800 ${d.getDay() === 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`
                } ${isToday && !isSel ? 'ring-1 ring-inset ring-[#630330]/40 dark:ring-amber-400/50 font-semibold' : ''}`}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* One date field: type it, or open the calendar                      */
/* ------------------------------------------------------------------ */

const DateField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  min?: string;
  rangeStart?: string;
  rangeEnd?: string;
  previewRange?: boolean;
  /** Increment to open the calendar from outside (e.g. after the start date is chosen) */
  openSignal?: number;
}> = ({ value, onChange, label, placeholder = 'วว/ดด/ปปปป', min, rangeStart, rangeEnd, previewRange, openSignal }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => toText(value));
  const [invalid, setInvalid] = useState(false);
  const [focused, setFocused] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sel = parseISO(value);
  const minD = parseISO(min);
  const [view, setView] = useState<Date>(() => { const d = sel || minD || new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => { if (!focused) { setText(toText(value)); setInvalid(false); } }, [value, focused]);
  useEffect(() => {
    if (!open) return;
    const d = parseISO(value) || parseISO(min) || new Date();
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (openSignal) setOpen(true); }, [openSignal]);

  const commit = (t: string) => {
    const iso = parseText(t);
    if (iso === null) { setInvalid(true); return; }
    if (iso && minD && parseISO(iso)! < minD) { setInvalid(true); return; }
    setInvalid(false);
    if (iso !== value) onChange(iso);
  };

  const weekday = sel ? TH_WEEKDAY_SHORT[sel.getDay()] : '';

  return (
    <div className="min-w-0">
      {label && <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</span>}
      <div
        ref={boxRef}
        className={`h-10 pl-3 pr-1 rounded-lg border bg-white dark:bg-slate-900 flex items-center gap-1.5 transition ${
          invalid ? 'border-rose-400 ring-4 ring-rose-400/10'
            : open || focused ? 'border-[#630330] ring-4 ring-[#630330]/10 dark:border-amber-400 dark:ring-amber-400/10'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <input
          ref={inputRef}
          value={text}
          inputMode="numeric"
          placeholder={placeholder}
          aria-label={label || 'วันที่'}
          aria-invalid={invalid}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); commit(text); }}
          onChange={e => {
            const next = autoSlash(e.target.value, text);
            setText(next);
            if (invalid) setInvalid(false);
            // Apply as soon as a full date is typed, so the form never submits a stale value
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(next) && parseText(next)) commit(next);
            if (!next) onChange('');
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(text); setOpen(false); } }}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm tabular-nums text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />
        {weekday && !invalid && <span className="text-[11px] text-slate-400 shrink-0">{weekday}</span>}
        {value && (
          <button type="button" tabIndex={-1} onClick={() => { onChange(''); setText(''); inputRef.current?.focus(); }} className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="ล้างวันที่"><X size={14} /></button>
        )}
        <button type="button" onClick={() => setOpen(o => !o)} className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-md transition ${open ? 'bg-[#630330] text-white dark:bg-amber-400 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`} aria-label="เปิดปฏิทิน" title="เปิดปฏิทิน">
          <CalendarIcon size={16} />
        </button>
      </div>
      {invalid && <span className="block mt-1 text-[11px] text-rose-500">{minD && parseText(text) ? `ต้องไม่ก่อน ${formatTH(min)}` : 'พิมพ์เป็น วว/ดด/ปปปป เช่น 15/06/2569'}</span>}

      <Popover anchor={boxRef} open={open} onClose={() => setOpen(false)}>
        <div className="p-3">
          {label && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1">เลือก{label}</p>}
          <Calendar
            view={view}
            onViewChange={setView}
            selected={sel}
            rangeStart={parseISO(rangeStart)}
            rangeEnd={parseISO(rangeEnd)}
            previewRange={previewRange}
            min={minD}
            onPick={d => { const iso = toISO(d); setText(toText(iso)); setInvalid(false); onChange(iso); setOpen(false); }}
          />
          <div className="flex justify-between pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => { const t = toISO(new Date()); if (minD && new Date() < minD) return; onChange(t); setOpen(false); }} className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#630330] dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800">วันนี้</button>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">ล้าง</button>
          </div>
        </div>
      </Popover>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Single date                                                         */
/* ------------------------------------------------------------------ */

export const DatePicker: React.FC<{
  value: string;
  onChange: (v: string) => void;
  name?: string;
  placeholder?: string;
  min?: string;
}> = ({ value, onChange, name, placeholder, min }) => (
  <>
    {name && <input type="hidden" name={name} value={value} />}
    <DateField value={value} onChange={onChange} placeholder={placeholder} min={min} />
  </>
);

/* ------------------------------------------------------------------ */
/* Date range: two fields + always-visible quick ranges                */
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
}> = ({ start, end, onChange, startName, endName, presets = [], placeholder }) => {
  const [openEnd, setOpenEnd] = useState(0);
  const dur = durationLabel(start, end);
  const activePreset = presets.find(p => { const [a, b] = p.get(start); return a === start && b === end && !!start; });

  return (
    <div className="space-y-2">
      {startName && <input type="hidden" name={startName} value={start} />}
      {endName && <input type="hidden" name={endName} value={end} />}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <DateField
          label="วันเริ่ม"
          value={start}
          rangeStart={start}
          rangeEnd={end}
          onChange={s => {
            const keepEnd = end && s && end >= s ? end : '';
            onChange(s, keepEnd);
            if (s && !keepEnd) setOpenEnd(n => n + 1); // go straight on to the end date
          }}
        />
        <ArrowRight size={15} className="hidden min-[420px]:block text-slate-300 mb-3" />
        <DateField
          label="วันสิ้นสุด"
          value={end}
          min={start}
          rangeStart={start}
          rangeEnd={end}
          previewRange
          openSignal={openEnd}
          onChange={e => onChange(start, e)}
        />
      </div>
      {(presets.length > 0 || dur || placeholder) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.length > 0 && <span className="text-[11px] text-slate-400 mr-0.5">ช่วงด่วน</span>}
          {presets.map(p => (
            <button key={p.label} type="button" onClick={() => { const [a, b] = p.get(start); onChange(a, b); }}
              className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition ${activePreset === p ? 'bg-[#630330] text-white dark:bg-amber-400 dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
              {p.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {dur ? <>รวม <b className="font-semibold text-slate-700 dark:text-slate-200">{dur}</b></> : !start && !end && placeholder ? placeholder : start && !end ? 'เลือกวันสิ้นสุด' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Briefcase, GraduationCap, Copy, Check } from 'lucide-react';
import { ApplicationStatus, Major, InternshipType } from '../../types';

/* ------------------------------------------------------------------ */
/* Design tokens (Tailwind class strings)                              */
/* ------------------------------------------------------------------ */

export const inputCls =
  'w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-[#630330] focus:ring-4 focus:ring-[#630330]/10 dark:focus:border-amber-400 dark:focus:ring-amber-400/10 disabled:opacity-60';

export const textareaCls = inputCls.replace('h-10', 'min-h-[96px] py-2.5');

export const selectCls = `${inputCls} appearance-none pr-9 cursor-pointer`;

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type BtnSize = 'sm' | 'md';

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4';

const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-[#630330] text-white hover:bg-[#7a0b3d] shadow-sm focus-visible:ring-[#630330]/20',
  secondary:
    'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm focus-visible:ring-slate-200',
  ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-slate-200',
  subtle: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:ring-slate-200',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus-visible:ring-rose-200',
};

const btnSizes: Record<BtnSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

export const btn = (variant: BtnVariant = 'secondary', size: BtnSize = 'md') =>
  `${btnBase} ${btnVariants[variant]} ${btnSizes[size]}`;

export const iconBtn =
  'inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition';

export const card = 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl';

/* ------------------------------------------------------------------ */
/* Domain meta                                                         */
/* ------------------------------------------------------------------ */

export const STATUS_META: Record<ApplicationStatus, { label: string; dot: string; pill: string; text: string; bar: string; desc: string; hex: string }> = {
  [ApplicationStatus.ACCEPTED]: {
    label: 'ตอบรับแล้ว',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500', hex: '#10b981',
    desc: 'สถานประกอบการตอบรับเข้าฝึกงาน',
  },
  [ApplicationStatus.PREPARING]: {
    label: 'กำลังจัดเตรียม',
    dot: 'bg-sky-500',
    pill: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
    text: 'text-sky-600 dark:text-sky-400',
    bar: 'bg-sky-500', hex: '#0ea5e9',
    desc: 'อยู่ระหว่างดำเนินการจัดทำเอกสาร',
  },
  [ApplicationStatus.PENDING]: {
    label: 'รอตรวจสอบ',
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500', hex: '#f59e0b',
    desc: 'สถานะเริ่มต้นเมื่อนักศึกษาส่งข้อมูล',
  },
  [ApplicationStatus.REJECTED]: {
    label: 'ปฏิเสธ',
    dot: 'bg-rose-500',
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500', hex: '#f43f5e',
    desc: 'ไม่ผ่านการพิจารณาหรือยกเลิก',
  },
};

export const STATUS_ORDER: ApplicationStatus[] = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.PREPARING,
  ApplicationStatus.PENDING,
  ApplicationStatus.REJECTED,
];

export const statusMeta = (s?: ApplicationStatus) => STATUS_META[s || ApplicationStatus.PENDING] || STATUS_META[ApplicationStatus.PENDING];

// Categorical colors validated for CVD separation (orange / blue / indigo / aqua).
export const MAJOR_META: Record<Major, { short: string; full: string; pill: string; dot: string; hex: string }> = {
  [Major.HALAL_FOOD]: { short: 'R&D', full: 'อาหารฮาลาล', pill: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300', dot: 'bg-[#eb6834]', hex: '#eb6834' },
  [Major.DIGITAL_TECH]: { short: 'TDS', full: 'เทคโนโลยีดิจิทัล', pill: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300', dot: 'bg-[#2a78d6]', hex: '#2a78d6' },
  [Major.INFO_TECH]: { short: 'IT', full: 'เทคโนโลยีสารสนเทศ', pill: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300', dot: 'bg-[#4a3aa7] dark:bg-[#9085e9]', hex: '#4a3aa7' },
  [Major.DATA_SCIENCE]: { short: 'DSA', full: 'วิทยาการข้อมูล', pill: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300', dot: 'bg-[#1baf7a]', hex: '#1baf7a' },
};

export const majorMeta = (m?: Major) => MAJOR_META[m as Major] || { short: '-', full: '-', pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', hex: '#94a3b8' };

export const MAJOR_LIST: Major[] = [Major.HALAL_FOOD, Major.DIGITAL_TECH, Major.INFO_TECH, Major.DATA_SCIENCE];

/** Internship vs co-op: two distinct hues used everywhere in the admin (badges, row stripes, charts). */
export const TYPE_META: Record<InternshipType, { label: string; short: string; pill: string; dot: string; bar: string; text: string; soft: string; hex: string }> = {
  [InternshipType.INTERNSHIP]: {
    label: 'ฝึกงาน', short: 'ฝึกงาน',
    pill: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
    dot: 'bg-sky-500', bar: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', soft: 'bg-sky-50 dark:bg-sky-500/10', hex: '#0ea5e9',
  },
  [InternshipType.COOP]: {
    label: 'สหกิจศึกษา', short: 'สหกิจ',
    pill: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/30',
    dot: 'bg-fuchsia-500', bar: 'bg-fuchsia-500', text: 'text-fuchsia-600 dark:text-fuchsia-400', soft: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', hex: '#d946ef',
  },
};
export const TYPE_LIST: InternshipType[] = [InternshipType.INTERNSHIP, InternshipType.COOP];
export const typeMeta = (t?: InternshipType) => TYPE_META[t === InternshipType.COOP ? InternshipType.COOP : InternshipType.INTERNSHIP];
export const TypeIcon: React.FC<{ type?: InternshipType; size?: number; className?: string }> = ({ type, size = 12, className }) =>
  type === InternshipType.COOP ? <GraduationCap size={size} className={className} /> : <Briefcase size={size} className={className} />;

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

export const StatusBadge: React.FC<{ status?: ApplicationStatus }> = ({ status }) => {
  const m = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${m.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

/** Student ID that copies itself to the clipboard on click. */
export const StudentIdCopy: React.FC<{ id?: string | number; copied?: boolean; onCopy: (id: string) => void }> = ({ id, copied, onCopy }) => {
  const text = String(id ?? '').trim();
  if (!text) return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onCopy(text); }}
      title="คลิกเพื่อคัดลอกรหัส"
      className={`group/id mt-0.5 inline-flex items-center gap-1.5 -ml-1 px-1 rounded-md font-mono text-xs transition ${copied ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-slate-500 dark:text-slate-400 hover:text-[#630330] hover:bg-[#630330]/[0.06] dark:hover:text-amber-300 dark:hover:bg-amber-400/10'}`}
    >
      {text}
      {copied ? <Check size={12} /> : <Copy size={12} className="opacity-40 group-hover/id:opacity-100" />}
    </button>
  );
};
export const TypeBadge: React.FC<{ type?: InternshipType; short?: boolean }> = ({ type, short }) => {
  const m = typeMeta(type);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${m.pill}`}>
      <TypeIcon type={type} size={11} />
      {short ? m.short : m.label}
    </span>
  );
};

export const MajorBadge: React.FC<{ major?: Major; full?: boolean }> = ({ major, full }) => {
  const m = majorMeta(major);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${m.pill}`}>
      {m.short}
      {full && <span className="ml-1 font-medium opacity-80">· {m.full}</span>}
    </span>
  );
};

export const Field: React.FC<{ label: string; hint?: string; required?: boolean; className?: string; children: React.ReactNode }> = ({
  label,
  hint,
  required,
  className = '',
  children,
}) => (
  <label className={`block space-y-1.5 ${className}`}>
    <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
  </label>
);

export const Segmented = <T extends string>({
  value,
  onChange,
  options,
  className = '',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}) => (
  <div className={`inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={`flex-1 h-8 px-3 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
          value === o.value
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
  children: React.ReactNode;
  zIndex?: string;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl',
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, icon, size = 'md', footer, children, zIndex = 'z-[200]' }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/40 backdrop-blur-[2px] wise-fade-in`}
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${modalSizes[size]} bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 flex flex-col max-h-[92svh] wise-pop-in`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          {icon && (
            <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className={iconBtn} aria-label="ปิด">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 rounded-b-2xl">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc?: string; action?: React.ReactNode }> = ({ icon, title, desc, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">{icon}</div>
    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
    {desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{desc}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export const ToastStack: React.FC<{ toasts: ToastItem[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-sm">
    {toasts.map((t) => (
      <div
        key={t.id}
        onClick={() => onDismiss(t.id)}
        className="pointer-events-auto w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl text-sm font-medium wise-pop-in cursor-pointer"
      >
        {t.kind === 'success' && <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />}
        {t.kind === 'error' && <AlertCircle size={16} className="text-rose-400 dark:text-rose-600 shrink-0" />}
        {t.kind === 'info' && <Info size={16} className="text-sky-400 dark:text-sky-600 shrink-0" />}
        <span className="truncate">{t.message}</span>
      </div>
    ))}
  </div>
);

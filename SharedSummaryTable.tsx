
import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, Loader2, UserCheck, Lock, Pencil, PenLine } from 'lucide-react';
import { StudentStatusRecord, InternshipType } from './types';
import { StatusBadge, MajorBadge } from './components/admin/ui';
import { FieldLock, LockMap, acquireLock, releaseLock } from './liveSync';

export type SupervisorSaveOutcome = { ok: boolean; lock?: FieldLock } | void;
export type SupervisorSaveFn = (id: string, name: string, studentCode?: string) => Promise<SupervisorSaveOutcome> | SupervisorSaveOutcome;

interface SupervisorInputProps {
  rowId: string;
  studentCode?: string;
  initialValue?: string;
  onSave?: SupervisorSaveFn;
  disabled?: boolean;
  lock?: FieldLock;          // held by someone else
  live?: boolean;            // backend supports locking
  onLockDenied?: (lock: FieldLock) => void;
}

const HEARTBEAT_MS = 15000;

const SupervisorInput: React.FC<SupervisorInputProps> = ({
  rowId,
  studentCode,
  initialValue = '',
  onSave,
  disabled = false,
  lock,
  live = false,
  onLockDenied
}) => {
  const [val, setVal] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [acquiring, setAcquiring] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [flash, setFlash] = useState(false);
  const holding = useRef(false);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevInitial = useRef(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const stopHolding = () => {
    if (heartbeat.current) clearInterval(heartbeat.current);
    heartbeat.current = null;
    const was = holding.current;
    holding.current = false;
    return was;
  };

  // Release a held lock if the row unmounts mid-edit
  useEffect(() => () => { if (stopHolding()) releaseLock(rowId); }, [rowId]);

  // Follow remote changes when not editing; flash when someone else changed it
  useEffect(() => {
    if (!editing && saveStatus !== 'saving') {
      setVal(initialValue || '');
      if ((prevInitial.current || '') !== (initialValue || '') && saveStatus === 'idle') {
        setFlash(true);
        const t = setTimeout(() => setFlash(false), 2200);
        prevInitial.current = initialValue;
        return () => clearTimeout(t);
      }
    }
    prevInitial.current = initialValue;
  }, [initialValue, editing, saveStatus]);

  const startEdit = async () => {
    if (disabled || editing) return;
    if (lock) { onLockDenied?.(lock); return; }
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
    if (!live) return;
    setAcquiring(true);
    try {
      const r = await acquireLock(rowId);
      if (!r.ok && 'lock' in r && r.lock) {
        setEditing(false);
        setVal(initialValue || '');
        onLockDenied?.(r.lock);
        return;
      }
      if (r.ok) {
        holding.current = true;
        heartbeat.current = setInterval(() => { acquireLock(rowId).catch(() => undefined); }, HEARTBEAT_MS);
      }
    } catch (err) {
      console.warn('acquire lock failed', err);
    } finally {
      setAcquiring(false);
    }
  };

  const commit = async () => {
    const trimmed = val.trim();
    setEditing(false);
    const wasHolding = stopHolding();
    if (trimmed === (initialValue || '').trim()) {
      if (wasHolding) releaseLock(rowId);
      return;
    }
    setSaveStatus('saving');
    try {
      const res = onSave ? await onSave(rowId, trimmed, studentCode) : undefined;
      if (res && res.ok === false) {
        setVal(initialValue || '');
        setSaveStatus('idle');
        if (res.lock) onLockDenied?.(res.lock);
        return;
      }
      prevInitial.current = trimmed;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Failed to save supervisor:', err);
      setVal(initialValue || '');
      setSaveStatus('idle');
    }
  };

  const cancel = () => {
    setVal(initialValue || '');
    setEditing(false);
    if (stopHolding()) releaseLock(rowId);
  };

  // Someone else is typing in this field
  if (lock && !editing) {
    return (
      <div
        className="flex items-center gap-2 min-w-[200px] max-w-[260px] px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 cursor-not-allowed"
        title="มีผู้กำลังกรอกช่องนี้ ช่องจะเปิดให้แก้ไขเมื่อบันทึกเสร็จ"
      >
        <span className="relative flex w-2 h-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full w-2 h-2 bg-amber-500" />
        </span>
        <span className="text-xs font-medium text-amber-800 dark:text-amber-200 truncate">
          {lock.name ? `${lock.name} กำลังกรอก…` : 'มีผู้กำลังกรอก…'}
        </span>
        <PenLine size={12} className="ml-auto text-amber-500 shrink-0 animate-pulse" />
      </div>
    );
  }

  const hasSupervisor = Boolean(val && val.trim());
  if (hasSupervisor && !editing) {
    return (
      <div className={`relative flex items-center justify-between min-w-[200px] max-w-[260px] px-2.5 py-1.5 rounded-lg border group transition-all duration-500 ${
        flash
          ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-400/20'
          : 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/20'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {saveStatus === 'saving'
            ? <Loader2 size={12} className="text-emerald-600 animate-spin shrink-0" />
            : saveStatus === 'saved'
              ? <Check size={12} className="text-emerald-600 shrink-0" />
              : <Lock size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
          <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 truncate" title={val}>{val}</span>
        </div>
        {!disabled && saveStatus !== 'saving' && (
          <button
            type="button"
            onClick={startEdit}
            className="p-1 ml-1 rounded-md text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 opacity-60 group-hover:opacity-100 transition-all shrink-0"
            title="แก้ไขอาจารย์นิเทศ"
          >
            <Pencil size={11} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center min-w-[200px]">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled || saveStatus === 'saving'}
        placeholder="พิมพ์ชื่ออาจารย์นิเทศ…"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={startEdit}
        onBlur={() => { if (editing) commit(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          else if (e.key === 'Escape') { e.stopPropagation(); cancel(); (e.target as HTMLInputElement).blur(); }
        }}
        className={`w-full pr-8 pl-3 py-1.5 bg-white dark:bg-slate-800/80 border rounded-lg text-xs font-medium transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
          saveStatus === 'saved'
            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800 dark:text-emerald-300'
            : editing
              ? 'border-[#630330] ring-4 ring-[#630330]/10 dark:border-amber-400 dark:ring-amber-400/10 text-slate-900 dark:text-white'
              : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-slate-300'
        }`}
      />
      <div className="absolute right-2.5 pointer-events-none flex items-center justify-center">
        {(saveStatus === 'saving' || acquiring) && <Loader2 size={13} className="text-slate-400 animate-spin" />}
        {saveStatus === 'saved' && <Check size={13} className="text-emerald-500" />}
        {saveStatus === 'idle' && !acquiring && (editing && live
          ? <Lock size={12} className="text-[#630330] dark:text-amber-400" />
          : <UserCheck size={13} className="text-slate-400 dark:text-slate-500 opacity-60" />)}
      </div>
    </div>
  );
};

interface SharedSummaryTableProps {
  students: StudentStatusRecord[];
  formatDateBE: (dateStr?: string) => string;
  isReadOnly?: boolean;
  showSupervisor?: boolean;
  onSupervisorChange?: SupervisorSaveFn;
  locks?: LockMap;
  live?: boolean;
  onLockDenied?: (lock: FieldLock) => void;
}

const SharedSummaryTable: React.FC<SharedSummaryTableProps> = ({
  students,
  formatDateBE,
  isReadOnly = false,
  showSupervisor = true,
  onSupervisorChange,
  locks = {},
  live = false,
  onLockDenied
}) => {
  const th = 'px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap';
  return (
    <div className="flex-1 overflow-auto min-h-0 custom-scrollbar bg-white dark:bg-slate-900">
      <table className="w-full text-left text-sm min-w-[1150px]">
        <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur">
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className={th}>ปี/เทอม</th>
            <th className={th}>สถานะ</th>
            <th className={th}>นักศึกษา</th>
            <th className={th}>สาขา</th>
            <th className={th}>ประเภท</th>
            <th className={th}>สถานที่ฝึกงาน</th>
            <th className={th}>ตำแหน่ง</th>
            <th className={th}>ระยะเวลา</th>
            {showSupervisor && <th className={th}>อาจารย์นิเทศ</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {students.map(student => {
            const rowId = student.id || student.studentId;
            const lock = locks[rowId];
            return (
              <tr key={student.id} className={`transition-colors print:break-inside-avoid ${lock ? 'bg-amber-50/40 dark:bg-amber-500/[0.04]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <td className="px-4 py-2.5 align-top text-xs text-slate-500 whitespace-nowrap tabular-nums">
                  {student.academicYear || '-'} / {student.term || '-'}
                </td>
                <td className="px-4 py-2.5 align-top"><StatusBadge status={student.status} /></td>
                <td className="px-4 py-2.5 align-top min-w-[180px]">
                  <div className="font-semibold text-slate-900 dark:text-white leading-snug break-words">{student.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{student.studentId}</div>
                </td>
                <td className="px-4 py-2.5 align-top"><MajorBadge major={student.major} /></td>
                <td className="px-4 py-2.5 align-top text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {student.internshipType === InternshipType.INTERNSHIP ? 'ฝึกงาน' : 'สหกิจ'}
                </td>
                <td className="px-4 py-2.5 align-top text-slate-700 dark:text-slate-200 min-w-[200px]">{student.location || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                <td className="px-4 py-2.5 align-top text-slate-600 dark:text-slate-300">{student.position || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                <td className="px-4 py-2.5 align-top text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {student.startDate && student.endDate ? `${formatDateBE(student.startDate)} – ${formatDateBE(student.endDate)}` : student.startDate ? `${formatDateBE(student.startDate)} – ไม่ระบุ` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>
                {showSupervisor && (
                  <td className="px-4 py-2 align-top">
                    {isReadOnly ? (
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{student.supervisor || '-'}</span>
                    ) : (
                      <SupervisorInput
                        rowId={rowId}
                        studentCode={student.studentId}
                        initialValue={student.supervisor}
                        onSave={onSupervisorChange}
                        lock={lock}
                        live={live}
                        onLockDenied={onLockDenied}
                      />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {students.length === 0 && (
            <tr>
              <td colSpan={showSupervisor ? 9 : 8} className="py-20 text-center">
                <Search size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">ไม่พบรายชื่อนักศึกษาในหมวดนี้</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SharedSummaryTable;

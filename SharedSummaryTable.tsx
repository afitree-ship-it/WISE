import React, { useState } from 'react';
import { Search, Lock, Edit2, Check, X, Loader2 } from 'lucide-react';
import { StudentStatusRecord, Major, InternshipType, ApplicationStatus } from './types';

const LOCK_EXPIRY_MS = 5 * 60 * 1000;

interface SharedSummaryTableProps {
  students: StudentStatusRecord[];
  formatDateBE: (dateStr?: string) => string;
  isReadOnly?: boolean;
  showSupervisor?: boolean;
  onSupervisorChange?: (id: string, name: string) => void;
  sessionId?: string;
  onSupervisorEdit?: (id: string) => Promise<boolean>;
  onSupervisorSave?: (id: string, name: string) => Promise<void>;
  onSupervisorCancel?: (id: string) => void;
}

const SharedSummaryTable: React.FC<SharedSummaryTableProps> = ({
  students, formatDateBE, isReadOnly = false, showSupervisor = true,
  onSupervisorChange, sessionId, onSupervisorEdit, onSupervisorSave, onSupervisorCancel,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);

  const isLockedByOther = (s: StudentStatusRecord) => {
    if (!s.supervisorLock || !s.supervisorLockedAt) return false;
    if (s.supervisorLock === sessionId) return false;
    return Date.now() - Number(s.supervisorLockedAt) < LOCK_EXPIRY_MS;
  };

  const handleStartEdit = async (student: StudentStatusRecord) => {
    if (isLockedByOther(student) || editingId === student.id || !onSupervisorEdit) return;
    setLockingId(student.id);
    const acquired = await onSupervisorEdit(student.id);
    setLockingId(null);
    if (acquired) {
      setEditingId(student.id);
      setEditValue(student.supervisor || '');
    }
  };

  const handleSave = async (id: string) => {
    if (!onSupervisorSave) return;
    setSavingId(id);
    await onSupervisorSave(id, editValue);
    setSavingId(null);
    setEditingId(null);
  };

  const handleCancel = (id: string) => {
    onSupervisorCancel?.(id);
    setEditingId(null);
    setEditValue('');
  };

  const renderSupervisorCell = (student: StudentStatusRecord) => {
    if (isReadOnly) {
      return <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{student.supervisor || '-'}</span>;
    }
    if (isLockedByOther(student)) {
      return (
        <div className="flex items-center gap-1.5 text-amber-500 px-2 py-1">
          <Lock size={12} />
          <span className="text-[11px] font-black uppercase">กำลังแก้ไข...</span>
        </div>
      );
    }
    if (editingId === student.id) {
      return (
        <div className="flex items-center gap-1 min-w-[200px]">
          <input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave(student.id);
              if (e.key === 'Escape') handleCancel(student.id);
            }}
            autoFocus
            placeholder="ชื่ออาจารย์นิเทศ..."
            className="flex-1 px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg text-sm font-bold outline-none ring-2 ring-indigo-500/20"
          />
          <button onClick={() => handleSave(student.id)} disabled={!!savingId}
            className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 shrink-0 select-none cursor-pointer">
            {savingId === student.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
          <button onClick={() => handleCancel(student.id)}
            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 shrink-0 select-none cursor-pointer">
            <X size={12} />
          </button>
        </div>
      );
    }
    return (
      <div onClick={() => handleStartEdit(student)}
        className="group flex items-center gap-2 cursor-pointer min-w-[150px] px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
        {lockingId === student.id
          ? <Loader2 size={12} className="text-indigo-400 animate-spin shrink-0" />
          : <Edit2 size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />}
        <span className={`text-sm font-bold ${student.supervisor ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300'}`}>
          {student.supervisor || 'คลิกเพื่อกรอก...'}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto min-h-0 custom-scrollbar rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <table className="w-full text-left border-collapse min-w-[1200px]">
        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-sm">
          <tr>
            <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700">ปีการศึกษา/เทอม</th>
            <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">สถานะ</th>
            <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700">รหัสนักศึกษา</th>
            <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700 w-[180px] min-w-[180px]">ชื่อ-นามสกุล</th>
            <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700">สาขา</th>
            <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700">ประเภท</th>
            <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700">สถานที่ฝึกงาน</th>
            <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700">ตำแหน่ง</th>
            <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700">วันที่เริ่ม-สิ้นสุด</th>
            {showSupervisor && <th className="px-4 py-2.5 text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">อาจารย์นิเทศ</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {students.map(student => (
            <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors print:break-inside-avoid">
              <td className="px-4 py-2 align-top">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-900 leading-tight">ปี {student.academicYear || '-'}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เทอม {student.term || '-'}</span>
                </div>
              </td>
              <td className="px-4 py-2 align-top">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border whitespace-nowrap ${
                  student.status === ApplicationStatus.ACCEPTED ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                  student.status === ApplicationStatus.REJECTED ? 'bg-rose-50 border-rose-100 text-rose-600' :
                  student.status === ApplicationStatus.PREPARING ? 'bg-blue-50 border-blue-100 text-blue-600' :
                  'bg-amber-50 border-amber-100 text-amber-600'
                }`}>
                  {student.status === ApplicationStatus.ACCEPTED ? 'ตอบรับแล้ว' :
                   student.status === ApplicationStatus.REJECTED ? 'ปฏิเสธ' :
                   student.status === ApplicationStatus.PREPARING ? 'กำลังจัดเตรียม' : 'รอตรวจสอบ'}
                </span>
              </td>
              <td className="px-4 py-2 text-sm font-black text-slate-500 font-mono tracking-tighter align-top">{student.studentId}</td>
              <td className="px-4 py-2 text-sm sm:text-base font-bold text-slate-900 dark:text-white w-[180px] min-w-[180px] leading-tight align-top break-words">{student.name}</td>
              <td className="px-4 py-2 align-top">
                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md border whitespace-nowrap ${
                  student.major === Major.HALAL_FOOD ? 'bg-amber-50 border-amber-100 text-amber-600' :
                  student.major === Major.DIGITAL_TECH ? 'bg-blue-50 border-blue-100 text-blue-600' :
                  student.major === Major.INFO_TECH ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                  'bg-emerald-50 border-emerald-100 text-emerald-600'
                }`}>
                  {student.major === Major.HALAL_FOOD ? 'R&D (อาหารฮาลาล)' :
                   student.major === Major.DIGITAL_TECH ? 'TDS (ดิจิทัล)' :
                   student.major === Major.INFO_TECH ? 'IT (เทคโนโลยีฯ)' : 'DSA (ดาต้า)'}
                </span>
              </td>
              <td className="px-4 py-2 align-top">
                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md border ${
                  student.internshipType === InternshipType.INTERNSHIP
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                }`}>
                  {student.internshipType === InternshipType.INTERNSHIP ? 'ฝึกงาน' : 'สหกิจ'}
                </span>
              </td>
              <td className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-400 align-top">{student.location || '-'}</td>
              <td className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-400 align-top">{student.position || '-'}</td>
              <td className="px-4 py-2 text-sm font-bold text-slate-600 whitespace-nowrap align-top">
                {student.startDate && student.endDate ? `${formatDateBE(student.startDate)} - ${formatDateBE(student.endDate)}` : '-'}
              </td>
              {showSupervisor && (
                <td className="px-4 py-2 align-top">
                  {renderSupervisorCell(student)}
                </td>
              )}
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={showSupervisor ? 10 : 9} className="py-20 text-center">
                <Search size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-base font-black uppercase text-slate-300">ไม่พบรายชื่อนักศึกษาในหมวดนี้</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SharedSummaryTable;

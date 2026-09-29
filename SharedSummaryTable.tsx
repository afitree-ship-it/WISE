
import React, { useState, useEffect } from 'react';
import { Search, Check, Loader2, UserCheck, Lock, Pencil } from 'lucide-react';
import { StudentStatusRecord, Major, InternshipType, ApplicationStatus } from './types';

interface SupervisorInputProps {
  studentId: string;
  initialValue?: string;
  onSave?: (id: string, name: string) => void;
  disabled?: boolean;
}

const SupervisorInput: React.FC<SupervisorInputProps> = ({
  studentId,
  initialValue = '',
  onSave,
  disabled = false
}) => {
  const [val, setVal] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Keep local state updated with prop changes when user is NOT actively typing or saving
  useEffect(() => {
    if (!isFocused && !isEditing && saveStatus !== 'saving') {
      if (initialValue) {
        setVal(initialValue);
      } else if (!val) {
        setVal('');
      }
    }
  }, [initialValue, isFocused, isEditing, saveStatus]);

  const commitChange = async () => {
    const trimmed = val.trim();
    setIsEditing(false);
    if (trimmed !== (initialValue || '').trim()) {
      setSaveStatus('saving');
      try {
        if (onSave) {
          await onSave(studentId, trimmed);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        console.error('Failed to save supervisor:', err);
        setSaveStatus('idle');
      }
    }
  };

  // If a supervisor is already filled and user is not actively editing it, display the locked state
  const hasSupervisor = Boolean(val && val.trim());
  if (hasSupervisor && !isEditing) {
    return (
      <div className="relative flex items-center justify-between min-w-[190px] max-w-[240px] px-2.5 py-1.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg shadow-sm group transition-all">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Lock size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate" title={val}>
            {val}
          </span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-1 ml-1 rounded-md text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 opacity-60 group-hover:opacity-100 transition-all shrink-0"
            title="คลิกเพื่อแก้ไขอาจารย์นิเทศ"
          >
            <Pencil size={11} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center min-w-[190px]">
      <input
        type="text"
        disabled={disabled}
        autoFocus={isEditing}
        placeholder="พิมพ์ชื่ออาจารย์นิเทศ..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          commitChange();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setVal(initialValue || '');
            setIsEditing(false);
          }
        }}
        className={`w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border rounded-lg text-xs font-bold transition-all shadow-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
          saveStatus === 'saved'
            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800 dark:text-emerald-300'
            : saveStatus === 'saving'
            ? 'border-indigo-400 bg-indigo-50/30'
            : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
        }`}
      />
      <div className="absolute right-2.5 pointer-events-none flex items-center justify-center">
        {saveStatus === 'saving' && (
          <Loader2 size={13} className="text-indigo-500 animate-spin" />
        )}
        {saveStatus === 'saved' && (
          <Check size={13} className="text-emerald-500 animate-in zoom-in-75 duration-200" />
        )}
        {saveStatus === 'idle' && (
          <UserCheck size={13} className="text-slate-400 dark:text-slate-500 opacity-60" />
        )}
      </div>
    </div>
  );
};

interface SharedSummaryTableProps {
  students: StudentStatusRecord[];
  formatDateBE: (dateStr?: string) => string;
  isReadOnly?: boolean;
  showSupervisor?: boolean;
  onSupervisorChange?: (id: string, name: string) => void;
}

const SharedSummaryTable: React.FC<SharedSummaryTableProps> = ({ 
  students, 
  formatDateBE, 
  isReadOnly = false,
  showSupervisor = true,
  onSupervisorChange 
}) => {
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
                   <span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-tight">ปี {student.academicYear || '-'}</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เทอม {student.term || '-'}</span>
                 </div>
              </td>
              <td className="px-4 py-2 align-top">
                 <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border whitespace-nowrap ${
                   student.status === ApplicationStatus.ACCEPTED ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400' :
                   student.status === ApplicationStatus.REJECTED ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400' :
                   student.status === ApplicationStatus.PREPARING ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400' :
                   'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400'
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
                    student.major === Major.HALAL_FOOD ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400' : 
                    student.major === Major.DIGITAL_TECH ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400' :
                    student.major === Major.INFO_TECH ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400' :
                    'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                 }`}>
                   {student.major === Major.HALAL_FOOD ? 'R&D (อาหารฮาลาล)' : 
                    student.major === Major.DIGITAL_TECH ? 'TDS (ดิจิทัล)' : 
                    student.major === Major.INFO_TECH ? 'IT (เทคโนโลยีฯ)' : 
                    'DSA (ดาต้า)'}
                 </span>
              </td>
              <td className="px-4 py-2 align-top">
                 <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md border ${
                    student.internshipType === InternshipType.INTERNSHIP 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400' 
                      : 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400'
                 }`}>
                   {student.internshipType === InternshipType.INTERNSHIP ? 'ฝึกงาน' : 'สหกิจ'}
                 </span>
              </td>
              <td className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 align-top">{student.location || '-'}</td>
              <td className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 align-top">{student.position || '-'}</td>
              <td className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap align-top">
                  {student.startDate && student.endDate ? `${formatDateBE(student.startDate)} - ${formatDateBE(student.endDate)}` : student.startDate ? `${formatDateBE(student.startDate)} - ไม่ระบุ` : '-'}
              </td>
              {showSupervisor && (
                <td className="px-4 py-2 align-top">
                  {isReadOnly ? (
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{student.supervisor || '-'}</span>
                  ) : (
                    <SupervisorInput
                      studentId={student.id || student.studentId}
                      initialValue={student.supervisor}
                      onSave={onSupervisorChange}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={showSupervisor ? 10 : 9} className="py-20 text-center">
                <Search size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-base font-black uppercase text-slate-300 dark:text-slate-600">ไม่พบรายชื่อนักศึกษาในหมวดนี้</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SharedSummaryTable;


import React from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { StudentStatusRecord, Major, InternshipType, ApplicationStatus } from './types';

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
                    student.major === Major.INFO_TECH ? 'IT (เทคโนโลยีฯ)' : 
                    'DSA (ดาต้า)'}
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
                  {isReadOnly ? (
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{student.supervisor || '-'}</span>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="ชื่ออาจารย์..." 
                      defaultValue={student.supervisor}
                      onBlur={(e) => {
                        if (onSupervisorChange && e.target.value !== student.supervisor) {
                          onSupervisorChange(student.id, e.target.value);
                        }
                      }}
                      className="w-full min-w-[180px] px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={showSupervisor ? 8 : 7} className="py-20 text-center">
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

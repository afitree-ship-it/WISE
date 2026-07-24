
import React, { useMemo, useState } from 'react';
import { ClipboardList, ArrowLeft, Share2, Calendar, BookOpen, Printer } from 'lucide-react';
import { StudentStatusRecord, ApplicationStatus } from './types';
import SharedSummaryTable from './SharedSummaryTable';
import { formatDateBE } from './dateUtils';
import { ShareLinkModal } from './components/ShareLinkModal';

interface SummaryPageProps {
  students: StudentStatusRecord[];
  onBack: () => void;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ students, onBack }) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const years = useMemo(() => {
    const uniqueYears = Array.from(new Set(students.map(s => String(s.academicYear || '').trim()).filter(Boolean)))
      .filter(y => /^\d+$/.test(y)); // Ensure only numeric values are treated as academic years to prevent UI issues from old/shifted columns
    return uniqueYears.sort((a, b) => b.localeCompare(a));
  }, [students]);

  const terms = useMemo(() => {
    const uniqueTerms = Array.from(new Set(students.map(s => String(s.term || '').trim()).filter(Boolean)))
      .filter(t => /^\d+$/.test(t) && t !== '3'); // Ensure only numeric values are treated as term numbers, excluding term 3
    return uniqueTerms.sort();
  }, [students]);

  const [selectedYears, setSelectedYears] = useState<string[]>(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const y = params.get('years');
    return y ? y.split(',') : []; // Default to empty (shows all)
  });
  
  const [selectedTerms, setSelectedTerms] = useState<string[]>(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const t = params.get('terms');
    return t ? t.split(',') : []; // Default to empty (shows all)
  });

  const summaryStudents = useMemo(() => {
    return students.filter(s => {
      const studentYear = String(s.academicYear || '').trim();
      const studentTerm = String(s.term || '').trim();
      
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(studentYear);
      const matchesTerm = selectedTerms.length === 0 || selectedTerms.includes(studentTerm);
      
      return matchesYear && matchesTerm;
    }).sort((a, b) => {
      // Sort Accepted first, then by last updated
      if (a.status === ApplicationStatus.ACCEPTED && b.status !== ApplicationStatus.ACCEPTED) return -1;
      if (a.status !== ApplicationStatus.ACCEPTED && b.status === ApplicationStatus.ACCEPTED) return 1;
      return b.lastUpdated - a.lastUpdated;
    });
  }, [students, selectedYears, selectedTerms]);

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const toggleYear = (year: string) => {
    setSelectedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
  };

  const toggleTerm = (term: string) => {
    setSelectedTerms(prev => prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-8 flex flex-col items-center">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: auto; margin: 0 !important; }
          html, body { 
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body { 
            background: white !important; 
            padding: 10mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          header, footer, nav, aside { display: none !important; }
          .print-content { 
            height: auto !important; 
            box-shadow: none !important;
            border: 1px solid #f1f5f9 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
            border-radius: 0 !important;
          }
          .custom-scrollbar { overflow: visible !important; }
          table { width: 100% !important; min-width: 0 !important; }
          th, td { padding: 8px 6px !important; font-size: 10px !important; }
          th { background-color: #f1f5f9 !important; }
          .sticky { position: static !important; }
          
          /* Force colors for badges */
          .bg-amber-50 { background-color: #fffbeb !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-indigo-50 { background-color: #eef2ff !important; }
          .bg-emerald-50 { background-color: #ecfdf5 !important; }
          .text-amber-600 { color: #d97706 !important; }
          .text-blue-600 { color: #2563eb !important; }
          .text-indigo-600 { color: #4f46e5 !important; }
          .text-emerald-600 { color: #059669 !important; }
        }
      `}} />
      <div className="w-full max-w-[98%] xl:max-w-[99%] px-1 sm:px-4">
        <header className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 no-print">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={onBack}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                <ClipboardList size={28} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 dark:text-white leading-none">สรุปภาพรวมการฝึกงาน</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Full Internship Summary View</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
             {/* Year Multi-Select chips */}
             <div className="flex flex-wrap gap-1 items-center max-w-[300px]">
                {years.map(y => (
                  <button 
                    key={y}
                    onClick={() => toggleYear(y)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      selectedYears.includes(y) 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                      : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                    }`}
                  >
                    ปี {y}
                  </button>
                ))}
             </div>

             <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

             {/* Term Multi-Select chips */}
             <div className="flex flex-wrap gap-1 items-center">
                {terms.map(t => (
                  <button 
                    key={t}
                    onClick={() => toggleTerm(t)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      selectedTerms.includes(t) 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none' 
                      : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                    }`}
                  >
                    เทอม {t}
                  </button>
                ))}
             </div>

             <div className="flex items-center gap-2 ml-auto md:ml-2">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase text-xs hover:bg-slate-50 transition-all"
                >
                  <Printer size={16} /> พิมพ์
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                >
                  <Share2 size={16} /> แชร์ลิงก์
                </button>
             </div>
          </div>
        </header>

        {/* Print Header */}
        <div className="hidden print:block mb-6 text-center">
            <h1 className="text-2xl font-black uppercase text-slate-900 leading-none">สรุปภาพรวมการฝึกงาน</h1>
            <p className="text-xs font-bold text-slate-500 uppercase mt-2 tracking-widest">
              ปีการศึกษา: {selectedYears.length > 0 ? selectedYears.join(', ') : "ทั้งหมด"} {selectedTerms.length > 0 ? `| ภาคเรียน: ${selectedTerms.join(', ')}` : ""}
            </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-3 sm:p-5 shadow-2xl shadow-indigo-100/20 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col h-[84vh] sm:h-[88vh] max-h-[88vh] print-content min-h-0 overflow-hidden">
           <SharedSummaryTable 
             students={summaryStudents} 
             formatDateBE={formatDateBE} 
             isReadOnly={true} 
             showSupervisor={true}
           />
           <footer className="mt-3 pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-50 dark:border-slate-800 no-print">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Live View Only • {summaryStudents.length} Students Listed
                </p>
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Last Refresh: {new Date().toLocaleTimeString('th-TH')}
              </p>
           </footer>
           <div className="hidden print:block mt-4 text-[10px] text-slate-400 font-bold text-right italic">
              ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
           </div>
        </div>
      </div>
    </div>
      <ShareLinkModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        years={selectedYears} 
        terms={selectedTerms} 
      />
    </>
  );
};

export default SummaryPage;

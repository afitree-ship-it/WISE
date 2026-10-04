
import React, { useMemo, useState, useEffect } from 'react';
import { ClipboardList, ArrowLeft, Share2, Printer, RefreshCw, FileSpreadsheet, FileText, Info, UserRound, PenLine } from 'lucide-react';
import { StudentStatusRecord, ApplicationStatus, Major } from './types';
import SharedSummaryTable, { SupervisorSaveFn } from './SharedSummaryTable';
import { LockMap, FieldLock, getEditorName, setEditorName } from './liveSync';
import { formatDateBE } from './dateUtils';
import { ShareLinkModal } from './components/ShareLinkModal';
import { exportToExcel, exportToWord, exportToPDF } from './exportUtils';
import { btn, MAJOR_META, MAJOR_LIST, STATUS_META, STATUS_ORDER, ToastStack, ToastItem } from './components/admin/ui';

interface SummaryPageProps {
  students: StudentStatusRecord[];
  onBack: () => void;
  onSupervisorChange?: SupervisorSaveFn;
  fetchFromSheets?: () => Promise<void>;
  isLoading?: boolean;
  isSyncing?: boolean;
  locks?: LockMap;
  liveSupported?: boolean | null;
  lastLiveSync?: number | null;
  logo?: string;
}

const readHashList = (key: string) => {
  const hash = window.location.hash.replace(/^#\??/, '');
  const v = new URLSearchParams(hash).get(key);
  return v ? v.split(',') : []; // Default to empty (shows all)
};

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition ${
      active
        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
    }`}
  >
    {children}
  </button>
);

const SummaryPage: React.FC<SummaryPageProps> = ({
  students,
  onBack,
  onSupervisorChange,
  fetchFromSheets,
  isLoading = false,
  isSyncing = false,
  locks = {},
  liveSupported = null,
  lastLiveSync = null,
  logo
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const [editorName, setEditorNameState] = useState(getEditorName());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const notify = (message: string, kind: ToastItem['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };
  const onLockDenied = (lock: FieldLock) =>
    notify(lock.name ? `${lock.name} กำลังกรอกช่องนี้อยู่ กรุณารอสักครู่` : 'มีผู้กำลังกรอกช่องนี้อยู่ กรุณารอสักครู่', 'error');

  // Supervisor values + locks arrive through the live endpoint (every few seconds).
  // Full refresh catches new/removed students; it runs fast only on the older backend.
  useEffect(() => {
    if (!fetchFromSheets) return;
    const every = liveSupported === false ? 6000 : 60000;
    const interval = setInterval(() => {
      fetchFromSheets();
      setLastRefreshedAt(new Date());
    }, every);
    return () => clearInterval(interval);
  }, [fetchFromSheets, liveSupported]);

  useEffect(() => { if (lastLiveSync) setLastRefreshedAt(new Date(lastLiveSync)); }, [lastLiveSync]);

  const editingCount = Object.keys(locks).length;

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

  const [selectedYears, setSelectedYears] = useState<string[]>(() => readHashList('years'));
  const [selectedTerms, setSelectedTerms] = useState<string[]>(() => readHashList('terms'));
  const [selectedMajors, setSelectedMajors] = useState<string[]>(() => readHashList('majors'));

  const summaryStudents = useMemo(() => {
    return students.filter(s => {
      const studentYear = String(s.academicYear || '').trim();
      const studentTerm = String(s.term || '').trim();
      const studentMajor = String(s.major || '').trim();

      const matchesYear = selectedYears.length === 0 || selectedYears.includes(studentYear);
      const matchesTerm = selectedTerms.length === 0 || selectedTerms.includes(studentTerm);
      const matchesMajor = selectedMajors.length === 0 || selectedMajors.includes(studentMajor);

      return matchesYear && matchesTerm && matchesMajor;
    }).sort((a, b) => {
      // Sort Accepted first, then by last updated
      if (a.status === ApplicationStatus.ACCEPTED && b.status !== ApplicationStatus.ACCEPTED) return -1;
      if (a.status !== ApplicationStatus.ACCEPTED && b.status === ApplicationStatus.ACCEPTED) return 1;
      return b.lastUpdated - a.lastUpdated;
    });
  }, [students, selectedYears, selectedTerms, selectedMajors]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let withSupervisor = 0;
    summaryStudents.forEach(s => {
      const k = s.status || ApplicationStatus.PENDING;
      byStatus[k] = (byStatus[k] || 0) + 1;
      if (s.supervisor && s.supervisor.trim()) withSupervisor++;
    });
    return { byStatus, withSupervisor };
  }, [summaryStudents]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const handleManualRefresh = async () => {
    if (fetchFromSheets) {
      await fetchFromSheets();
      setLastRefreshedAt(new Date());
    }
  };

  const exportTitle = 'สรุปรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา';

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: auto; margin: 0 !important; }
            html, body { margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
            body { background: white !important; padding: 10mm !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .no-print { display: none !important; }
            header, footer, nav, aside { display: none !important; }
            .print-content { height: auto !important; max-height: none !important; box-shadow: none !important; border: 1px solid #f1f5f9 !important; padding: 0 !important; overflow: visible !important; background: white !important; border-radius: 0 !important; }
            .custom-scrollbar { overflow: visible !important; }
            table { width: 100% !important; min-width: 0 !important; }
            th, td { padding: 8px 6px !important; font-size: 10px !important; }
            th { background-color: #f1f5f9 !important; }
            .sticky { position: static !important; }
          }
        `}} />

        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition" title="กลับหน้าหลัก">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {logo
                ? <img src={logo} alt="โลโก้" className="h-7 max-w-[120px] object-contain shrink-0" />
                : <ClipboardList size={18} className="text-[#630330] dark:text-amber-400 shrink-0" />}
              <h1 className="text-base font-semibold truncate">สรุปภาพรวมการฝึกงาน</h1>
              <span className={`hidden sm:inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium ${liveSupported === false ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${liveSupported === false ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
                {liveSupported === false ? 'รีเฟรชทุก 6 วินาที' : 'เรียลไทม์'}
              </span>
              {editingCount > 0 && (
                <span className="hidden md:inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-amber-50 dark:bg-amber-500/10 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  <PenLine size={11} /> กำลังกรอก {editingCount} ช่อง
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={handleManualRefresh} disabled={isLoading || isSyncing} className={btn('ghost', 'sm')} title="รีเฟรชข้อมูล">
                <RefreshCw size={14} className={isLoading || isSyncing ? 'animate-spin' : ''} />
                <span className="hidden md:inline">{isLoading || isSyncing ? 'กำลังซิงค์…' : 'รีเฟรช'}</span>
              </button>
              <div className="hidden sm:flex items-center">
                <button onClick={() => exportToExcel(summaryStudents, exportTitle)} className={btn('ghost', 'sm')} title="ดาวน์โหลด Excel"><FileSpreadsheet size={14} /> <span className="hidden lg:inline">Excel</span></button>
                <button onClick={() => exportToWord(summaryStudents, exportTitle)} className={btn('ghost', 'sm')} title="ดาวน์โหลด Word"><FileText size={14} /> <span className="hidden lg:inline">Word</span></button>
                <button onClick={() => exportToPDF(summaryStudents, exportTitle)} className={btn('ghost', 'sm')} title="พิมพ์ / PDF"><Printer size={14} /> <span className="hidden lg:inline">PDF</span></button>
              </div>
              <button onClick={() => setIsShareModalOpen(true)} className={btn('primary', 'sm')}>
                <Share2 size={14} /> แชร์
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-4">
          {/* Print header */}
          <div className="hidden print:block mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">สรุปภาพรวมการฝึกงาน</h1>
            <p className="text-xs text-slate-500 mt-2">
              ปีการศึกษา: {selectedYears.length > 0 ? selectedYears.join(', ') : "ทั้งหมด"} {selectedTerms.length > 0 ? `| ภาคเรียน: ${selectedTerms.join(', ')}` : ""}
            </p>
          </div>

          {/* Quick counts */}
          <div className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <p className="text-xs text-slate-500">นักศึกษา</p>
              <p className="text-xl font-bold tabular-nums mt-0.5">{summaryStudents.length}</p>
            </div>
            {STATUS_ORDER.map(st => (
              <div key={st} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[st].dot}`} />{STATUS_META[st].label}</p>
                <p className={`text-xl font-bold tabular-nums mt-0.5 ${STATUS_META[st].text}`}>{counts.byStatus[st] || 0}</p>
              </div>
            ))}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <p className="text-xs text-slate-500">มีอาจารย์นิเทศแล้ว</p>
              <p className="text-xl font-bold tabular-nums mt-0.5">{counts.withSupervisor}<span className="text-sm font-medium text-slate-400">/{summaryStudents.length}</span></p>
            </div>
          </div>

          {/* Filters */}
          <div className="no-print flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              <span className="text-xs text-slate-500 shrink-0 mr-1">ปี</span>
              <Chip active={selectedYears.length === 0} onClick={() => setSelectedYears([])}>ทั้งหมด</Chip>
              {years.map(y => <Chip key={y} active={selectedYears.includes(y)} onClick={() => toggle(setSelectedYears)(y)}>{y}</Chip>)}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              <span className="text-xs text-slate-500 shrink-0 mr-1">เทอม</span>
              <Chip active={selectedTerms.length === 0} onClick={() => setSelectedTerms([])}>ทั้งหมด</Chip>
              {terms.map(t => <Chip key={t} active={selectedTerms.includes(t)} onClick={() => toggle(setSelectedTerms)(t)}>{t}</Chip>)}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              <span className="text-xs text-slate-500 shrink-0 mr-1">สาขา</span>
              <Chip active={selectedMajors.length === 0} onClick={() => setSelectedMajors([])}>ทั้งหมด</Chip>
              {MAJOR_LIST.map((m: Major) => <Chip key={m} active={selectedMajors.includes(m)} onClick={() => toggle(setSelectedMajors)(m)}>{MAJOR_META[m].short}</Chip>)}
            </div>
          </div>

          {/* Guidance */}
          <div className="no-print flex flex-col md:flex-row md:items-center gap-3 px-3.5 py-2.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-xs text-sky-900 dark:text-sky-200">
            <div className="flex items-start gap-2.5 flex-1">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p>
                <b>ระบุอาจารย์นิเทศ:</b> พิมพ์ชื่อในคอลัมน์ "อาจารย์นิเทศ" แล้วกด Enter ทุกคนจะเห็นทันที
                {liveSupported !== false && <> · ระหว่างที่คุณกรอก ช่องนั้นจะถูก<b>ล็อก</b>ไม่ให้ผู้อื่นแก้ไขพร้อมกัน</>}
              </p>
            </div>
            {liveSupported !== false && (
              <label className="flex items-center gap-2 shrink-0">
                <UserRound size={14} className="shrink-0" />
                <span className="whitespace-nowrap">ชื่อของคุณ</span>
                <input
                  value={editorName}
                  onChange={(e) => { setEditorNameState(e.target.value); setEditorName(e.target.value); }}
                  placeholder="เช่น อ.สมชาย"
                  className="h-8 w-40 px-2.5 rounded-md border border-sky-200 dark:border-sky-500/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-sky-400/30"
                  title="ชื่อนี้จะแสดงให้ผู้อื่นเห็นขณะที่คุณกำลังกรอก"
                />
              </label>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col h-[68vh] print-content min-h-0 overflow-hidden">
            <SharedSummaryTable
              students={summaryStudents}
              formatDateBE={formatDateBE}
              isReadOnly={false}
              showSupervisor={true}
              onSupervisorChange={onSupervisorChange}
              locks={locks}
              live={liveSupported === true}
              onLockDenied={onLockDenied}
            />
          </div>
          <footer className="no-print flex items-center justify-between text-[11px] text-slate-400">
            <span>{isSyncing ? 'กำลังบันทึกข้อมูล…' : 'เชื่อมต่อแบบเรียลไทม์'}</span>
            <span>รีเฟรชล่าสุด {lastRefreshedAt.toLocaleTimeString('th-TH')}</span>
          </footer>
          <div className="hidden print:block mt-4 text-[10px] text-slate-400 text-right italic">
            ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
          </div>
        </main>
      </div>
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        years={selectedYears}
        terms={selectedTerms}
        availableYears={years}
        availableTerms={terms}
      />
    </>
  );
};

export default SummaryPage;

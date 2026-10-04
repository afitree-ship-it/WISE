import React, { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, RefreshCw, Printer } from 'lucide-react';
import { StudentStatusRecord, ScheduleEvent } from './types';
import Dashboard, { DashboardFilters } from './components/Dashboard';
import { btn } from './components/admin/ui';

interface DashboardPageProps {
  students: StudentStatusRecord[];
  schedules: ScheduleEvent[];
  onBack: () => void;
  fetchFromSheets?: () => Promise<void>;
  isLoading?: boolean;
  logo?: string;
}

const readHashList = (key: string) => {
  const v = new URLSearchParams(window.location.hash.replace(/^#\??/, '')).get(key);
  return v ? v.split(',') : [];
};

/** Read-only, aggregate-only dashboard opened from a shared link (no student names). */
const DashboardPage: React.FC<DashboardPageProps> = ({ students, schedules, onBack, fetchFromSheets, isLoading = false, logo }) => {
  const [filters, setFilters] = useState<DashboardFilters>(() => ({
    years: readHashList('years'),
    terms: readHashList('terms'),
    majors: readHashList('majors'),
  }));
  const [refreshedAt, setRefreshedAt] = useState(new Date());

  useEffect(() => {
    if (!fetchFromSheets) return;
    fetchFromSheets().then(() => setRefreshedAt(new Date()));
    const t = setInterval(() => { fetchFromSheets().then(() => setRefreshedAt(new Date())); }, 60000);
    return () => clearInterval(t);
  }, [fetchFromSheets]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="no-print sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition" title="กลับหน้าหลัก">
            <ArrowLeft size={18} />
          </button>
          {logo
            ? <img src={logo} alt="โลโก้" className="h-7 max-w-[120px] object-contain" />
            : <span className="w-7 h-7 rounded-lg bg-[#630330] text-[#D4AF37] flex items-center justify-center text-xs font-extrabold">W</span>}
          <h1 className="text-base font-semibold truncate">แดชบอร์ดการฝึกงานและสหกิจศึกษา</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden md:inline text-[11px] text-slate-400 mr-1">อัปเดต {refreshedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={() => fetchFromSheets?.().then(() => setRefreshedAt(new Date()))} disabled={isLoading} className={btn('ghost', 'sm')} title="รีเฟรช">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /><span className="hidden sm:inline">รีเฟรช</span>
            </button>
            <button onClick={() => window.print()} className={btn('ghost', 'sm')} title="พิมพ์"><Printer size={14} /><span className="hidden sm:inline">พิมพ์</span></button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#630330]/10 dark:bg-amber-400/10 text-[#630330] dark:text-amber-300 flex items-center justify-center"><BarChart3 size={20} /></div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">ภาพรวม</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">ข้อมูลสรุปแบบอ่านอย่างเดียว อัปเดตอัตโนมัติทุก 1 นาที</p>
          </div>
        </div>
        <Dashboard students={students} schedules={schedules} mode="public" filters={filters} onFiltersChange={setFilters} />
      </main>
    </div>
  );
};

export default DashboardPage;

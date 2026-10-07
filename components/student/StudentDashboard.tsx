import React, { useState, useMemo } from 'react';
import {
  Language, InternshipSite, DocumentForm, ScheduleEvent, ChecklistStep,
  StudentStatusRecord, ApplicationStatus
} from '../../types';
import { StudentBundle, StudentSession } from '../../studentApi';
import StudentArea, { StudentTab } from './StudentArea';
import LanguageSwitcher from '../LanguageSwitcher';
import { isTH, card, statusName, statusCls, majorName } from './shared';
import {
  UserRound, BookOpen, Clock, Award, FileText,
  LogOut, Home, Moon, Sun, Camera, RefreshCw, CheckCircle2,
  CalendarDays, Download, Search, Building2, ExternalLink, ChevronRight
} from 'lucide-react';
import { squarePhoto } from '../../imageUtils';
import { studentCall } from '../../studentApi';

interface Props {
  lang: Language;
  setLang: (l: Language) => void;
  session: StudentSession;
  bundle: StudentBundle;
  setBundle: React.Dispatch<React.SetStateAction<StudentBundle | null>>;
  studentStatuses: StudentStatusRecord[];
  sites: InternshipSite[];
  schedules: ScheduleEvent[];
  forms: DocumentForm[];
  checklist?: ChecklistStep[];
  emblem?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
  onHome: () => void;
  refreshBundle: () => Promise<void>;
}

type TabType = StudentTab | 'docs_schedule';

const StudentDashboard: React.FC<Props> = ({
  lang,
  setLang,
  session,
  bundle,
  setBundle,
  sites,
  schedules,
  forms,
  emblem,
  theme,
  onToggleTheme,
  onLogout,
  onHome,
  refreshBundle
}) => {
  const isThai = isTH(lang);
  const [activeTab, setActiveTab] = useState<TabType>('me');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  const [docSearch, setDocSearch] = useState('');

  // Find latest accepted or primary record
  const records = bundle.records || [];
  const latestRecord = records[0] || null;

  // Local image cache for instant 0ms rendering
  const [photoSrc, setPhotoSrc] = useState<string | null>(() => {
    try {
      const local = localStorage.getItem(`wise_photo_${bundle.studentId}`);
      if (local) return local;
    } catch {}
    return bundle.photo || null;
  });

  React.useEffect(() => {
    let s = bundle.photo || null;
    try {
      const local = localStorage.getItem(`wise_photo_${bundle.studentId}`);
      if (local) s = local;
    } catch {}
    setPhotoSrc(s);
  }, [bundle.photo, bundle.studentId]);

  const handlePhotoError = () => {
    if (!bundle.photo) {
      setPhotoSrc(null);
      return;
    }
    const m = /id=([\w-]+)|\/d\/([\w-]+)/.exec(bundle.photo);
    const fileId = m ? (m[1] || m[2]) : '';
    if (fileId && photoSrc?.includes('lh3.googleusercontent.com')) {
      setPhotoSrc(`https://drive.google.com/thumbnail?id=${fileId}&sz=w400`);
    } else if (fileId && photoSrc?.includes('thumbnail')) {
      setPhotoSrc(`https://drive.google.com/uc?export=view&id=${fileId}`);
    } else {
      setPhotoSrc(null);
    }
  };

  const uploadPhoto = async (f: File) => {
    setPhotoBusy(true);
    setPhotoErr('');
    try {
      const data = await squarePhoto(f);
      try { localStorage.setItem(`wise_photo_${bundle.studentId}`, data); } catch {}
      setPhotoSrc(data);
      setBundle(b => (b ? { ...b, photo: data } : b));

      const r = await studentCall('setPhoto', { token: session.token, data });
      if (r?.status === 'expired') {
        onLogout();
        return;
      }
      if (r?.status !== 'success') throw new Error(r?.message || '');
      if (r.photo) {
        setBundle(b => (b ? { ...b, photo: r.photo } : b));
      }
    } catch (e: any) {
      setPhotoErr(isThai ? 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' : 'Failed to upload photo. Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'me',
      label: isThai ? 'ข้อมูลของฉัน' : 'My Profile',
      icon: <UserRound size={18} />,
      desc: isThai ? 'ประวัติ & สถานะการฝึก' : 'Profile & status'
    },
    {
      id: 'log',
      label: isThai ? 'สมุดบันทึก' : 'Logbook',
      icon: <BookOpen size={18} />,
      desc: isThai ? 'บันทึกงาน & ข้อมูลพี่เลี้ยง' : 'Diary & mentor'
    },
    {
      id: 'time',
      label: isThai ? 'ลงเวลาฝึกงาน' : 'Attendance',
      icon: <Clock size={18} />,
      desc: isThai ? 'บันทึกเวลาเข้า-ออกงาน' : 'Check-in / out'
    },
    {
      id: 'eval',
      label: isThai ? 'ผลการประเมิน' : 'Evaluation',
      icon: <Award size={18} />,
      desc: isThai ? 'ส่งลิงก์ & ดูคะแนน' : 'Mentor evaluation'
    },
    {
      id: 'docs_schedule',
      label: isThai ? 'เอกสาร & กำหนดการ' : 'Docs & Dates',
      icon: <FileText size={18} />,
      desc: isThai ? 'ดาวน์โหลดแบบฟอร์ม' : 'Forms & deadlines'
    },
  ];

  const filteredForms = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return forms;
    return forms.filter(f => (f.title || '').toLowerCase().includes(q) || (f.category || '').toLowerCase().includes(q));
  }, [forms, docSearch]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return schedules
      .filter(s => s.rawEndDate ? new Date(s.rawEndDate) >= now : true)
      .slice(0, 6);
  }, [schedules]);

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#12080e] text-[#2a0a17] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#1a0a13]/90 backdrop-blur-xl border-b border-[#efe4d2] dark:border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo & Portal title */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onHome} className="flex items-center gap-2.5 group shrink-0" title="หน้าแรก">
              {emblem ? (
                <span className="w-10 h-10 rounded-xl bg-white shadow-sm ring-1 ring-[#efe4d2] dark:ring-white/10 overflow-hidden flex items-center justify-center p-0.5">
                  <img src={emblem} alt="WISE" className="w-full h-full object-contain" />
                </span>
              ) : (
                <span className="w-10 h-10 rounded-xl bg-[#630330] text-[#e8cf7a] flex items-center justify-center font-extrabold text-sm shadow-sm">
                  WISE
                </span>
              )}
            </button>
            <div className="min-w-0">
              <span className="font-bold text-[15px] sm:text-[16px] text-[#630330] dark:text-[#e8cf7a] leading-none block truncate">
                WISE Student Portal
              </span>
              <span className="text-[11.5px] text-[#8d7480] dark:text-slate-400 leading-tight block truncate mt-0.5">
                {isThai ? 'ระบบนักศึกษาฝึกงานและสหกิจศึกษา' : 'Work-Integrated Education Space'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} variant="dropdown" tone="light" />
            <button
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#6e5560] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
              title={theme === 'light' ? 'โหมดมืด' : 'โหมดสว่าง'}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            <button
              onClick={onHome}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#efe4d2] dark:border-white/10 bg-white dark:bg-white/5 text-[12.5px] font-medium text-[#6e5560] dark:text-slate-300 hover:bg-[#f6eee3] dark:hover:bg-white/10 transition"
              title={isThai ? 'ดูข้อมูลทั่วไป / หน้าหลัก' : 'Public Home'}
            >
              <Home size={15} />
              <span>{isThai ? 'หน้าหลัก' : 'Home'}</span>
            </button>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/20 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-[12.5px] font-semibold transition active:scale-95 shadow-sm"
              title={isThai ? 'ออกจากระบบ' : 'Log out'}
            >
              <LogOut size={15} />
              <span>{isThai ? 'ออกจากระบบ' : 'Log out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Student Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Student Welcome & Profile Hero Card */}
        <div className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] bg-gradient-to-br from-[#630330] via-[#520227] to-[#3a011a] text-white p-6 sm:p-8 shadow-xl shadow-[#630330]/15">
          <div className="wl-pattern opacity-15 pointer-events-none absolute inset-0" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar with Camera badge */}
              <label
                className="group relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl bg-[#D4AF37] text-[#2a0114] flex items-center justify-center text-3xl font-extrabold overflow-hidden cursor-pointer ring-4 ring-[#e8cf7a]/40 shadow-lg hover:ring-[#e8cf7a] transition"
                title={isThai ? 'แตะเพื่อเปลี่ยนรูปโปรไฟล์' : 'Click to change photo'}
              >
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={latestRecord?.name || ''}
                    onError={handlePhotoError}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{(latestRecord?.name || '?').replace(/^(นางสาว|นาย|นาง|น\.ส\.)\s*/, '').trim().charAt(0) || '?'}</span>
                )}
                <span className={`absolute inset-x-0 bottom-0 h-7 bg-black/70 text-white text-[10.5px] font-semibold flex items-center justify-center gap-1 transition ${photoBusy ? 'opacity-100' : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100'}`}>
                  {photoBusy ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={12} />}
                  <span>{photoSrc ? (isThai ? 'เปลี่ยนรูป' : 'Change') : (isThai ? 'เพิ่มรูป' : 'Add')}</span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={photoBusy}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = '';
                    if (f) uploadPhoto(f);
                  }}
                />
              </label>

              {/* Student details */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {latestRecord?.name || bundle.studentId}
                  </h1>
                  {latestRecord?.status && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold ${statusCls(latestRecord.status)}`}>
                      {statusName(latestRecord.status, lang)}
                    </span>
                  )}
                </div>

                <div className="text-[13px] text-white/80 space-y-0.5">
                  <p className="flex items-center gap-2">
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[12px] font-semibold text-[#e8cf7a]">
                      {bundle.studentId}
                    </span>
                    {latestRecord?.major && (
                      <span className="truncate">
                        {majorName(latestRecord.major, lang)}
                      </span>
                    )}
                  </p>
                  {(latestRecord?.location || latestRecord?.supervisor) && (
                    <p className="text-white/70 text-[12px] truncate pt-0.5">
                      {latestRecord.location && <span>📍 {latestRecord.location}</span>}
                      {latestRecord.supervisor && <span className="ms-3">👨‍🏫 {isThai ? 'อ.นิเทศ:' : 'Supervisor:'} {latestRecord.supervisor}</span>}
                    </p>
                  )}
                </div>

                {photoErr && <p className="mt-2 text-[12px] text-rose-300 font-medium">{photoErr}</p>}
              </div>
            </div>

            {/* Quick status pill / refresh button */}
            <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
              <button
                onClick={() => refreshBundle()}
                className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12.5px] font-medium flex items-center gap-1.5 transition active:scale-95"
                title={isThai ? 'รีเฟรชข้อมูล' : 'Refresh data'}
              >
                <RefreshCw size={14} />
                <span>{isThai ? 'อัปเดตข้อมูล' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Primary Navigation Tabs - Big, Prominent, Clear Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative group p-3.5 sm:p-4 rounded-2xl flex flex-col items-start text-left transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#630330] text-white shadow-lg shadow-[#630330]/25 ring-2 ring-[#e8cf7a]/60'
                    : 'bg-white dark:bg-white/[0.04] text-[#2a0a17] dark:text-slate-200 border border-[#efe4d2] dark:border-white/10 hover:border-[#630330]/50 hover:bg-[#faf6ef] dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-[#e8cf7a] text-[#630330]'
                        : 'bg-[#630330]/10 dark:bg-white/10 text-[#630330] dark:text-[#e8cf7a] group-hover:bg-[#630330] group-hover:text-white'
                    }`}
                  >
                    {tab.icon}
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#e8cf7a] shadow-sm animate-pulse" />
                  )}
                </div>
                <span className="font-bold text-[14px] sm:text-[15px] leading-tight block">
                  {tab.label}
                </span>
                <span
                  className={`text-[11.5px] leading-tight mt-0.5 block truncate w-full ${
                    isActive ? 'text-white/70' : 'text-[#8d7480] dark:text-slate-400'
                  }`}
                >
                  {tab.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Content Body */}
        <div className="mt-2">
          {activeTab !== 'docs_schedule' ? (
            <StudentArea
              lang={lang}
              tab={activeTab}
              token={session.token}
              bundle={bundle}
              setBundle={fn => setBundle(b => (b ? fn(b) : b))}
              refresh={refreshBundle}
              onExpired={onLogout}
              go={t => setActiveTab(t)}
            />
          ) : (
            /* Documents & Schedule Tab */
            <div className="space-y-6">
              {/* Documents Card */}
              <div className={`${card} p-5 sm:p-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-[#2a0a17] dark:text-white flex items-center gap-2">
                      <Download size={20} className="text-[#630330] dark:text-[#e8cf7a]" />
                      <span>{isThai ? 'แบบฟอร์มและเอกสารที่ต้องใช้' : 'Forms and Documents'}</span>
                    </h2>
                    <p className="text-xs text-[#8d7480] dark:text-slate-400 mt-0.5">
                      {isThai ? 'ดาวน์โหลดเอกสารสำหรับยื่นคำร้องและรายงานตัว' : 'Download documents for application and reporting'}
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      placeholder={isThai ? 'ค้นหาเอกสาร...' : 'Search forms...'}
                      className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[#efe4d2] dark:border-white/10 text-xs text-[#2a0a17] dark:text-white outline-none focus:ring-2 focus:ring-[#630330]"
                    />
                  </div>
                </div>

                {filteredForms.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredForms.map(form => (
                      <a
                        key={form.id}
                        href={form.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group p-4 rounded-2xl border border-[#efe4d2] dark:border-white/10 hover:border-[#630330] bg-white dark:bg-white/[0.02] hover:bg-[#faf6ef] dark:hover:bg-white/5 transition flex flex-col justify-between"
                      >
                        <div>
                          {form.category && (
                            <span className="text-[10px] uppercase font-bold text-[#8d7480] dark:text-slate-400 block mb-1">
                              {form.category}
                            </span>
                          )}
                          <p className="font-semibold text-[13.5px] text-[#2a0a17] dark:text-white group-hover:text-[#630330] dark:group-hover:text-[#e8cf7a] transition line-clamp-2">
                            {form.title}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11.5px] text-[#630330] dark:text-[#e8cf7a] font-medium pt-2 border-t border-slate-100 dark:border-white/5">
                          <span>{isThai ? 'ดาวน์โหลดเอกสาร' : 'Download form'}</span>
                          <ExternalLink size={13} />
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-sm text-[#8d7480] dark:text-slate-400">
                    {isThai ? 'ไม่พบเอกสารที่ค้นหา' : 'No documents found'}
                  </p>
                )}
              </div>

              {/* Upcoming Schedules Card */}
              <div className={`${card} p-5 sm:p-6`}>
                <h2 className="text-lg font-bold text-[#2a0a17] dark:text-white flex items-center gap-2 mb-4">
                  <CalendarDays size={20} className="text-[#630330] dark:text-[#e8cf7a]" />
                  <span>{isThai ? 'กำหนดการสำคัญที่กำลังจะมาถึง' : 'Upcoming Schedule'}</span>
                </h2>

                <div className="space-y-3">
                  {upcomingEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl border border-[#efe4d2] dark:border-white/10 flex items-center justify-between gap-4 bg-white dark:bg-white/[0.02]"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[13.5px] text-[#2a0a17] dark:text-white truncate">
                          {typeof ev.event === 'object' ? (isThai ? ev.event.th : ev.event.en) : ev.event}
                        </p>
                        <p className="text-xs text-[#8d7480] dark:text-slate-400 mt-0.5">
                          {ev.startDate} {ev.endDate && ev.endDate !== ev.startDate ? `- ${ev.endDate}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#8a6a14] dark:text-[#e8cf7a]">
                        {ev.status || (isThai ? 'กำหนดการ' : 'Scheduled')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;

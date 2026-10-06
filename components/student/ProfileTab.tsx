import React, { useState } from 'react';
import { UserRound, ChevronDown, Camera, RefreshCw, Building2, Briefcase, GraduationCap, CalendarRange, UserCheck, BookOpen, NotebookPen, Clock, ClipboardCheck, ArrowRight } from 'lucide-react';
import { Language } from '../../types';
import { StudentBundle, StudentRecordLite, studentCall } from '../../studentApi';
import { squarePhoto } from '../../imageUtils';
import { card, SectionHead, isTH, fmtDate, majorName, statusName, statusCls, typeName, sortRecords } from './shared';

type Go = (t: 'log' | 'time' | 'eval') => void;

const T = {
  th: {
    title: 'ข้อมูลของฉัน', sub: 'ข้อมูลการฝึกที่บันทึกไว้ในระบบ ถ้าข้อมูลไม่ถูกต้อง แจ้งเจ้าหน้าที่ WISE',
    studentId: 'รหัสนักศึกษา', major: 'สาขาวิชา', latest: 'รอบล่าสุด', older: (n: number) => `รอบก่อนหน้า (${n})`,
    type: 'รูปแบบการฝึก', site: 'สถานที่ฝึก', position: 'ตำแหน่งงาน', supervisor: 'อาจารย์นิเทศ', period: 'ระยะเวลาฝึก', term: 'ภาคเรียน',
    termOf: (t: string, y: string) => `ภาคเรียนที่ ${t || '-'} / ${y || '-'}`, notSet: 'ยังไม่ระบุ', status: 'สถานะ',
    progress: 'ความคืบหน้าของรอบนี้', logbook: 'ข้อมูลหน่วยงาน', diary: (n: number) => `บันทึกรายวัน ${n} วัน`, days: (n: number) => `ลงเวลา ${n} วัน`, eval: 'ผลประเมิน',
    filled: 'กรอกแล้ว', notFilled: 'ยังไม่กรอก', evalDone: 'ได้รับแล้ว', evalWait: 'ยังไม่ได้รับ',
    photo: 'รูปประจำตัว', add: 'เพิ่มรูป', change: 'เปลี่ยนรูป', photoHint: 'แตะที่กรอบรูปเพื่อเพิ่มรูปของคุณ',
    photoFail: 'อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง', photoDrive: 'ระบบยังเก็บรูปใน Google Drive ไม่ได้ กรุณาแจ้งเจ้าหน้าที่',
  },
  en: {
    title: 'My info', sub: 'Your placement details on record. Tell WISE staff if anything is wrong.',
    studentId: 'Student ID', major: 'Major', latest: 'Latest placement', older: (n: number) => `Earlier placements (${n})`,
    type: 'Type', site: 'Site', position: 'Position', supervisor: 'Supervisor', period: 'Period', term: 'Term',
    termOf: (t: string, y: string) => `Term ${t || '-'} / ${y || '-'}`, notSet: 'Not set', status: 'Status',
    progress: 'This placement', logbook: 'Workplace details', diary: (n: number) => `${n} log entries`, days: (n: number) => `${n} days clocked`, eval: 'Evaluation',
    filled: 'Filled', notFilled: 'Not yet', evalDone: 'Received', evalWait: 'Waiting',
    photo: 'Profile photo', add: 'Add photo', change: 'Change', photoHint: 'Tap the frame to add your photo',
    photoFail: 'Could not upload the photo. Please try again.', photoDrive: 'Photo storage is not ready yet. Please tell WISE staff.',
  },
};

const Row: React.FC<{ icon: React.ReactNode; k: string; v: React.ReactNode }> = ({ icon, k, v }) => (
  <div className="flex items-start gap-3 py-2.5">
    <span className="w-8 h-8 shrink-0 rounded-lg bg-[#630330]/[0.06] dark:bg-white/5 text-[#630330] dark:text-[#e8cf7a] flex items-center justify-center">{icon}</span>
    <div className="min-w-0">
      <p className="text-[12px] text-[#8d7480] dark:text-slate-400">{k}</p>
      <p className="text-[14.5px] text-[#2a0a17] dark:text-slate-100 break-words">{v}</p>
    </div>
  </div>
);

const RecordDetails: React.FC<{ r: StudentRecordLite; lang: Language }> = ({ r, lang }) => {
  const L = isTH(lang) ? T.th : T.en;
  const ns = <span className="text-[#b3a0a8]">{L.notSet}</span>;
  const period = r.startDate || r.endDate ? `${fmtDate(r.startDate, lang) || '?'} – ${fmtDate(r.endDate, lang) || '?'}` : null;
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-[#f6efe4] dark:divide-white/5">
      <Row icon={<Briefcase size={15} />} k={L.type} v={typeName(r.internshipType, lang)} />
      <Row icon={<Building2 size={15} />} k={L.site} v={r.location || ns} />
      <Row icon={<UserRound size={15} />} k={L.position} v={r.position || ns} />
      <Row icon={<UserCheck size={15} />} k={L.supervisor} v={r.supervisor || ns} />
      <Row icon={<CalendarRange size={15} />} k={L.period} v={period || ns} />
      <Row icon={<BookOpen size={15} />} k={L.term} v={L.termOf(r.term, r.academicYear)} />
    </div>
  );
};

interface ProfileProps {
  lang: Language; bundle: StudentBundle; record: StudentRecordLite | null; go: Go;
  token: string; onPatch: (fn: (b: StudentBundle) => StudentBundle) => void; onExpired: () => void;
}

const ProfileTab: React.FC<ProfileProps> = ({ lang, bundle, record, go, token, onPatch, onExpired }) => {
  const L = isTH(lang) ? T.th : T.en;
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  const uploadPhoto = async (f: File) => {
    setPhotoBusy(true); setPhotoErr('');
    try {
      const data = await squarePhoto(f);
      const r = await studentCall('setPhoto', { token, data });
      if (r?.status === 'expired') return onExpired();
      if (r?.status !== 'success') throw new Error(r?.message || '');
      onPatch(b => ({ ...b, photo: r.photo }));
    } catch (e: any) {
      setPhotoErr(String(e?.message || '').startsWith('drive') ? L.photoDrive : L.photoFail);
    } finally { setPhotoBusy(false); }
  };
  const sorted = sortRecords(bundle.records);
  const latest = sorted[0];
  const older = sorted.slice(1);
  const [openOld, setOpenOld] = useState<string | null>(null);
  const [showOld, setShowOld] = useState(false);
  if (!latest) return null;

  const rid = record?.id;
  const diaryCount = rid ? Object.values(bundle.diary[rid] || {}).filter(t => String(t).trim()).length : 0;
  const days = rid ? (bundle.attendance[rid] || []).filter(a => a.inTime).length : 0;
  const lb = rid ? bundle.logbooks[rid]?.data : undefined;
  const ev = rid ? (bundle.evaluations[rid] || [])[0] : undefined;

  return (
    <div className="space-y-6">
      <SectionHead icon={<UserRound size={17} />} title={L.title} sub={L.sub} />

      <div className="relative overflow-hidden rounded-[26px] bg-[#630330] text-white p-5 sm:p-6">
        <div className="wl-pattern opacity-[0.14]" />
        <div className="relative flex items-center gap-4">
          <label className="group relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl bg-[#D4AF37] text-[#2a0114] flex items-center justify-center text-[28px] font-bold overflow-hidden cursor-pointer ring-2 ring-[#e8cf7a]/50" title={L.photo}>
            {bundle.photo ? <img src={bundle.photo} alt={latest.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : (latest.name || '?').replace(/^(นางสาว|นาย|นาง)/, '').trim().charAt(0)}
            <span className={`absolute inset-x-0 bottom-0 h-7 bg-black/55 text-white text-[11px] font-normal flex items-center justify-center gap-1 transition ${photoBusy ? 'opacity-100' : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100'}`}>
              {photoBusy ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={12} />}{bundle.photo ? L.change : L.add}
            </span>
            <input type="file" accept="image/*" className="sr-only" disabled={photoBusy} onChange={e => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) uploadPhoto(f); }} />
          </label>
          <div className="min-w-0">
            <p className="text-[19px] sm:text-[21px] font-medium leading-tight break-words">{latest.name}</p>
            <p className="mt-1 text-[13px] text-white/75 flex flex-wrap gap-x-3">
              <span className="wl-latin tabular-nums">{bundle.studentId}</span>
              <span className="flex items-center gap-1"><GraduationCap size={13} />{majorName(latest.major, lang)}</span>
            </p>
            {photoErr ? <p className="mt-2 text-[12px] text-rose-200">{photoErr}</p> : !bundle.photo && <p className="mt-2 text-[12px] text-white/60">{L.photoHint}</p>}
          </div>
        </div>
      </div>

      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-[15px] font-medium text-[#2a0a17] dark:text-white">{L.latest}</p>
          <span className={`inline-flex items-center h-7 px-3 rounded-full text-[12.5px] ${statusCls(latest.status)}`}>{statusName(latest.status, lang)}</span>
        </div>
        <RecordDetails r={latest} lang={lang} />
      </div>

      {record && (
        <div className={`${card} p-5`}>
          <p className="text-[15px] font-medium text-[#2a0a17] dark:text-white mb-3">{L.progress}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { t: 'log' as const, icon: <Building2 size={16} />, k: L.logbook, v: lb?.orgName || lb?.mentorName ? L.filled : L.notFilled, ok: !!(lb?.orgName || lb?.mentorName) },
              { t: 'log' as const, icon: <NotebookPen size={16} />, k: L.diary(diaryCount), v: '', ok: diaryCount > 0 },
              { t: 'time' as const, icon: <Clock size={16} />, k: L.days(days), v: '', ok: days > 0 },
              { t: 'eval' as const, icon: <ClipboardCheck size={16} />, k: L.eval, v: ev ? `${ev.avg.toFixed(2)} · ${ev.level}` : L.evalWait, ok: !!ev },
            ].map((x, i) => (
              <button key={i} onClick={() => go(x.t)} className="group text-left rounded-2xl border border-[#f0e6d6] dark:border-white/10 p-3.5 hover:border-[#630330]/40 transition">
                <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center ${x.ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-[#630330]/[0.06] text-[#630330] dark:bg-white/5 dark:text-[#e8cf7a]'}`}>{x.icon}</span>
                <p className="mt-2 text-[13.5px] text-[#2a0a17] dark:text-slate-100">{x.k}</p>
                <p className="text-[12px] text-[#8d7480] dark:text-slate-400 flex items-center gap-1">{x.v}<ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition rtl:rotate-180" /></p>
              </button>
            ))}
          </div>
        </div>
      )}

      {older.length > 0 && (
        <div>
          <button onClick={() => setShowOld(v => !v)} aria-expanded={showOld} className="flex items-center gap-2 text-[14px] text-[#630330] dark:text-[#e8cf7a]">
            <ChevronDown size={16} className={`transition ${showOld ? 'rotate-180' : ''}`} />{L.older(older.length)}
          </button>
          {showOld && (
            <div className="mt-3 space-y-2">
              {older.map(r => (
                <div key={r.id} className={`${card} overflow-hidden`}>
                  <button onClick={() => setOpenOld(o => (o === r.id ? null : r.id))} aria-expanded={openOld === r.id} className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left">
                    <span className="min-w-0">
                      <span className="block text-[14px] text-[#2a0a17] dark:text-white truncate">{r.location || typeName(r.internshipType, lang)}</span>
                      <span className="block text-[12px] text-[#8d7480]">{L.termOf(r.term, r.academicYear)} · {typeName(r.internshipType, lang)}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={`hidden sm:inline-flex items-center h-6 px-2.5 rounded-full text-[11.5px] ${statusCls(r.status)}`}>{statusName(r.status, lang)}</span>
                      <ChevronDown size={16} className={`text-[#b3a0a8] transition ${openOld === r.id ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {openOld === r.id && <div className="px-5 pb-4 border-t border-[#f6efe4] dark:border-white/5"><RecordDetails r={r} lang={lang} /></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileTab;

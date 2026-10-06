import React from 'react';
import { Language } from '../../types';
import { StudentRecordLite, localDate } from '../../studentApi';

/* Portal look: cream cards, maroon accents, gold highlights */
export const card = 'rounded-[22px] bg-white/85 dark:bg-white/[0.04] border border-[#efe4d2] dark:border-white/10';
export const field = 'w-full h-11 px-3.5 rounded-xl border border-[#e6d9c4] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[14.5px] text-[#2a0a17] dark:text-white placeholder:text-[#b3a0a8] dark:placeholder:text-slate-500 outline-none transition focus:border-[#630330] focus:ring-4 focus:ring-[#630330]/10 dark:focus:border-[#e8cf7a] dark:focus:ring-[#e8cf7a]/10 disabled:opacity-60';
export const area = field.replace('h-11', 'min-h-[96px] py-2.5 leading-relaxed');
export const btnMain = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#630330] hover:bg-[#7a0b3d] text-white text-[14px] font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
export const btnSoft = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-[#630330]/[0.07] dark:bg-white/5 text-[#630330] dark:text-[#e8cf7a] text-[13.5px] hover:bg-[#630330] hover:text-white transition disabled:opacity-50 disabled:pointer-events-none';
export const label = 'block text-[13px] font-medium text-[#4a2a37] dark:text-slate-200 mb-1';
export const hint = 'block text-[11.5px] font-light text-[#8d7480] dark:text-slate-400 mt-1';

export const SectionHead: React.FC<{ icon: React.ReactNode; title: string; sub?: string; right?: React.ReactNode }> = ({ icon, title, sub, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-4">
    <div className="min-w-0">
      <h2 className="flex items-center gap-2.5 text-[21px] sm:text-[23px] font-medium text-[#2a0a17] dark:text-white">
        <span className="w-8 h-8 shrink-0 rounded-lg bg-[#630330] text-[#e8cf7a] flex items-center justify-center">{icon}</span>{title}
      </h2>
      {sub && <p className="mt-1 text-[13.5px] font-light text-[#7d6470] dark:text-slate-400">{sub}</p>}
    </div>
    {right}
  </div>
);

export const Notice: React.FC<{ tone?: 'info' | 'warn' | 'error' | 'ok'; children: React.ReactNode; icon?: React.ReactNode }> = ({ tone = 'info', children, icon }) => {
  const cls = {
    info: 'bg-[#faf6ef] dark:bg-white/[0.03] border-[#efe4d2] dark:border-white/10 text-[#6e5560] dark:text-slate-300',
    warn: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25 text-amber-800 dark:text-amber-200',
    error: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-200',
    ok: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-800 dark:text-emerald-200',
  }[tone];
  return <div className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl border text-[13px] leading-relaxed ${cls}`}>{icon && <span className="shrink-0 mt-0.5">{icon}</span>}<div className="min-w-0">{children}</div></div>;
};

/* ---------- labels ---------- */

const MAJORS: Record<string, [string, string]> = {
  halal_food: ['วิจัยและพัฒนาผลิตภัณฑ์อาหารฮาลาล', 'Research and Development of Halal Food Product'],
  digital_tech: ['เทคโนโลยีและวิทยาการดิจิทัล', 'Technology and Digital Science'],
  info_tech: ['เทคโนโลยีสารสนเทศ', 'Information Technology'],
  data_science: ['วิทยาการข้อมูลและการวิเคราะห์', 'Data Science and Analytics'],
};
const STATUSES: Record<string, [string, string, string]> = {
  pending: ['รอการตอบรับ', 'Awaiting reply', 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'],
  preparing: ['กำลังเตรียมเอกสาร', 'Preparing documents', 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'],
  accepted: ['ได้รับการตอบรับ', 'Accepted', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'],
  rejected: ['ไม่ได้รับการตอบรับ', 'Not accepted', 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'],
};

export const isTH = (lang: Language) => lang === Language.TH;
export const majorName = (m: string, lang: Language) => (MAJORS[m] ? MAJORS[m][isTH(lang) ? 0 : 1] : m || '-');
export const statusName = (s: string, lang: Language) => (STATUSES[s] ? STATUSES[s][isTH(lang) ? 0 : 1] : s || '-');
export const statusCls = (s: string) => (STATUSES[s] ? STATUSES[s][2] : 'bg-slate-100 text-slate-600');
export const typeName = (t: string, lang: Language) => (t === 'coop' ? (isTH(lang) ? 'สหกิจศึกษา' : 'Co-op') : (isTH(lang) ? 'ฝึกงาน' : 'Internship'));

export const localeOf = (lang: Language) => (lang === Language.TH ? 'th-TH' : lang === Language.AR ? 'ar' : lang === Language.MS ? 'ms-MY' : 'en-GB');
export const fmtDate = (s: string | Date | null | undefined, lang: Language, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  const d = s instanceof Date ? s : localDate(s || '');
  return d ? d.toLocaleDateString(localeOf(lang), o) : '';
};
export const fmtTime = (ms: number | null | undefined) => {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Newest placement first: accepted ones before applications still in progress */
export const sortRecords = (records: StudentRecordLite[]) =>
  [...records].sort((a, b) => {
    const acc = (r: StudentRecordLite) => (r.status === 'accepted' ? 1 : 0);
    const key = (r: StudentRecordLite) => `${r.academicYear || ''}-${r.term || ''}-${localDate(r.startDate)?.getTime() || 0}`.padStart(30, '0');
    return key(b).localeCompare(key(a)) || acc(b) - acc(a);
  });

/** Strings for the student area. Thai and English; Arabic and Malay fall back to English. */
export const ST = {
  th: {
    loginBtn: 'ล็อกอินนักศึกษา', logout: 'ออกจากระบบนักศึกษา', hello: 'สวัสดี',
    tabs: { me: 'ข้อมูลของฉัน', log: 'บันทึกการฝึก', time: 'ลงเวลา', eval: 'ประเมิน' },
    expired: 'เซสชันหมดอายุ กรุณาล็อกอินใหม่', saved: 'บันทึกแล้ว', saving: 'กำลังบันทึก…', save: 'บันทึก', failed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
    noPlacement: 'ยังไม่มีข้อมูลการฝึกในระบบ', noPlacementSub: 'เมื่อเจ้าหน้าที่บันทึกสถานที่ฝึกของคุณแล้ว ส่วนนี้จะใช้งานได้',
    placement: 'รอบการฝึก',
  },
  en: {
    loginBtn: 'Student sign in', logout: 'Sign out', hello: 'Hello',
    tabs: { me: 'My info', log: 'Logbook', time: 'Time clock', eval: 'Evaluation' },
    expired: 'Your session expired. Please sign in again.', saved: 'Saved', saving: 'Saving…', save: 'Save', failed: 'Could not save. Please try again.',
    noPlacement: 'No placement on record yet', noPlacementSub: 'This section opens once staff record your placement.',
    placement: 'Placement',
  },
};
export const stOf = (lang: Language) => (isTH(lang) ? ST.th : ST.en);

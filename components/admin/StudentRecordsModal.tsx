import React, { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Building2, Clock, ClipboardCheck, RefreshCw, KeyRound, Unlock, MapPin, AlertCircle, Phone, ExternalLink, Users } from 'lucide-react';
import { StudentStatusRecord, Language } from '../../types';
import { StudentBundle, adminCall, attendanceSummary, backendHasStudents } from '../../studentApi';
import { Modal, btn, card } from './ui';
import MapPicker from '../student/MapPicker';
import EvalResult from '../student/EvalResult';
import { fmtDate, fmtTime, sortRecords, typeName } from '../student/shared';

interface Props {
  student: StudentStatusRecord | null;
  onClose: () => void;
  notify: (msg: string, type?: any) => void;
}

type View = 'org' | 'diary' | 'time' | 'eval';

const KV: React.FC<{ k: string; v?: React.ReactNode }> = ({ k, v }) => (
  <div className="min-w-0">
    <p className="text-[11px] text-slate-400">{k}</p>
    <p className="text-sm text-slate-800 dark:text-slate-100 break-words">{v || <span className="text-slate-300 dark:text-slate-600">—</span>}</p>
  </div>
);

/** Staff view of one student's logbook, diary, attendance and mentor evaluation. */
const StudentRecordsModal: React.FC<Props> = ({ student, onClose, notify }) => {
  const [bundle, setBundle] = useState<StudentBundle | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>('org');
  const [rid, setRid] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState('');

  const load = async () => {
    if (!student) return;
    setLoading(true); setErr('');
    try {
      if (!(await backendHasStudents())) { setErr('ระบบหลังบ้านยังไม่รองรับส่วนนี้ ต้อง redeploy code.gs ก่อน'); return; }
      const r = await adminCall('view', { studentId: student.studentId });
      if (r?.status === 'unauthorized') { setErr('สิทธิ์ผู้ดูแลหมดอายุ กรุณาออกจากระบบแล้วเข้าใหม่'); return; }
      if (r?.status !== 'success') throw new Error();
      setBundle(r.bundle);
      const sorted = sortRecords(r.bundle.records);
      setRid(cur => (sorted.some(x => x.id === cur) ? cur : (sorted.find(x => x.id === student.id) || sorted[0])?.id || ''));
    } catch { setErr('โหลดข้อมูลไม่สำเร็จ'); } finally { setLoading(false); }
  };

  useEffect(() => { setBundle(null); setView('org'); setConfirmReset(false); if (student) { setRid(student.id); load(); } }, [student?.studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const records = useMemo(() => (bundle ? sortRecords(bundle.records) : []), [bundle]);
  const record = records.find(r => r.id === rid);
  const lb = bundle && rid ? bundle.logbooks[rid]?.data : undefined;
  const diary = bundle && rid ? bundle.diary[rid] || {} : {};
  const diaryDays = Object.entries(diary).filter(([, t]) => String(t).trim()).sort((a, b) => b[0].localeCompare(a[0]));
  const att = useMemo(() => (bundle && rid ? [...(bundle.attendance[rid] || [])].sort((a, b) => b.date.localeCompare(a.date)) : []), [bundle, rid]);
  const wp = bundle && rid ? bundle.workplaces[rid] : undefined;
  const evals = bundle && rid ? bundle.evaluations[rid] || [] : [];
  const sum = record ? attendanceSummary(att, wp, record.startDate, record.endDate, bundle?.today) : null;

  const resetPin = async () => {
    if (!student) return;
    setBusy('pin');
    try {
      const r = await adminCall('resetPin', { studentId: student.studentId });
      if (r?.status !== 'success') throw new Error();
      notify('รีเซ็ต PIN แล้ว นักศึกษาตั้ง PIN ใหม่ได้ตอนล็อกอินครั้งถัดไป');
      setConfirmReset(false);
    } catch { notify('รีเซ็ต PIN ไม่สำเร็จ', 'error'); } finally { setBusy(''); }
  };

  const unlock = async () => {
    if (!student || !rid) return;
    setBusy('unlock');
    try {
      const r = await adminCall('unlockWorkplace', { studentId: student.studentId, recordId: rid });
      if (r?.status !== 'success') throw new Error();
      notify('ปลดล็อกพื้นที่ทำงานแล้ว นักศึกษาปักหมุดใหม่ได้');
      await load();
    } catch { notify('ปลดล็อกไม่สำเร็จ', 'error'); } finally { setBusy(''); }
  };

  const tabs: { id: View; label: string; icon: React.ReactNode; n?: number }[] = [
    { id: 'org', label: 'ข้อมูลหน่วยงาน', icon: <Building2 size={14} /> },
    { id: 'diary', label: 'บันทึกรายวัน', icon: <NotebookPen size={14} />, n: diaryDays.length },
    { id: 'time', label: 'ลงเวลา', icon: <Clock size={14} />, n: sum?.days },
    { id: 'eval', label: 'ผลประเมิน', icon: <ClipboardCheck size={14} />, n: evals.length },
  ];

  return (
    <Modal
      open={!!student}
      onClose={onClose}
      title={student ? `บันทึกการฝึก · ${student.name}` : ''}
      subtitle={student ? `รหัส ${student.studentId}` : ''}
      icon={<NotebookPen size={18} />}
      size="xl"
      footer={
        <>
          <div className="mr-auto flex items-center gap-2">
            {confirmReset ? (
              <>
                <span className="text-xs text-slate-500">รีเซ็ต PIN ของนักศึกษาคนนี้?</span>
                <button onClick={resetPin} disabled={busy === 'pin'} className={btn('danger', 'sm')}>{busy === 'pin' ? <RefreshCw size={13} className="animate-spin" /> : null}ยืนยัน</button>
                <button onClick={() => setConfirmReset(false)} className={btn('ghost', 'sm')}>ยกเลิก</button>
              </>
            ) : (
              <button onClick={() => setConfirmReset(true)} disabled={!bundle} className={btn('ghost', 'sm')} title="ใช้เมื่อนักศึกษาลืม PIN"><KeyRound size={14} /> รีเซ็ต PIN</button>
            )}
          </div>
          <button onClick={load} disabled={loading} className={btn('secondary')}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> โหลดใหม่</button>
          <button onClick={onClose} className={btn('primary')}>ปิด</button>
        </>
      }
    >
      {err ? (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0" />{err}</div>
      ) : !bundle ? (
        <div className="py-16 flex justify-center text-slate-400"><RefreshCw size={20} className="animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {bundle.photo && (
            <div className="flex items-center gap-3">
              <img src={bundle.photo} alt={student?.name} referrerPolicy="no-referrer" className="w-16 h-16 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
              <p className="text-xs text-slate-500">รูปประจำตัวที่นักศึกษาอัปโหลด</p>
            </div>
          )}
          {records.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 mr-1">รอบการฝึก</span>
              {records.map(r => (
                <button key={r.id} onClick={() => setRid(r.id)} className={`h-7 px-3 rounded-full text-xs font-medium transition ${r.id === rid ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {r.term || '-'}/{r.academicYear || '-'} · {typeName(r.internshipType, Language.TH)}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto hide-scrollbar">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setView(t.id)} className={`flex-1 shrink-0 h-9 px-3 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition ${view === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
                {t.icon}{t.label}{t.n !== undefined && <span className="tabular-nums text-slate-400">{t.n}</span>}
              </button>
            ))}
          </div>

          {view === 'org' && (
            !lb ? <p className="py-10 text-center text-sm text-slate-400">นักศึกษายังไม่ได้กรอกข้อมูลหน่วยงาน</p> : (
              <div className="space-y-4">
                <div className={`${card} p-4 grid sm:grid-cols-2 gap-4`}>
                  <KV k="ชื่อหน่วยงาน" v={lb.orgName} />
                  <KV k="ที่อยู่" v={lb.orgAddress} />
                  <KV k="พี่เลี้ยง" v={lb.mentorName ? `${lb.mentorName}${lb.mentorPosition ? ` · ${lb.mentorPosition}` : ''}` : ''} />
                  <KV k="เบอร์โทร" v={lb.mentorPhone ? <span className="inline-flex items-center gap-1.5 select-all"><Phone size={13} className="text-slate-400" />{lb.mentorPhone}</span> : ''} />
                  <KV k="Facebook" v={lb.facebook} />
                  <KV k="LINE" v={lb.line} />
                  <KV k="ที่พักระหว่างฝึก" v={lb.lodging} />
                  <KV k="นักศึกษาร่วมปฏิบัติงาน" v={(lb.coworkers || []).length ? <span className="flex flex-col">{lb.coworkers!.map((c, i) => <span key={i} className="inline-flex items-center gap-1.5"><Users size={12} className="text-slate-400" />{c.name}{c.studentId ? ` (${c.studentId})` : ''}</span>)}</span> : ''} />
                  <div className="sm:col-span-2"><KV k="ประวัติหน่วยงานโดยย่อ" v={lb.orgHistory ? <span className="whitespace-pre-wrap">{lb.orgHistory}</span> : ''} /></div>
                </div>
                {lb.lat && lb.lng && (
                  <div className="space-y-1.5">
                    <MapPicker lang={Language.TH} readOnly value={{ lat: lb.lat, lng: lb.lng }} height={240} />
                    <a href={`https://www.google.com/maps?q=${lb.lat},${lb.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#630330] dark:text-amber-300 hover:underline"><ExternalLink size={13} />เปิดใน Google Maps</a>
                  </div>
                )}
              </div>
            )
          )}

          {view === 'diary' && (
            diaryDays.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีบันทึกรายวัน</p> : (
              <ul className="space-y-2">
                {diaryDays.map(([d, t]) => {
                  const a = att.find(x => x.date === d);
                  return (
                    <li key={d} className={`${card} p-3.5`}>
                      <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtDate(d, Language.TH, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {a?.inTime && <span className="tabular-nums">เข้า {fmtTime(a.inTime)} · ออก {fmtTime(a.outTime)}</span>}
                      </p>
                      <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{t}</p>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {view === 'time' && (
            <div className="space-y-4">
              {!wp ? <p className="py-6 text-center text-sm text-slate-400">นักศึกษายังไม่ได้กำหนดพื้นที่ทำงาน</p> : (
                <div className={`${card} p-4 space-y-3`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><MapPin size={14} />พื้นที่ทำงาน · รัศมี {wp.radius} ม.</p>
                      <p className="text-xs text-slate-500">{wp.address || `${wp.lat}, ${wp.lng}`}{wp.workStart || wp.workEnd ? ` · เวลาทำงาน ${wp.workStart || '?'}–${wp.workEnd || '?'}` : ''}</p>
                    </div>
                    {wp.locked && <button onClick={unlock} disabled={busy === 'unlock'} className={btn('secondary', 'sm')}>{busy === 'unlock' ? <RefreshCw size={13} className="animate-spin" /> : <Unlock size={13} />} ปลดล็อกให้ปักหมุดใหม่</button>}
                  </div>
                  <MapPicker lang={Language.TH} readOnly value={{ lat: wp.lat, lng: wp.lng }} radius={wp.radius} height={240}
                    extra={att.slice(0, 30).flatMap(a => [
                      a.inLat && a.inLng ? { lat: a.inLat, lng: a.inLng, color: '#10b981', label: `เข้า ${fmtDate(a.date, Language.TH, { day: 'numeric', month: 'short' })} ${fmtTime(a.inTime)} · ${a.inDist} ม.` } : null,
                      a.outLat && a.outLng ? { lat: a.outLat, lng: a.outLng, color: '#f59e0b', label: `ออก ${fmtDate(a.date, Language.TH, { day: 'numeric', month: 'short' })} ${fmtTime(a.outTime)} · ${a.outDist} ม.` } : null,
                    ].filter(Boolean) as any)} />
                  <p className="text-[11px] text-slate-400">จุดเขียว = ตำแหน่งตอนลงเวลาเข้า · จุดส้ม = ตอนลงเวลาออก (30 วันล่าสุด)</p>
                </div>
              )}
              {sum && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[['วันที่มา', sum.days], ['ชั่วโมงรวม', sum.hours], ['มาสาย', wp?.workStart ? sum.late : '—'], ['ออกก่อน', wp?.workEnd ? sum.early : '—'], ['ขาด (จ.–ศ.)', sum.absent], ['ไม่ได้ลงออก', sum.noOut]].map(([k, v]) => (
                    <div key={String(k)} className={`${card} p-3`}><p className="text-[11px] text-slate-400">{k}</p><p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{v}</p></div>
                  ))}
                </div>
              )}
              {att.length > 0 && (
                <div className={`${card} overflow-x-auto`}>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800"><th className="px-3 py-2 font-medium">วันที่</th><th className="px-3 py-2 font-medium">เข้า</th><th className="px-3 py-2 font-medium">ออก</th><th className="px-3 py-2 font-medium text-right">ชม.</th><th className="px-3 py-2 font-medium text-right">ระยะจากหมุด</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {att.map(a => (
                        <tr key={a.date} className="text-slate-700 dark:text-slate-200">
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(a.date, Language.TH, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                          <td className="px-3 py-2 tabular-nums">{fmtTime(a.inTime)}</td>
                          <td className="px-3 py-2 tabular-nums">{fmtTime(a.outTime)}</td>
                          <td className="px-3 py-2 tabular-nums text-right">{a.inTime && a.outTime ? (Math.round(((a.outTime - a.inTime) / 3600000) * 10) / 10) : '—'}</td>
                          <td className="px-3 py-2 tabular-nums text-right text-xs text-slate-500">{a.inDist} / {a.outTime ? a.outDist : '—'} ม.</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {view === 'eval' && (
            evals.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">{bundle.evalLinks[rid] ? 'สร้าง QR แล้ว รอพี่เลี้ยงส่งแบบประเมิน' : 'นักศึกษายังไม่ได้สร้าง QR สำหรับประเมิน'}</p> : (
              <div className="space-y-3">{evals.map((e, i) => <div key={i} className={`${card} p-5`}><EvalResult criteria={bundle.criteria} result={e} /></div>)}</div>
            )
          )}
        </div>
      )}
    </Modal>
  );
};

export default StudentRecordsModal;

import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Clock, LogIn, LogOut, Lock, RefreshCw, CheckCircle2, AlertTriangle, Timer, CalendarCheck, CalendarX, Hourglass, ShieldCheck } from 'lucide-react';
import { Language } from '../../types';
import { StudentBundle, StudentRecordLite, attendanceSummary, studentCall } from '../../studentApi';
import MapPicker, { LatLng } from './MapPicker';
import { card, field, btnMain, btnSoft, label, hint, SectionHead, Notice, isTH, fmtDate, fmtTime, stOf } from './shared';

interface Props {
  lang: Language;
  token: string;
  bundle: StudentBundle;
  record: StudentRecordLite;
  onRefresh: () => Promise<void>;
  onExpired: () => void;
}

const T = {
  th: {
    setupTitle: 'กำหนดพื้นที่ทำงาน', setupSub: 'ทำครั้งเดียวก่อนเริ่มลงเวลา ระบบจะให้ลงเวลาได้เฉพาะในพื้นที่นี้',
    step1: 'ปักหมุดที่ตั้งของหน่วยงาน', step1Hint: 'แนะนำ: กด “ใช้ตำแหน่งปัจจุบัน” ขณะอยู่ที่หน่วยงาน',
    step2: 'เลือกรัศมีพื้นที่', step2Hint: 'ครอบคลุมตัวอาคารและที่จอดรถ ในอาคาร GPS อาจคลาดเคลื่อนได้ 50–100 เมตร',
    useLogbook: 'ใช้หมุดจากข้อมูลหน่วยงาน', confirmTitle: 'ยืนยันพื้นที่ทำงาน?',
    confirmBody: 'หลังยืนยันแล้วจะแก้ไขเองไม่ได้ ถ้าต้องการเปลี่ยน ต้องติดต่อเจ้าหน้าที่ WISE ให้ปลดล็อก',
    confirm: 'ยืนยันและล็อกพื้นที่', cancel: 'กลับไปแก้', setBtn: 'บันทึกพื้นที่ทำงาน',
    nowTitle: 'ลงเวลาวันนี้', checkIn: 'ลงเวลาเข้างาน', checkOut: 'ลงเวลาออกงาน', doneToday: 'วันนี้ลงเวลาครบแล้ว',
    in: 'เข้างาน', out: 'ออกงาน', reading: 'กำลังอ่านตำแหน่ง…', sending: 'กำลังบันทึก…',
    okIn: (t: string) => `ลงเวลาเข้างาน ${t} น. เรียบร้อย`, okOut: (t: string) => `ลงเวลาออกงาน ${t} น. เรียบร้อย`,
    outside: (d: number, r: number) => `คุณอยู่ห่างจากที่ทำงาน ${d.toLocaleString()} เมตร (ต้องอยู่ภายใน ${r} เมตร)`,
    noGps: 'อ่านตำแหน่งไม่ได้ กรุณาเปิด GPS และอนุญาตให้เว็บนี้เข้าถึงตำแหน่ง', alreadyIn: 'วันนี้ลงเวลาเข้างานไปแล้ว', notIn: 'ต้องลงเวลาเข้างานก่อน', alreadyOut: 'วันนี้ลงเวลาออกงานไปแล้ว',
    lockedNote: 'เวลาเข้า-ออกบันทึกด้วยเวลาของเซิร์ฟเวอร์ และแก้ไขย้อนหลังไม่ได้',
    area: 'พื้นที่ทำงาน', radius: (r: number) => `รัศมี ${r} ม.`, areaLocked: 'ล็อกแล้ว · ถ้าหมุดผิดตำแหน่ง ติดต่อเจ้าหน้าที่เพื่อปลดล็อก',
    hours: 'เวลาทำงานปกติ', hoursHint: 'ใช้คำนวณมาสาย/ออกก่อนเวลา ถ้าเวลาไม่แน่นอน เว้นว่างได้', start: 'เวลาเริ่มงาน', end: 'เวลาเลิกงาน', saveHours: 'บันทึกเวลาทำงาน',
    sumTitle: 'สรุปการปฏิบัติงาน', days: 'วันที่มา', totalHours: 'ชั่วโมงรวม', late: 'มาสาย', early: 'ออกก่อนเวลา', absent: 'ขาด (จ.–ศ.)', noOut: 'ลืมลงเวลาออก',
    absentHint: 'นับวันจันทร์–ศุกร์ในช่วงฝึกที่ไม่มีการลงเวลาเข้า ถ้าหน่วยงานหยุดวันนั้นไม่ต้องกังวล',
    historyTitle: 'ประวัติการลงเวลา', none: 'ยังไม่มีการลงเวลา', date: 'วันที่', hrs: 'ชม.',
    flagLate: 'สาย', flagEarly: 'ออกก่อน', flagNoOut: 'ไม่ได้ลงออก', meters: 'ม.',
  },
  en: {
    setupTitle: 'Set your work area', setupSub: 'Do this once before clocking in. You can only clock in inside this area.',
    step1: 'Pin the workplace', step1Hint: 'Tip: tap “Use my location” while you are at the workplace',
    step2: 'Choose the radius', step2Hint: 'Cover the building and car park. Indoors, GPS can be off by 50–100 m.',
    useLogbook: 'Use the pin from workplace details', confirmTitle: 'Confirm your work area?',
    confirmBody: 'After confirming you cannot change it yourself. Ask WISE staff to unlock it if needed.',
    confirm: 'Confirm and lock', cancel: 'Go back', setBtn: 'Save work area',
    nowTitle: 'Today', checkIn: 'Clock in', checkOut: 'Clock out', doneToday: 'All done for today',
    in: 'In', out: 'Out', reading: 'Reading your location…', sending: 'Saving…',
    okIn: (t: string) => `Clocked in at ${t}`, okOut: (t: string) => `Clocked out at ${t}`,
    outside: (d: number, r: number) => `You are ${d.toLocaleString()} m from your workplace (must be within ${r} m)`,
    noGps: 'Could not read your location. Turn on GPS and allow location access.', alreadyIn: 'Already clocked in today', notIn: 'Clock in first', alreadyOut: 'Already clocked out today',
    lockedNote: 'Times come from the server clock and cannot be changed afterwards.',
    area: 'Work area', radius: (r: number) => `${r} m radius`, areaLocked: 'Locked · if the pin is wrong, ask staff to unlock it',
    hours: 'Usual hours', hoursHint: 'Used to flag late arrivals and early leaving. Leave empty if your hours vary.', start: 'Start', end: 'End', saveHours: 'Save hours',
    sumTitle: 'Attendance summary', days: 'Days present', totalHours: 'Total hours', late: 'Late', early: 'Left early', absent: 'Absent (Mon–Fri)', noOut: 'Missed clock-out',
    absentHint: 'Weekdays in the placement period with no clock-in. Ignore days the workplace was closed.',
    historyTitle: 'History', none: 'No records yet', date: 'Date', hrs: 'h',
    flagLate: 'Late', flagEarly: 'Early', flagNoOut: 'No clock-out', meters: 'm',
  },
};

const RADII = [100, 200, 300, 500];

const TimeTab: React.FC<Props> = ({ lang, token, bundle, record, onRefresh, onExpired }) => {
  const L = isTH(lang) ? T.th : T.en;
  const S = stOf(lang);
  const wp = bundle.workplaces[record.id];
  const rows = useMemo(() => [...(bundle.attendance[record.id] || [])].sort((a, b) => b.date.localeCompare(a.date)), [bundle.attendance, record.id]);
  const todayRow = rows.find(r => r.date === bundle.today);
  const logPin = bundle.logbooks[record.id]?.data;

  /* clock */
  const [now, setNow] = useState(Date.now());
  const offset = useMemo(() => bundle.serverTime - Date.now(), [bundle.serverTime]); // show server time
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  /* setup */
  const [pin, setPin] = useState<LatLng | null>(logPin?.lat && logPin?.lng ? { lat: logPin.lat, lng: logPin.lng } : null);
  const [addr, setAddr] = useState(logPin?.orgAddress || '');
  const [radius, setRadius] = useState(200);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null);

  /* hours */
  const [ws, setWs] = useState(wp?.workStart || '');
  const [we, setWe] = useState(wp?.workEnd || '');
  useEffect(() => { setWs(wp?.workStart || ''); setWe(wp?.workEnd || ''); }, [wp?.workStart, wp?.workEnd]);

  const call = async (op: string, data: Record<string, unknown>) => {
    const r = await studentCall(op, { token, recordId: record.id, ...data });
    if (r?.status === 'expired') { onExpired(); throw new Error('expired'); }
    return r;
  };

  const saveArea = async () => {
    if (!pin) return;
    setBusy('area'); setMsg(null);
    try {
      const r = await call('setWorkplace', { lat: pin.lat, lng: pin.lng, radius, address: addr });
      if (r?.status !== 'success') throw new Error(r?.message);
      await onRefresh();
      setConfirming(false);
    } catch (e: any) { if (e?.message !== 'expired') setMsg({ tone: 'error', text: S.failed }); } finally { setBusy(null); }
  };

  const clock = (kind: 'in' | 'out') => {
    setMsg(null);
    if (!navigator.geolocation) { setMsg({ tone: 'error', text: L.noGps }); return; }
    setBusy('gps');
    navigator.geolocation.getCurrentPosition(async pos => {
      setBusy('send');
      try {
        const r = await call('clock', { kind, lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
        if (r?.status === 'success') {
          setMsg({ tone: 'ok', text: (kind === 'in' ? L.okIn : L.okOut)(fmtTime(r.time)) });
          await onRefresh();
        } else if (r?.message === 'outside') setMsg({ tone: 'error', text: L.outside(r.distance, r.radius) });
        else if (r?.message === 'already_in') setMsg({ tone: 'warn', text: L.alreadyIn });
        else if (r?.message === 'not_in') setMsg({ tone: 'warn', text: L.notIn });
        else if (r?.message === 'already_out') setMsg({ tone: 'warn', text: L.alreadyOut });
        else setMsg({ tone: 'error', text: S.failed });
      } catch (e: any) { if (e?.message !== 'expired') setMsg({ tone: 'error', text: S.failed }); } finally { setBusy(null); }
    }, () => { setBusy(null); setMsg({ tone: 'error', text: L.noGps }); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  };

  const saveHours = async () => {
    setBusy('hours'); setMsg(null);
    try {
      const r = await call('setHours', { workStart: ws, workEnd: we });
      if (r?.status !== 'success') throw new Error();
      await onRefresh();
      setMsg({ tone: 'ok', text: S.saved });
    } catch (e: any) { if (e?.message !== 'expired') setMsg({ tone: 'error', text: S.failed }); } finally { setBusy(null); }
  };

  const sum = attendanceSummary(rows, wp, record.startDate, record.endDate, bundle.today);
  const toMin = (s?: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const sMin = toMin(wp?.workStart), eMin = toMin(wp?.workEnd);
  const minOf = (ms: number) => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };

  const message = msg && <Notice tone={msg.tone} icon={msg.tone === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}>{msg.text}</Notice>;

  /* ---------- first time: define the work area ---------- */
  if (!wp) {
    return (
      <section>
        <SectionHead icon={<MapPin size={17} />} title={L.setupTitle} sub={L.setupSub} />
        <div className={`${card} p-5 sm:p-6 space-y-6`}>
          <div>
            <p className="flex items-center gap-2 text-[15px] font-medium text-[#2a0a17] dark:text-white"><span className="w-6 h-6 rounded-full bg-[#630330] text-white text-[12px] flex items-center justify-center">1</span>{L.step1}</p>
            <p className={`${hint} mb-3`}>{L.step1Hint}</p>
            {logPin?.lat && logPin?.lng && (pin?.lat !== logPin.lat || pin?.lng !== logPin.lng) && (
              <button onClick={() => { setPin({ lat: logPin.lat!, lng: logPin.lng! }); setAddr(logPin.orgAddress || ''); }} className={`${btnSoft} mb-3`}><MapPin size={15} />{L.useLogbook}</button>
            )}
            <MapPicker lang={lang} value={pin} onChange={setPin} onAddress={setAddr} radius={radius} height={300} />
            {addr && <p className="mt-2 text-[12.5px] text-[#6e5560] dark:text-slate-300 line-clamp-2">{addr}</p>}
          </div>
          <div>
            <p className="flex items-center gap-2 text-[15px] font-medium text-[#2a0a17] dark:text-white"><span className="w-6 h-6 rounded-full bg-[#630330] text-white text-[12px] flex items-center justify-center">2</span>{L.step2}</p>
            <p className={`${hint} mb-3`}>{L.step2Hint}</p>
            <div className="flex flex-wrap gap-2">
              {RADII.map(r => (
                <button key={r} onClick={() => setRadius(r)} className={`h-10 px-4 rounded-full text-[13.5px] transition ${radius === r ? 'bg-[#630330] text-white' : 'border border-[#e6d9c4] dark:border-white/10 text-[#6e5560] dark:text-slate-300 hover:border-[#630330]'}`}>{r} {L.meters}</button>
              ))}
            </div>
          </div>
          {message}
          {confirming ? (
            <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-4">
              <p className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-100"><Lock size={16} />{L.confirmTitle}</p>
              <p className="mt-1 text-[13px] text-amber-800 dark:text-amber-200">{L.confirmBody}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={saveArea} disabled={busy === 'area'} className={btnMain}>{busy === 'area' ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}{L.confirm}</button>
                <button onClick={() => setConfirming(false)} className={btnSoft}>{L.cancel}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} disabled={!pin} className={btnMain}><MapPin size={16} />{L.setBtn}</button>
          )}
        </div>
      </section>
    );
  }

  /* ---------- daily clock ---------- */
  const serverNow = new Date(now + offset);
  const phase = !todayRow?.inTime ? 'in' : !todayRow.outTime ? 'out' : 'done';

  return (
    <div className="space-y-8">
      <section>
        <SectionHead icon={<Clock size={17} />} title={L.nowTitle} sub={fmtDate(serverNow, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          <div className="relative overflow-hidden rounded-[26px] bg-[#630330] text-white p-6 flex flex-col items-center text-center">
            <div className="wl-pattern opacity-[0.14]" />
            <p className="relative text-[12.5px] text-[#e8cf7a]">{isTH(lang) ? 'เวลาขณะนี้' : 'Current time'}</p>
            <p className="relative wl-latin text-[54px] font-extrabold leading-none tabular-nums mt-1">{fmtTime(serverNow.getTime())}<span className="text-[22px] opacity-60">:{String(serverNow.getSeconds()).padStart(2, '0')}</span></p>
            <div className="relative mt-5 grid grid-cols-2 gap-3 w-full max-w-[300px]">
              <div className="rounded-2xl bg-white/10 py-3"><p className="text-[11.5px] text-white/60">{L.in}</p><p className="text-[22px] font-semibold tabular-nums">{fmtTime(todayRow?.inTime)}</p></div>
              <div className="rounded-2xl bg-white/10 py-3"><p className="text-[11.5px] text-white/60">{L.out}</p><p className="text-[22px] font-semibold tabular-nums">{fmtTime(todayRow?.outTime)}</p></div>
            </div>
            <div className="relative mt-5 w-full max-w-[300px]">
              {phase === 'done' ? (
                <p className="h-12 rounded-full bg-white/10 flex items-center justify-center gap-2 text-[14.5px]"><CheckCircle2 size={18} className="text-[#e8cf7a]" />{L.doneToday}</p>
              ) : (
                <button onClick={() => clock(phase)} disabled={!!busy} className="w-full h-12 rounded-full bg-[#D4AF37] hover:bg-[#e2c056] text-[#2a0114] text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-70">
                  {busy === 'gps' || busy === 'send' ? <><RefreshCw size={17} className="animate-spin" />{busy === 'gps' ? L.reading : L.sending}</> : phase === 'in' ? <><LogIn size={18} />{L.checkIn}</> : <><LogOut size={18} />{L.checkOut}</>}
                </button>
              )}
            </div>
            <p className="relative mt-3 text-[11px] text-white/55 flex items-center gap-1.5"><ShieldCheck size={12} />{L.lockedNote}</p>
          </div>

          <div className={`${card} p-4 space-y-3`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-medium text-[#2a0a17] dark:text-white flex items-center gap-1.5"><MapPin size={15} className="text-[#630330] dark:text-[#e8cf7a]" />{L.area} · {L.radius(wp.radius)}</p>
                {wp.address && <p className="text-[12px] text-[#7d6470] dark:text-slate-400 line-clamp-2 mt-0.5">{wp.address}</p>}
              </div>
              {wp.locked && <Lock size={15} className="text-[#b3a0a8] shrink-0 mt-1" />}
            </div>
            <MapPicker lang={lang} readOnly value={{ lat: wp.lat, lng: wp.lng }} radius={wp.radius} height={210}
              extra={todayRow?.inLat && todayRow?.inLng ? [{ lat: todayRow.inLat, lng: todayRow.inLng, color: '#10b981', label: `${L.in} ${fmtTime(todayRow.inTime)}` }] : []} />
            {wp.locked && <p className="text-[11.5px] font-light text-[#8d7480] dark:text-slate-400">{L.areaLocked}</p>}
          </div>
        </div>
        {msg && <div className="mt-4">{message}</div>}
      </section>

      {/* usual hours */}
      <section className={`${card} p-5`}>
        <p className="text-[15px] font-medium text-[#2a0a17] dark:text-white flex items-center gap-2"><Timer size={16} className="text-[#630330] dark:text-[#e8cf7a]" />{L.hours}</p>
        <p className={`${hint} mb-3`}>{L.hoursHint}</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block"><span className={label}>{L.start}</span><input type="time" value={ws} onChange={e => setWs(e.target.value)} className={`${field} w-36`} /></label>
          <label className="block"><span className={label}>{L.end}</span><input type="time" value={we} onChange={e => setWe(e.target.value)} className={`${field} w-36`} /></label>
          <button onClick={saveHours} disabled={busy === 'hours' || (ws === (wp.workStart || '') && we === (wp.workEnd || ''))} className={btnSoft}>{busy === 'hours' ? <RefreshCw size={15} className="animate-spin" /> : null}{L.saveHours}</button>
        </div>
      </section>

      {/* summary */}
      <section>
        <SectionHead icon={<CalendarCheck size={17} />} title={L.sumTitle} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { k: L.days, v: sum.days, icon: <CalendarCheck size={16} />, cls: 'text-emerald-700 dark:text-emerald-300' },
            { k: L.totalHours, v: sum.hours, icon: <Hourglass size={16} />, cls: 'text-[#630330] dark:text-[#e8cf7a]' },
            { k: L.late, v: sMin === null ? '—' : sum.late, icon: <Clock size={16} />, cls: 'text-amber-700 dark:text-amber-300' },
            { k: L.early, v: eMin === null ? '—' : sum.early, icon: <LogOut size={16} />, cls: 'text-amber-700 dark:text-amber-300' },
            { k: L.absent, v: sum.absent, icon: <CalendarX size={16} />, cls: 'text-rose-700 dark:text-rose-300' },
            { k: L.noOut, v: sum.noOut, icon: <AlertTriangle size={16} />, cls: 'text-rose-700 dark:text-rose-300' },
          ].map(x => (
            <div key={x.k} className={`${card} p-4`}>
              <p className="flex items-center justify-between text-[12.5px] text-[#7d6470] dark:text-slate-400">{x.k}<span className={x.cls}>{x.icon}</span></p>
              <p className={`wl-latin mt-1 text-[28px] font-extrabold tabular-nums ${x.cls}`}>{x.v}</p>
            </div>
          ))}
        </div>
        <p className={`${hint} mt-2`}>{L.absentHint}</p>
      </section>

      {/* history */}
      <section>
        <SectionHead icon={<Clock size={17} />} title={L.historyTitle} />
        <div className={`${card} overflow-hidden`}>
          {rows.length === 0 ? <p className="px-5 py-10 text-center text-[13.5px] font-light text-[#8d7480]">{L.none}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-[#8d7480] dark:text-slate-400 border-b border-[#f3ebdf] dark:border-white/5">
                  <th className="px-4 py-2.5 font-normal">{L.date}</th><th className="px-3 py-2.5 font-normal">{L.in}</th><th className="px-3 py-2.5 font-normal">{L.out}</th><th className="px-3 py-2.5 font-normal text-right">{L.hrs}</th><th className="px-4 py-2.5 font-normal"></th>
                </tr></thead>
                <tbody className="divide-y divide-[#f6efe4] dark:divide-white/5">
                  {rows.map(r => {
                    const h = r.inTime && r.outTime ? Math.round(((r.outTime - r.inTime) / 3600000) * 10) / 10 : null;
                    const flags = [
                      sMin !== null && r.inTime && minOf(r.inTime) > sMin ? { t: L.flagLate, c: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' } : null,
                      eMin !== null && r.outTime && minOf(r.outTime) < eMin ? { t: L.flagEarly, c: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' } : null,
                      r.inTime && !r.outTime && r.date !== bundle.today ? { t: L.flagNoOut, c: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' } : null,
                    ].filter(Boolean) as { t: string; c: string }[];
                    return (
                      <tr key={r.date} className="text-[#2a0a17] dark:text-slate-200">
                        <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(r.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                        <td className="px-3 py-2.5 tabular-nums">{fmtTime(r.inTime)}</td>
                        <td className="px-3 py-2.5 tabular-nums">{fmtTime(r.outTime)}</td>
                        <td className="px-3 py-2.5 tabular-nums text-right">{h ?? '—'}</td>
                        <td className="px-4 py-2.5"><span className="flex flex-wrap gap-1">{flags.map(f => <span key={f.t} className={`px-2 h-6 inline-flex items-center rounded-full text-[11.5px] ${f.c}`}>{f.t}</span>)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default TimeTab;

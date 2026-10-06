import React, { useEffect, useMemo, useState } from 'react';
import { Building2, NotebookPen, Plus, Trash2, Check, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, Users, Home, History, UserRound, Clock } from 'lucide-react';
import { Language } from '../../types';
import { LogbookData, StudentBundle, StudentRecordLite, Coworker, localDate, isoOf, studentCall } from '../../studentApi';
import MapPicker from './MapPicker';
import { card, field, area, btnMain, btnSoft, label, hint, SectionHead, Notice, isTH, fmtDate, fmtTime, stOf } from './shared';

interface Props {
  lang: Language;
  token: string;
  bundle: StudentBundle;
  record: StudentRecordLite;
  onPatch: (fn: (b: StudentBundle) => StudentBundle) => void;
  onExpired: () => void;
}

const T = {
  th: {
    orgTitle: 'ข้อมูลหน่วยงาน', orgSub: 'กรอกครั้งเดียว แก้ไขได้ตลอดช่วงฝึก',
    orgName: 'ชื่อหน่วยงาน / สถานประกอบการ', orgAddress: 'ที่อยู่หน่วยงาน', orgAddressHint: 'ปักหมุดบนแผนที่ด้านล่าง ระบบจะเติมที่อยู่ให้ แก้ไขเพิ่มได้',
    openMap: 'เปิดใน Google Maps',
    mentor: 'พี่เลี้ยง', mentorName: 'ชื่อ-สกุลพี่เลี้ยง', mentorPos: 'ตำแหน่ง', phone: 'เบอร์โทร', fb: 'Facebook (ถ้ามี)', line: 'LINE ID (ถ้ามี)',
    me: 'ข้อมูลระหว่างฝึก', lodging: 'สถานที่พักระหว่างฝึก', lodgingPh: 'เช่น หอพัก ... ใกล้หน่วยงาน',
    coworkers: 'นักศึกษาที่ร่วมปฏิบัติงาน', coName: 'ชื่อ-สกุล', coId: 'รหัสนักศึกษา (ถ้ามี)', addCo: 'เพิ่มเพื่อนร่วมฝึก', noCo: 'ยังไม่มี กด “เพิ่ม” ถ้ามีเพื่อนฝึกด้วยกัน',
    history: 'ประวัติความเป็นมาโดยย่อของหน่วยงาน', historyPh: 'ก่อตั้งเมื่อ… ดำเนินธุรกิจด้าน… จุดเด่นของหน่วยงาน…',
    saveOrg: 'บันทึกข้อมูลหน่วยงาน', unsaved: 'มีการแก้ไขที่ยังไม่บันทึก', lastSaved: 'บันทึกล่าสุด',
    diaryTitle: 'บันทึกการปฏิบัติงานรายสัปดาห์', diarySub: 'จดสิ่งที่ทำและสิ่งที่ได้เรียนรู้ในแต่ละวัน ไม่ต้องกรอกทุกวัน วันหยุดเว้นว่างได้',
    week: (n: number) => `สัปดาห์ที่ ${n}`, filled: (a: number) => `กรอกแล้ว ${a}/7 วัน`,
    dayPh: 'วันนี้ทำอะไร ได้เรียนรู้อะไร (ไม่บังคับ)', future: 'ยังไม่ถึงวันนี้', autosave: 'บันทึกอัตโนมัติเมื่อคลิกออกจากช่อง',
    inOut: 'เข้า–ออก', noDates: 'ยังไม่มีวันเริ่ม-สิ้นสุดการฝึกในระบบ จึงแสดงสัปดาห์ปัจจุบัน',
    days: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'],
  },
  en: {
    orgTitle: 'Workplace details', orgSub: 'Fill in once; you can edit any time during the placement',
    orgName: 'Organisation name', orgAddress: 'Address', orgAddressHint: 'Drop a pin on the map below to fill this in, then edit as needed',
    openMap: 'Open in Google Maps',
    mentor: 'Mentor', mentorName: 'Mentor name', mentorPos: 'Position', phone: 'Phone', fb: 'Facebook (optional)', line: 'LINE ID (optional)',
    me: 'During the placement', lodging: 'Where you stay', lodgingPh: 'e.g. dormitory near the office',
    coworkers: 'Fellow students at the same site', coName: 'Full name', coId: 'Student ID (optional)', addCo: 'Add a fellow student', noCo: 'None yet. Tap “Add” if you train with others.',
    history: 'Short history of the organisation', historyPh: 'Founded in… works in… known for…',
    saveOrg: 'Save workplace details', unsaved: 'Unsaved changes', lastSaved: 'Last saved',
    diaryTitle: 'Weekly work log', diarySub: 'Note what you did and learned each day. Days off can stay empty.',
    week: (n: number) => `Week ${n}`, filled: (a: number) => `${a}/7 days filled`,
    dayPh: 'What did you do and learn today? (optional)', future: 'Not yet', autosave: 'Saves automatically when you leave a box',
    inOut: 'In–out', noDates: 'No placement dates on record, so the current week is shown',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
};

const mondayOf = (d: Date) => { const c = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (c.getDay() + 6) % 7; c.setDate(c.getDate() - wd); return c; };

const LogbookTab: React.FC<Props> = ({ lang, token, bundle, record, onPatch, onExpired }) => {
  const L = isTH(lang) ? T.th : T.en;
  const S = stOf(lang);
  const saved = bundle.logbooks[record.id];
  const [form, setForm] = useState<LogbookData>(() => ({ orgName: record.location || '', ...(saved?.data || {}) }));
  const [dirty, setDirty] = useState(false);
  const [orgState, setOrgState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => { setForm({ orgName: record.location || '', ...(bundle.logbooks[record.id]?.data || {}) }); setDirty(false); }, [record.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof LogbookData>(k: K, v: LogbookData[K]) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); setOrgState('idle'); };
  const coworkers = form.coworkers || [];
  const setCo = (i: number, p: Partial<Coworker>) => set('coworkers', coworkers.map((c, j) => (j === i ? { ...c, ...p } : c)));

  const saveOrg = async () => {
    setOrgState('saving');
    const data: LogbookData = { ...form, coworkers: coworkers.filter(c => c.name.trim()) };
    try {
      const r = await studentCall('saveLogbook', { token, recordId: record.id, data });
      if (r?.status === 'expired') return onExpired();
      if (r?.status !== 'success') throw new Error();
      onPatch(b => ({ ...b, logbooks: { ...b.logbooks, [record.id]: { data, updatedAt: r.updatedAt } } }));
      setDirty(false); setOrgState('saved');
    } catch { setOrgState('error'); }
  };

  /* ---------- weekly diary ---------- */
  const today = localDate(bundle.today) || new Date();
  const start = localDate(record.startDate), end = localDate(record.endDate);
  const weeks = useMemo(() => {
    const first = mondayOf(start || today);
    const lastDay = end && start && end >= start ? end : (start ? new Date(Math.max(today.getTime(), start.getTime())) : today);
    const list: Date[] = [];
    for (const d = new Date(first); d <= lastDay && list.length < 60; d.setDate(d.getDate() + 7)) list.push(new Date(d));
    return list.length ? list : [mondayOf(today)];
  }, [record.startDate, record.endDate, bundle.today]); // eslint-disable-line react-hooks/exhaustive-deps
  // Open on this week; after the placement ends, on the last week
  const found = weeks.findIndex(w => today >= w && today < new Date(w.getFullYear(), w.getMonth(), w.getDate() + 7));
  const currentIdx = found >= 0 ? found : today > weeks[weeks.length - 1] ? weeks.length - 1 : 0;
  const [wi, setWi] = useState(currentIdx);
  useEffect(() => { setWi(currentIdx); }, [record.id, weeks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const diary = bundle.diary[record.id] || {};
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dayState, setDayState] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const attByDate = useMemo(() => Object.fromEntries((bundle.attendance[record.id] || []).map(a => [a.date, a])), [bundle.attendance, record.id]);

  const weekStart = weeks[Math.min(wi, weeks.length - 1)];
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  const filled = days.filter(d => (drafts[isoOf(d)] ?? diary[isoOf(d)] ?? '').trim()).length;

  const saveDay = async (iso: string) => {
    const text = drafts[iso];
    if (text === undefined || text === (diary[iso] || '')) return;
    setDayState(s => ({ ...s, [iso]: 'saving' }));
    try {
      const r = await studentCall('saveDiary', { token, recordId: record.id, date: iso, text });
      if (r?.status === 'expired') return onExpired();
      if (r?.status !== 'success') throw new Error();
      onPatch(b => ({ ...b, diary: { ...b.diary, [record.id]: { ...(b.diary[record.id] || {}), [iso]: text } } }));
      setDrafts(d => { const n = { ...d }; delete n[iso]; return n; });
      setDayState(s => ({ ...s, [iso]: 'saved' }));
    } catch { setDayState(s => ({ ...s, [iso]: 'error' })); }
  };

  const mapsLink = form.lat && form.lng ? `https://www.google.com/maps?q=${form.lat},${form.lng}` : form.orgAddress ? `https://www.google.com/maps/search/${encodeURIComponent(form.orgAddress)}` : '';

  return (
    <div className="space-y-8">
      {/* ---------- workplace details ---------- */}
      <section>
        <SectionHead icon={<Building2 size={17} />} title={L.orgTitle} sub={L.orgSub} />
        <div className={`${card} p-5 sm:p-6 space-y-6`}>
          <div className="grid gap-4">
            <label className="block"><span className={label}>{L.orgName}</span>
              <input value={form.orgName || ''} onChange={e => set('orgName', e.target.value)} className={field} />
            </label>
            <div>
              <span className={label}>{L.orgAddress}</span>
              <textarea value={form.orgAddress || ''} onChange={e => set('orgAddress', e.target.value)} rows={2} className={area.replace('min-h-[96px]', 'min-h-[64px]')} />
              <span className={hint}>{L.orgAddressHint}</span>
            </div>
            <MapPicker lang={lang} value={form.lat && form.lng ? { lat: form.lat, lng: form.lng } : null}
              onChange={p => { setForm(f => ({ ...f, lat: p.lat, lng: p.lng })); setDirty(true); }}
              onAddress={a => setForm(f => (f.orgAddress?.trim() ? f : { ...f, orgAddress: a }))} />
            {mapsLink && <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-[#630330] dark:text-[#e8cf7a] hover:underline w-fit"><ExternalLink size={14} />{L.openMap}</a>}
          </div>

          <div className="pt-5 border-t border-[#f3ebdf] dark:border-white/5">
            <p className="flex items-center gap-2 text-[15px] font-medium text-[#2a0a17] dark:text-white mb-3"><UserRound size={16} className="text-[#630330] dark:text-[#e8cf7a]" />{L.mentor}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className={label}>{L.mentorName}</span><input value={form.mentorName || ''} onChange={e => set('mentorName', e.target.value)} className={field} /></label>
              <label className="block"><span className={label}>{L.mentorPos}</span><input value={form.mentorPosition || ''} onChange={e => set('mentorPosition', e.target.value)} className={field} /></label>
              <label className="block"><span className={label}>{L.phone}</span><input value={form.mentorPhone || ''} inputMode="tel" onChange={e => set('mentorPhone', e.target.value)} className={field} /></label>
              <label className="block"><span className={label}>{L.fb}</span><input value={form.facebook || ''} onChange={e => set('facebook', e.target.value)} className={field} /></label>
              <label className="block sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]"><span className={label}>{L.line}</span><input value={form.line || ''} onChange={e => set('line', e.target.value)} className={field} /></label>
            </div>
          </div>

          <div className="pt-5 border-t border-[#f3ebdf] dark:border-white/5 space-y-4">
            <p className="flex items-center gap-2 text-[15px] font-medium text-[#2a0a17] dark:text-white"><Home size={16} className="text-[#630330] dark:text-[#e8cf7a]" />{L.me}</p>
            <label className="block"><span className={label}>{L.lodging}</span><input value={form.lodging || ''} onChange={e => set('lodging', e.target.value)} placeholder={L.lodgingPh} className={field} /></label>
            <div>
              <span className={`${label} flex items-center gap-1.5`}><Users size={14} />{L.coworkers}</span>
              {coworkers.length === 0 && <p className="text-[12.5px] font-light text-[#8d7480] dark:text-slate-400 mb-2">{L.noCo}</p>}
              <div className="space-y-2">
                {coworkers.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={c.name} onChange={e => setCo(i, { name: e.target.value })} placeholder={L.coName} className={`${field} flex-[2]`} aria-label={L.coName} />
                    <input value={c.studentId || ''} inputMode="numeric" onChange={e => setCo(i, { studentId: e.target.value })} placeholder={L.coId} className={`${field} flex-1 min-w-0`} aria-label={L.coId} />
                    <button type="button" onClick={() => set('coworkers', coworkers.filter((_, j) => j !== i))} className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-[#b3a0a8] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label="remove"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => set('coworkers', [...coworkers, { name: '' }])} className={`${btnSoft} mt-2`}><Plus size={15} />{L.addCo}</button>
            </div>
          </div>

          <div className="pt-5 border-t border-[#f3ebdf] dark:border-white/5">
            <label className="block"><span className={`${label} flex items-center gap-1.5`}><History size={14} />{L.history}</span>
              <textarea value={form.orgHistory || ''} onChange={e => set('orgHistory', e.target.value)} rows={5} placeholder={L.historyPh} className={area} />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-[12.5px] text-[#8d7480] dark:text-slate-400">
              {orgState === 'error' ? <span className="text-rose-600">{S.failed}</span> : dirty ? <span className="text-amber-700 dark:text-amber-300">● {L.unsaved}</span> : saved?.updatedAt ? `${L.lastSaved} ${fmtDate(new Date(Number(saved.updatedAt)), lang)} ${fmtTime(Number(saved.updatedAt))}` : ''}
            </span>
            <button onClick={saveOrg} disabled={orgState === 'saving' || (!dirty && orgState !== 'error')} className={btnMain}>
              {orgState === 'saving' ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}{orgState === 'saved' && !dirty ? S.saved : L.saveOrg}
            </button>
          </div>
        </div>
      </section>

      {/* ---------- weekly diary ---------- */}
      <section>
        <SectionHead icon={<NotebookPen size={17} />} title={L.diaryTitle} sub={L.diarySub} />
        {!start && <div className="mb-3"><Notice tone="warn">{L.noDates}</Notice></div>}
        <div className={`${card} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setWi(i => Math.max(0, i - 1))} disabled={wi === 0} className="w-10 h-10 rounded-full flex items-center justify-center text-[#630330] dark:text-[#e8cf7a] hover:bg-[#630330]/[0.07] disabled:opacity-30" aria-label="previous week"><ChevronLeft size={18} className="rtl:rotate-180" /></button>
              <div className="relative">
                <select value={wi} onChange={e => setWi(Number(e.target.value))} className="appearance-none h-10 pl-4 pr-9 rounded-full bg-[#630330] text-white text-[14px] font-medium outline-none cursor-pointer" aria-label="week">
                  {weeks.map((w, i) => <option key={i} value={i}>{L.week(i + 1)} · {fmtDate(w, lang, { day: 'numeric', month: 'short' })}</option>)}
                </select>
                <ChevronRight size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-white/70" />
              </div>
              <button onClick={() => setWi(i => Math.min(weeks.length - 1, i + 1))} disabled={wi >= weeks.length - 1} className="w-10 h-10 rounded-full flex items-center justify-center text-[#630330] dark:text-[#e8cf7a] hover:bg-[#630330]/[0.07] disabled:opacity-30" aria-label="next week"><ChevronRight size={18} className="rtl:rotate-180" /></button>
            </div>
            <div className="flex items-center gap-3 text-[12.5px] text-[#7d6470] dark:text-slate-400">
              <span>{fmtDate(days[0], lang, { day: 'numeric', month: 'short' })} – {fmtDate(days[6], lang)}</span>
              <span className="inline-flex items-center h-7 px-3 rounded-full bg-[#D4AF37]/15 text-[#8a6a14] dark:text-[#e8cf7a] tabular-nums">{L.filled(filled)}</span>
            </div>
          </div>

          <div className="grid gap-3">
            {days.map((d, i) => {
              const iso = isoOf(d);
              const future = d > today;
              const outside = (start && d < start) || (end && d > end);
              const val = drafts[iso] ?? diary[iso] ?? '';
              const st = dayState[iso];
              const att = attByDate[iso];
              const weekend = i >= 5;
              return (
                <div key={iso} className={`rounded-2xl border p-3.5 transition ${iso === bundle.today ? 'border-[#630330]/40 dark:border-[#e8cf7a]/40 bg-[#630330]/[0.02]' : 'border-[#f0e6d6] dark:border-white/10'} ${outside || future ? 'opacity-60' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="flex items-baseline gap-2">
                      <span className={`text-[14px] font-medium ${weekend ? 'text-rose-600 dark:text-rose-300' : 'text-[#2a0a17] dark:text-white'}`}>{L.days[i]}</span>
                      <span className="text-[12.5px] text-[#8d7480] dark:text-slate-400">{fmtDate(d, lang)}</span>
                    </p>
                    <span className="flex items-center gap-2 text-[11.5px]">
                      {att?.inTime && <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 tabular-nums"><Clock size={11} />{fmtTime(att.inTime)}–{att.outTime ? fmtTime(att.outTime) : '…'}</span>}
                      {st === 'saving' && <span className="text-[#8d7480] inline-flex items-center gap-1"><RefreshCw size={11} className="animate-spin" />{S.saving}</span>}
                      {st === 'saved' && <span className="text-emerald-600 inline-flex items-center gap-1"><Check size={12} />{S.saved}</span>}
                      {st === 'error' && <button onClick={() => saveDay(iso)} className="text-rose-600 underline">{S.failed}</button>}
                    </span>
                  </div>
                  {future ? (
                    <p className="text-[12.5px] font-light text-[#b3a0a8]">{L.future}</p>
                  ) : (
                    <textarea value={val} rows={val ? Math.min(8, Math.max(2, val.split('\n').length + 1)) : 2} placeholder={L.dayPh}
                      onChange={e => { const v = e.target.value; setDrafts(dd => ({ ...dd, [iso]: v })); }}
                      onBlur={() => saveDay(iso)}
                      className={`${area.replace('min-h-[96px]', 'min-h-[60px]')} text-[14px]`} aria-label={`${L.days[i]} ${fmtDate(d, lang)}`} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] font-light text-[#8d7480] dark:text-slate-400">{L.autosave}</p>
        </div>
      </section>
    </div>
  );
};

export default LogbookTab;

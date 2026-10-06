import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, RefreshCw, CheckCircle2, AlertCircle, Building2, CalendarRange, UserRound, Send } from 'lucide-react';
import { post, backendHasStudents, EvalCategory, questionsOf, categoryScores, overallScore, SCORE_LABELS } from '../../studentApi';
import { levelCls } from './EvalResult';
import { fmtDate, majorName, typeName } from './shared';
import { Language } from '../../types';

interface EvalInfo {
  student: { name: string; studentId: string; major: string; internshipType: string; position: string; startDate: string; endDate: string } | null;
  org: string;
  mentor: { name: string; position: string };
  criteria: EvalCategory[];
  submitted: { evaluatorName: string; submittedAt: number; avg: number; percent: number; level: string } | null;
}

const SCALE = [5, 4, 3, 2, 1];
const input = 'w-full h-11 px-3.5 rounded-xl border border-[#e6d9c4] bg-white text-[15px] text-[#2a0a17] placeholder:text-[#b3a0a8] outline-none focus:border-[#630330] focus:ring-4 focus:ring-[#630330]/10';

/** Public form the mentor opens from the student's QR code. No sign-in; the link token is the key. */
const EvaluationPage: React.FC<{ token: string; logo?: string }> = ({ token, logo }) => {
  const [info, setInfo] = useState<EvalInfo | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ avg: number; percent: number; level: string } | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    document.title = 'แบบประเมินผลการฝึก · WISE';
    backendHasStudents()
      .then(ok => (ok ? post({ type: 'eval', op: 'get', t: token }) : { status: 'error', message: 'backend' }))
      .then(r => {
        if (r?.status !== 'success') { setLoadErr(r?.message === 'not_found' ? 'ไม่พบแบบประเมินนี้ ลิงก์อาจไม่ถูกต้อง กรุณาขอ QR Code ใหม่จากนักศึกษา' : 'โหลดแบบประเมินไม่สำเร็จ กรุณาลองใหม่'); return; }
        setInfo(r);
        setName(r.mentor?.name || '');
        setPosition(r.mentor?.position || '');
      })
      .catch(() => setLoadErr('เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'));
  }, [token]);

  const qs = useMemo(() => (info ? questionsOf(info.criteria) : []), [info]);
  const answered = qs.filter(q => scores[q.id]).length;
  const live = info && answered ? overallScore(info.criteria, scores) : null;

  const submit = async () => {
    setTried(true); setErr('');
    if (!name.trim()) { setErr('กรุณากรอกชื่อผู้ประเมิน'); return; }
    if (answered < qs.length) { setErr(`ยังให้คะแนนไม่ครบ (${answered}/${qs.length} ข้อ)`); document.querySelector('[data-missing="1"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    setBusy(true);
    try {
      const r = await post({ type: 'eval', op: 'submit', t: token, evaluatorName: name.trim(), evaluatorPosition: position.trim(), scores, comment: comment.trim() });
      if (r?.status === 'success') { setDone(r.result); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (r?.message === 'already') setErr('แบบประเมินนี้ถูกส่งไปแล้ว');
      else setErr('ส่งไม่สำเร็จ กรุณาลองใหม่');
    } catch { setErr('ส่งไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'); } finally { setBusy(false); }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-[100dvh] bg-[#fbf7f0] text-[#2a0a17]" style={{ fontFamily: "'Kanit', 'Anuphan', sans-serif" }}>
      <header className="bg-[#630330] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          {logo ? <img src={logo} alt="" className="h-9 max-w-[150px] object-contain bg-white rounded-lg p-1" /> : <span className="w-9 h-9 rounded-lg bg-[#D4AF37] text-[#2a0114] font-extrabold flex items-center justify-center">W</span>}
          <div className="min-w-0">
            <p className="text-[17px] font-medium leading-tight">แบบประเมินผลการฝึกงาน / สหกิจศึกษา</p>
            <p className="text-[12.5px] text-white/70">หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน (WISE) คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี</p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">{children}</main>
    </div>
  );

  if (loadErr) return shell(<div className="rounded-3xl bg-white border border-rose-200 p-8 text-center"><AlertCircle size={28} className="mx-auto text-rose-500" /><p className="mt-3 text-[15px]">{loadErr}</p></div>);
  if (!info) return shell(<div className="py-20 flex justify-center text-[#8d7480]"><RefreshCw size={22} className="animate-spin" /></div>);

  const st = info.student;
  const studentCard = (
    <section className="rounded-3xl bg-white border border-[#efe4d2] p-5 sm:p-6">
      <p className="text-[12.5px] text-[#8d7480]">นักศึกษาที่รับการประเมิน</p>
      <p className="mt-0.5 text-[19px] font-medium">{st?.name || '-'}</p>
      <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[13.5px] text-[#4a2a37]">
        <span>รหัสนักศึกษา <b className="font-medium tabular-nums">{st?.studentId}</b></span>
        <span>{st ? majorName(st.major, Language.TH) : ''}</span>
        <span className="flex items-center gap-1.5"><Building2 size={14} className="text-[#630330]" />{info.org || '-'}</span>
        <span className="flex items-center gap-1.5"><UserRound size={14} className="text-[#630330]" />{st ? typeName(st.internshipType, Language.TH) : ''}{st?.position ? ` · ${st.position}` : ''}</span>
        {(st?.startDate || st?.endDate) && <span className="flex items-center gap-1.5 sm:col-span-2"><CalendarRange size={14} className="text-[#630330]" />{fmtDate(st.startDate, Language.TH)} – {fmtDate(st.endDate, Language.TH)}</span>}
      </div>
    </section>
  );

  const resultCard = (r: { avg: number; percent: number; level: string }, title: string, sub: string) => (
    <section className="rounded-3xl bg-white border border-emerald-200 p-6 sm:p-8 text-center">
      <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
      <p className="mt-3 text-[20px] font-medium">{title}</p>
      <p className="mt-1 text-[13.5px] text-[#7d6470]">{sub}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <span className="text-[34px] font-extrabold tabular-nums text-[#630330]">{r.avg.toFixed(2)}</span>
        <span className={`inline-flex items-center h-8 px-3.5 rounded-full text-[14px] font-medium ${levelCls(r.level)}`}>{r.level}</span>
        <span className="text-[14px] tabular-nums text-[#6e5560]">ร้อยละ {r.percent.toFixed(2)}</span>
      </div>
    </section>
  );

  if (done) return shell(<>{resultCard(done, 'ส่งแบบประเมินเรียบร้อย ขอบคุณครับ/ค่ะ', 'ผลการประเมินถูกส่งถึงนักศึกษาและเจ้าหน้าที่ WISE แล้ว')}{studentCard}</>);
  if (info.submitted) return shell(<>{resultCard(info.submitted, 'แบบประเมินนี้ส่งแล้ว', `ประเมินโดย ${info.submitted.evaluatorName} เมื่อ ${new Date(info.submitted.submittedAt).toLocaleDateString('th-TH', { dateStyle: 'long' })}`)}{studentCard}</>);

  const cats = categoryScores(info.criteria, scores);

  return shell(
    <>
      {studentCard}

      <section className="rounded-3xl bg-white border border-[#efe4d2] p-5 sm:p-6 space-y-4">
        <p className="text-[16px] font-medium">ผู้ประเมิน</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="block text-[13px] mb-1">ชื่อ-สกุล <span className="text-rose-500">*</span></span><input value={name} onChange={e => setName(e.target.value)} className={`${input} ${tried && !name.trim() ? '!border-rose-400' : ''}`} /></label>
          <label className="block"><span className="block text-[13px] mb-1">ตำแหน่ง</span><input value={position} onChange={e => setPosition(e.target.value)} className={input} /></label>
        </div>
      </section>

      <section className="rounded-3xl bg-[#630330] text-white p-4 sm:p-5">
        <p className="text-[13px] text-[#e8cf7a]">เกณฑ์การให้คะแนน</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5 text-center">
          {SCALE.map(s => <div key={s} className="rounded-xl bg-white/10 py-2"><p className="text-[18px] font-bold">{s}</p><p className="text-[11px] sm:text-[12px] text-white/75 leading-tight">{SCORE_LABELS[s]}</p></div>)}
        </div>
      </section>

      {info.criteria.map((cat, ci) => {
        const items = qs.filter(q => q.cat === cat.id);
        const c = cats.find(x => x.id === cat.id);
        return (
          <section key={cat.id} className="rounded-3xl bg-white border border-[#efe4d2] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 bg-[#faf6ef] border-b border-[#efe4d2]">
              <p className="text-[16px] font-medium"><span className="text-[#630330] mr-2 tabular-nums">{ci + 1}.</span>{cat.title}</p>
              {c && c.count > 0 && <span className="text-[12.5px] tabular-nums text-[#6e5560]">เฉลี่ย {c.avg.toFixed(2)}</span>}
            </div>
            <ul className="divide-y divide-[#f6efe4]">
              {items.map((q, qi) => {
                const missing = tried && !scores[q.id];
                return (
                  <li key={q.id} data-missing={missing ? '1' : undefined} className={`px-5 sm:px-6 py-4 ${missing ? 'bg-rose-50/60' : ''}`}>
                    {q.id !== cat.id && <p className="text-[14.5px] mb-2.5"><span className="text-[#8d7480] tabular-nums mr-1.5">{ci + 1}.{qi + 1}</span>{q.title}</p>}
                    <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={q.title}>
                      {SCALE.map(s => {
                        const on = scores[q.id] === s;
                        return (
                          <button key={s} type="button" role="radio" aria-checked={on} onClick={() => setScores(v => ({ ...v, [q.id]: s }))}
                            className={`h-12 rounded-xl border-2 flex flex-col items-center justify-center transition ${on ? 'border-[#630330] bg-[#630330] text-white' : 'border-[#ebdfcc] text-[#4a2a37] hover:border-[#630330]/50'}`}>
                            <span className="text-[16px] font-bold leading-none">{s}</span>
                            <span className={`hidden sm:block text-[10.5px] mt-0.5 ${on ? 'text-white/80' : 'text-[#8d7480]'}`}>{SCORE_LABELS[s]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="rounded-3xl bg-white border border-[#efe4d2] p-5 sm:p-6">
        <label className="block"><span className="block text-[16px] font-medium mb-2">ข้อเสนอแนะเพิ่มเติม</span>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={5} placeholder="จุดเด่น สิ่งที่ควรพัฒนา หรือข้อคิดเห็นอื่นๆ (ไม่บังคับ)" className={`${input} h-auto py-3 leading-relaxed`} />
        </label>
      </section>

      <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-[#fbf7f0] via-[#fbf7f0] to-transparent">
        <div className="rounded-3xl bg-white border border-[#efe4d2] shadow-[0_20px_40px_-20px_rgba(99,3,48,0.35)] p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <p className="text-[12.5px] text-[#8d7480]">ให้คะแนนแล้ว {answered}/{qs.length} ข้อ</p>
            {live && <p className="text-[14px]">เฉลี่ย <b className="tabular-nums">{live.avg.toFixed(2)}</b> · ร้อยละ <span className="tabular-nums">{live.percent.toFixed(2)}</span> · <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[12px] ${levelCls(live.level)}`}>{live.level}</span></p>}
          </div>
          <button onClick={submit} disabled={busy} className="h-12 px-6 rounded-full bg-[#630330] hover:bg-[#7a0b3d] text-white text-[15px] font-medium inline-flex items-center gap-2 disabled:opacity-60">
            {busy ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}ส่งแบบประเมิน
          </button>
          {err && <p className="w-full text-[13px] text-rose-600 flex items-center gap-1.5"><AlertCircle size={14} />{err}</p>}
        </div>
      </div>
      <p className="text-center text-[11.5px] text-[#a08a95] flex items-center justify-center gap-1.5"><ClipboardCheck size={13} />ส่งได้ครั้งเดียว ค่าเฉลี่ยรวมคิดจากค่าเฉลี่ยของแต่ละด้าน</p>
    </>
  );
};

export default EvaluationPage;

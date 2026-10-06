import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ClipboardCheck, Copy, Check, ExternalLink, RefreshCw, QrCode, Info } from 'lucide-react';
import { Language } from '../../types';
import { StudentBundle, StudentRecordLite, studentCall } from '../../studentApi';
import EvalResult from './EvalResult';
import { card, btnMain, btnSoft, SectionHead, Notice, isTH, stOf } from './shared';

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
    title: 'แบบประเมินจากพี่เลี้ยง', sub: 'ส่ง QR Code หรือลิงก์นี้ให้พี่เลี้ยงหรือผู้ดูแลประเมินผลการฝึกออนไลน์',
    create: 'สร้าง QR Code สำหรับประเมิน', copy: 'คัดลอกลิงก์', copied: 'คัดลอกแล้ว', open: 'เปิดดูแบบประเมิน',
    how: 'พี่เลี้ยงสแกน QR หรือเปิดลิงก์ได้เลย ไม่ต้องล็อกอิน ประเมิน 4 ด้าน คะแนน 1–5 ส่งได้ครั้งเดียว',
    waiting: 'ยังไม่มีผลการประเมิน', waitingSub: 'เมื่อพี่เลี้ยงส่งแบบประเมินแล้ว ผลจะแสดงที่นี่',
    result: 'ผลการประเมิน', scale: '5 = ดีมาก · 4 = ดี · 3 = ปานกลาง · 2 = พอใช้ · 1 = ควรปรับปรุง',
  },
  en: {
    title: 'Mentor evaluation', sub: 'Share this QR code or link with your mentor to evaluate your placement online',
    create: 'Create evaluation QR code', copy: 'Copy link', copied: 'Copied', open: 'Open the form',
    how: 'Your mentor scans the QR or opens the link, no sign-in needed. Four areas, scored 1–5, one submission.',
    waiting: 'No evaluation yet', waitingSub: 'Results appear here once your mentor submits the form.',
    result: 'Result', scale: '5 = excellent · 4 = good · 3 = fair · 2 = adequate · 1 = needs improvement',
  },
};

const EvalTab: React.FC<Props> = ({ lang, token, bundle, record, onPatch, onExpired }) => {
  const L = isTH(lang) ? T.th : T.en;
  const S = stOf(lang);
  const evalToken = bundle.evalLinks[record.id];
  const link = evalToken ? `${window.location.origin}${window.location.pathname}#eval=${evalToken}` : '';
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const results = bundle.evaluations[record.id] || [];

  useEffect(() => {
    if (!link) { setQr(''); return; }
    QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: '#2a0114', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [link]);

  const create = async () => {
    setBusy(true); setErr('');
    try {
      const r = await studentCall('evalLink', { token, recordId: record.id });
      if (r?.status === 'expired') return onExpired();
      if (r?.status !== 'success') throw new Error();
      onPatch(b => ({ ...b, evalLinks: { ...b.evalLinks, [record.id]: r.token } }));
    } catch { setErr(S.failed); } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="space-y-8">
      <section>
        <SectionHead icon={<QrCode size={17} />} title={L.title} sub={L.sub} />
        <div className={`${card} p-5 sm:p-6`}>
          {!link ? (
            <div className="flex flex-col items-center text-center gap-4 py-6">
              <span className="w-16 h-16 rounded-2xl bg-[#630330]/[0.07] text-[#630330] dark:text-[#e8cf7a] flex items-center justify-center"><QrCode size={30} /></span>
              <p className="max-w-sm text-[13.5px] font-light text-[#6e5560] dark:text-slate-300">{L.how}</p>
              <button onClick={create} disabled={busy} className={btnMain}>{busy ? <RefreshCw size={16} className="animate-spin" /> : <QrCode size={16} />}{L.create}</button>
              {err && <p className="text-[12.5px] text-rose-600">{err}</p>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-[220px_minmax(0,1fr)] gap-6 items-center">
              <div className="mx-auto w-[220px] max-w-full aspect-square rounded-2xl bg-white p-3 border border-[#efe4d2] shadow-[0_20px_40px_-25px_rgba(99,3,48,0.5)]">
                {qr ? <img src={qr} alt="QR code" className="w-full h-full" /> : <div className="w-full h-full animate-pulse bg-slate-100 rounded-xl" />}
              </div>
              <div className="min-w-0 space-y-3">
                <Notice icon={<Info size={15} />}>{L.how}</Notice>
                <div className="flex items-center gap-2 p-1.5 pl-3.5 rounded-xl border border-[#e6d9c4] dark:border-white/10 bg-white dark:bg-white/[0.03]">
                  <span className="flex-1 min-w-0 truncate text-[13px] text-[#6e5560] dark:text-slate-300 select-all">{link}</span>
                  <button onClick={copy} className="h-9 px-3 rounded-lg bg-[#630330] text-white text-[13px] inline-flex items-center gap-1.5 shrink-0">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? L.copied : L.copy}</button>
                </div>
                <a href={link} target="_blank" rel="noopener noreferrer" className={btnSoft}><ExternalLink size={15} />{L.open}</a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionHead icon={<ClipboardCheck size={17} />} title={L.result} sub={L.scale} />
        {results.length === 0 ? (
          <div className={`${card} px-5 py-10 text-center`}>
            <p className="text-[15px] text-[#2a0a17] dark:text-white">{L.waiting}</p>
            <p className="mt-1 text-[13px] font-light text-[#8d7480]">{L.waitingSub}</p>
          </div>
        ) : results.map((r, i) => (
          <div key={i} className={`${card} p-5 sm:p-6 ${i ? 'mt-3' : ''}`}><EvalResult criteria={bundle.criteria} result={r} /></div>
        ))}
      </section>
    </div>
  );
};

export default EvalTab;

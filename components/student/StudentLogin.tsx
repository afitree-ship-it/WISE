import React, { useEffect, useRef, useState } from 'react';
import { X, UserCircle, KeyRound, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Language } from '../../types';
import { backendHasStudents, studentCall, StudentBundle, StudentSession } from '../../studentApi';
import { isTH } from './shared';

interface Props {
  open: boolean;
  lang: Language;
  onClose: () => void;
  onSuccess: (session: StudentSession, bundle: StudentBundle) => void;
}

type Step = 'id' | 'pin' | 'setup';

const T = {
  th: {
    title: 'ล็อกอินนักศึกษา', sub: 'เฉพาะนักศึกษาที่มีข้อมูลการฝึกในระบบ',
    id: 'รหัสนักศึกษา', idPh: '', next: 'ถัดไป', back: 'กลับ',
    pin: 'PIN 4–6 หลัก', pinPh: '••••', login: 'เข้าสู่ระบบ',
    setupTitle: 'ตั้ง PIN ครั้งแรก', setupSub: 'ตั้ง PIN ไว้ใช้ล็อกอินครั้งต่อไป',
    notMe: 'ไม่ใช่ฉัน', isMe: 'ตรวจสอบชื่อให้ถูกต้องก่อนตั้ง PIN',
    newPin: 'ตั้ง PIN (ตัวเลข 4–6 หลัก)', confirm: 'ยืนยัน PIN อีกครั้ง', setup: 'ตั้ง PIN และเข้าสู่ระบบ',
    errNotFound: 'ไม่พบรหัสนี้ในระบบ ถ้าคิดว่าผิดพลาด กรุณาติดต่อเจ้าหน้าที่ WISE',
    errPinFormat: 'PIN ต้องเป็นตัวเลข 4–6 หลัก', errMismatch: 'PIN ทั้งสองช่องไม่ตรงกัน',
    errName: 'ชื่อจริงไม่ตรงกับข้อมูลในระบบ', errWrong: (n: number) => `PIN ไม่ถูกต้อง เหลืออีก ${n} ครั้ง`,
    errLocked: (m: number) => `กรอก PIN ผิดหลายครั้ง ลองใหม่ได้ในอีก ${m} นาที`,
    errHasPin: 'รหัสนี้ตั้ง PIN ไว้แล้ว', errNet: 'เชื่อมต่อระบบไม่ได้ ลองใหม่อีกครั้ง',
    errBackend: 'ระบบล็อกอินนักศึกษายังไม่เปิดใช้งาน กรุณาติดต่อเจ้าหน้าที่',
    forgot: 'ลืม PIN? ติดต่อเจ้าหน้าที่ WISE เพื่อรีเซ็ต',
    note: 'ไม่ต้องล็อกอินก็ดูกำหนดการ เอกสาร และสถานที่ฝึกได้ตามปกติ',
  },
  en: {
    title: 'Student sign in', sub: 'For students with a placement on record',
    id: 'Student ID', idPh: '', next: 'Next', back: 'Back',
    pin: '4–6 digit PIN', pinPh: '••••', login: 'Sign in',
    setupTitle: 'Set your PIN', setupSub: 'Choose a PIN for next time',
    notMe: 'Not me', isMe: 'Check that this is you before setting a PIN',
    newPin: 'New PIN (4–6 digits)', confirm: 'Confirm PIN', setup: 'Set PIN and sign in',
    errNotFound: 'This ID is not in the system. Please contact WISE staff.',
    errPinFormat: 'The PIN must be 4–6 digits', errMismatch: 'The PINs do not match',
    errName: 'The first name does not match our records', errWrong: (n: number) => `Wrong PIN. ${n} attempts left`,
    errLocked: (m: number) => `Too many attempts. Try again in ${m} min`,
    errHasPin: 'This ID already has a PIN', errNet: 'Could not reach the server. Please try again.',
    errBackend: 'Student sign-in is not open yet. Please contact staff.',
    forgot: 'Forgot your PIN? Ask WISE staff to reset it.',
    note: 'You can still view the schedule, documents and sites without signing in.',
  },
};

const pinCls = 'w-full h-12 px-4 rounded-xl bg-white text-[#2a0114] text-lg tracking-[0.35em] font-semibold placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 outline-none ring-2 ring-transparent focus:ring-[#D4AF37] transition';
const textCls = 'w-full h-12 px-4 rounded-xl bg-white text-[#2a0114] text-[15px] font-medium placeholder:text-slate-400 placeholder:font-normal outline-none ring-2 ring-transparent focus:ring-[#D4AF37] transition';

const StudentLogin: React.FC<Props> = ({ open, lang, onClose, onSuccess }) => {
  const L = isTH(lang) ? T.th : T.en;
  const [step, setStep] = useState<Step>('id');
  const [sid, setSid] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showPin, setShowPin] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setStep('id'); setPin(''); setPin2(''); setName(''); setErr(''); setBusy(false); } }, [open]);
  useEffect(() => { setTimeout(() => firstInput.current?.focus(), 60); }, [step, open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const fail = (r: any) => {
    const m = r?.message;
    if (m === 'not_found') setErr(L.errNotFound);
    else if (m === 'pin_format') setErr(L.errPinFormat);
    else if (m === 'wrong_pin') setErr(L.errWrong(r.left ?? 0));
    else if (m === 'locked') setErr(L.errLocked(Math.max(1, Math.ceil(((r.until || Date.now()) - Date.now()) / 60000))));
    else if (m === 'has_pin') { setErr(L.errHasPin); setStep('pin'); }
    else setErr(L.errNet);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('');
    try {
      if (!(await backendHasStudents())) { setErr(L.errBackend); return; }
      await fn();
    } catch { setErr(L.errNet); } finally { setBusy(false); }
  };

  const submitId = (e: React.FormEvent) => {
    e.preventDefault();
    const id = sid.trim();
    if (!id) return;
    run(async () => {
      const r = await studentCall('check', { studentId: id });
      if (r?.status !== 'success') return fail(r);
      if (!r.exists) return setErr(L.errNotFound);
      setName(r.name || '');
      setStep(r.hasPin ? 'pin' : 'setup');
    });
  };

  const done = (r: any) => {
    if (r?.status !== 'success' || !r.token) return fail(r);
    onSuccess({ token: r.token, studentId: sid.trim() }, r.bundle);
  };

  const submitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) return setErr(L.errPinFormat);
    run(async () => done(await studentCall('login', { studentId: sid.trim(), pin })));
  };

  const submitSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) return setErr(L.errPinFormat);
    if (pin !== pin2) return setErr(L.errMismatch);
    run(async () => done(await studentCall('setup', { studentId: sid.trim(), pin })));
  };

  const pinInput = (value: string, set: (v: string) => void, ph: string, ref?: React.Ref<HTMLInputElement>, labelText?: string) => (
    <label className="block">
      {labelText && <span className="block text-[12px] text-white/70 mb-1.5">{labelText}</span>}
      <span className="relative block">
        <input ref={ref} type={showPin ? 'text' : 'password'} inputMode="numeric" autoComplete="off" maxLength={6} value={value}
          onChange={e => { set(e.target.value.replace(/\D/g, '')); setErr(''); }} placeholder={ph} className={`${pinCls} pr-12`} />
        <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700" aria-label="show PIN">
          {showPin ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );

  // Who this ID belongs to, so the student can check it is them before typing a PIN
  const back = () => { setStep('id'); setPin(''); setPin2(''); setErr(''); };
  const who = (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.07] border border-white/10">
      <span className="w-11 h-11 shrink-0 rounded-xl bg-[#D4AF37] text-[#2a0114] font-bold text-[17px] flex items-center justify-center">{name.replace(/^(นางสาว|นาย|นาง)/, '').trim().charAt(0) || '?'}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-white leading-snug break-words">{name || sid}</span>
        <span className="block text-[12px] text-white/55 tabular-nums">{sid}</span>
      </span>
      <button type="button" onClick={back} className="shrink-0 h-8 px-3 rounded-full text-[12px] text-white/70 hover:text-white hover:bg-white/10">{L.notMe}</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-6 bg-[#12000a]/75 backdrop-blur-xl wise-fade-in" onMouseDown={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="st-login-title" onMouseDown={e => e.stopPropagation()}
        className="wise-pop-in w-full sm:max-w-[430px] max-h-[92svh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[#2a0114]/95 border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#D4AF37]/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#7A0B3D]/60 blur-3xl" />
        </div>
        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#E8CF7A] flex items-center justify-center">
              {step === 'id' ? <UserCircle size={22} /> : step === 'setup' ? <ShieldCheck size={22} /> : <KeyRound size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="st-login-title" className="text-lg sm:text-xl font-bold text-white leading-tight">{step === 'setup' ? L.setupTitle : L.title}</h3>
              <p className="text-[13px] text-white/55 mt-0.5">{step === 'setup' ? L.setupSub : step === 'pin' ? '' : L.sub}</p>
            </div>
            <button onClick={onClose} disabled={busy} className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition" aria-label="close"><X size={18} /></button>
          </div>

          {step === 'id' && (
            <form onSubmit={submitId} className="mt-6 space-y-4">
              <label className="block">
                <span className="block text-[12px] text-white/70 mb-1.5">{L.id}</span>
                <input ref={firstInput} value={sid} inputMode="numeric" autoComplete="username" onChange={e => { setSid(e.target.value.trim()); setErr(''); }} placeholder={L.idPh} className={textCls} />
              </label>
              <button type="submit" disabled={busy || !sid.trim()} className="w-full h-12 rounded-2xl bg-[#630330] hover:bg-[#7a0b3d] text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition disabled:bg-white/10 disabled:text-white/40">
                {busy ? <RefreshCw size={17} className="animate-spin" /> : <ArrowRight size={18} />}{L.next}
              </button>
            </form>
          )}

          {step === 'pin' && (
            <form onSubmit={submitPin} className="mt-6 space-y-4">
              {who}
              {pinInput(pin, setPin, L.pinPh, firstInput, L.pin)}
              <button type="submit" disabled={busy || pin.length < 4} className="w-full h-12 rounded-2xl bg-[#630330] hover:bg-[#7a0b3d] text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition disabled:bg-white/10 disabled:text-white/40">
                {busy ? <RefreshCw size={17} className="animate-spin" /> : <ArrowRight size={18} />}{L.login}
              </button>
              <div className="flex items-center justify-between text-[12px]">
                <button type="button" onClick={() => { setStep('id'); setPin(''); setErr(''); }} className="inline-flex items-center gap-1 text-white/60 hover:text-white"><ArrowLeft size={13} />{L.back}</button>
                <span className="text-white/45">{L.forgot}</span>
              </div>
            </form>
          )}

          {step === 'setup' && (
            <form onSubmit={submitSetup} className="mt-6 space-y-4">
              {who}
              <p className="text-[11.5px] text-white/50 -mt-1">{L.isMe}</p>
              {pinInput(pin, setPin, L.pinPh, firstInput, L.newPin)}
              {pinInput(pin2, setPin2, L.pinPh, undefined, L.confirm)}
              <button type="submit" disabled={busy || pin.length < 4 || pin2.length < 4} className="w-full h-12 rounded-2xl bg-[#630330] hover:bg-[#7a0b3d] text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition disabled:bg-white/10 disabled:text-white/40">
                {busy ? <RefreshCw size={17} className="animate-spin" /> : <ShieldCheck size={18} />}{L.setup}
              </button>
              <button type="button" onClick={() => { setStep('id'); setErr(''); }} className="inline-flex items-center gap-1 text-[12px] text-white/60 hover:text-white"><ArrowLeft size={13} />{L.back}</button>
            </form>
          )}

          {err && <p role="alert" className="mt-4 flex items-start gap-2 text-[13px] text-rose-200 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3 py-2.5"><AlertCircle size={16} className="shrink-0 mt-0.5" />{err}</p>}
          <p className="mt-6 pt-4 border-t border-white/10 text-[11.5px] text-white/40">{L.note}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;

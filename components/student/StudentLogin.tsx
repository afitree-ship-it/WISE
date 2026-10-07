import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, UserCircle, KeyRound, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Language } from '../../types';
import { studentCall, StudentBundle, StudentSession } from '../../studentApi';
import { isTH } from './shared';

interface Props {
  open: boolean;
  lang: Language;
  studentStatuses?: any[];
  onClose: () => void;
  onSuccess: (session: StudentSession, bundle: StudentBundle) => void;
}

type Mode = 'login' | 'setup';

const T = {
  th: {
    title: 'เข้าสู่ระบบนักศึกษา', sub: 'สำหรับนักศึกษาฝึกงานและสหกิจศึกษา WISE',
    id: 'รหัสนักศึกษา', idPh: 'เช่น 4065xxxxx', next: 'ถัดไป', back: 'กลับ',
    pin: 'PIN เข้าสู่ระบบ (4–6 หลัก)', pinPh: '••••', login: 'เข้าสู่ระบบนักศึกษา',
    setupTitle: 'ตั้ง PIN สำหรับเข้าใช้งานครั้งแรก', setupSub: 'กรอกรหัสนักศึกษาและตั้ง PIN เพื่อเข้าใช้งาน',
    notMe: 'ไม่ใช่ฉัน', isMe: 'ตรวจสอบชื่อให้ถูกต้องก่อนตั้ง PIN',
    newPin: 'ตั้ง PIN ใหม่ (ตัวเลข 4–6 หลัก)', confirm: 'ยืนยัน PIN อีกครั้ง', setup: 'บันทึก PIN และเข้าสู่ระบบ',
    switchToSetup: 'ยังไม่เคยตั้ง PIN? แตะเพื่อตั้ง PIN ครั้งแรก',
    switchToLogin: 'ตั้ง PIN ไว้แล้ว? แตะเพื่อเข้าสู่ระบบ',
    errNotFound: 'ไม่พบรหัสนี้ในฐานข้อมูลนักศึกษา กรุณาตรวจสอบความถูกต้องหรือติดต่อเจ้าหน้าที่ WISE',
    errPinFormat: 'PIN ต้องเป็นตัวเลข 4–6 หลัก', errMismatch: 'PIN ทั้งสองช่องไม่ตรงกัน',
    errName: 'ชื่อจริงไม่ตรงกับข้อมูลในระบบ', errWrong: (n: number) => `PIN ไม่ถูกต้อง (เหลือโอกาสกรอกอีก ${n} ครั้ง)`,
    errLocked: (m: number) => `กรอก PIN ผิดหลายครั้ง ระบบระงับชั่วคราว ลองใหม่ได้ในอีก ${m} นาที`,
    errHasPin: 'รหัสนี้ตั้ง PIN ไว้แล้ว กรุณาเข้าสู่ระบบด้วย PIN', errNet: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง',
    errBackend: 'ระบบล็อกอินนักศึกษายังไม่พร้อมใช้งาน กรุณาติดต่อเจ้าหน้าที่',
    forgot: 'ลืม PIN? ติดต่อเจ้าหน้าที่ WISE เพื่อรีเซ็ต',
    note: 'ไม่ต้องล็อกอินก็สามารถดูกำหนดการ เอกสาร และสถานที่ฝึกได้ตามปกติ',
    checking: 'กำลังตรวจสอบ...',
    loggingIn: 'กำลังเข้าสู่ระบบ...',
    settingUp: 'กำลังบันทึก PIN...',
    found: 'พบข้อมูลในระบบ',
    needSetupPrompt: 'รหัสนี้ยังไม่เคยตั้ง PIN กรุณาตั้ง PIN เพื่อเริ่มใช้งาน',
  },
  en: {
    title: 'Student Sign In', sub: 'For WISE internship & co-op students',
    id: 'Student ID', idPh: 'e.g. 4065xxxxx', next: 'Next', back: 'Back',
    pin: 'Sign-in PIN (4–6 digits)', pinPh: '••••', login: 'Sign In as Student',
    setupTitle: 'First-time PIN Setup', setupSub: 'Set a secure PIN for future logins',
    notMe: 'Not me', isMe: 'Please check your name carefully before setting PIN',
    newPin: 'New PIN (4–6 digits)', confirm: 'Confirm PIN', setup: 'Save PIN & Sign In',
    switchToSetup: 'First time here? Set your PIN',
    switchToLogin: 'Already have a PIN? Sign in',
    errNotFound: 'Student ID not found in the placement records. Please contact WISE staff.',
    errPinFormat: 'PIN must be 4–6 digits', errMismatch: 'The PINs do not match',
    errName: 'Name does not match records', errWrong: (n: number) => `Incorrect PIN (${n} attempts left)`,
    errLocked: (m: number) => `Too many wrong attempts. Try again in ${m} min`,
    errHasPin: 'This ID already has a PIN. Please sign in.', errNet: 'Could not connect. Please try again.',
    errBackend: 'Student sign-in service is currently unavailable.',
    forgot: 'Forgot PIN? Contact WISE staff to reset.',
    note: 'You can still view the schedule, forms and partner sites without signing in.',
    checking: 'Checking...',
    loggingIn: 'Signing in...',
    settingUp: 'Saving PIN...',
    found: 'Record found',
    needSetupPrompt: 'This ID does not have a PIN yet. Please set your PIN below.',
  },
};

const normId = (v: any) => {
  const s = String(v ?? '').trim();
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s;
};

const pinCls = 'w-full h-12 px-4 rounded-xl bg-white text-[#2a0114] text-lg tracking-[0.35em] font-semibold placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 outline-none ring-2 ring-transparent focus:ring-[#D4AF37] transition';
const textCls = 'w-full h-12 px-4 rounded-xl bg-white text-[#2a0114] text-[15px] font-medium placeholder:text-slate-400 placeholder:font-normal outline-none ring-2 ring-transparent focus:ring-[#D4AF37] transition';

const StudentLogin: React.FC<Props> = ({ open, lang, studentStatuses, onClose, onSuccess }) => {
  const L = isTH(lang) ? T.th : T.en;
  const [mode, setMode] = useState<Mode>('login');
  const [sid, setSid] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showPin, setShowPin] = useState(false);
  const sidInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode('login');
      setPin('');
      setPin2('');
      setErr('');
      setBusy(false);
      setTimeout(() => sidInputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  const findLocalStudent = (id: string) => {
    const target = normId(id);
    if (!target) return null;
    let list = studentStatuses;
    if (!list || !list.length) {
      try { list = JSON.parse(localStorage.getItem('wise_student_statuses') || '[]'); } catch { list = []; }
    }
    return list?.find((s: any) => normId(s.studentId) === target || normId(s.id) === target) || null;
  };

  // Instant local identification (0 ms response time!)
  const localMatched = useMemo(() => {
    const trimmed = sid.trim();
    if (trimmed.length < 3) return null;
    return findLocalStudent(trimmed);
  }, [sid, studentStatuses]);

  if (!open) return null;

  const fail = (r: any) => {
    const m = r?.message;
    if (m === 'not_found') setErr(L.errNotFound);
    else if (m === 'pin_format') setErr(L.errPinFormat);
    else if (m === 'wrong_pin') setErr(L.errWrong(r.left ?? 0));
    else if (m === 'locked') setErr(L.errLocked(Math.max(1, Math.ceil(((r.until || Date.now()) - Date.now()) / 60000))));
    else if (m === 'has_pin') {
      try { localStorage.setItem(`wise_pin_${normId(sid.trim())}`, 'has_pin'); } catch {}
      setErr(L.errHasPin);
      setMode('login');
    }
    else if (m === 'no_pin') {
      try { localStorage.setItem(`wise_pin_${normId(sid.trim())}`, 'no_pin'); } catch {}
      setErr(L.needSetupPrompt);
      setMode('setup');
    }
    else if (m === 'Unknown type: student' || (r?.status === 'error' && m && String(m).includes('Unknown type'))) setErr(L.errBackend);
    else setErr(L.errNet);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('');
    try {
      await fn();
    } catch {
      setErr(L.errNet);
    } finally {
      setBusy(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = sid.trim();
    if (!id) return;
    if (!/^\d{4,6}$/.test(pin)) {
      setErr(L.errPinFormat);
      return;
    }

    run(async () => {
      const r = await studentCall('login', { studentId: id, pin });
      if (r?.status === 'success' && r.token) {
        try { localStorage.setItem(`wise_pin_${normId(id)}`, 'has_pin'); } catch {}
        onSuccess({ token: r.token, studentId: id }, r.bundle);
      } else {
        fail(r);
      }
    });
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = sid.trim();
    if (!id) return;
    if (!/^\d{4,6}$/.test(pin)) return setErr(L.errPinFormat);
    if (pin !== pin2) return setErr(L.errMismatch);

    run(async () => {
      const r = await studentCall('setup', { studentId: id, pin });
      if (r?.status === 'success' && r.token) {
        try { localStorage.setItem(`wise_pin_${normId(id)}`, 'has_pin'); } catch {}
        onSuccess({ token: r.token, studentId: id }, r.bundle);
      } else {
        fail(r);
      }
    });
  };

  const pinInputField = (
    value: string,
    set: (v: string) => void,
    ph: string,
    labelText: string,
    showToggle = true
  ) => (
    <label className="block">
      <span className="block text-[12.5px] font-medium text-white/80 mb-1.5">{labelText}</span>
      <span className="relative block">
        <input
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={value}
          onChange={e => { set(e.target.value.replace(/\D/g, '')); setErr(''); }}
          placeholder={ph}
          className={`${pinCls} pr-12`}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPin(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
            aria-label="Toggle PIN visibility"
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-6 bg-[#12000a]/80 backdrop-blur-xl wise-fade-in"
      onMouseDown={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="st-login-title"
        onMouseDown={e => e.stopPropagation()}
        className="wise-pop-in w-full sm:max-w-[440px] max-h-[92svh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[#2a0114]/95 border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative"
      >
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#D4AF37]/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#7A0B3D]/60 blur-3xl" />
        </div>

        <div className="relative p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#E8CF7A] flex items-center justify-center shadow-inner">
              {mode === 'setup' ? <ShieldCheck size={24} /> : <KeyRound size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="st-login-title" className="text-lg sm:text-xl font-bold text-white leading-tight">
                {mode === 'setup' ? L.setupTitle : L.title}
              </h3>
              <p className="text-[12.5px] text-white/60 mt-0.5">
                {mode === 'setup' ? L.setupSub : L.sub}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={busy}
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
              aria-label="close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLoginSubmit : handleSetupSubmit} className="mt-6 space-y-4">
            {/* Student ID */}
            <label className="block">
              <span className="block text-[12.5px] font-medium text-white/80 mb-1.5">{L.id}</span>
              <input
                ref={sidInputRef}
                value={sid}
                inputMode="numeric"
                autoComplete="username"
                onChange={e => { setSid(e.target.value.trim()); setErr(''); }}
                placeholder={L.idPh}
                className={textCls}
              />
            </label>

            {/* Instant Identification Banner (0ms) */}
            {localMatched && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F3E3B6] animate-fadeIn shadow-sm">
                <span className="w-7 h-7 rounded-xl bg-[#D4AF37] text-[#2a0114] text-xs font-bold flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider block">
                    {L.found}
                  </span>
                  <span className="font-bold block truncate text-white text-[14px]">
                    {localMatched.name}
                  </span>
                  {(localMatched.major || localMatched.internshipType) && (
                    <span className="text-[11.5px] text-white/70 block truncate mt-0.5">
                      {[localMatched.major, localMatched.internshipType].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* PIN Inputs */}
            {mode === 'login' ? (
              pinInputField(pin, setPin, L.pinPh, L.pin)
            ) : (
              <>
                {pinInputField(pin, setPin, L.pinPh, L.newPin)}
                {pinInputField(pin2, setPin2, L.pinPh, L.confirm, false)}
              </>
            )}

            {/* Error Message */}
            {err && (
              <div role="alert" className="flex items-start gap-2.5 text-[13px] text-rose-200 bg-rose-500/15 border border-rose-400/30 rounded-xl p-3 animate-shake">
                <AlertCircle size={17} className="shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-snug">{err}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={busy || !sid.trim() || pin.length < 4 || (mode === 'setup' && pin2.length < 4)}
              className="w-full h-12 rounded-2xl bg-[#630330] hover:bg-[#7a0b3d] text-white text-[15.5px] font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-[#630330]/40 hover:shadow-[#630330]/60 active:scale-[0.99] transition disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed"
            >
              {busy ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : mode === 'setup' ? (
                <ShieldCheck size={19} />
              ) : (
                <ArrowRight size={19} />
              )}
              <span>{busy ? (mode === 'setup' ? L.settingUp : L.loggingIn) : (mode === 'setup' ? L.setup : L.login)}</span>
            </button>

            {/* Mode Switcher Buttons */}
            <div className="pt-2 flex flex-col gap-2 text-center text-[13px]">
              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => { setMode('setup'); setPin(''); setPin2(''); setErr(''); }}
                  className="text-[#E8CF7A] hover:underline font-medium py-1 transition"
                >
                  {L.switchToSetup}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setPin(''); setPin2(''); setErr(''); }}
                  className="text-[#E8CF7A] hover:underline font-medium py-1 transition"
                >
                  {L.switchToLogin}
                </button>
              )}
              <span className="text-white/40 text-[11.5px]">{L.forgot}</span>
            </div>
          </form>

          <p className="mt-5 pt-4 border-t border-white/10 text-[11px] text-white/40 text-center">
            {L.note}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;

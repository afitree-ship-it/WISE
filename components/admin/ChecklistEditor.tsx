import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, RotateCcw, ChevronDown, Languages, Pencil, Check, Info, Square, MapPin, FileText, CalendarClock, MinusCircle, AlertCircle } from 'lucide-react';
import { ChecklistStep, StepLink, DEFAULT_CHECKLIST, CHECKLIST_GROUPS_TH } from '../../checklist';
import { inputCls, btn, iconBtn } from './ui';

interface Props {
  value?: ChecklistStep[];
  onChange: (next: ChecklistStep[] | undefined) => void;
}

/** What each shortcut does for the student, in plain words */
const LINK_INFO: Record<StepLink, { label: string; desc: string; chip: string; icon: React.ReactNode }> = {
  '': { label: 'ไม่มีปุ่ม', desc: 'แสดงแค่ชื่อและคำอธิบาย', chip: '', icon: <MinusCircle size={15} /> },
  sites: { label: 'ดูสถานที่ฝึก', desc: 'ปุ่มพาไปหน้ารายชื่อสถานประกอบการ', chip: 'ดูสถานที่', icon: <MapPin size={15} /> },
  app: { label: 'เอกสารสมัครงาน', desc: 'ปุ่มพาไปเอกสารหมวด “สมัครงาน”', chip: 'เอกสารสมัคร', icon: <FileText size={15} /> },
  monitor: { label: 'เอกสารระหว่างฝึก', desc: 'ปุ่มพาไปเอกสารหมวด “ระหว่างฝึกงาน”', chip: 'เอกสารระหว่างฝึก', icon: <FileText size={15} /> },
  deadline: { label: 'วันกำหนดการถัดไป', desc: 'แสดงวันที่จากเมนู “กำหนดการ” ที่ใกล้ที่สุด', chip: 'กำหนดการ', icon: <CalendarClock size={15} /> },
};

const GROUP_INFO = [
  { tone: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', desc: 'สิ่งที่ต้องทำก่อนไปฝึก เช่น เลือกที่ฝึก ยื่นเอกสาร' },
  { tone: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', desc: 'สิ่งที่ต้องทำระหว่างอยู่ที่สถานประกอบการ' },
  { tone: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', desc: 'สิ่งที่ต้องส่งหรือทำหลังฝึกเสร็จ' },
];

const Label: React.FC<{ title: string; desc: string; required?: boolean; htmlFor?: string }> = ({ title, desc, required, htmlFor }) => (
  <label htmlFor={htmlFor} className="block mb-1.5">
    <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{title}{required && <span className="text-rose-500 ml-0.5">*</span>}</span>
    <span className="block text-[11px] text-slate-400 leading-snug">{desc}</span>
  </label>
);

/** Admin editor for the student checklist shown in the portal. */
const ChecklistEditor: React.FC<Props> = ({ value, onChange }) => {
  const steps = value?.length ? value : DEFAULT_CHECKLIST;
  const isDefault = !value?.length;
  const [editing, setEditing] = useState<string | null>(null);
  const [openEn, setOpenEn] = useState<Record<string, boolean>>({});
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (!confirmDel) return;
    const t = setTimeout(() => setConfirmDel(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDel]);

  const commit = (next: ChecklistStep[]) => onChange(next);
  const update = (id: string, patch: (s: ChecklistStep) => ChecklistStep) => commit(steps.map(s => (s.id === id ? patch(s) : s)));

  // Editing the Thai text drops the old translations; they are re-translated automatically on save
  const setTh = (id: string, field: 'title' | 'hint', v: string) =>
    update(id, s => ({ ...s, [field]: { th: v } }));
  const setEn = (id: string, field: 'title' | 'hint', v: string) =>
    update(id, s => ({ ...s, [field]: { ...s[field], en: v, ar: undefined, ms: undefined } }));

  const move = (id: string, dir: -1 | 1) => {
    const s = steps.find(x => x.id === id);
    if (!s) return;
    const same = steps.filter(x => x.group === s.group);
    const i = same.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= same.length) return;
    const a = steps.indexOf(same[i]), b = steps.indexOf(same[j]);
    const next = [...steps];
    [next[a], next[b]] = [next[b], next[a]];
    commit(next);
  };

  const remove = (id: string) => { commit(steps.filter(s => s.id !== id)); setConfirmDel(null); if (editing === id) setEditing(null); };

  const add = (group: 0 | 1 | 2) => {
    const step: ChecklistStep = { id: `c${Date.now().toString(36)}`, group, title: { th: '' }, hint: { th: '' }, link: '' };
    const lastIdx = steps.map(s => s.group).lastIndexOf(group);
    const next = [...steps];
    next.splice(lastIdx < 0 ? next.length : lastIdx + 1, 0, step);
    commit(next);
    setEditing(step.id);
  };

  const untitled = steps.filter(s => !String(s.title.th || '').trim()).length;

  return (
    <div className="space-y-4">
      {/* How it works */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3.5 flex gap-3">
        <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
          <p><b className="font-semibold text-slate-800 dark:text-slate-100">เช็กลิสต์นี้คืออะไร</b> รายการขั้นตอนที่นักศึกษาเห็นในแท็บ “เช็กลิสต์” หลังเข้าสู่ระบบ และติ๊กได้เองเมื่อทำเสร็จ</p>
          <p><b className="font-semibold text-slate-800 dark:text-slate-100">วิธีแก้</b> กด <Pencil size={11} className="inline -mt-0.5" /> ที่ขั้นตอนเพื่อแก้ไข · ใช้ลูกศรเพื่อเรียงลำดับ · กด “เพิ่มขั้นตอน” ในแต่ละช่วง แล้วกด <b className="font-semibold">บันทึก</b> ด้านล่างสุดของหน้า</p>
          <p><b className="font-semibold text-slate-800 dark:text-slate-100">ภาษา</b> กรอกภาษาไทยอย่างเดียวได้ ระบบแปลเป็นอังกฤษ อาหรับ และมลายูให้ตอนบันทึก</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center h-7 px-2.5 rounded-full text-xs font-medium ${isDefault ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
          {isDefault ? `ใช้ค่าเริ่มต้นของระบบ · ${steps.length} ขั้นตอน` : `ปรับแต่งแล้ว · ${steps.length} ขั้นตอน`}
        </span>
        {!isDefault && (confirmReset ? (
          <span className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">ล้างที่แก้ไว้ทั้งหมด?</span>
            <button onClick={() => { onChange(undefined); setConfirmReset(false); setEditing(null); }} className={btn('danger', 'sm')}>ยืนยัน</button>
            <button onClick={() => setConfirmReset(false)} className={btn('ghost', 'sm')}>ไม่</button>
          </span>
        ) : (
          <button onClick={() => setConfirmReset(true)} className={btn('ghost', 'sm')}><RotateCcw size={14} /> กลับไปใช้ค่าเริ่มต้น</button>
        ))}
      </div>

      {untitled > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-300"><AlertCircle size={14} /> มี {untitled} ขั้นตอนที่ยังไม่มีชื่อ ขั้นตอนเหล่านี้จะไม่แสดงให้นักศึกษาเห็น</p>
      )}

      {[0, 1, 2].map(g => {
        const list = steps.filter(s => s.group === g);
        const gi = GROUP_INFO[g];
        return (
          <div key={g} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-1.5 h-8 rounded-full shrink-0 ${gi.tone}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">ช่วง “{CHECKLIST_GROUPS_TH[g]}” <span className="font-normal text-slate-400">· {list.length} ขั้นตอน</span></p>
                  <p className="text-[11px] text-slate-400 truncate">{gi.desc}</p>
                </div>
              </div>
              <button onClick={() => add(g as 0 | 1 | 2)} className={btn('secondary', 'sm')}><Plus size={14} /> เพิ่มขั้นตอน</button>
            </div>
            {list.length === 0 && <p className="px-4 py-5 text-center text-xs text-slate-400">ยังไม่มีขั้นตอนในช่วงนี้ · กด “เพิ่มขั้นตอน”</p>}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((s, i) => {
                const open = editing === s.id;
                const title = String(s.title.th || '').trim();
                const hint = String(s.hint.th || '').trim();
                const li = LINK_INFO[s.link] || LINK_INFO[''];
                return (
                  <li key={s.id} className={open ? 'bg-slate-50/70 dark:bg-slate-800/30' : ''}>
                    {/* Summary row */}
                    <div className="px-3 sm:px-3.5 py-2.5 flex items-center gap-2.5">
                      <span className={`w-6 h-6 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${gi.soft}`}>{i + 1}</span>
                      <button type="button" onClick={() => setEditing(open ? null : s.id)} className="flex-1 min-w-0 text-left">
                        <span className={`block text-sm truncate ${title ? 'font-medium text-slate-800 dark:text-slate-100' : 'italic text-rose-500'}`}>{title || 'ยังไม่มีชื่อขั้นตอน'}</span>
                        <span className="flex items-center gap-2 text-[11px] text-slate-400 min-w-0">
                          {hint && <span className="truncate">{hint}</span>}
                          {li.chip && <span className="shrink-0 inline-flex items-center gap-1 px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{li.icon}{li.chip}</span>}
                        </span>
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => move(s.id, -1)} disabled={i === 0} className={`${iconBtn} disabled:opacity-30`} aria-label="เลื่อนขึ้น" title="เลื่อนขึ้น"><ArrowUp size={15} /></button>
                        <button onClick={() => move(s.id, 1)} disabled={i === list.length - 1} className={`${iconBtn} disabled:opacity-30`} aria-label="เลื่อนลง" title="เลื่อนลง"><ArrowDown size={15} /></button>
                        <button onClick={() => setEditing(open ? null : s.id)} className={`${iconBtn} ${open ? '!bg-[#630330] !text-white dark:!bg-amber-400 dark:!text-slate-900' : ''}`} aria-label={open ? 'เสร็จ' : 'แก้ไข'} title={open ? 'เสร็จ' : 'แก้ไข'}>{open ? <Check size={15} /> : <Pencil size={15} />}</button>
                        {confirmDel === s.id ? (
                          <button onClick={() => remove(s.id)} className={btn('danger', 'sm')}>ลบ?</button>
                        ) : (
                          <button onClick={() => setConfirmDel(s.id)} className={`${iconBtn} hover:!text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-500/10`} aria-label="ลบ" title="ลบ"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </div>

                    {/* Edit form */}
                    {open && (
                      <div className="px-3 sm:px-3.5 pb-4 pt-1 sm:pl-12 grid gap-4">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`t-${s.id}`} title="ชื่อขั้นตอน" required desc="สิ่งที่นักศึกษาต้องทำ เขียนสั้นๆ ขึ้นต้นด้วยคำกริยา" />
                            <input id={`t-${s.id}`} autoFocus value={s.title.th || ''} onChange={e => setTh(s.id, 'title', e.target.value)} placeholder="เช่น ยื่นเอกสารที่เจ้าหน้าที่ WISE" className={`${inputCls} ${!title ? '!border-rose-300' : ''}`} />
                          </div>
                          <div>
                            <Label htmlFor={`h-${s.id}`} title="คำอธิบาย (ไม่บังคับ)" desc="ข้อความเล็กใต้ชื่อ บอกรายละเอียดหรือเงื่อนไขเพิ่ม" />
                            <input id={`h-${s.id}`} value={s.hint.th || ''} onChange={e => setTh(s.id, 'hint', e.target.value)} placeholder="เช่น ภายในวันที่กำหนดในปฏิทิน" className={inputCls} />
                          </div>
                        </div>

                        <div>
                          <Label title="ปุ่มลัดของขั้นตอนนี้" desc="ปุ่มที่จะแสดงข้างขั้นตอน ช่วยพานักศึกษาไปยังสิ่งที่ต้องใช้" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" role="radiogroup">
                            {(Object.keys(LINK_INFO) as StepLink[]).map(k => {
                              const on = s.link === k;
                              return (
                                <button key={k || 'none'} type="button" role="radio" aria-checked={on} onClick={() => update(s.id, x => ({ ...x, link: k }))}
                                  className={`text-left rounded-lg border-2 px-3 py-2 flex items-start gap-2.5 transition ${on ? 'border-[#630330] bg-[#630330]/[0.04] dark:border-amber-400 dark:bg-amber-400/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                  <span className={`mt-0.5 shrink-0 ${on ? 'text-[#630330] dark:text-amber-300' : 'text-slate-400'}`}>{LINK_INFO[k].icon}</span>
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">{LINK_INFO[k].label}</span>
                                    <span className="block text-[11px] text-slate-400 leading-snug">{LINK_INFO[k].desc}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <Label title="อยู่ในช่วงไหน" desc="ย้ายขั้นตอนไปช่วงอื่นได้ ขั้นตอนจะไปต่อท้ายช่วงนั้น" />
                          <div className="inline-flex flex-wrap p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                            {CHECKLIST_GROUPS_TH.map((label, gIdx) => (
                              <button key={gIdx} type="button" onClick={() => update(s.id, x => ({ ...x, group: gIdx as 0 | 1 | 2 }))}
                                className={`h-8 px-3 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${s.group === gIdx ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${GROUP_INFO[gIdx].tone}`} />{label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <button type="button" onClick={() => setOpenEn(o => ({ ...o, [s.id]: !o[s.id] }))} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                            <Languages size={14} /> แก้คำแปลภาษาอังกฤษเอง (ไม่บังคับ)
                            <ChevronDown size={14} className={`transition ${openEn[s.id] ? 'rotate-180' : ''}`} />
                          </button>
                          {openEn[s.id] && (
                            <div className="mt-2 grid sm:grid-cols-2 gap-3">
                              <div>
                                <Label title="Step title (English)" desc="เว้นว่าง = ให้ระบบแปลให้ตอนบันทึก" />
                                <input value={s.title.en || ''} onChange={e => setEn(s.id, 'title', e.target.value)} placeholder="e.g. Submit documents to WISE" className={inputCls} />
                              </div>
                              <div>
                                <Label title="Hint (English)" desc="ใส่เมื่ออยากใช้คำเฉพาะแทนคำแปลอัตโนมัติ" />
                                <input value={s.hint.en || ''} onChange={e => setEn(s.id, 'hint', e.target.value)} placeholder="e.g. By the deadline" className={inputCls} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Preview */}
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 mb-1.5">ตัวอย่างที่นักศึกษาเห็น</p>
                          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 flex items-center gap-3">
                            <Square size={18} className="text-slate-300 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm truncate ${title ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 italic'}`}>{title || 'ชื่อขั้นตอน'}</p>
                              {hint && <p className="text-[11px] text-slate-400 truncate">{hint}</p>}
                            </div>
                            {li.chip && <span className="shrink-0 h-7 px-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">{li.icon}{li.chip}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="text-[11px] text-slate-400 leading-relaxed">
        นักศึกษาติ๊กเช็กลิสต์ในเครื่องของตัวเอง · แก้ชื่อหรือเรียงลำดับใหม่ ความคืบหน้าเดิมยังอยู่ · ถ้าลบขั้นตอน ความคืบหน้าของขั้นนั้นจะหายไป
      </p>
    </div>
  );
};

export default ChecklistEditor;

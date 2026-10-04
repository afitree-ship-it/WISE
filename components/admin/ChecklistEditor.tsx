import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, RotateCcw, ChevronDown, Languages } from 'lucide-react';
import { ChecklistStep, StepLink, DEFAULT_CHECKLIST, CHECKLIST_GROUPS_TH, STEP_LINK_LABELS } from '../../checklist';
import { inputCls, selectCls, btn, iconBtn } from './ui';

interface Props {
  value?: ChecklistStep[];
  onChange: (next: ChecklistStep[] | undefined) => void;
}

/** Admin editor for the student checklist shown in the portal. */
const ChecklistEditor: React.FC<Props> = ({ value, onChange }) => {
  const steps = value?.length ? value : DEFAULT_CHECKLIST;
  const isDefault = !value?.length;
  const [openEn, setOpenEn] = useState<Record<string, boolean>>({});

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

  const remove = (id: string) => commit(steps.filter(s => s.id !== id));

  const add = (group: 0 | 1 | 2) => {
    const step: ChecklistStep = { id: `c${Date.now().toString(36)}`, group, title: { th: '' }, hint: { th: '' }, link: '' };
    const lastIdx = steps.map(s => s.group).lastIndexOf(group);
    const next = [...steps];
    next.splice(lastIdx < 0 ? next.length : lastIdx + 1, 0, step);
    commit(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center h-7 px-2.5 rounded-full text-xs font-medium ${isDefault ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
          {isDefault ? `ค่าเริ่มต้น · ${steps.length} ขั้น` : `ปรับแต่งแล้ว · ${steps.length} ขั้น`}
        </span>
        {!isDefault && (
          <button onClick={() => onChange(undefined)} className={btn('ghost', 'sm')}><RotateCcw size={14} /> กลับไปใช้ค่าเริ่มต้น</button>
        )}
      </div>

      {[0, 1, 2].map(g => {
        const list = steps.filter(s => s.group === g);
        return (
          <div key={g} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{CHECKLIST_GROUPS_TH[g]} <span className="font-normal text-slate-400">· {list.length}</span></span>
              <button onClick={() => add(g as 0 | 1 | 2)} className={btn('secondary', 'sm')}><Plus size={14} /> เพิ่มขั้นตอน</button>
            </div>
            {list.length === 0 && <p className="px-4 py-5 text-center text-xs text-slate-400">ยังไม่มีขั้นตอนในช่วงนี้</p>}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((s, i) => (
                <li key={s.id} className="p-3 sm:p-3.5 flex gap-2.5">
                  <span className="mt-2 w-6 h-6 shrink-0 rounded-full bg-[#630330]/10 text-[#630330] dark:bg-amber-400/10 dark:text-amber-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1 min-w-0 grid gap-2">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input value={s.title.th || ''} onChange={e => setTh(s.id, 'title', e.target.value)} placeholder="ชื่อขั้นตอน เช่น ยื่นเอกสารที่เจ้าหน้าที่" className={inputCls} aria-label="ชื่อขั้นตอน" />
                      <input value={s.hint.th || ''} onChange={e => setTh(s.id, 'hint', e.target.value)} placeholder="คำอธิบายสั้นๆ (ไม่บังคับ)" className={inputCls} aria-label="คำอธิบาย" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <select value={s.link} onChange={e => update(s.id, x => ({ ...x, link: e.target.value as StepLink }))} className={`${selectCls} h-9 text-xs w-auto`} aria-label="ปุ่มลัด">
                          {(Object.keys(STEP_LINK_LABELS) as StepLink[]).map(k => <option key={k} value={k}>{STEP_LINK_LABELS[k]}</option>)}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                      <div className="relative">
                        <select value={s.group} onChange={e => update(s.id, x => ({ ...x, group: Number(e.target.value) as 0 | 1 | 2 }))} className={`${selectCls} h-9 text-xs w-auto`} aria-label="ช่วง">
                          {CHECKLIST_GROUPS_TH.map((label, gi) => <option key={gi} value={gi}>{label}</option>)}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                      <button onClick={() => setOpenEn(o => ({ ...o, [s.id]: !o[s.id] }))} className={`${btn('ghost', 'sm')} ${openEn[s.id] ? 'text-[#630330] dark:text-amber-300' : ''}`}>
                        <Languages size={14} /> แก้คำแปลอังกฤษเอง
                      </button>
                    </div>
                    {openEn[s.id] && (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input value={s.title.en || ''} onChange={e => setEn(s.id, 'title', e.target.value)} placeholder="ว่างไว้ = แปลอัตโนมัติตอนบันทึก" className={inputCls} aria-label="Step title" />
                        <input value={s.hint.en || ''} onChange={e => setEn(s.id, 'hint', e.target.value)} placeholder="Short hint" className={inputCls} aria-label="Hint" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => move(s.id, -1)} disabled={i === 0} className={`${iconBtn} disabled:opacity-30`} aria-label="เลื่อนขึ้น"><ArrowUp size={15} /></button>
                    <button onClick={() => move(s.id, 1)} disabled={i === list.length - 1} className={`${iconBtn} disabled:opacity-30`} aria-label="เลื่อนลง"><ArrowDown size={15} /></button>
                    <button onClick={() => remove(s.id)} className={`${iconBtn} hover:!text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-500/10`} aria-label="ลบ"><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="text-[11px] text-slate-400 leading-relaxed">
        นักศึกษาติ๊กเช็กลิสต์ในเครื่องของตัวเอง · เพิ่ม/แก้ชื่อขั้นตอนได้โดยไม่ทำให้ความคืบหน้าเดิมหาย แต่ถ้าลบขั้นตอน ความคืบหน้าของขั้นนั้นจะหายไป ·
        กรอกเป็นภาษาไทยได้เลย ระบบจะแปลเป็นอังกฤษ อาหรับ และมลายูให้อัตโนมัติเมื่อกดบันทึก
      </p>
    </div>
  );
};

export default ChecklistEditor;

import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Info } from 'lucide-react';
import { EvalCategory, DEFAULT_CRITERIA, questionsOf } from '../../studentApi';
import { inputCls, btn, iconBtn } from './ui';

interface Props {
  value?: EvalCategory[];
  onChange: (next: EvalCategory[] | undefined) => void;
}

/** Admin editor for the mentor evaluation: the 4 areas and the items under each. */
const EvalCriteriaEditor: React.FC<Props> = ({ value, onChange }) => {
  const cats = value?.length ? value : DEFAULT_CRITERIA;
  const isDefault = !value?.length;
  const commit = (next: EvalCategory[]) => onChange(next);
  const setCat = (id: string, p: Partial<EvalCategory>) => commit(cats.map(c => (c.id === id ? { ...c, ...p } : c)));
  const items = (c: EvalCategory) => c.items || [];
  const addItem = (c: EvalCategory) => setCat(c.id, { items: [...items(c), { id: `i${Date.now().toString(36)}`, title: '' }] });
  const setItem = (c: EvalCategory, iid: string, title: string) => setCat(c.id, { items: items(c).map(i => (i.id === iid ? { ...i, title } : i)) });
  const removeItem = (c: EvalCategory, iid: string) => setCat(c.id, { items: items(c).filter(i => i.id !== iid) });
  const moveItem = (c: EvalCategory, idx: number, dir: -1 | 1) => {
    const arr = [...items(c)];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setCat(c.id, { items: arr });
  };
  const total = questionsOf(cats).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3.5 flex gap-3">
        <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
          <p>พี่เลี้ยงให้คะแนน 1–5 ทุกข้อ (5 ดีมาก · 4 ดี · 3 ปานกลาง · 2 พอใช้ · 1 ควรปรับปรุง)</p>
          <p>ด้านที่ <b className="font-semibold">ยังไม่มีข้อย่อย</b> จะให้คะแนนรวมทั้งด้านเป็น 1 ข้อ · ค่าเฉลี่ยรวม = ค่าเฉลี่ยของทุกด้าน (แต่ละด้านมีน้ำหนักเท่ากัน)</p>
          <p className="text-amber-700 dark:text-amber-300">แก้ข้อย่อยหลังจากมีคนประเมินแล้ว ผลเดิมจะยังอยู่ แต่ข้อที่ถูกลบจะไม่แสดง</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center h-7 px-2.5 rounded-full text-xs font-medium ${isDefault ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
          {cats.length} ด้าน · รวม {total} ข้อที่ต้องให้คะแนน
        </span>
        {!isDefault && <button onClick={() => onChange(undefined)} className={btn('ghost', 'sm')}><RotateCcw size={14} /> กลับไปใช้ 4 ด้านเริ่มต้น</button>}
      </div>

      {cats.map((c, ci) => (
        <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <span className="w-6 h-6 shrink-0 rounded-md bg-[#630330] text-white dark:bg-amber-400 dark:text-slate-900 text-xs font-bold flex items-center justify-center">{ci + 1}</span>
            <input value={c.title} onChange={e => setCat(c.id, { title: e.target.value })} className={`${inputCls} h-9 font-semibold`} aria-label={`ชื่อด้านที่ ${ci + 1}`} />
            <button onClick={() => addItem(c)} className={`${btn('secondary', 'sm')} shrink-0`}><Plus size={14} /> เพิ่มข้อย่อย</button>
          </div>
          {items(c).length === 0 ? (
            <p className="px-4 py-3.5 text-xs text-slate-400">ยังไม่มีข้อย่อย · พี่เลี้ยงจะให้คะแนน “{c.title}” เป็น 1 ข้อ</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {items(c).map((it, ii) => (
                <li key={it.id} className="flex items-center gap-2 px-3.5 py-2">
                  <span className="w-9 shrink-0 text-xs tabular-nums text-slate-400">{ci + 1}.{ii + 1}</span>
                  <input value={it.title} onChange={e => setItem(c, it.id, e.target.value)} placeholder="เช่น ปฏิบัติงานตามที่ได้รับมอบหมายได้ถูกต้อง" className={`${inputCls} h-9 ${!it.title.trim() ? '!border-rose-300' : ''}`} aria-label={`ข้อ ${ci + 1}.${ii + 1}`} />
                  <button onClick={() => moveItem(c, ii, -1)} disabled={ii === 0} className={`${iconBtn} disabled:opacity-30`} aria-label="เลื่อนขึ้น"><ArrowUp size={15} /></button>
                  <button onClick={() => moveItem(c, ii, 1)} disabled={ii === items(c).length - 1} className={`${iconBtn} disabled:opacity-30`} aria-label="เลื่อนลง"><ArrowDown size={15} /></button>
                  <button onClick={() => removeItem(c, it.id)} className={`${iconBtn} hover:!text-rose-600`} aria-label="ลบ"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <p className="text-[11px] text-slate-400">ข้อย่อยที่ไม่มีชื่อจะไม่แสดงในแบบประเมิน · กด “บันทึก” ด้านล่างของหน้าเพื่อใช้งาน</p>
    </div>
  );
};

export default EvalCriteriaEditor;

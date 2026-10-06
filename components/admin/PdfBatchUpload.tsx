import React, { useEffect, useRef, useState } from 'react';
import { FileText, Upload, X, Check, AlertCircle, RefreshCw, Plus, Info, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { FormCategory } from '../../types';
import { Modal, btn, inputCls, iconBtn } from './ui';
import { MAX_PDF_MB, isPdf, titleFromFileName, dragHasFiles } from '../../uploads';
import { DriveStatus, driveStatus } from '../../studentApi';

export type BatchItem = {
  key: string;
  file: File;
  title: string;
  category: FormCategory;
  state: 'ready' | 'uploading' | 'done' | 'error';
  error?: string;
};

export const CATEGORY_LABEL: Record<FormCategory, string> = {
  [FormCategory.APPLICATION]: 'เอกสารสมัครงาน',
  [FormCategory.MONITORING]: 'เอกสารระหว่างฝึกงาน',
};

/** Turns a server reply into something the admin can act on. */
export const uploadErrorText = (msg?: string) => {
  const m = String(msg || '');
  if (m === 'NO_BACKEND') return 'ระบบหลังบ้านยังไม่รองรับการอัปโหลด (ต้อง redeploy code.gs)';
  if (m === 'UNAUTHORIZED') return 'สิทธิ์ผู้ดูแลหมดอายุ กรุณาออกจากระบบแล้วเข้าใหม่';
  if (/^drive:/i.test(m) || /permission|DriveApp|สิทธิ์/i.test(m)) return `Google Drive ยังไม่อนุญาต: ให้เปิด Apps Script แล้วกด Run ฟังก์ชัน setupDrive หนึ่งครั้ง จากนั้น deploy ใหม่ (${m.replace(/^drive:\s*/i, '').slice(0, 120)})`;
  if (m === 'not a pdf') return 'ไฟล์นี้ไม่ใช่ PDF จริง';
  if (m === 'file too large') return 'ไฟล์ใหญ่เกินกำหนด';
  if (/^HTTP_/.test(m)) return `Apps Script ตอบกลับผิดพลาด (${m.slice(5)}) ไฟล์อาจใหญ่เกินไปหรือหมดเวลา ลองไฟล์ที่เล็กลง`;
  if (/failed to fetch|networkerror|load failed/i.test(m)) return 'เชื่อมต่อ Apps Script ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
  return m && m !== 'UPLOAD_FAILED' ? `อัปโหลดไม่สำเร็จ: ${m.slice(0, 160)}` : 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง';
};

const fmtSize =(b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Splits dropped/picked files into accepted PDFs and rejected names (with the reason). */
export const screenFiles = (files: FileList | File[]) => {
  const ok: File[] = [];
  const bad: string[] = [];
  Array.from(files).forEach(f => {
    if (!isPdf(f)) bad.push(`${f.name} (ไม่ใช่ PDF)`);
    else if (f.size > MAX_PDF_MB * 1048576) bad.push(`${f.name} (ใหญ่เกิน ${MAX_PDF_MB} MB)`);
    else ok.push(f);
  });
  return { ok, bad };
};

const DriveBanner: React.FC<{ drive: DriveStatus | null | 'checking' }> = ({ drive }) => {
  const box = 'flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs leading-relaxed';
  if (drive === 'checking') return (
    <div className={`${box} bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400`}><RefreshCw size={14} className="animate-spin shrink-0 mt-0.5" />กำลังตรวจสอบ Google Drive…</div>
  );
  if (drive === null) return null; // backend without the check: errors still show per file
  if (!drive.drive) return (
    <div className={`${box} bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200`}>
      <AlertCircle size={15} className="shrink-0 mt-0.5" />
      <span><b>Google Drive ยังไม่ได้อนุญาต</b> เปิด Apps Script → เลือกฟังก์ชัน <code>setupDrive</code> → Run → Allow แล้ว Deploy → Manage deployments → ดินสอ → New version → Deploy</span>
    </div>
  );
  if (drive.fallback) return (
    <div className={`${box} bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200`}>
      <Info size={15} className="shrink-0 mt-0.5" />
      <span>
        <b>บัญชีเจ้าของ Apps Script เปิดโฟลเดอร์ WISE ไม่ได้</b> ไฟล์จะถูกเก็บในโฟลเดอร์ "WISE uploads" ของบัญชีนั้นแทน
        {drive.url && <> (<a href={drive.url} target="_blank" rel="noreferrer" className="underline">เปิดดู</a>)</>}
        {' '}แก้ได้โดยแชร์โฟลเดอร์ WISE ให้บัญชีเจ้าของสคริปต์เป็น Editor แล้ว Run <code>setupDrive</code> อีกครั้ง
      </span>
    </div>
  );
  return (
    <div className={`${box} bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200`}>
      <Check size={15} className="shrink-0 mt-0.5" />
      <span>Google Drive พร้อม · ไฟล์จะเก็บที่ <b>{drive.folder || 'WISE'} / เอกสารดาวน์โหลด / ตามหมวดหมู่</b>
        {drive.url && <> · <a href={drive.url} target="_blank" rel="noreferrer" className="underline">เปิดโฟลเดอร์</a></>}
      </span>
    </div>
  );
};

interface Props {
  open: boolean;
  initialFiles: File[];
  initialCategory: FormCategory;
  onClose: () => void;
  /** Uploads one file and returns its document record (not saved yet); throws on failure. */
  onUpload: (item: BatchItem) => Promise<unknown>;
  /** Saves the records of every uploaded file, in list order. */
  onCommit: (records: any[]) => Promise<void>;
  onRejected: (names: string[]) => void;
}

const UPLOAD_PARALLEL = 3;

const PdfBatchUpload: React.FC<Props> = ({ open, initialFiles, initialCategory, onClose, onUpload, onCommit, onRejected }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [over, setOver] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);

  const toItems = (files: File[], category: FormCategory): BatchItem[] =>
    files.map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file, title: titleFromFileName(file.name), category, state: 'ready' }));

  useEffect(() => {
    if (open) { setItems(toItems(initialFiles, initialCategory)); setBusy(false); }
  }, [open, initialFiles, initialCategory]);

  // Check the Drive folder before uploading, so a missing permission shows up front
  const [drive, setDrive] = useState<DriveStatus | null | 'checking'>('checking');
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setDrive('checking');
    driveStatus().then(s => { if (alive) setDrive(s); });
    return () => { alive = false; };
  }, [open]);

  const addFiles = (files: FileList | File[]) => {
    const { ok, bad } = screenFiles(files);
    if (bad.length) onRejected(bad);
    if (ok.length) setItems(prev => [...prev, ...toItems(ok, prev[prev.length - 1]?.category || initialCategory)]);
  };

  const [dragKey, setDragKey] = useState<string | null>(null);
  // Files upload top to bottom, and appear in the documents list in this order
  const moveTo = (key: string, to: number) => setItems(prev => {
    const from = prev.findIndex(x => x.key === key);
    if (from < 0 || to < 0 || to >= prev.length || from === to) return prev;
    const next = [...prev];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    return next;
  });

  const patch = (key: string, p: Partial<BatchItem>) => setItems(prev => prev.map(it => (it.key === key ? { ...it, ...p } : it)));

  const pending = items.filter(it => it.state !== 'done');
  const doneCount = items.filter(it => it.state === 'done').length;
  const missingTitle = pending.some(it => !it.title.trim());

  const start = async () => {
    setBusy(true);
    const queue = [...pending];
    const results: (unknown | undefined)[] = new Array(queue.length);
    let failed = 0;
    let next = 0;
    // A few files at a time: each request spends most of its time waiting on Apps Script
    const worker = async () => {
      while (next < queue.length) {
        const i = next++;
        const it = queue[i];
        patch(it.key, { state: 'uploading', error: undefined });
        try {
          results[i] = await onUpload({ ...it, title: it.title.trim() });
          patch(it.key, { state: 'done' });
        } catch (err: any) {
          failed++;
          patch(it.key, { state: 'error', error: uploadErrorText(err?.message) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_PARALLEL, queue.length) }, worker));
    // Records are saved once, in the order arranged on screen
    const saved = results.filter(r => r !== undefined);
    if (saved.length) {
      setSaving(true);
      try { await onCommit(saved); }
      catch (err: any) {
        failed++;
        queue.forEach((it, i) => { if (results[i] !== undefined) patch(it.key, { state: 'error', error: `อัปไฟล์แล้วแต่บันทึกรายการไม่สำเร็จ: ${String(err?.message || err).slice(0, 120)}` }); });
      }
      setSaving(false);
    }
    setBusy(false);
    if (!failed) onClose();
  };

  const setAllCategory = (c: FormCategory) => setItems(prev => prev.map(it => (it.state === 'done' ? it : { ...it, category: c })));
  const allSame = pending.length > 0 && pending.every(it => it.category === pending[0].category) ? pending[0].category : null;

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose(); }}
      title="อัปโหลดเอกสาร PDF"
      subtitle="ลากไฟล์มาวางได้หลายไฟล์พร้อมกัน ตั้งชื่อ จัดลำดับ (ลากหรือกดลูกศร) แล้วกดอัปโหลด"
      icon={<Upload size={18} />}
      size="lg"
      footer={
        <>
          <span className="mr-auto text-xs text-slate-500 tabular-nums">
            {saving ? 'กำลังบันทึกรายการ…' : busy ? `อัปโหลดแล้ว ${doneCount}/${items.length}` : doneCount ? `สำเร็จ ${doneCount}/${items.length}` : `${items.length} ไฟล์`}
          </span>
          <button type="button" onClick={onClose} disabled={busy} className={btn('secondary')}>{doneCount ? 'ปิด' : 'ยกเลิก'}</button>
          <button type="button" onClick={start} disabled={busy || !pending.length || missingTitle} className={btn('primary')}>
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
            {busy ? 'กำลังอัปโหลด…' : pending.some(it => it.state === 'error') ? 'ลองอีกครั้ง' : `อัปโหลด ${pending.length} ไฟล์`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <DriveBanner drive={drive} />
        {/* Drop zone (adds more files) */}
        <div
          onDragOver={e => { if (dragHasFiles(e)) { e.preventDefault(); setOver(true); } }}
          onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); if (!busy) addFiles(e.dataTransfer.files); }}
          onClick={() => !busy && pickRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickRef.current?.click(); } }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition ${over ? 'border-[#630330] bg-[#630330]/5 dark:border-amber-400 dark:bg-amber-400/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}`}
        >
          <input ref={pickRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={e => { if (e.target.files) addFiles(e.target.files); e.currentTarget.value = ''; }} />
          <span className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"><Plus size={18} /></span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{over ? 'ปล่อยเพื่อเพิ่มไฟล์' : 'ลากไฟล์ PDF มาวางเพิ่ม หรือคลิกเพื่อเลือก'}</span>
            <span className="block text-[11px] text-slate-400">เลือกได้หลายไฟล์ · เฉพาะ .pdf · ไม่เกิน {MAX_PDF_MB} MB ต่อไฟล์</span>
          </span>
        </div>

        {items.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">ตั้งหมวดหมู่ทุกไฟล์เป็น</span>
              {(Object.keys(CATEGORY_LABEL) as FormCategory[]).map(c => (
                <button key={c} type="button" disabled={busy} onClick={() => setAllCategory(c)}
                  className={`h-7 px-3 rounded-full font-medium transition ${allSame === c ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>

            <ul className="space-y-2">
              {items.map((it, idx) => (
                <li key={it.key}
                  draggable={!busy && it.state !== 'done'}
                  onDragStart={e => { setDragKey(it.key); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', it.key); }}
                  onDragOver={e => { if (dragKey && dragKey !== it.key) { e.preventDefault(); moveTo(dragKey, idx); } }}
                  onDragEnd={() => setDragKey(null)}
                  className={`rounded-xl border p-3 transition ${dragKey === it.key ? 'opacity-50 ring-2 ring-[#630330]/30' : ''} ${it.state === 'done' ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10' : it.state === 'error' ? 'border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-0.5 shrink-0 -my-1">
                      <button type="button" disabled={busy || idx === 0} onClick={() => moveTo(it.key, idx - 1)} className={`${iconBtn} !w-7 !h-6 disabled:opacity-25`} aria-label="เลื่อนขึ้น" title="เลื่อนขึ้น"><ArrowUp size={14} /></button>
                      <span className="flex items-center gap-0.5 text-[11px] font-semibold tabular-nums text-slate-400 cursor-grab active:cursor-grabbing" title="ลากเพื่อจัดลำดับ"><GripVertical size={12} />{idx + 1}</span>
                      <button type="button" disabled={busy || idx === items.length - 1} onClick={() => moveTo(it.key, idx + 1)} className={`${iconBtn} !w-7 !h-6 disabled:opacity-25`} aria-label="เลื่อนลง" title="เลื่อนลง"><ArrowDown size={14} /></button>
                    </div>
                    <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${it.state === 'done' ? 'bg-emerald-500 text-white' : it.state === 'error' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                      {it.state === 'done' ? <Check size={17} /> : it.state === 'uploading' ? <RefreshCw size={16} className="animate-spin" /> : it.state === 'error' ? <AlertCircle size={17} /> : <FileText size={17} />}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <label className="block">
                        <span className="sr-only">ชื่อเอกสารของไฟล์ที่ {idx + 1}</span>
                        <input
                          value={it.title}
                          onChange={e => patch(it.key, { title: e.target.value })}
                          disabled={busy || it.state === 'done'}
                          placeholder="ตั้งชื่อเอกสาร เช่น แบบฟอร์ม วบง. 01"
                          className={`${inputCls} ${!it.title.trim() ? '!border-rose-300' : ''}`}
                          autoFocus={idx === 0}
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span className="text-[11px] text-slate-400 truncate max-w-full" title={it.file.name}>{it.file.name} · {fmtSize(it.file.size)}</span>
                        <span className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                          {(Object.keys(CATEGORY_LABEL) as FormCategory[]).map(c => (
                            <button key={c} type="button" disabled={busy || it.state === 'done'} onClick={() => patch(it.key, { category: c })}
                              className={`h-6 px-2.5 rounded-md text-[11px] font-medium transition ${it.category === c ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                              {CATEGORY_LABEL[c]}
                            </button>
                          ))}
                        </span>
                      </div>
                      {it.error && <p className="text-[11px] text-rose-600 dark:text-rose-300">{it.error}</p>}
                    </div>
                    {it.state !== 'done' && (
                      <button type="button" disabled={busy} onClick={() => setItems(prev => prev.filter(x => x.key !== it.key))} className={iconBtn} title="เอาไฟล์นี้ออก" aria-label="เอาไฟล์นี้ออก"><X size={16} /></button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="text-[11px] text-slate-400 flex items-start gap-1.5"><Info size={12} className="mt-0.5 shrink-0" /> ไฟล์จะถูกเก็บใน Google Drive ของระบบ และระบบจะแปลชื่อเอกสารเป็นภาษาอังกฤษ อาหรับ และมลายูให้อัตโนมัติ</p>
      </div>
    </Modal>
  );
};

export default PdfBatchUpload;

import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Link, ExternalLink, Lock } from 'lucide-react';
import { Major } from '../types';
import { Modal, btn, MAJOR_META } from './admin/ui';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  years?: string[];
  terms?: string[];
  availableYears?: string[];
  availableTerms?: string[];
  kind?: 'summary' | 'dashboard';
}

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-8 px-3 rounded-full text-xs font-medium transition ${
      active
        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
        : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
    }`}
  >
    {children}
  </button>
);

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  years = [],
  terms = [],
  availableYears,
  availableTerms,
  kind = 'summary'
}) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options inside the modal
  const yearOptions = availableYears && availableYears.length > 0 ? availableYears : (years.length > 0 ? years : ['2568', '2567', '2566']);
  const termOptions = availableTerms && availableTerms.length > 0 ? availableTerms : ['1', '2'];

  const [selectedYears, setSelectedYears] = useState<string[]>(years);
  const [selectedTerms, setSelectedTerms] = useState<string[]>(terms);
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);

  // Sync with props when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedYears(years);
      setSelectedTerms(terms);
      setSelectedMajors([]);
      setCopied(false);
    }
  }, [isOpen, years, terms]);

  // Construct URL dynamically
  useEffect(() => {
    if (isOpen) {
      const params = new URLSearchParams();
      params.set('view', kind === 'dashboard' ? 'stats' : 'summary');
      if (selectedYears.length > 0) params.set('years', selectedYears.join(','));
      if (selectedTerms.length > 0) params.set('terms', selectedTerms.join(','));
      if (selectedMajors.length > 0) params.set('majors', selectedMajors.join(','));

      const pathname = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
      const url = `${window.location.origin}${pathname}#?${params.toString()}`;
      setShareUrl(url);
      setCopied(false);
    }
  }, [isOpen, selectedYears, selectedTerms, selectedMajors, kind]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      }
    } catch (err) {
      console.warn("navigator.clipboard failed, using fallback:", err);
    }

    // Fallback copy method
    try {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      }
    } catch (err) {
      console.error("Fallback copy failed:", err);
    }
  };

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter(prev => prev.includes(v) ? prev.filter(item => item !== v) : [...prev, v]);
  const toggleYear = toggle(setSelectedYears);
  const toggleTerm = toggle(setSelectedTerms);
  const toggleMajor = toggle(setSelectedMajors);

  const summaryText = [
    selectedYears.length ? `ปี ${selectedYears.join(', ')}` : 'ทุกปี',
    selectedTerms.length ? `เทอม ${selectedTerms.join(', ')}` : 'ทุกเทอม',
    selectedMajors.length ? selectedMajors.map(m => MAJOR_META[m as Major]?.short).join(', ') : 'ทุกสาขา',
  ].join(' · ');

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={kind === 'dashboard' ? 'แชร์แดชบอร์ด' : 'แชร์รายชื่อให้อาจารย์'}
      subtitle={kind === 'dashboard' ? 'ลิงก์ดูสถิติภาพรวมแบบอ่านอย่างเดียว' : 'สร้างลิงก์สำหรับดูรายชื่อและระบุอาจารย์นิเทศ'}
      icon={<Link size={18} />}
      size="md"
      zIndex="z-[300]"
      footer={
        <>
          <button onClick={() => window.open(shareUrl, '_blank')} className={`${btn('ghost', 'sm')} mr-auto`}>
            <ExternalLink size={14} /> ทดลองเปิด
          </button>
          <button onClick={onClose} className={btn('secondary')}>ปิด</button>
          <button onClick={handleCopy} className={btn('primary')}>
            {copied ? <><Check size={15} /> คัดลอกแล้ว</> : <><Copy size={15} /> คัดลอกลิงก์</>}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ปีการศึกษา</span>
            <span className="text-[11px] text-slate-400">ไม่เลือก = ทุกปี</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={selectedYears.length === 0} onClick={() => setSelectedYears([])}>ทั้งหมด</Chip>
            {yearOptions.map(y => <Chip key={y} active={selectedYears.includes(y)} onClick={() => toggleYear(y)}>{y}</Chip>)}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ภาคเรียน</span>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={selectedTerms.length === 0} onClick={() => setSelectedTerms([])}>ทั้งหมด</Chip>
            {termOptions.map(t => <Chip key={t} active={selectedTerms.includes(t)} onClick={() => toggleTerm(t)}>เทอม {t}</Chip>)}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">สาขาวิชา</span>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={selectedMajors.length === 0} onClick={() => setSelectedMajors([])}>ทั้งหมด</Chip>
            {[Major.HALAL_FOOD, Major.DIGITAL_TECH, Major.INFO_TECH, Major.DATA_SCIENCE].map(m => (
              <Chip key={m} active={selectedMajors.includes(m)} onClick={() => toggleMajor(m)}>
                {MAJOR_META[m].short} · {MAJOR_META[m].full}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ลิงก์</span>
            <span className="text-[11px] text-slate-400 truncate">{summaryText}</span>
          </div>
          <div className="flex items-center gap-2 h-10 pl-3 pr-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
            <input
              ref={inputRef}
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-transparent outline-none font-mono text-xs text-slate-600 dark:text-slate-300"
            />
            <button onClick={handleCopy} className={`h-8 w-8 shrink-0 rounded-md flex items-center justify-center transition ${copied ? 'text-emerald-600' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800'}`} aria-label="คัดลอก">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        <div className="flex gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <Lock size={14} className="shrink-0 mt-0.5 text-slate-400" />
          {kind === 'dashboard'
            ? <p>ผู้รับลิงก์ดูได้เฉพาะ<b>ตัวเลขสถิติและกราฟ</b> โดยไม่ต้องล็อกอิน ไม่มีรายชื่อหรือรหัสนักศึกษา และแก้ไขข้อมูลไม่ได้</p>
            : <p>อาจารย์เปิดลิงก์ได้จากทุกอุปกรณ์โดย<b>ไม่ต้องล็อกอิน</b> เพื่อดูรายชื่อและพิมพ์ระบุอาจารย์นิเทศ ข้อมูลจะแสดงให้ทุกคนเห็นทันที และช่องที่มีผู้กำลังกรอกจะถูกล็อกไว้</p>}
        </div>
      </div>
    </Modal>
  );
};

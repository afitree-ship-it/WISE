import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Link, ExternalLink, Filter, Calendar, BookOpen, Layers } from 'lucide-react';
import { Major } from '../types';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  years?: string[];
  terms?: string[];
  availableYears?: string[];
  availableTerms?: string[];
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ 
  isOpen, 
  onClose, 
  years = [], 
  terms = [],
  availableYears,
  availableTerms
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
      params.set('view', 'summary');
      if (selectedYears.length > 0) params.set('years', selectedYears.join(','));
      if (selectedTerms.length > 0) params.set('terms', selectedTerms.join(','));
      if (selectedMajors.length > 0) params.set('majors', selectedMajors.join(','));
      
      const pathname = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
      const url = `${window.location.origin}${pathname}#?${params.toString()}`;
      setShareUrl(url);
    }
  }, [isOpen, selectedYears, selectedTerms, selectedMajors]);

  if (!isOpen) return null;

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

  const toggleYear = (y: string) => {
    setSelectedYears(prev => prev.includes(y) ? prev.filter(item => item !== y) : [...prev, y]);
  };

  const toggleTerm = (t: string) => {
    setSelectedTerms(prev => prev.includes(t) ? prev.filter(item => item !== t) : [...prev, t]);
  };

  const toggleMajor = (m: string) => {
    setSelectedMajors(prev => prev.includes(m) ? prev.filter(item => item !== m) : [...prev, m]);
  };

  const handleOpenLink = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 shadow-3xl border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-200 max-h-[94svh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3.5 mb-5 shrink-0">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-inner">
            <Link size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">แชร์รายชื่อนักศึกษาให้อาจารย์</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Share Filtered Summary Link</p>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          {/* Filter Customization Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Filter size={14} className="text-indigo-600" />
              กำหนดเงื่อนไขรายชื่อที่ต้องการแชร์
            </div>

            {/* Year Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar size={12} className="text-indigo-500" /> ปีการศึกษา:
                </label>
                <button 
                  type="button" 
                  onClick={() => setSelectedYears([])}
                  className={`text-[10px] font-black uppercase ${selectedYears.length === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {selectedYears.length === 0 ? '✓ แสดงทุกปี' : 'แสดงทุกปี'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {yearOptions.map(y => {
                  const isSelected = selectedYears.includes(y);
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => toggleYear(y)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' 
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      ปี {y}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Term Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <BookOpen size={12} className="text-indigo-500" /> ภาคเรียน (เทอม):
                </label>
                <button 
                  type="button" 
                  onClick={() => setSelectedTerms([])}
                  className={`text-[10px] font-black uppercase ${selectedTerms.length === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {selectedTerms.length === 0 ? '✓ แสดงทุกเทอม' : 'แสดงทุกเทอม'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {termOptions.map(t => {
                  const isSelected = selectedTerms.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTerm(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' 
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      เทอม {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Major Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers size={12} className="text-indigo-500" /> สาขาวิชา:
                </label>
                <button 
                  type="button" 
                  onClick={() => setSelectedMajors([])}
                  className={`text-[10px] font-black uppercase ${selectedMajors.length === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {selectedMajors.length === 0 ? '✓ ทุกสาขาวิชา' : 'ทุกสาขาวิชา'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: Major.HALAL_FOOD, label: 'R&D อาหารฮาลาล' },
                  { id: Major.DIGITAL_TECH, label: 'TDS เทคโนโลยีดิจิทัล' },
                  { id: Major.INFO_TECH, label: 'IT เทคโนโลยีสารสนเทศ' },
                  { id: Major.DATA_SCIENCE, label: 'DSA วิทยาการข้อมูล' }
                ].map(m => {
                  const isSelected = selectedMajors.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMajor(m.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black truncate text-left transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' 
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Link URL Box */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              ลิงก์สำหรับแชร์ให้อาจารย์
            </label>
            <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 focus-within:border-indigo-500 transition-all">
              <input 
                ref={inputRef}
                type="text" 
                readOnly 
                value={shareUrl}
                className="flex-1 bg-transparent border-none outline-none font-mono text-[11px] px-3 text-slate-600 dark:text-slate-300 select-all"
                onClick={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.select();
                }}
              />
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase text-xs transition-all shrink-0 ${
                  copied 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    คัดลอกแล้ว!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    คัดลอกลิงก์
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action buttons & Info notice */}
          <div className="flex gap-2">
            <button
              onClick={handleOpenLink}
              className="flex-1 py-2.5 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-black text-xs uppercase flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink size={14} /> ทดลองเปิดดูหน้ารายชื่อ
            </button>
          </div>

          <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-bold">
            🔒 <strong>สำหรับอาจารย์:</strong> อาจารย์สามารถเปิดลิงก์นี้จากอุปกรณ์ใดก็ได้โดย<strong>ไม่ต้องล็อคอิน</strong> เพื่อดูรายชื่อและพิมพ์ระบุอาจารย์นิเทศ ข้อมูลที่ระบุจะถูกบันทึกและล็อกทันทีแบบเรียลไทม์
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase text-xs transition-colors"
          >
            เสร็จสิ้น / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

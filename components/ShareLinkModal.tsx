import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Link } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  years: string[];
  terms: string[];
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose, years, terms }) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const params = new URLSearchParams();
      params.set('view', 'summary');
      if (years.length > 0) params.set('years', years.join(','));
      if (terms.length > 0) params.set('terms', terms.join(','));
      
      const url = `${window.location.origin}/#?${params.toString()}`;
      setShareUrl(url);
      setCopied(false);
    }
  }, [isOpen, years, terms]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (err) {
      console.error("Fallback copy failed:", err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6 mt-2">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-3xl mb-4 shadow-inner">
            <Link size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">แชร์ลิงก์สรุปภาพรวม</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Get Filtered Summary Link</p>
        </div>

        {/* Content Box */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              ลิงก์สำหรับแชร์สรุปข้อมูล
            </label>
            <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 focus-within:border-indigo-500 transition-all">
              <input 
                ref={inputRef}
                type="text" 
                readOnly 
                value={shareUrl}
                className="flex-1 bg-transparent border-none outline-none font-mono text-xs px-3 text-slate-600 dark:text-slate-300 select-all"
                onClick={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.select();
                }}
              />
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] transition-all shrink-0 ${
                  copied 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={12} />
                    คัดลอกแล้ว
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    คัดลอก
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Manual Copy instructions */}
          <div className="text-center bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
              💡 ดับเบิลคลิกหรือลากคลุมลิงก์ด้านบนเพื่อคัดลอกด้วยตนเองได้ทุกเมื่อ
              <br />
              ลิงก์นี้เปิดหน้ารายงานที่กำหนดฟิลเตอร์ไว้โดยตรง ไม่จำเป็นต้องล็อคอิน
            </p>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

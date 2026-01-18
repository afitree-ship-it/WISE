import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  className?: string;
  variant?: 'inline' | 'dropdown';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  currentLang, 
  onLanguageChange, 
  className = "",
  variant = 'inline'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const langs = [
    { code: Language.TH, label: 'TH', flag: 'https://flagcdn.com/w40/th.png' },
    { code: Language.EN, label: 'EN', flag: 'https://flagcdn.com/w40/us.png' },
    { code: Language.AR, label: 'AR', flag: 'https://flagcdn.com/w40/sa.png' },
    { code: Language.MS, label: 'MS', flag: 'https://flagcdn.com/w40/my.png' },
  ];

  const activeLang = langs.find(l => l.code === currentLang) || langs[0];
  const otherLangs = langs.filter(l => l.code !== currentLang);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (variant === 'dropdown') {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant]);

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef} style={{ isolation: 'isolate' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className={`
            flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300
            bg-white/20 border border-white/40
            shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:bg-white/30 group
            ${isOpen ? 'ring-2 ring-[#D4AF37]' : ''}
          `}
        >
          <div className="w-5 h-3.5 overflow-hidden rounded-[2px] shadow-sm flex-shrink-0 ring-1 ring-white/50">
            <img 
              src={activeLang.flag} 
              alt={activeLang.label}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
          <span className="text-[11px] font-black tracking-tight text-white uppercase drop-shadow-md">
            {activeLang.label}
          </span>
          <ChevronDown 
            size={14} 
            className={`text-white transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-3 w-32 origin-top-right z-[150] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden py-1.5">
              {langs.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    onLanguageChange(l.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors group ${currentLang === l.code ? 'bg-slate-50 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className={`w-5 h-3.5 overflow-hidden rounded-[2px] shadow-sm flex-shrink-0 transition-all ${currentLang === l.code ? 'grayscale-0' : 'grayscale-[40%] group-hover:grayscale-0'}`}>
                    <img 
                      src={l.flag} 
                      alt={l.label}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>
                  <span className={`text-[11px] font-bold transition-colors ${currentLang === l.code ? 'text-[#630330] dark:text-[#D4AF37]' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#630330] dark:group-hover:text-[#D4AF37]'}`}>
                    {l.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Inline variant (Default for landing page)
  return (
    <div className={`inline-flex items-center p-1 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm ${className}`}>
      <div className="flex items-center gap-0.5 sm:gap-1">
        {langs.map((l) => {
          const isActive = currentLang === l.code;
          return (
            <button
              key={l.code}
              onClick={() => onLanguageChange(l.code)}
              className={`
                relative flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-[#630330] dark:bg-[#D4AF37] shadow-lg scale-100 z-10' 
                  : 'bg-transparent hover:bg-white dark:hover:bg-white/10 scale-95'
                }
              `}
              aria-label={`Switch to ${l.label}`}
            >
              <div className={`
                w-4.5 h-3.5 sm:w-5 sm:h-4 overflow-hidden rounded-[2px] shadow-sm transition-all duration-300 flex-shrink-0
                ${isActive ? 'grayscale-0 ring-1 ring-white/20' : 'grayscale-[40%] opacity-80 group-hover:grayscale-0 group-hover:opacity-100'}
              `}>
                <img 
                  src={l.flag} 
                  alt={`${l.label} flag`}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              <span className={`
                text-[10px] sm:text-[11px] font-black tracking-tight transition-all duration-300
                ${isActive 
                  ? 'text-white dark:text-slate-950' 
                  : 'text-slate-600 dark:text-slate-300 group-hover:text-[#630330] dark:group-hover:text-[#D4AF37]'
                }
              `}>
                {l.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
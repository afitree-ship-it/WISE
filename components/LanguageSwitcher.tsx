
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
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            bg-slate-100/60 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/80 dark:border-white/10
            shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-slate-700/80 group
            ${isOpen ? 'ring-2 ring-[#630330]/20 dark:ring-[#D4AF37]/20' : ''}
          `}
        >
          <div className="w-5 h-3.5 overflow-hidden rounded-[2px] shadow-sm flex-shrink-0 ring-1 ring-slate-200/50 dark:ring-white/10">
            <img 
              src={activeLang.flag} 
              alt={activeLang.label}
              className="w-full h-full object-cover"
              loading="eager"
              crossOrigin="anonymous"
            />
          </div>
          <span className="text-[11px] font-black tracking-tight text-slate-800 dark:text-slate-200 uppercase">
            {activeLang.label}
          </span>
          <ChevronDown 
            size={14} 
            className={`text-slate-400 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-32 origin-top-right z-[100] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden py-1.5">
              {otherLangs.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    onLanguageChange(l.code);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#630330]/5 dark:hover:bg-[#D4AF37]/10 transition-colors group"
                >
                  <div className="w-5 h-3.5 overflow-hidden rounded-[2px] shadow-sm flex-shrink-0 grayscale-[30%] group-hover:grayscale-0 transition-all">
                    <img 
                      src={l.flag} 
                      alt={l.label}
                      className="w-full h-full object-cover"
                      loading="eager"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-[#630330] dark:group-hover:text-[#D4AF37] transition-colors">
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
    <div className={`inline-flex items-center p-1 bg-slate-100/60 dark:bg-slate-800/50 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm ${className}`}>
      <div className="flex items-center gap-0.5 sm:gap-1">
        {langs.map((l) => {
          const isActive = currentLang === l.code;
          return (
            <button
              key={l.code}
              onClick={() => onLanguageChange(l.code)}
              className={`
                relative flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group
                ${isActive 
                  ? 'bg-[#630330] dark:bg-[#D4AF37] shadow-[0_4px_12px_rgba(99,3,48,0.25)] dark:shadow-[0_4px_12px_rgba(212,175,55,0.2)] scale-100 z-10' 
                  : 'bg-transparent hover:bg-white/90 dark:hover:bg-white/10 scale-95'
                }
              `}
              aria-label={`Switch to ${l.label}`}
            >
              <div className={`
                w-4.5 h-3.5 sm:w-5 sm:h-4 overflow-hidden rounded-[2px] shadow-sm transition-all duration-500 flex-shrink-0
                ${isActive ? 'grayscale-0 ring-1 ring-white/20' : 'grayscale-[40%] opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110'}
              `}>
                <img 
                  src={l.flag} 
                  alt={`${l.label} flag`}
                  className="w-full h-full object-cover"
                  loading="eager"
                  crossOrigin="anonymous"
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
              {isActive && (
                <div className="absolute inset-0 rounded-xl border border-white/10 dark:border-black/5 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSwitcher;

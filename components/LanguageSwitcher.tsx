
import React from 'react';
import { Language } from '../types';

interface LanguageSwitcherProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLang, onLanguageChange, className = "" }) => {
  const langs = [
    { code: Language.TH, label: 'TH', flag: '🇹🇭' },
    { code: Language.EN, label: 'EN', flag: '🇺🇸' },
    { code: Language.AR, label: 'AR', flag: '🇸🇦' },
    { code: Language.ID, label: 'ID', flag: '🇮🇩' },
    { code: Language.MS, label: 'MS', flag: '🇲🇾' },
  ];

  return (
    <div className={`flex items-center gap-1 p-1 bg-black/10 backdrop-blur-xl rounded-full border border-white/10 shadow-lg inline-flex overflow-hidden ${className}`}>
      {langs.map((lang) => {
        const isActive = currentLang === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={`
              relative flex items-center justify-center gap-2 px-3.5 py-2 rounded-full transition-all duration-300 group
              ${isActive 
                ? 'bg-white text-[#630330] shadow-sm' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
              }
            `}
          >
            <span className={`text-xs leading-none transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              {lang.flag}
            </span>
            <span className={`text-[10px] font-bold tracking-normal transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
              {lang.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;

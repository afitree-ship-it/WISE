
import React from 'react';
import { Language } from '../types';

interface LanguageSwitcherProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLang, onLanguageChange, className = "" }) => {
  const langs = [
    { code: Language.TH, label: 'TH', flag: 'https://flagcdn.com/w40/th.png' },
    { code: Language.EN, label: 'EN', flag: 'https://flagcdn.com/w40/us.png' },
    { code: Language.AR, label: 'AR', flag: 'https://flagcdn.com/w40/sa.png' },
    { code: Language.MS, label: 'MS', flag: 'https://flagcdn.com/w40/my.png' },
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
            <div className={`w-5 h-3.5 overflow-hidden rounded-sm transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              <img 
                src={lang.flag} 
                alt={lang.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
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

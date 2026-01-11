
import React from 'react';
import { Language } from '../types';

interface LanguageSwitcherProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLang, onLanguageChange, className = "" }) => {
  const langs = [
    { 
      code: Language.TH, 
      label: 'TH', 
      flagUrl: 'https://flagcdn.com/th.svg',
      alt: 'Thai Flag'
    },
    { 
      code: Language.EN, 
      label: 'EN', 
      flagUrl: 'https://flagcdn.com/us.svg',
      alt: 'US Flag'
    },
    { 
      code: Language.AR, 
      label: 'AR', 
      flagUrl: 'https://flagcdn.com/sa.svg',
      alt: 'Saudi Arabia Flag'
    },
    { 
      code: Language.MS, 
      label: 'MS', 
      flagUrl: 'https://flagcdn.com/my.svg',
      alt: 'Malaysia Flag'
    },
  ];

  return (
    <div className={`flex items-center gap-1 p-1 bg-black/20 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl inline-flex overflow-hidden ${className}`}>
      {langs.map((lang) => {
        const isActive = currentLang === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={`
              relative flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-full transition-all duration-500 group
              ${isActive 
                ? 'bg-white text-[#630330] shadow-md ring-1 ring-white/20' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
              }
            `}
          >
            <div className={`w-4 h-4 sm:w-5 sm:h-3.5 overflow-hidden rounded-sm flex-shrink-0 transition-transform duration-500 shadow-sm border border-black/5 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              <img 
                src={lang.flagUrl} 
                alt={lang.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <span className={`text-[10px] sm:text-[11px] font-black tracking-wider transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
              {lang.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;


import React from 'react';
import { InternshipSite, Language, Major, LocalizedString } from '../types';
import { TRANSLATIONS } from '../constants';
import { MapPin, Mail, Phone, ExternalLink, GraduationCap, Flame, Sparkles, Briefcase } from 'lucide-react';

interface InternshipCardProps {
  site: InternshipSite;
  lang: Language;
}

const InternshipCard: React.FC<InternshipCardProps> = ({ site, lang }) => {
  const t = TRANSLATIONS[lang];
  const isHalal = site.major === Major.HALAL_FOOD;
  const isActive = site.status === 'active';
  
  // A site is considered "new" if it was created in the last 48 hours
  const isNew = site.createdAt && (Date.now() - site.createdAt < 172800000);

  // Helper to extract localized text
  const getLocalized = (localized: LocalizedString) => {
    return localized[lang] || localized['en'] || localized['th'];
  };

  const getSafeUrl = (url?: string) => {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const safeContactLink = getSafeUrl(site.contactLink);
  
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all hover:border-[#63033044] dark:hover:border-[#D4AF3744] hover:shadow-lg p-4 flex flex-col h-full">
      {isNew && (
        <div className="absolute top-0 right-0 bg-[#D4AF37] text-[#630330] py-0.5 px-2 rounded-bl-lg font-black text-[7px] uppercase flex items-center gap-1 shadow-lg z-10 animate-pulse">
          <Sparkles size={7} /> NEW
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-1.5 mb-2">
        <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase ${
          isActive 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50' 
            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100/50'
        }`}>
          {isActive ? (
            <span className="flex items-center gap-0.5"><Flame size={8} /> {t.activeSites}</span>
          ) : (
            <span className="flex items-center gap-0.5"><GraduationCap size={8} /> {t.pastSites}</span>
          )}
        </span>
        <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase ${
          isHalal ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100/50' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100/50'
        }`}>
          {isHalal ? t.halalMajor : t.digitalMajor}
        </span>
      </div>
      
      <h3 className="text-[12px] font-bold text-slate-900 dark:text-white mb-1 leading-tight group-hover:text-[#630330] dark:group-hover:text-[#D4AF37] transition-colors line-clamp-1">
        {getLocalized(site.name)}
      </h3>
      
      {site.position && (
        <div className="flex items-center text-[#630330] dark:text-[#D4AF37] text-[9px] font-black uppercase mb-1.5">
          <Briefcase size={9} className="mr-1" />
          <span className="truncate">{getLocalized(site.position)}</span>
        </div>
      )}

      <div className="flex items-center text-slate-400 dark:text-slate-500 text-[8px] font-bold mb-2">
        <MapPin size={9} className="mr-1 text-[#630330] dark:text-[#D4AF37]" />
        {getLocalized(site.location)}
      </div>
      
      <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-snug mb-3 flex-grow line-clamp-2">
        {getLocalized(site.description)}
      </p>

      <div className="mt-auto">
        {safeContactLink ? (
          <a 
            href={safeContactLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#630330] dark:bg-[#7a0b3d] text-white text-[9px] font-bold uppercase hover:bg-[#7a0b3d] transition-all shadow-md"
          >
            {t.visitWebsite} <ExternalLink size={9} />
          </a>
        ) : (
          <div className="w-full text-center py-2 text-[8px] text-slate-300 dark:text-slate-600 font-bold uppercase border border-slate-50 dark:border-slate-800 rounded-lg">
            {lang === 'th' ? 'ไม่มีเว็บไซต์' : 'No Website'}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternshipCard;


import React from 'react';
import { InternshipSite, Language, Major, LocalizedString } from '../types';
import { TRANSLATIONS } from '../constants';
import { MapPin, Mail, Phone, ExternalLink, GraduationCap, Flame } from 'lucide-react';

interface InternshipCardProps {
  site: InternshipSite;
  lang: Language;
}

const InternshipCard: React.FC<InternshipCardProps> = ({ site, lang }) => {
  const t = TRANSLATIONS[lang];
  const isHalal = site.major === Major.HALAL_FOOD;
  const isActive = site.status === 'active';

  // Helper to extract localized text
  const getLocalized = (localized: LocalizedString) => {
    return localized[lang] || localized['en'] || localized['th'];
  };

  // FIX: Safety helper to ensure URLs are absolute and don't trigger 404s
  const getSafeUrl = (url?: string) => {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    // Check if it starts with http:// or https://
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const safeContactLink = getSafeUrl(site.contactLink);
  
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 transition-all hover:border-[#63033044] hover:shadow-xl p-5 flex flex-col h-full">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase ${
          isActive 
            ? 'bg-emerald-100 text-emerald-700' 
            : 'bg-slate-100 text-slate-500'
        }`}>
          {isActive ? (
            <span className="flex items-center gap-1"><Flame size={10} /> {t.activeSites}</span>
          ) : (
            <span className="flex items-center gap-1"><GraduationCap size={10} /> {t.pastSites}</span>
          )}
        </span>
        <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase ${
          isHalal ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {isHalal ? t.halalMajor : t.digitalMajor}
        </span>
      </div>
      
      <h3 className="text-sm font-bold text-slate-900 mb-1 leading-tight group-hover:text-[#630330] transition-colors line-clamp-2">
        {getLocalized(site.name)}
      </h3>
      <div className="flex items-center text-slate-400 text-[9px] font-bold mb-3">
        <MapPin size={10} className="mr-1 text-[#630330]" />
        {getLocalized(site.location)}
      </div>
      
      <p className="text-slate-500 text-[10px] leading-relaxed mb-4 flex-grow line-clamp-3">
        {getLocalized(site.description)}
      </p>

      <div className="flex flex-col gap-1.5 mb-4">
        {site.email && (
          <div className="flex items-center gap-2 text-[9px] text-slate-500 bg-slate-50 px-2 py-1 rounded-md overflow-hidden">
            <Mail size={10} className="text-[#630330] flex-shrink-0" />
            <span className="truncate">{site.email}</span>
          </div>
        )}
        {site.phone && (
          <div className="flex items-center gap-2 text-[9px] text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
            <Phone size={10} className="text-[#630330] flex-shrink-0" />
            <span>{site.phone}</span>
          </div>
        )}
      </div>

      <div className="mt-auto">
        {safeContactLink ? (
          <a 
            href={safeContactLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#630330] text-white text-[9px] font-bold uppercase hover:bg-[#7a0b3d] transition-all shadow-md group-hover:shadow-[#63033044]"
          >
            {t.visitWebsite} <ExternalLink size={10} />
          </a>
        ) : (
          <div className="w-full text-center py-2.5 text-[8px] text-slate-300 font-bold uppercase border border-slate-50 rounded-xl">
            {lang === 'th' ? 'ไม่มีเว็บไซต์' : 'No Website'}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternshipCard;

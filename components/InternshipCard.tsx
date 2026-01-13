
import React from 'react';
import { InternshipSite, Language, Major, LocalizedString } from '../types';
import { TRANSLATIONS } from '../constants';
import { MapPin, Mail, Phone, ExternalLink, GraduationCap, Flame, Sparkles, Briefcase, History, CheckCircle2 } from 'lucide-react';

interface InternshipCardProps {
  site: InternshipSite;
  lang: Language;
}

const InternshipCard: React.FC<InternshipCardProps> = ({ site, lang }) => {
  const t = TRANSLATIONS[lang];
  const isHalal = site.major === Major.HALAL_FOOD;
  const isActive = site.status === 'active';
  const isSeniorVisited = site.status === 'senior_visited';
  
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
    <div className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all duration-300 flex flex-col h-full shadow-sm hover:shadow-xl
      ${isActive 
        ? 'border-slate-100 dark:border-slate-800 hover:border-[#63033044] dark:hover:border-[#D4AF3744]' 
        : isSeniorVisited
        ? 'border-amber-100 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700'
        : 'border-slate-50 dark:border-slate-800 opacity-90'
      }`}>
      
      {isNew && isActive && (
        <div className="absolute top-0 right-0 bg-[#D4AF37] text-[#630330] py-1 px-3 rounded-bl-xl font-black text-[10px] uppercase flex items-center gap-1 shadow-lg z-10 animate-pulse">
          <Sparkles size={12} /> NEW
        </div>
      )}

      {/* Header Tags Section */}
      <div className="p-4 pb-2 flex flex-wrap gap-2">
        {isActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-tight border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50">
            <Flame size={12} className="animate-bounce" /> {t.activeSites}
          </div>
        )}

        {isSeniorVisited && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-tight border bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50">
            <CheckCircle2 size={12} /> {t.seniorVisitedSites}
          </div>
        )}

        {!isActive && !isSeniorVisited && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-tight border bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50">
            <History size={12} /> {t.pastSites}
          </div>
        )}

        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-tight border
          ${isHalal 
            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50' 
            : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/50'
          }`}>
          <GraduationCap size={12} /> {isHalal ? t.halalMajor : t.digitalMajor}
        </div>
      </div>
      
      {/* Content Section */}
      <div className="px-4 pb-4 flex-grow space-y-3">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight group-hover:text-[#630330] dark:group-hover:text-[#D4AF37] transition-colors mb-1">
            {getLocalized(site.name)}
          </h3>
          <div className="flex items-center text-slate-500 dark:text-slate-400 text-xs font-bold">
            <MapPin size={14} className="mr-1.5 text-rose-500 flex-shrink-0" />
            {getLocalized(site.location)}
          </div>
        </div>

        {/* Job Position - Highlighted */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
            <Briefcase size={10} /> Position Required
          </div>
          <div className="text-sm font-black text-[#630330] dark:text-[#D4AF37] uppercase leading-tight">
            {getLocalized(site.position) || '-'}
          </div>
        </div>
        
        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed line-clamp-3 font-medium italic opacity-80">
          "{getLocalized(site.description)}"
        </p>

        {/* Contact Information */}
        <div className="space-y-1.5 pt-1">
          {site.email && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Mail size={12} />
              </div>
              <span className="truncate">{site.email}</span>
            </div>
          )}
          {site.phone && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Phone size={12} />
              </div>
              <span className="truncate">{site.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Section */}
      <div className="p-4 pt-0">
        {safeContactLink ? (
          <a 
            href={safeContactLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-xs font-black uppercase hover:shadow-lg hover:-translate-y-0.5 transition-all
              ${isSeniorVisited 
                ? 'bg-gradient-to-r from-amber-500 to-amber-600' 
                : 'bg-gradient-to-r from-[#630330] to-[#8B1A4F] dark:from-[#7a0b3d] dark:to-[#630330]'
              }`}
          >
            {t.visitWebsite} <ExternalLink size={14} />
          </a>
        ) : (
          <div className="w-full text-center py-3 text-[11px] text-slate-300 dark:text-slate-600 font-black uppercase border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
            {lang === 'th' ? 'ไม่มีเว็บไซต์หลัก' : 'Official Website Unavailable'}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternshipCard;

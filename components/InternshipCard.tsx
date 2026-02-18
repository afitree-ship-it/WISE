
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

  const getMajorLabel = (m: Major) => {
    switch(m) {
      case Major.HALAL_FOOD: return t.halalMajor;
      case Major.DIGITAL_TECH: return t.digitalMajor;
      case Major.INFO_TECH: return t.infoTechMajor;
      case Major.DATA_SCIENCE: return t.dataScienceMajor;
      default: return '';
    }
  };

  const getMajorColorClass = (m: Major) => {
    switch(m) {
      case Major.HALAL_FOOD: return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
      case Major.DIGITAL_TECH: return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
      case Major.INFO_TECH: return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50';
      case Major.DATA_SCIENCE: return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      default: return '';
    }
  };

  const description = getLocalized(site.description);
  
  return (
    <div className={`group relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 border-2 transition-all duration-500 flex flex-col h-full shadow-md hover:shadow-2xl hover:-translate-y-2
      ${isActive 
        ? 'border-[#630330]/20 dark:border-[#D4AF37]/30 shadow-[#630330]/5' 
        : isSeniorVisited
        ? 'border-amber-400/40 dark:border-amber-600/40 shadow-amber-500/5'
        : 'border-slate-200 dark:border-slate-800'
      }`}>
      
      {isNew && isActive && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-[#D4AF37] to-[#f3d066] text-[#630330] py-1.5 px-4 rounded-bl-[1.5rem] font-black text-[10px] uppercase flex items-center gap-1 shadow-lg z-10">
          <Sparkles size={12} className="animate-pulse" /> NEW
        </div>
      )}

      {/* Header Tags Section */}
      <div className="p-5 pb-2 flex flex-wrap gap-2">
        {isActive && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border bg-[#630330] text-white border-[#630330] shadow-sm">
            <Flame size={12} className="animate-bounce" /> {t.activeSites}
          </div>
        )}

        {isSeniorVisited && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border bg-amber-500 text-white border-amber-500 shadow-sm">
            <CheckCircle2 size={12} /> {t.seniorVisitedSites}
          </div>
        )}

        {!isActive && !isSeniorVisited && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 shadow-sm">
            <History size={12} /> {t.pastSites}
          </div>
        )}

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${getMajorColorClass(site.major)}`}>
          <GraduationCap size={12} /> {getMajorLabel(site.major)}
        </div>
      </div>
      
      {/* Content Section */}
      <div className="px-6 pb-5 flex-grow space-y-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight group-hover:text-[#630330] dark:group-hover:text-[#D4AF37] transition-colors mb-1.5">
            {getLocalized(site.name)}
          </h3>
          <div className="flex items-center text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <MapPin size={14} className="mr-1.5 text-rose-500 flex-shrink-0" />
            {getLocalized(site.location)}
          </div>
        </div>

        {/* Job Position - Highlighted Box */}
        <div className={`p-4 rounded-2xl border-2 shadow-inner transition-colors duration-500
          ${isActive ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 group-hover:bg-white group-hover:border-[#630330]/10' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'}
        `}>
          <div className="text-[9px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1.5 tracking-widest">
            <Briefcase size={12} className="text-[#630330]/40 dark:text-[#D4AF37]/40" /> Position Required
          </div>
          <div className="text-[13px] font-black text-[#630330] dark:text-[#D4AF37] uppercase leading-tight">
            {getLocalized(site.position) || '-'}
          </div>
        </div>
        
        {description && (
          <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed line-clamp-3 font-medium italic opacity-70 group-hover:opacity-100 transition-opacity">
            "{description}"
          </p>
        )}

        {/* Contact Information */}
        <div className="space-y-2 pt-1">
          {site.email && (
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 group/link">
              <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/link:bg-[#630330]/5 group-hover/link:text-[#630330] transition-colors shadow-sm">
                <Mail size={14} />
              </div>
              <span className="truncate">{site.email}</span>
            </div>
          )}
          {site.phone && (
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 group/link">
              <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/link:bg-[#630330]/5 group-hover/link:text-[#630330] transition-colors shadow-sm">
                <Phone size={14} />
              </div>
              <span className="truncate">{site.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Section */}
      <div className="p-6 pt-0 mt-auto">
        {safeContactLink ? (
          <a 
            href={safeContactLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-[11px] font-black uppercase shadow-lg hover:shadow-[#630330]/20 hover:scale-[1.02] active:scale-95 transition-all
              ${isSeniorVisited 
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/20' 
                : 'bg-gradient-to-r from-[#630330] to-[#8B1A4F] dark:from-[#7a0b3d] dark:to-[#630330] shadow-[#630330]/20'
              }`}
          >
            {t.visitWebsite} <ExternalLink size={14} />
          </a>
        ) : (
          <div className="w-full text-center py-4 text-[10px] text-slate-300 dark:text-slate-600 font-black uppercase border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
            {lang === 'th' ? 'ไม่มีเว็บไซต์หลัก' : 'Official Website Unavailable'}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternshipCard;

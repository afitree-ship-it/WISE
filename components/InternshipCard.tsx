
import React from 'react';
import { InternshipSite, Language, Major, LocalizedString } from '../types';
import { TRANSLATIONS } from '../constants';
import { localize } from '../localize';
import { MapPin, Mail, Phone, ArrowUpRight, Sparkles, Briefcase, History, CheckCircle2, Circle } from 'lucide-react';

interface InternshipCardProps {
  site: InternshipSite;
  lang: Language;
}

const MAJOR_DOT: Record<Major, string> = {
  [Major.HALAL_FOOD]: 'bg-amber-500',
  [Major.DIGITAL_TECH]: 'bg-blue-500',
  [Major.INFO_TECH]: 'bg-violet-500',
  [Major.DATA_SCIENCE]: 'bg-teal-500',
};

const InternshipCard: React.FC<InternshipCardProps> = ({ site, lang }) => {
  const t = TRANSLATIONS[lang];
  const isActive = site.status === 'active';
  const isSeniorVisited = site.status === 'senior_visited';

  // A site is considered "new" if it was created in the last 48 hours
  const isNew = site.createdAt && (Date.now() - site.createdAt < 172800000);

  const getLocalized = (localized: LocalizedString) => localize(localized, lang);

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

  const description = getLocalized(site.description);
  const position = getLocalized(site.position);

  const statusChip = isActive
    ? { cls: 'bg-[#630330] text-white', icon: <Circle size={7} className="fill-emerald-400 text-emerald-400" />, label: t.activeSites }
    : isSeniorVisited
    ? { cls: 'bg-[#D4AF37]/15 text-[#8a6a14] dark:text-[#e8cf7a]', icon: <CheckCircle2 size={13} />, label: t.seniorVisitedSites }
    : { cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400', icon: <History size={13} />, label: t.pastSites };

  return (
    <div className={`group relative flex flex-col h-full rounded-3xl bg-white dark:bg-[#1c0c14] border transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-28px_rgba(99,3,48,0.55)]
      ${isActive ? 'border-[#efe4d2] dark:border-white/10 hover:border-[#D4AF37]/70' : 'border-[#efe4d2]/80 dark:border-white/5'}`}>

      <div className="p-5 pb-0 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium ${statusChip.cls}`}>
          {statusChip.icon} {statusChip.label}
        </span>
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] text-[#6e5560] dark:text-slate-300 bg-[#faf6ef] dark:bg-white/5">
          <span className={`w-1.5 h-1.5 rounded-full ${MAJOR_DOT[site.major] || 'bg-slate-400'}`} /> {getMajorLabel(site.major)}
        </span>
        {isNew && isActive && (
          <span className="ms-auto inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-gradient-to-b from-[#f0d78a] to-[#cfa73a] text-[#2A0114] text-[11px] font-semibold">
            <Sparkles size={12} /> NEW
          </span>
        )}
      </div>

      <div className="px-5 pt-4 pb-5 flex-grow">
        <h3 className="text-[18px] font-medium leading-snug text-[#2a0a17] dark:text-white group-hover:text-[#630330] dark:group-hover:text-[#e8cf7a] transition-colors">
          {getLocalized(site.name)}
        </h3>
        {getLocalized(site.location) && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-light text-[#7d6470] dark:text-slate-400">
            <MapPin size={14} className="shrink-0 text-[#D4AF37]" /> {getLocalized(site.location)}
          </p>
        )}

        {position && (
          <div className="mt-4 flex items-start gap-2.5 p-3 rounded-2xl bg-[#faf6ef] dark:bg-white/[0.04]">
            <Briefcase size={15} className="shrink-0 mt-0.5 text-[#630330]/60 dark:text-[#e8cf7a]/70" />
            <span className="text-[14px] text-[#630330] dark:text-[#e8cf7a] leading-snug">{position}</span>
          </div>
        )}

        {description && (
          <p className="mt-3 text-[13px] font-light leading-relaxed text-[#6e5560] dark:text-slate-400 line-clamp-3">{description}</p>
        )}

        {(site.email || site.phone) && (
          <div className="mt-4 space-y-1.5">
            {site.email && (
              <p className="flex items-center gap-2.5 text-[13px] text-[#6e5560] dark:text-slate-400 min-w-0 select-all">
                <Mail size={14} className="shrink-0 text-[#a8862a]" /><span className="truncate">{site.email}</span>
              </p>
            )}
            {site.phone && (
              <p className="flex items-center gap-2.5 text-[13px] text-[#6e5560] dark:text-slate-400 select-all">
                <Phone size={14} className="shrink-0 text-[#a8862a]" /><span className="truncate">{site.phone}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 mt-auto">
        {safeContactLink ? (
          <a
            href={safeContactLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-[#630330] hover:bg-[#7a0b3d] text-white text-[14px] font-medium transition active:scale-[0.98]"
          >
            {t.visitWebsite} <ArrowUpRight size={16} />
          </a>
        ) : (
          <div className="flex items-center justify-center h-11 rounded-2xl border border-dashed border-[#e5d6c0] dark:border-white/10 text-[13px] font-light text-[#a8949e]">
            {lang === 'th' ? 'ไม่มีเว็บไซต์หลัก' : 'Official website unavailable'}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternshipCard;

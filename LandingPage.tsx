
import React, { useState } from 'react';
import { 
  Language, 
  Major, 
  StudentStatusRecord, 
  ApplicationStatus,
  Translation
} from './types';
import LanguageSwitcher from './components/LanguageSwitcher';
import { MouseGlow, TechMeteorShower, ModernWaves } from './components/LandingBackground';
import { 
  X, 
  ChevronRight, 
  Timer, 
  LockKeyhole, 
  Fingerprint, 
  GraduationCap, 
  UserCircle, 
  AlertCircle, 
  Activity,
  CheckCircle2,
  Clock,
  ClipboardList,
  ShieldCheck,
  ShieldX,
  Search
} from 'lucide-react';

interface LandingPageProps {
  lang: Language;
  setLang: (lang: Language) => void;
  currentT: Translation;
  isRtl: boolean;
  onEnterDashboard: () => void;
  onAdminLogin: (password: string) => boolean;
  studentStatuses: StudentStatusRecord[];
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  lang, 
  setLang, 
  currentT, 
  isRtl, 
  onEnterDashboard, 
  onAdminLogin,
  studentStatuses
}) => {
  const [showStatusCheckModal, setShowStatusCheckModal] = useState(false);
  const [searchStudentId, setSearchStudentId] = useState('');
  const [foundStatus, setFoundStatus] = useState<StudentStatusRecord | null | undefined>(undefined);
  
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAdminLogin(adminPassInput);
    if (!success) {
      setLoginError(true);
      setAdminPassInput('');
    }
  };

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchStudentId.trim();
    if (!query) return;

    const found = studentStatuses.find(s => 
      String(s.studentId).trim() === query || 
      String(s.studentId).replace(/-/g, '').trim() === query.replace(/-/g, '').trim()
    );
    
    setFoundStatus(found || null);
  };

  const getStatusInfo = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING: 
        return { 
          color: 'bg-amber-500', 
          bg: 'bg-amber-50', 
          text: 'text-amber-700', 
          border: 'border-amber-200',
          icon: <Clock size={20} className="sm:w-6 sm:h-6" />,
          step: 1
        };
      case ApplicationStatus.PREPARING: 
        return { 
          color: 'bg-blue-500', 
          bg: 'bg-blue-50', 
          text: 'text-blue-700', 
          border: 'border-blue-200',
          icon: <ClipboardList size={20} className="sm:w-6 sm:h-6" />,
          step: 2
        };
      case ApplicationStatus.ACCEPTED: 
        return { 
          color: 'bg-emerald-500', 
          bg: 'bg-emerald-50', 
          text: 'text-emerald-700', 
          border: 'border-emerald-200',
          icon: <ShieldCheck size={20} className="sm:w-6 sm:h-6" />,
          step: 3
        };
      case ApplicationStatus.REJECTED: 
        return { 
          color: 'bg-rose-500', 
          bg: 'bg-rose-50', 
          text: 'text-rose-700', 
          border: 'border-rose-200',
          icon: <ShieldX size={20} className="sm:w-6 sm:h-6" />,
          step: 3
        };
      default: 
        return { 
          color: 'bg-slate-500', 
          bg: 'bg-slate-50', 
          text: 'text-slate-700', 
          border: 'border-slate-200',
          icon: <Activity size={20} className="sm:w-6 sm:h-6" />,
          step: 0
        };
    }
  };

  const getStatusLabel = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING: return currentT.statusPending;
      case ApplicationStatus.PREPARING: return currentT.statusPreparing;
      case ApplicationStatus.ACCEPTED: return currentT.statusAccepted;
      case ApplicationStatus.REJECTED: return currentT.statusRejected;
      default: return '';
    }
  };

  return (
    <div className={`fixed inset-0 w-full h-[100svh] flex flex-col items-center luxe-mangosteen-bg overflow-hidden desktop-zoom-70 touch-auto ${isRtl ? 'rtl' : ''}`}>
      <MouseGlow />
      <div className="bg-video-wrap">
        <video autoPlay loop muted playsInline>
          <source src="https://assets.mixkit.co/videos/preview/mixkit-business-people-working-in-a-busy-office-33824-large.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="video-overlay"></div>
      <div className="islamic-tech-watermark"></div>
      <TechMeteorShower />
      <ModernWaves />
      
      <div className="flex-grow flex flex-col items-center justify-center w-full max-w-4xl z-20 px-6 reveal-anim h-full pointer-events-none">
        <div className="flex flex-col items-center space-y-4 sm:space-y-6 pointer-events-auto">
           <div className="px-4 sm:px-8 py-2 sm:py-3 glass-polish rounded-full border border-white/10 shadow-2xl backdrop-blur-3xl transform hover:scale-105 transition-all">
             <div className="flex flex-row items-center gap-2 sm:gap-6 whitespace-nowrap overflow-hidden">
               <span className="text-[8px] sm:text-xs font-bold uppercase text-white tracking-normal opacity-90">
                 {lang === Language.TH ? "คณะวิทยาศาสตร์และเทคโนโลยี" : (lang === Language.AR ? "كلية العلوم والتكنولوجيا" : "Faculty of Science and Technology")}
               </span>
               <div className="w-1 h-1 sm:w-2 sm:h-2 bg-[#D4AF37] rounded-full opacity-40"></div>
               <span className="text-[8px] sm:text-xs font-bold uppercase text-[#D4AF37] tracking-normal">
                 {lang === Language.TH ? "มหาวิทยาลัยฟาฏอนี" : (lang === Language.AR ? "جامعة فطاني" : "Fatoni University")}
               </span>
             </div>
           </div>

           <div className="relative flex flex-col items-center group text-center max-w-full">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[100px] w-60 h-60 sm:w-80 sm:h-80 bg-[#D4AF37] rounded-full"></div>
              <h2 className="relative text-7xl sm:text-[10rem] md:text-[11rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-[#D4AF37] leading-tight transition-all duration-700 group-hover:scale-105 drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)] select-none">
                WISE
              </h2>
              <div className="relative flex flex-col items-center -mt-2 sm:-mt-8 space-y-1.5 px-4 w-full overflow-hidden">
                <div className="h-px w-20 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mb-1"></div>
                <span className="text-[#D4AF37] text-[10px] sm:text-xl md:text-2xl font-extrabold tracking-tight uppercase opacity-95 drop-shadow-lg leading-none whitespace-nowrap">
                  Work-Integrated  Science  Education  Unit
                </span>
                <span className="text-[#D4AF37] text-[8px] sm:text-base md:text-lg font-semibold opacity-90 drop-shadow-md leading-none whitespace-nowrap">
                  หน่วยจัดการศึกษาวิทยาศาสตร์บูรณาการกับการทำงาน
                </span>
                <div className="h-px w-14 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent mt-1"></div>
              </div>
           </div>
        </div>

        <div className="mt-6 sm:mt-10 space-y-6 sm:space-y-10 text-center w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 flex flex-col items-center pointer-events-auto">
          <h1 className="text-center text-[11px] min-[360px]:text-[13px] min-[400px]:text-[15px] min-[480px]:text-base sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight drop-shadow-2xl px-2 opacity-90 tracking-tight whitespace-nowrap mx-auto">
            {currentT.landingHeading}
          </h1>

          <div className="flex flex-col items-center w-full gap-6 sm:gap-10">
            <div className="transform transition-all duration-500 hover:scale-105 scale-90 sm:scale-100">
              <LanguageSwitcher currentLang={lang} onLanguageChange={setLang} />
            </div>
            
            <div className="flex flex-col items-center w-full">
              <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 px-2">
                <button 
                  onClick={onEnterDashboard}
                  className="group relative px-5 sm:px-14 py-4 sm:py-5 bg-white text-[#630330] rounded-full font-black uppercase text-[12px] min-[400px]:text-[13px] sm:text-xl transition-all hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-full border-2 border-white/0 group-hover:border-white/50 group-hover:animate-ring-expand pointer-events-none"></div>
                  <span className="relative z-10 flex items-center gap-1.5 sm:gap-4 tracking-tight whitespace-nowrap">
                    {currentT.startNow} 
                    <div className="flex items-center justify-center w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-[#630330]/5 group-hover:bg-[#630330] group-hover:text-white transition-all duration-500">
                      <ChevronRight size={14} className={`sm:w-[18px] sm:h-[18px] ${isRtl ? 'rotate-180' : ''}`} />
                    </div>
                  </span>
                </button>

                <button 
                  onClick={() => {
                    setSearchStudentId('');
                    setFoundStatus(undefined);
                    setShowStatusCheckModal(true);
                  }}
                  className="group relative px-4 sm:px-8 py-4 sm:py-5 bg-[#D4AF37] hover:bg-[#b8952c] text-[#2A0114] rounded-full font-bold uppercase text-[10px] sm:text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
                >
                  <span className="flex items-center gap-2 tracking-tight whitespace-nowrap">
                    <Timer size={14} className="sm:w-[16px] sm:h-[16px] group-hover:rotate-12 transition-transform" />
                    {currentT.checkStatus}
                  </span>
                </button>
              </div>

              <button 
                onClick={() => {
                  setLoginError(false);
                  setShowAdminLogin(true);
                }}
                className="flex items-center gap-2 mt-8 opacity-30 hover:opacity-100 transition-all duration-500 group touch-auto"
                title="Staff Access"
              >
                <LockKeyhole size={12} className="text-[#D4AF37] group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase text-[#D4AF37] tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">Staff Access</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Status Check Modal */}
      {showStatusCheckModal && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl reveal-anim touch-auto">
          <div className="w-full max-w-[560px] bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-3xl relative overflow-y-auto max-h-[92svh]">
             <button onClick={() => setShowStatusCheckModal(false)} className="absolute top-4 right-4 sm:top-8 sm:right-8 p-2 sm:p-3 rounded-full hover:bg-slate-100 transition-colors z-10">
               <X size={20} className="text-slate-400 sm:w-6 sm:h-6" />
             </button>
             
             <div className="flex flex-col items-center mb-6 sm:mb-10">
               <div className="p-3 sm:p-5 bg-[#D4AF37]/10 rounded-2xl sm:rounded-[2rem] mb-4 sm:mb-6">
                 <Timer size={32} className="text-[#D4AF37] sm:w-[40px] sm:h-[40px]" />
               </div>
               <h3 className="text-lg sm:text-2xl font-black text-[#2A0114] uppercase text-center">{currentT.statusTitle}</h3>
               <p className="text-[10px] sm:text-sm text-slate-400 font-bold uppercase mt-1 sm:mt-2 tracking-wide text-center">{currentT.statusCheckPrompt}</p>
             </div>

             <form onSubmit={handleCheckStatus} className="space-y-4 sm:space-y-6">
               <div className="relative group">
                 <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors">
                   <UserCircle size={24} className="sm:w-[28px] sm:h-[28px]" />
                 </div>
                 <input 
                  type="text" 
                  placeholder={currentT.studentIdPlaceholder}
                  value={searchStudentId}
                  onChange={e => setSearchStudentId(e.target.value)}
                  className="w-full pl-12 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-6 bg-slate-50 border-2 border-transparent focus:border-[#D4AF37] focus:bg-white rounded-xl sm:rounded-2xl outline-none font-bold text-lg sm:text-2xl transition-all"
                  autoFocus
                 />
               </div>
               <button type="submit" className="w-full bg-[#2A0114] text-white py-4 sm:py-6 rounded-xl sm:rounded-2xl font-black uppercase text-sm sm:text-base shadow-xl shadow-[#2A0114]/20 transform active:scale-[0.98] transition-all hover:bg-[#43021f] flex items-center justify-center gap-2">
                 <Search size={18} /> {currentT.searchButton}
               </button>
             </form>

             <div className="mt-6 sm:mt-10 min-h-[200px]">
               {foundStatus === undefined ? (
                 <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-slate-300 animate-pulse">
                    <Activity size={32} className="sm:w-[48px] sm:h-[48px] opacity-20 mb-4" />
                    <p className="text-[10px] sm:text-sm font-black uppercase tracking-widest">Waiting for ID...</p>
                 </div>
               ) : foundStatus === null ? (
                 <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-rose-500 gap-3 border-2 border-dashed border-rose-100 rounded-2xl sm:rounded-[2.5rem] bg-rose-50/30">
                   <AlertCircle size={32} className="sm:w-[40px] sm:h-[40px]" />
                   <p className="text-sm sm:text-lg font-black uppercase text-center px-4 leading-tight">{currentT.noStatusFound}</p>
                 </div>
               ) : (() => {
                 const info = getStatusInfo(foundStatus.status);
                 return (
                   <div className={`rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 border-2 ${info.border} ${info.bg} reveal-anim space-y-6 sm:space-y-8 shadow-inner overflow-hidden`}>
                     <div className="flex items-start justify-between gap-2">
                       <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                         <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-[2rem] bg-white flex items-center justify-center text-[#2A0114] shadow-md border border-slate-100 flex-shrink-0">
                           <GraduationCap size={24} className="sm:w-[40px] sm:h-[40px]" />
                         </div>
                         <div className="min-w-0">
                           <p className="text-[8px] sm:text-xs font-black text-slate-400 uppercase leading-none mb-1 sm:mb-2 tracking-widest">{currentT.studentLabel}</p>
                           <h4 className="font-black text-slate-900 leading-tight text-base sm:text-2xl line-clamp-2 mb-1 sm:mb-2">{foundStatus.name}</h4>
                           <div className="flex flex-col gap-2">
                             <span className="inline-flex w-fit text-[9px] sm:text-sm font-black text-[#D4AF37] uppercase bg-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm border border-[#D4AF37]/20 whitespace-nowrap">ID: {foundStatus.studentId}</span>
                             <div className={`text-[8px] sm:text-[11px] font-black uppercase px-3 py-1.5 rounded-xl border ${info.border} ${info.bg} ${info.text} leading-tight`}>
                               {foundStatus.major === Major.HALAL_FOOD ? currentT.halalMajor : currentT.digitalMajor}
                             </div>
                           </div>
                         </div>
                       </div>
                       <div className={`p-2.5 sm:p-4 rounded-full ${info.color} text-white shadow-lg animate-bounce flex-shrink-0`}>
                         {info.icon}
                       </div>
                     </div>
                     
                     <div className="space-y-4 sm:space-y-6">
                        <div className="flex items-end justify-between px-1">
                           <div className="flex flex-col">
                             <span className="text-[7px] sm:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 sm:mb-1">Current Process</span>
                             <span className={`text-sm sm:text-2xl font-black uppercase ${info.text} leading-tight`}>{getStatusLabel(foundStatus.status)}</span>
                           </div>
                        </div>

                        {/* Progress Tracker */}
                        <div className="flex items-center justify-between relative px-2 pt-2">
                           <div className="absolute top-1/2 left-4 right-4 h-1 sm:h-1.5 bg-slate-200 -translate-y-1/2 rounded-full overflow-hidden">
                              <div 
                                className={`absolute top-0 left-0 h-full transition-all duration-[2s] ease-out ${foundStatus.status === ApplicationStatus.REJECTED ? 'bg-rose-500' : info.color}`}
                                style={{ 
                                  width: info.step === 1 ? '15%' : info.step === 2 ? '50%' : '100%' 
                                }}
                              ></div>
                           </div>
                           
                           {[1, 2, 3].map((step) => (
                             <div key={step} className={`relative z-10 w-5 h-5 sm:w-8 sm:h-8 rounded-full border-2 sm:border-4 flex items-center justify-center transition-all duration-1000 delay-${step * 300}
                               ${info.step >= step ? `${info.color} border-white shadow-md scale-110 sm:scale-125` : 'bg-white border-slate-200 scale-100'}`}>
                               {info.step > step ? <CheckCircle2 size={10} className="text-white sm:w-[12px] sm:h-[12px]" /> : <div className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full ${info.step >= step ? 'bg-white' : 'bg-slate-300'}`} />}
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-[8px] sm:text-xs text-slate-400 font-black uppercase justify-between pt-4 sm:pt-6 border-t border-slate-200/50">
                       <div className="flex items-center gap-2">
                         <Activity size={12} className={info.text} />
                         {currentT.lastUpdated}: {new Date(foundStatus.lastUpdated).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                       </div>
                       {foundStatus.remarks && <span className="text-rose-400 break-words line-clamp-1">NOTE: {foundStatus.remarks}</span>}
                     </div>
                   </div>
                 );
               })()}
             </div>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl reveal-anim overflow-y-auto touch-auto">
          <div className="w-full max-w-[420px] my-auto flex flex-col items-center relative p-6 sm:p-14 rounded-[2rem] sm:rounded-[3rem] border border-white/10 bg-white/5 shadow-3xl">
            <button onClick={() => setShowAdminLogin(false)} className="absolute top-4 right-4 sm:top-8 sm:right-8 p-2 sm:p-3 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
            <div className="inline-flex p-4 sm:p-7 rounded-2xl sm:rounded-[2rem] bg-[#D4AF37]/10 text-[#D4AF37] mb-4 sm:mb-8 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
              <Fingerprint size={40} className="animate-pulse sm:w-[48px] sm:h-[48px]" />
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white uppercase mb-4 text-center">Staff Access</h3>
            <form onSubmit={handleAdminSubmit} className="w-full space-y-4 sm:space-y-8">
              <div className="relative">
                <input 
                  type="password" 
                  autoFocus 
                  placeholder="••••••" 
                  value={adminPassInput} 
                  onChange={e => {
                    setAdminPassInput(e.target.value);
                    if (loginError) setLoginError(false);
                  }} 
                  className={`w-full px-4 py-4 sm:py-7 rounded-xl sm:rounded-2xl bg-white/5 border-2 outline-none font-bold text-center text-4xl sm:text-6xl transition-all
                    ${loginError ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-white/10 focus:border-[#D4AF37] text-[#D4AF37]'}`}
                />
              </div>
              <button type="submit" className="w-full bg-[#630330] hover:bg-[#7a0b3d] text-white py-4 sm:py-7 rounded-xl sm:rounded-2xl font-black uppercase text-xs sm:text-base shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all">
                {lang === Language.TH ? 'ยืนยัน' : 'Verify'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;

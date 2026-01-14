
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
  Activity 
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

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const found = studentStatuses.find(s => s.studentId === searchStudentId);
    setFoundStatus(found || null);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAdminLogin(adminPassInput);
    if (success) {
      setShowAdminLogin(false);
    } else {
      setLoginError(true);
      setAdminPassInput('');
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ApplicationStatus.PREPARING: return 'bg-blue-100 text-blue-700 border-blue-200';
      case ApplicationStatus.ACCEPTED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ApplicationStatus.REJECTED: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
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
    <div className={`fixed inset-0 w-full h-[100svh] flex flex-col items-center luxe-mangosteen-bg overflow-hidden desktop-zoom-70 touch-none ${isRtl ? 'rtl' : ''}`}>
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
      
      <div className="flex-grow flex flex-col items-center justify-center w-full max-w-4xl z-20 px-6 reveal-anim h-full">
        <div className="flex flex-col items-center space-y-4 sm:space-y-6">
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

        <div className="mt-6 sm:mt-10 space-y-6 sm:space-y-10 text-center w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 flex flex-col items-center">
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
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-xl reveal-anim touch-auto">
          <div className="w-full max-w-[520px] bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-3xl relative overflow-hidden">
             <button onClick={() => setShowStatusCheckModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors z-10">
               <X size={20} className="text-slate-400" />
             </button>
             <div className="flex flex-col items-center mb-8">
               <div className="p-4 bg-[#D4AF37]/10 rounded-2xl mb-4">
                 <Timer size={32} className="text-[#D4AF37]" />
               </div>
               <h3 className="text-xl font-black text-[#2A0114] uppercase text-center">{currentT.statusTitle}</h3>
               <p className="text-[12px] text-slate-400 font-bold uppercase mt-1">{currentT.statusCheckPrompt}</p>
             </div>

             <form onSubmit={handleCheckStatus} className="space-y-5">
               <div className="relative group">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors">
                   <UserCircle size={24} />
                 </div>
                 <input 
                  type="text" 
                  placeholder={currentT.studentIdPlaceholder}
                  value={searchStudentId}
                  onChange={e => setSearchStudentId(e.target.value)}
                  className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:border-[#D4AF37] focus:bg-white rounded-2xl outline-none font-bold text-lg transition-all"
                 />
               </div>
               <button type="submit" className="w-full bg-[#2A0114] text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl shadow-[#2A0114]/20 transform active:scale-[0.98] transition-all">
                 {currentT.searchButton}
               </button>
             </form>

             <div className="mt-8 min-h-[160px]">
               {foundStatus === undefined ? null : foundStatus === null ? (
                 <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-2xl">
                   <AlertCircle size={24} />
                   <p className="text-[12px] font-bold uppercase tracking-tight">{currentT.noStatusFound}</p>
                 </div>
               ) : (
                 <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 reveal-anim space-y-6">
                   <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#2A0114] shadow-sm border border-slate-100">
                       <GraduationCap size={28} />
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1.5">{currentT.studentLabel}</p>
                       <h4 className="font-bold text-slate-900 leading-tight text-lg">{foundStatus.name}</h4>
                       <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-tight">{foundStatus.major === Major.HALAL_FOOD ? currentT.halalMajor : currentT.digitalMajor}</p>
                     </div>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 px-1">
                        <span>Timeline Progress</span>
                        <span className={`${foundStatus.status === ApplicationStatus.ACCEPTED ? 'text-emerald-500' : 'text-amber-500'}`}>{getStatusLabel(foundStatus.status)}</span>
                      </div>
                      <div className="relative h-1 bg-slate-200 rounded-full overflow-hidden">
                         <div 
                           className={`absolute top-0 left-0 h-full transition-all duration-1000 ${foundStatus.status === ApplicationStatus.REJECTED ? 'bg-rose-500' : 'bg-[#D4AF37]'}`}
                           style={{ 
                             width: foundStatus.status === ApplicationStatus.PENDING ? '25%' : 
                                    foundStatus.status === ApplicationStatus.PREPARING ? '50%' : '100%' 
                           }}
                         ></div>
                      </div>
                   </div>

                   <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase justify-end pt-2 border-t border-slate-100/50">
                     <Activity size={12} /> {currentT.lastUpdated}: {new Date(foundStatus.lastUpdated).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                   </div>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl reveal-anim overflow-y-auto touch-auto">
          <div className="w-full max-w-[420px] my-auto flex flex-col items-center relative p-8 sm:p-14 rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 bg-white/5 shadow-3xl">
            <button onClick={() => setShowAdminLogin(false)} className="absolute top-6 right-6 sm:top-8 sm:right-8 p-3 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <X size={24} />
            </button>
            <div className="inline-flex p-6 sm:p-7 rounded-[1.5rem] sm:rounded-[2rem] bg-[#D4AF37]/10 text-[#D4AF37] mb-6 sm:mb-8 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
              <Fingerprint size={48} className="animate-pulse" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white uppercase mb-1 text-center">Staff Access</h3>
            <form onSubmit={handleAdminSubmit} className="w-full space-y-6 sm:space-y-8">
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
                  className={`w-full px-4 py-6 sm:py-7 rounded-2xl bg-white/5 border-2 outline-none font-bold text-center text-5xl sm:text-6xl transition-all
                    ${loginError ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-white/10 focus:border-[#D4AF37] text-[#D4AF37]'}`}
                />
              </div>
              <button type="submit" className="w-full bg-[#630330] hover:bg-[#7a0b3d] text-white py-5 sm:py-7 rounded-2xl font-black uppercase text-sm sm:text-base shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all">ยืนยัน</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;

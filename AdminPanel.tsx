
import React, { useState, useMemo } from 'react';
import { 
  Language, 
  Major, 
  InternshipSite, 
  DocumentForm, 
  FormCategory, 
  ScheduleEvent,
  LocalizedString,
  ApplicationStatus,
  StudentStatusRecord,
  Translation
} from './types';
import { TRANSLATIONS } from './constants';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Plus, 
  Pencil, 
  Search, 
  Cpu, 
  Salad, 
  Trash,
  RefreshCw,
  Building2,
  X,
  FileText,
  CalendarDays,
  Download,
  Filter,
  Clock,
  ClipboardList,
  ShieldCheck,
  ShieldX,
  Check,
  Users,
  Timer
} from 'lucide-react';

interface AdminPanelProps {
  sites: InternshipSite[];
  setSites: (sites: InternshipSite[]) => void;
  studentStatuses: StudentStatusRecord[];
  setStudentStatuses: (statuses: StudentStatusRecord[]) => void;
  schedules: ScheduleEvent[];
  setSchedules: (schedules: ScheduleEvent[]) => void;
  forms: DocumentForm[];
  setForms: (forms: DocumentForm[]) => void;
  currentT: Translation;
  lang: Language;
  fetchFromSheets: () => Promise<void>;
  syncToSheets: (type: string, data: any[]) => Promise<void>;
  isLoading: boolean;
  isSyncing: boolean;
  lastSync: number | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  sites,
  setSites,
  studentStatuses,
  setStudentStatuses,
  schedules,
  setSchedules,
  forms,
  setForms,
  currentT,
  lang,
  fetchFromSheets,
  syncToSheets,
  isLoading,
  isSyncing,
}) => {
  const [adminActiveTab, setAdminActiveTab] = useState<'students' | 'sites' | 'schedule' | 'forms'>('students');
  
  // Local UI States
  const [adminStudentSearch, setAdminStudentSearch] = useState('');
  const [adminStudentStatusFilter, setAdminStudentStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [adminSiteSearch, setAdminSiteSearch] = useState('');
  const [adminSiteMajorFilter, setAdminSiteMajorFilter] = useState<Major | 'all'>('all');
  const [isTranslating, setIsTranslating] = useState(false);

  // Modal States
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingSite, setEditingSite] = useState<InternshipSite | null>(null);
  const [showAdminStatusModal, setShowAdminStatusModal] = useState(false);
  const [editingStatusRecord, setEditingStatusRecord] = useState<StudentStatusRecord | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEvent | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState<DocumentForm | null>(null);

  const getLocalized = (localized: LocalizedString) => {
    return localized.th || localized.en || '';
  };

  const performBatchTranslation = async (items: { key: string, value: string, isDate?: boolean }[]) => {
    if (items.length === 0) return {};
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const prompt = `Translate to EN, AR, MS: ${items.map(i => `${i.key}:"${i.value}"${i.isDate ? '(date-standard)' : ''}`).join('|')}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are a professional translator for an educational portal. For 'date-standard' items: In 'th' (Thai), MUST use Buddhist Era year (BE = current year + 543). In 'en', 'ar', 'ms', MUST use Gregorian year (AD). Return JSON with th, en, ar, ms keys.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: items.reduce((acc, curr) => ({
              ...acc,
              [curr.key]: {
                type: Type.OBJECT,
                properties: { th: { type: Type.STRING }, en: { type: Type.STRING }, ar: { type: Type.STRING }, ms: { type: Type.STRING } },
                required: ["th", "en", "ar", "ms"]
              }
            }), {})
          },
        },
      });
      return JSON.parse(response.text ?? "{}");
    } catch (error) {
      return items.reduce((acc, curr) => ({ ...acc, [curr.key]: { th: curr.value, en: curr.value, ar: curr.value, ms: curr.value } }), {});
    }
  };

  const filteredAdminStudents = useMemo(() => {
    let result = studentStatuses;
    if (adminStudentSearch) {
      const search = adminStudentSearch.toLowerCase();
      result = result.filter(s => 
        (s.name || "").toLowerCase().includes(search) || 
        String(s.studentId || "").toLowerCase().includes(search)
      );
    }
    if (adminStudentStatusFilter !== 'all') {
      result = result.filter(s => s.status === adminStudentStatusFilter);
    }
    return result;
  }, [studentStatuses, adminStudentSearch, adminStudentStatusFilter]);

  const filteredAdminSites = useMemo(() => {
    let result = sites;
    if (adminSiteSearch) {
      const search = adminSiteSearch.toLowerCase();
      result = result.filter(s => 
        getLocalized(s.name).toLowerCase().includes(search) || 
        getLocalized(s.location).toLowerCase().includes(search) ||
        getLocalized(s.position).toLowerCase().includes(search)
      );
    }
    if (adminSiteMajorFilter !== 'all') {
      result = result.filter(s => s.major === adminSiteMajorFilter);
    }
    return result;
  }, [sites, adminSiteSearch, adminSiteMajorFilter]);

  const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thEvent = formData.get('event_th') as string;
    const rawStart = formData.get('start_th') as string;
    const rawEnd = formData.get('end_th') as string;
    setIsTranslating(true);
    const results = await performBatchTranslation([
      { key: 'event', value: thEvent },
      { key: 'start', value: rawStart, isDate: true },
      { key: 'end', value: rawEnd, isDate: true }
    ]);
    setIsTranslating(false);
    const newEvent: ScheduleEvent = {
      id: editingSchedule?.id || Date.now().toString(),
      event: results['event'] || { th: thEvent, en: thEvent, ar: thEvent, ms: thEvent },
      startDate: results['start'] || { th: rawStart, en: rawStart, ar: rawStart, ms: rawStart },
      endDate: results['end'] || { th: rawEnd, en: rawEnd, ar: rawEnd, ms: rawEnd },
      rawStartDate: rawStart,
      rawEndDate: rawEnd,
      status: 'upcoming',
      createdAt: editingSchedule?.createdAt || Date.now()
    };
    let updated = editingSchedule ? schedules.map(s => s.id === editingSchedule.id ? newEvent : s) : [newEvent, ...schedules];
    setSchedules(updated);
    syncToSheets('schedules', updated);
    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const handleSaveForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thTitle = formData.get('title') as string;
    const category = formData.get('category') as FormCategory;
    const url = formData.get('url') as string;
    setIsTranslating(true);
    const results = await performBatchTranslation([{ key: 'title', value: thTitle }]);
    setIsTranslating(false);
    const newForm: DocumentForm = {
      id: editingForm?.id || Date.now().toString(),
      title: results['title'] || { th: thTitle, en: thTitle, ar: thTitle, ms: thTitle },
      category,
      url: url.startsWith('http') ? url : `https://${url}`
    };
    let updated = editingForm ? forms.map(f => f.id === editingForm.id ? newForm : f) : [newForm, ...forms];
    setForms(updated);
    syncToSheets('forms', updated);
    setShowFormModal(false);
    setEditingForm(null);
  };

  const handleSaveSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thName = formData.get('name_th') as string;
    const thLoc = formData.get('loc_th') as string;
    const thDesc = formData.get('desc_th') as string;
    const thPos = formData.get('pos_th') as string;
    setIsTranslating(true);
    const results = await performBatchTranslation([
      { key: 'name', value: thName }, { key: 'loc', value: thLoc },
      { key: 'desc', value: thDesc }, { key: 'pos', value: thPos }
    ]);
    setIsTranslating(false);
    const newSite: InternshipSite = {
      id: editingSite?.id || Date.now().toString(),
      name: results['name'],
      location: results['loc'],
      description: results['desc'],
      position: results['pos'],
      status: formData.get('status') as any,
      major: formData.get('major') as Major, 
      contactLink: formData.get('contact_link') as string || undefined,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      createdAt: editingSite?.createdAt || Date.now()
    };
    let updated = editingSite ? sites.map(s => s.id === editingSite.id ? newSite : s) : [newSite, ...sites];
    setSites(updated);
    syncToSheets('sites', updated);
    setShowSiteModal(false);
    setEditingSite(null);
  };

  const handleSaveStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newRecord: StudentStatusRecord = {
      id: editingStatusRecord?.id || Date.now().toString(),
      studentId: formData.get('student_id') as string,
      name: formData.get('student_name') as string,
      status: formData.get('status') as ApplicationStatus,
      major: formData.get('major') as Major,
      lastUpdated: Date.now()
    };
    let updated = editingStatusRecord ? studentStatuses.map(s => s.id === editingStatusRecord.id ? newRecord : s) : [newRecord, ...studentStatuses];
    setStudentStatuses(updated);
    syncToSheets('studentStatuses', updated);
    setShowAdminStatusModal(false);
    setEditingStatusRecord(null);
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

  const adminMenu = [
    { id: 'students', label: 'ติดตามสถานะ', icon: <Users size={20} />, color: 'amber' },
    { id: 'sites', label: 'สถานประกอบการ', icon: <Building2 size={20} />, color: 'rose' },
    { id: 'schedule', label: 'กำหนดการสำคัญ', icon: <CalendarDays size={20} />, color: 'emerald' },
    { id: 'forms', label: 'จัดการเอกสาร', icon: <FileText size={20} />, color: 'indigo' },
  ];

  return (
    <>
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 lg:w-72 flex-shrink-0 flex flex-col h-fit md:h-full overflow-y-auto hide-scrollbar z-[60]">
         <div className="flex flex-row md:flex-col gap-2 p-1.5 md:p-0 bg-[#e4d4bc]/80 dark:bg-slate-950/80 backdrop-blur-md md:bg-transparent rounded-2xl">
            {adminMenu.map(item => (
              <button
                key={item.id}
                onClick={() => setAdminActiveTab(item.id as any)}
                className={`
                  flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black uppercase text-[11px] min-[400px]:text-sm transition-all whitespace-nowrap md:w-full
                  ${adminActiveTab === item.id 
                    ? `bg-[#630330] text-white shadow-lg shadow-[#630330]/20` 
                    : 'bg-white/90 dark:bg-slate-900 text-slate-600 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800'
                  }
                `}
              >
                <span className={`${adminActiveTab === item.id ? 'text-[#D4AF37]' : ''}`}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="hidden md:block mt-4 p-5 rounded-2xl bg-gradient-to-br from-[#2A0114] to-[#630330] text-white shadow-xl shadow-[#2A0114]/20 border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] mb-1">WISE Portal</p>
              <h4 className="font-bold text-xs leading-tight opacity-90">ระบบจัดการหลังบ้าน <br /> คณะวิทยาศาสตร์ฯ มฟน.</h4>
              <button onClick={fetchFromSheets} disabled={isLoading} className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase text-[#D4AF37] hover:text-white transition-all">
                <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} /> รีเฟรชข้อมูล
              </button>
            </div>
         </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow reveal-anim relative h-full flex flex-col overflow-hidden">
        <div className="bg-white/95 dark:bg-slate-900 rounded-[2.25rem] border border-slate-200/50 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full">
          <header className="flex-shrink-0 z-[50] px-6 sm:px-8 py-4 sm:py-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <div className={`p-2.5 sm:p-3 rounded-2xl bg-${adminActiveTab === 'students' ? 'amber' : adminActiveTab === 'sites' ? 'rose' : adminActiveTab === 'schedule' ? 'emerald' : 'indigo'}-50 dark:bg-slate-800 text-${adminActiveTab === 'students' ? 'amber' : adminActiveTab === 'sites' ? 'rose' : adminActiveTab === 'schedule' ? 'emerald' : 'indigo'}-600 shadow-inner`}>
                  {React.cloneElement(adminMenu.find(m => m.id === adminActiveTab)?.icon as React.ReactElement<any>, { size: 24 })}
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black uppercase text-slate-900 dark:text-white leading-none tracking-tight">{adminMenu.find(m => m.id === adminActiveTab)?.label}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Management Suite</p>
                </div>
             </div>
             <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-64 group">
                   <Search size={22} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors" />
                   <input 
                     type="text" 
                     placeholder="ค้นหา..." 
                     value={adminActiveTab === 'students' ? adminStudentSearch : adminSiteSearch}
                     onChange={(e) => adminActiveTab === 'students' ? setAdminStudentSearch(e.target.value) : setAdminSiteSearch(e.target.value)}
                     className="w-full pl-12 pr-5 py-3 bg-slate-50/50 dark:bg-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-700 rounded-xl outline-none font-bold text-sm sm:text-base focus:ring-2 focus:ring-[#D4AF37]/20 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-inner"
                   />
                </div>
                <button 
                  onClick={() => {
                    if(adminActiveTab === 'students') { setEditingStatusRecord(null); setShowAdminStatusModal(true); }
                    else if(adminActiveTab === 'sites') { setEditingSite(null); setShowSiteModal(true); }
                    else if(adminActiveTab === 'schedule') { setEditingSchedule(null); setShowScheduleModal(true); }
                    else { setEditingForm(null); setShowFormModal(true); }
                  }}
                  className={`w-full sm:w-auto px-8 py-3 rounded-xl bg-${adminMenu.find(m => m.id === adminActiveTab)?.color}-600 text-white font-black uppercase text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg shadow-${adminMenu.find(m => m.id === adminActiveTab)?.color}-600/20 transition-all hover:scale-105 active:scale-95`}
                >
                  <Plus size={22} /> เพิ่มข้อมูล
                </button>
             </div>
          </header>

          <div className="flex-grow overflow-y-auto relative custom-scrollbar">
             <div className="sticky top-0 left-0 right-0 h-8 bg-gradient-to-b from-white dark:from-slate-900 to-transparent z-[40] pointer-events-none opacity-80" />
             <div className="px-6 sm:px-8 pb-12">
              {adminActiveTab === 'students' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex flex-wrap items-center gap-2 mb-2 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700 relative z-10">
                    <button onClick={() => setAdminStudentStatusFilter('all')} className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminStudentStatusFilter === 'all' ? 'bg-[#630330] text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>ทั้งหมด ({studentStatuses.length})</button>
                    {[
                      { id: ApplicationStatus.PENDING, label: currentT.statusPending, color: 'amber' },
                      { id: ApplicationStatus.PREPARING, label: currentT.statusPreparing, color: 'blue' },
                      { id: ApplicationStatus.ACCEPTED, label: currentT.statusAccepted, color: 'emerald' },
                      { id: ApplicationStatus.REJECTED, label: currentT.statusRejected, color: 'rose' }
                    ].map(st => (
                      <button key={st.id} onClick={() => setAdminStudentStatusFilter(st.id)} className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminStudentStatusFilter === st.id ? `bg-${st.color}-500 text-white shadow-md` : `text-slate-500 hover:bg-${st.color}-50 dark:hover:bg-${st.color}-950/20`}`}><div className={`w-2 h-2 rounded-full ${adminStudentStatusFilter === st.id ? 'bg-white' : `bg-${st.color}-400`}`} />{st.label} ({studentStatuses.filter(s => s.status === st.id).length})</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredAdminStudents.map(record => (
                      <div key={record.id} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between group hover:border-amber-200 hover:shadow-xl transition-all shadow-sm">
                        <div className="space-y-1 overflow-hidden pr-2">
                          <h4 className="font-black text-slate-900 dark:text-white text-base truncate">{record.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">ID: {record.studentId}</p>
                          <div className={`mt-2 px-3 py-1 rounded-full text-[9px] font-black uppercase border inline-block ${getStatusColor(record.status)}`}>{getStatusLabel(record.status)}</div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => { setEditingStatusRecord(record); setShowAdminStatusModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-amber-500 rounded-xl transition-all"><Pencil size={18} /></button>
                          <button onClick={() => { if(confirm('ลบข้อมูลนี้?')) { const updated = studentStatuses.filter(s => s.id !== record.id); setStudentStatuses(updated); syncToSheets('studentStatuses', updated); } }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {adminActiveTab === 'sites' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex flex-wrap items-center gap-2 mb-2 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700 relative z-10">
                    <button onClick={() => setAdminSiteMajorFilter('all')} className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === 'all' ? 'bg-[#630330] text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>ทุกสาขา ({sites.length})</button>
                    <button onClick={() => setAdminSiteMajorFilter(Major.HALAL_FOOD)} className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === Major.HALAL_FOOD ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'}`}><Salad size={16} /> {currentT.halalMajor}</button>
                    <button onClick={() => setAdminSiteMajorFilter(Major.DIGITAL_TECH)} className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === Major.DIGITAL_TECH ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-950/20'}`}><Cpu size={16} /> {currentT.digitalMajor}</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredAdminSites.map(site => (
                      <div key={site.id} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between group hover:border-rose-200 hover:shadow-xl transition-all shadow-sm">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-white ${site.major === Major.HALAL_FOOD ? 'bg-amber-500' : 'bg-blue-600'} shadow-lg`}>{site.major === Major.HALAL_FOOD ? <Salad size={24} /> : <Cpu size={24} />}</div>
                          <div className="overflow-hidden space-y-0.5"><h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">{getLocalized(site.name)}</h4><p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{getLocalized(site.location)}</p></div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => { setEditingSite(site); setShowSiteModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Pencil size={18} /></button>
                          <button onClick={() => { if(confirm('ลบหน่วยงานนี้?')) { const updated = sites.filter(s => s.id !== site.id); setSites(updated); syncToSheets('sites', updated); } }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {adminActiveTab === 'schedule' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {schedules.map(item => (
                    <div key={item.id} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col gap-4 relative group hover:border-emerald-200 hover:shadow-xl transition-all shadow-sm">
                      <div className="absolute top-4 right-4 flex gap-1">
                        <button onClick={() => { setEditingSchedule(item); setShowScheduleModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-emerald-500 rounded-xl transition-all"><Pencil size={18} /></button>
                        <button onClick={() => { if(confirm('ลบกำหนดการ?')) { const updated = schedules.filter(s => s.id !== item.id); setSchedules(updated); syncToSheets('schedules', updated); } }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white text-base sm:text-lg pr-12 leading-tight">{getLocalized(item.event)}</h4>
                      <div className="flex flex-col text-[11px] font-black uppercase text-slate-400 gap-1.5 mt-auto">
                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div> START: {getLocalized(item.startDate)}</span>
                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div> END: {getLocalized(item.endDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {adminActiveTab === 'forms' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {forms.map(form => (
                    <div key={form.id} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between group hover:border-indigo-200 hover:shadow-xl transition-all shadow-sm">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl shadow-inner"><Download size={22} /></div>
                        <div className="overflow-hidden">
                          <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">{getLocalized(form.title)}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{form.category}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => { setEditingForm(form); setShowFormModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-indigo-500 rounded-xl transition-all"><Pencil size={18} /></button>
                        <button onClick={() => { if(confirm('ลบเอกสาร?')) { const updated = forms.filter(f => f.id !== form.id); setForms(updated); syncToSheets('forms', updated); } }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
             </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      {showAdminStatusModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim touch-auto">
          <div className="w-full max-w-[540px] bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90svh]">
            {/* Fix: Added missing Timer icon import reference */}
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-8 uppercase flex items-center gap-3"><Timer size={28} className="text-amber-500" />{editingStatusRecord ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มข้อมูลติดตาม'}</h3>
            <form onSubmit={handleSaveStatus} className="space-y-6">
              <div className="space-y-2"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">รหัสนักศึกษา</label><input name="student_id" defaultValue={editingStatusRecord?.studentId} required placeholder="6XXXXXXXX" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-amber-500 outline-none font-bold text-xl transition-all" /></div>
              <div className="space-y-2"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ชื่อ-นามสกุล</label><input name="student_name" defaultValue={editingStatusRecord?.name} required placeholder="ชื่อจริง - นามสกุล" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-amber-500 outline-none font-bold text-lg transition-all" /></div>
              <div className="space-y-3"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ตัวเลือกสาขาวิชา</label><div className="grid grid-cols-2 gap-4">
                  {[{ id: Major.HALAL_FOOD, label: currentT.halalMajor, icon: <Salad size={26} />, color: 'amber' }, { id: Major.DIGITAL_TECH, label: currentT.digitalMajor, icon: <Cpu size={26} />, color: 'indigo' }].map((mj) => (
                    <label key={mj.id} className="relative cursor-pointer group"><input type="radio" name="major" value={mj.id} defaultChecked={editingStatusRecord?.major === mj.id || (!editingStatusRecord && mj.id === Major.HALAL_FOOD)} className="peer hidden" /><div className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 text-center active:scale-95 relative bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 peer-checked:border-${mj.color}-500 peer-checked:bg-${mj.color}-50/60 dark:peer-checked:bg-${mj.color}-950/30 peer-checked:shadow-md`}><div className={`absolute top-2 right-2 p-1 rounded-full bg-${mj.color}-500 text-white scale-0 peer-checked:scale-100 transition-transform`}><Check size={12} /></div><div className={`text-slate-300 group-hover:scale-110 transition-transform peer-checked:text-${mj.color}-600 dark:peer-checked:text-${mj.color}-400 mb-3`}>{mj.icon}</div><span className={`text-base sm:text-lg font-black leading-tight text-slate-500 dark:text-slate-400 peer-checked:text-${mj.color}-700 dark:peer-checked:text-${mj.color}-300`}>{mj.label}</span></div></label>
                  ))}
              </div></div>
              <div className="space-y-3"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ตัวเลือก สถานะปัจจุบัน</label><div className="grid grid-cols-2 gap-4">
                  {[{ id: ApplicationStatus.PENDING, label: currentT.statusPending, color: 'amber', icon: <Clock size={24} /> }, { id: ApplicationStatus.PREPARING, label: currentT.statusPreparing, color: 'blue', icon: <ClipboardList size={24} /> }, { id: ApplicationStatus.ACCEPTED, label: currentT.statusAccepted, color: 'emerald', icon: <ShieldCheck size={24} /> }, { id: ApplicationStatus.REJECTED, label: currentT.statusRejected, color: 'rose', icon: <ShieldX size={24} /> }].map((st) => (
                    <label key={st.id} className="relative cursor-pointer group"><input type="radio" name="status" value={st.id} defaultChecked={editingStatusRecord?.status === st.id || (!editingStatusRecord && st.id === ApplicationStatus.PENDING)} className="peer hidden" /><div className={`flex items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 active:scale-95 relative bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 peer-checked:border-${st.color}-500 peer-checked:bg-${st.color}-50/60 dark:peer-checked:bg-${st.color}-950/30 peer-checked:shadow-sm`}><div className={`absolute top-2 right-2 p-1 rounded-full bg-${st.color}-500 text-white scale-0 peer-checked:scale-100 transition-transform`}><Check size={10} /></div><div className={`text-slate-200 peer-checked:text-${st.color}-600 dark:peer-checked:text-${st.color}-400 transition-colors`}>{st.icon}</div><span className={`text-base font-black uppercase text-slate-500 dark:text-slate-400 peer-checked:text-${st.color}-700 dark:peer-checked:text-${st.color}-300 leading-tight`}>{st.label}</span></div></label>
                  ))}
              </div></div>
              <div className="flex gap-4 pt-6"><button type="button" onClick={() => setShowAdminStatusModal(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-sm sm:text-base hover:bg-slate-50 transition-colors">ยกเลิก</button><button type="submit" disabled={isSyncing} className="flex-1 py-5 rounded-2xl bg-[#630330] text-white font-black uppercase text-sm sm:text-base shadow-lg shadow-[#630330]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">{isSyncing ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim"><div className="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-[2rem] p-8"><h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-3"><CalendarDays size={24} className="text-emerald-500" />{editingSchedule ? 'แก้ไขกำหนดการ' : 'เพิ่มกำหนดการใหม่'}</h3><form onSubmit={handleSaveSchedule} className="space-y-5"><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ชื่อกิจกรรม</label><input name="event_th" defaultValue={editingSchedule?.event.th} required placeholder="หัวข้อกิจกรรม" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-xl transition-all" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">วันเริ่มต้น</label><input type="date" name="start_th" defaultValue={editingSchedule?.rawStartDate} required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-lg transition-all" /></div><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">วันสิ้นสุด</label><input type="date" name="end_th" defaultValue={editingSchedule?.rawEndDate} required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-lg transition-all" /></div></div><div className="flex gap-4 pt-4"><button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-xs">ยกเลิก</button><button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-3.5 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs disabled:opacity-50">{isTranslating ? 'กำลังประมวลผล...' : 'บันทึกกำหนดการ'}</button></div></form></div></div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim"><div className="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-[2rem] p-8"><h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-3"><FileText size={24} className="text-indigo-500" />{editingForm ? 'แก้ไขแบบฟอร์ม' : 'เพิ่มแบบฟอร์มใหม่'}</h3><form onSubmit={handleSaveForm} className="space-y-5"><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ชื่อเอกสาร</label><input name="title" defaultValue={editingForm?.title.th} required placeholder="Document Name" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-xl transition-all" /></div><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">หมวดหมู่</label><select name="category" defaultValue={editingForm?.category || FormCategory.APPLICATION} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-lg border-2 border-transparent focus:border-indigo-500"><option value={FormCategory.APPLICATION}>เอกสารสมัครงาน (Application)</option><option value={FormCategory.MONITORING}>เอกสารระหว่างฝึกงาน (Monitoring)</option></select></div><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ลิงก์ URL</label><input name="url" defaultValue={editingForm?.url} required placeholder="Download Link" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-xl transition-all" /></div><div className="flex gap-4 pt-4"><button type="button" onClick={() => setShowFormModal(false)} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-xs">ยกเลิก</button><button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-black uppercase text-xs disabled:opacity-50">{isTranslating ? 'กำลังประมวลผล...' : 'บันทึกเอกสาร'}</button></div></form></div></div>
      )}

      {showSiteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim"><div className="w-full max-w-[540px] bg-white dark:bg-slate-900 rounded-[2rem] p-8 overflow-y-auto max-h-[90svh]"><h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-3"><Building2 size={24} className="text-rose-600" />{editingSite ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}</h3><form onSubmit={handleSaveSite} className="space-y-5"><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ชื่อหน่วยงาน</label><input name="name_th" defaultValue={editingSite?.name.th} required placeholder="Company Name" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-xl transition-all" /></div><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">จังหวัด</label><input name="loc_th" defaultValue={editingSite?.location.th} required placeholder="City/Prov" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-xl transition-all" /></div></div><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">รายละเอียดงาน</label><textarea name="desc_th" defaultValue={editingSite?.description.th} required placeholder="Job details..." className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-xl transition-all min-h-[80px]"></textarea></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ตำแหน่ง</label><input name="pos_th" defaultValue={editingSite?.position.th} required placeholder="Ex: QA, Dev" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-xl transition-all" /></div><div className="space-y-1"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">สาขาวิชา</label><select name="major" defaultValue={editingSite?.major || Major.HALAL_FOOD} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-lg border-2 border-transparent focus:border-rose-500"><option value={Major.HALAL_FOOD}>{currentT.halalMajor}</option><option value={Major.DIGITAL_TECH}>{currentT.digitalMajor}</option></select></div></div><div className="space-y-2"><label className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 ml-1">สถานะ</label><div className="grid grid-cols-3 gap-3"><label className="flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-emerald-50 transition-all border-2 border-transparent has-[:checked]:border-emerald-500"><input type="radio" name="status" value="active" defaultChecked={!editingSite || editingSite.status === 'active'} className="hidden" /><span className="text-[10px] font-black uppercase">เปิดรับ</span></label><label className="flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-amber-50 transition-all border-2 border-transparent has-[:checked]:border-amber-500"><input type="radio" name="status" value="senior_visited" defaultChecked={editingSite?.status === 'senior_visited'} className="hidden" /><span className="text-[10px] font-black uppercase">รุ่นพี่เคยไป</span></label><label className="flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-200 transition-all border-2 border-transparent has-[:checked]:border-slate-500"><input type="radio" name="status" value="archived" defaultChecked={editingSite?.status === 'archived'} className="hidden" /><span className="text-[10px] font-black uppercase">คลังข้อมูล</span></label></div></div><div className="flex gap-4 pt-4"><button type="button" onClick={() => setShowSiteModal(false)} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-xs">ยกเลิก</button><button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-3.5 rounded-2xl bg-rose-600 text-white font-black uppercase text-xs disabled:opacity-50">{isTranslating ? 'กำลังบันทึก...' : 'บันทึกหน่วยงาน'}</button></div></form></div></div>
      )}
    </>
  );
};

export default AdminPanel;

import React, { useState, useMemo, useRef } from 'react';
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
  Translation,
  InternshipType
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
  Timer,
  AlertTriangle,
  Upload,
  FileUp,
  Link as LinkIcon,
  Briefcase,
  GraduationCap,
  Calendar,
  Fingerprint,
  MapPin,
  FileSpreadsheet,
  Info
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
  
  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRange, setReportRange] = useState({ start: '', end: '' });
  
  // Validation State
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isForceSaveVisible, setIsForceSaveVisible] = useState(false);
  
  // File Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const studentStatusFormRef = useRef<HTMLFormElement>(null);
  
  // Custom Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'student' | 'site' | 'schedule' | 'form' } | null>(null);

  const getLocalized = (localized: LocalizedString) => {
    return localized.th || localized.en || '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
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
    let result = [...studentStatuses];
    
    // Sort by latest update first
    result.sort((a, b) => b.lastUpdated - a.lastUpdated);

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
    let url = formData.get('url') as string || "#";
    
    let fileData = null;
    if (uploadMethod === 'file' && selectedFile) {
      setIsTranslating(true);
      try {
        fileData = await fileToBase64(selectedFile);
        url = `PENDING_UPLOAD:${selectedFile.name}`;
      } catch (err) {
        console.error("File read error:", err);
      }
      setIsTranslating(false);
    }

    setIsTranslating(true);
    const results = await performBatchTranslation([{ key: 'title', value: thTitle }]);
    setIsTranslating(false);

    const newForm: DocumentForm = {
      id: editingForm?.id || Date.now().toString(),
      title: results['title'] || { th: thTitle, en: thTitle, ar: thTitle, ms: thTitle },
      category,
      url: url.startsWith('http') || url.startsWith('PENDING') ? url : `https://${url}`
    };

    const syncPayload = fileData 
      ? { ...newForm, _fileData: fileData, _fileName: selectedFile?.name }
      : newForm;

    let updated = editingForm ? forms.map(f => f.id === editingForm.id ? newForm : f) : [newForm, ...forms];
    setForms(updated);
    
    if (fileData) {
      syncToSheets('uploadForm', [syncPayload]);
    } else {
      syncToSheets('forms', updated);
    }

    setShowFormModal(false);
    setEditingForm(null);
    setSelectedFile(null);
    setUploadMethod('url');
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

  const handleSaveStatus = (e?: React.FormEvent<HTMLFormElement>, isForced: boolean = false) => {
    if (e) e.preventDefault();
    
    if (!studentStatusFormRef.current) return;
    
    const formData = new FormData(studentStatusFormRef.current);
    const rawStudentId = (formData.get('student_id') as string) || "";
    const rawName = (formData.get('student_name') as string) || "";
    const rawLocation = (formData.get('location') as string) || "";
    const rawPosition = (formData.get('position') as string) || "";
    const rawTerm = (formData.get('term') as string) || "";
    const rawYear = (formData.get('academic_year') as string) || "";
    
    const normStudentId = rawStudentId.trim().replace(/\s+/g, '');
    const normName = rawName.trim().replace(/\s+/g, ' ').toLowerCase();

    if (!isForced) {
      let duplicateType: string | null = null;
      const isDuplicate = studentStatuses.some(record => {
        if (editingStatusRecord && record.id === editingStatusRecord.id) return false;
        
        const existingId = String(record.studentId || "").trim().replace(/\s+/g, '');
        const existingName = String(record.name || "").trim().replace(/\s+/g, ' ').toLowerCase();
        
        if (existingId === normStudentId) {
          duplicateType = "รหัสประจำตัวนักศึกษา";
          return true;
        }
        if (existingName === normName) {
          duplicateType = "ชื่อ-นามสกุล";
          return true;
        }
        return false;
      });

      if (isDuplicate) {
        setStatusError(`🚨 ตรวจพบข้อมูลซ้ำ: ${duplicateType} "${duplicateType === 'รหัสประจำตัวนักศึกษา' ? rawStudentId : rawName}" มีอยู่แล้วในระบบ คุณแน่ใจหรือไม่ที่จะบันทึกซ้ำ?`);
        setIsForceSaveVisible(true);
        return;
      }
    }

    const newRecord: StudentStatusRecord = {
      id: editingStatusRecord?.id || Date.now().toString(),
      studentId: rawStudentId.trim(),
      name: rawName.trim(),
      location: rawLocation.trim() || undefined,
      position: rawPosition.trim() || undefined,
      term: rawTerm.trim() || undefined,
      academicYear: rawYear.trim() || undefined,
      status: formData.get('status') as ApplicationStatus,
      major: formData.get('major') as Major,
      internshipType: formData.get('internship_type') as InternshipType,
      startDate: formData.get('start_date') as string || undefined,
      endDate: formData.get('end_date') as string || undefined,
      lastUpdated: Date.now()
    };

    let updated = editingStatusRecord ? studentStatuses.map(s => s.id === editingStatusRecord.id ? newRecord : s) : [newRecord, ...studentStatuses];
    setStudentStatuses(updated);
    syncToSheets('studentStatuses', updated);
    setShowAdminStatusModal(false);
    setEditingStatusRecord(null);
    setStatusError(null);
    setIsForceSaveVisible(false);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    const { id, type } = itemToDelete;
    let updated: any[] = [];

    switch (type) {
      case 'student':
        updated = studentStatuses.filter(s => s.id !== id);
        setStudentStatuses(updated);
        syncToSheets('studentStatuses', updated);
        break;
      case 'site':
        updated = sites.filter(s => s.id !== id);
        setSites(updated);
        syncToSheets('sites', updated);
        break;
      case 'schedule':
        updated = schedules.filter(s => s.id !== id);
        setSchedules(updated);
        syncToSheets('schedules', updated);
        break;
      case 'form':
        updated = forms.filter(f => f.id !== id);
        setForms(updated);
        syncToSheets('forms', updated);
        break;
    }

    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleDownloadReport = () => {
    let filtered = [...studentStatuses];
    if (reportRange.start) {
      filtered = filtered.filter(s => s.startDate && s.startDate >= reportRange.start);
    }
    if (reportRange.end) {
      filtered = filtered.filter(s => s.endDate && s.endDate <= reportRange.end);
    }

    if (filtered.length === 0) {
      alert("ไม่พบข้อมูลในช่วงเวลาที่ระบุ");
      return;
    }

    const headers = ["ID", "Student Name", "Major", "Type", "Location", "Position", "Term", "Year", "Start Date", "End Date", "Status"];
    const rows = filtered.map(s => [
      `"${s.studentId}"`,
      `"${s.name}"`,
      `"${s.major === Major.HALAL_FOOD ? 'สาขาวิชาวิจัยและพัฒนาผลิตภัณฑ์อาหารฮาลาล' : 'สาขาวิชาเทคโนโลยีและวิทยาการดิจิทัล'}"`,
      `"${s.internshipType === InternshipType.INTERNSHIP ? 'Internship' : 'Co-op'}"`,
      `"${s.location || '-'}"`,
      `"${s.position || '-'}"`,
      `"${s.term || '-'}"`,
      `"${s.academicYear || '-'}"`,
      `"${s.startDate || '-'}"`,
      `"${s.endDate || '-'}"`,
      `"${getStatusLabel(s.status)}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Internship_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowReportModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('กรุณาเลือกไฟล์ PDF เท่านั้น');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
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
      case ApplicationStatus.PENDING: return 'รอการตรวจสอบ';
      case ApplicationStatus.PREPARING: return 'กำลังจัดเตรียม';
      case ApplicationStatus.ACCEPTED: return 'ตอบรับแล้ว';
      case ApplicationStatus.REJECTED: return 'ปฏิเสธ';
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
                {adminActiveTab === 'students' && (
                  <button 
                    onClick={() => setShowReportModal(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-black uppercase text-xs flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 transition-all shadow-sm"
                  >
                    <FileSpreadsheet size={18} /> ส่งออกรายงาน
                  </button>
                )}
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
                    if(adminActiveTab === 'students') { 
                      setEditingStatusRecord(null); 
                      setStatusError(null);
                      setIsForceSaveVisible(false);
                      setShowAdminStatusModal(true); 
                    }
                    else if(adminActiveTab === 'sites') { setEditingSite(null); setShowSiteModal(true); }
                    else if(adminActiveTab === 'schedule') { setEditingSchedule(null); setShowScheduleModal(true); }
                    else { 
                      setEditingForm(null); 
                      setSelectedFile(null);
                      setUploadMethod('url');
                      setShowFormModal(true); 
                    }
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
                      { id: ApplicationStatus.PENDING, label: 'รอการตรวจสอบ', color: 'amber' },
                      { id: ApplicationStatus.PREPARING, label: 'กำลังจัดเตรียม', color: 'blue' },
                      { id: ApplicationStatus.ACCEPTED, label: 'ตอบรับแล้ว', color: 'emerald' },
                      { id: ApplicationStatus.REJECTED, label: 'ปฏิเสธ', color: 'rose' }
                    ].map(st => (
                      <button key={st.id} onClick={() => setAdminStudentStatusFilter(st.id)} className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminStudentStatusFilter === st.id ? `bg-${st.color}-500 text-white shadow-md` : `text-slate-500 hover:bg-${st.color}-50 dark:hover:bg-${st.color}-950/20`}`}><div className={`w-2 h-2 rounded-full ${adminStudentStatusFilter === st.id ? 'bg-white' : `bg-${st.color}-400`}`} />{st.label} ({studentStatuses.filter(s => s.status === st.id).length})</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredAdminStudents.map(record => (
                      <div key={record.id} className="p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col gap-4 group hover:border-amber-200 hover:shadow-xl transition-all shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 overflow-hidden pr-2">
                            <h4 className="font-black text-slate-900 dark:text-white text-lg truncate leading-tight">{record.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5"><Fingerprint size={12} /> ID: {record.studentId}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditingStatusRecord(record); setStatusError(null); setIsForceSaveVisible(false); setShowAdminStatusModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-amber-500 rounded-xl transition-all"><Pencil size={18} /></button>
                            <button onClick={() => { setItemToDelete({ id: record.id, type: 'student' }); setShowDeleteModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase w-16">กระบวนการ:</span>
                             <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusColor(record.status)}`}>{getStatusLabel(record.status)}</div>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase w-16">สถานที่:</span>
                             <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px] flex items-center gap-1">
                               <MapPin size={10} className="text-rose-400" />
                               {record.location || '-'}
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase w-16">ตำแหน่ง:</span>
                             <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px] flex items-center gap-1">
                               <Briefcase size={10} className="text-emerald-400" />
                               {record.position || '-'}
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase w-16">เทอม/ปี:</span>
                             <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                               {record.term ? `เทอม ${record.term}` : '-'} / {record.academicYear || '-'}
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase w-16">รูปแบบ:</span>
                             <div className="px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 flex items-center gap-1.5">
                               {record.internshipType === InternshipType.INTERNSHIP ? <Briefcase size={12} className="text-emerald-500" /> : <GraduationCap size={12} className="text-indigo-500" />}
                               {record.internshipType === InternshipType.INTERNSHIP ? 'ฝึกงาน' : 'สหกิจศึกษา'}
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase w-16 shrink-0">สาขา:</span>
                             <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${record.major === Major.HALAL_FOOD ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-blue-50 border-blue-100 text-blue-600'} flex items-center gap-1.5`}>
                               {record.major === Major.HALAL_FOOD ? <Salad size={12} /> : <Cpu size={12} />}
                               {record.major === Major.HALAL_FOOD ? 'สาขาวิชาวิจัยและพัฒนาผลิตภัณฑ์อาหารฮาลาล' : 'สาขาวิชาเทคโนโลยีและวิทยาการดิจิทัล'}
                             </div>
                           </div>
                        </div>

                        <div className="pt-3 border-t border-slate-50 dark:border-slate-700/50 flex flex-col gap-2">
                           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                             <Calendar size={14} className="text-slate-400" />
                             {record.startDate && record.endDate ? (
                               <span>ระยะเวลา: {record.startDate} ถึง {record.endDate}</span>
                             ) : (
                               <span className="italic text-slate-300">ยังไม่ได้ระบุระยะเวลาฝึก</span>
                             )}
                           </div>
                           <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                             <RefreshCw size={10} /> อัปเดตล่าสุด: {new Date(record.lastUpdated).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                           </div>
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
                          <button onClick={() => { setItemToDelete({ id: site.id, type: 'site' }); setShowDeleteModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
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
                        <button onClick={() => { setItemToDelete({ id: item.id, type: 'schedule' }); setShowDeleteModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
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
                        <button onClick={() => { setItemToDelete({ id: form.id, type: 'form' }); setShowDeleteModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
             </div>
          </div>
        </div>
      </main>

      {/* REPORT MODAL - Range selector */}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md reveal-anim" onClick={() => setShowReportModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-3xl border border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl shadow-inner">
                      <FileSpreadsheet size={28} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none">Export Summary</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Select Month Range</p>
                   </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">เริ่มจากเดือน</label>
                      <input 
                        type="month" 
                        value={reportRange.start}
                        onChange={(e) => setReportRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm transition-all shadow-inner"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ถึงเดือน</label>
                      <input 
                        type="month" 
                        value={reportRange.end}
                        onChange={(e) => setReportRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm transition-all shadow-inner"
                      />
                   </div>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex gap-3 items-center">
                   <Info size={18} className="text-slate-400 shrink-0" />
                   <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed">
                     ระบบจะส่งออกข้อมูลนักศึกษาที่ระบุ "วันที่เริ่มต้น/สิ้นสุด" อยู่ในช่วงที่เลือกเป็นไฟล์ CSV
                   </p>
                </div>

                <button 
                  onClick={handleDownloadReport}
                  className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black uppercase text-sm shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Download size={20} /> ดาวน์โหลดรายงาน (.CSV)
                </button>
             </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL - Ultra Compact */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md reveal-anim" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-[380px] bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center relative" onClick={(e) => e.stopPropagation()}>
             <button onClick={() => setShowDeleteModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               <X size={18} className="text-slate-400" />
             </button>
             <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">ยืนยันการลบ?</h3>
             <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
             </p>
             <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3.5 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all"
                >
                  ยืนยันลบ
                </button>
             </div>
          </div>
        </div>
      )}

      {/* STUDENT STATUS MODAL - Compact, Dates & Force Save */}
      {showAdminStatusModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim touch-auto" onClick={() => { setShowAdminStatusModal(false); setStatusError(null); setIsForceSaveVisible(false); }}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[85svh] relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowAdminStatusModal(false); setStatusError(null); setIsForceSaveVisible(false); }} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-3"><Timer size={24} className="text-amber-500" />{editingStatusRecord ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มข้อมูลนักศึกษา'}</h3>
            
            <form ref={studentStatusFormRef} onSubmit={(e) => handleSaveStatus(e)} className="space-y-4">
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">รหัสนักศึกษา</label><input name="student_id" defaultValue={editingStatusRecord?.studentId} required placeholder="6XXXXXXXX" className="w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-amber-500 outline-none font-bold text-lg transition-all" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ชื่อ-นามสกุล</label><input name="student_name" defaultValue={editingStatusRecord?.name} required placeholder="ชื่อจริง - นามสกุล" className="w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-amber-500 outline-none font-bold text-base transition-all" /></div>
              
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">สาขาวิชา</label><div className="grid grid-cols-1 gap-2.5">
                  {[
                    { id: Major.HALAL_FOOD, label: 'สาขาวิชาวิจัยและพัฒนาผลิตภัณฑ์อาหารฮาลาล', icon: <Salad size={18} />, color: 'amber' }, 
                    { id: Major.DIGITAL_TECH, label: 'สาขาวิชาเทคโนโลยีและวิทยาการดิจิทัล', icon: <Cpu size={18} />, color: 'blue' }
                  ].map((mj) => (
                    <label key={mj.id} className="relative cursor-pointer group"><input type="radio" name="major" value={mj.id} defaultChecked={editingStatusRecord?.major === mj.id || (!editingStatusRecord && mj.id === Major.HALAL_FOOD)} className="peer hidden" /><div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-300 relative bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 peer-checked:border-${mj.color}-500 peer-checked:bg-${mj.color}-50/50 dark:peer-checked:bg-${mj.color}-950/20`}><div className={`text-slate-300 peer-checked:text-${mj.color}-600`}>{mj.icon}</div><span className={`text-[11px] font-black leading-tight text-slate-500 peer-checked:text-${mj.color}-700`}>{mj.label}</span></div></label>
                  ))}
              </div></div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">เทอม (Semester)</label>
                  <select name="term" defaultValue={editingStatusRecord?.term} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-sm border-2 border-transparent focus:border-amber-500 outline-none">
                    <option value="">- เลือกเทอม -</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ปีการศึกษา</label>
                  <input name="academic_year" defaultValue={editingStatusRecord?.academicYear} placeholder="25XX" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-amber-500 outline-none font-bold text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">สถานที่ฝึกงาน / สหกิจศึกษา</label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input name="location" defaultValue={editingStatusRecord?.location} placeholder="ชื่อบริษัท หรือ หน่วยงาน" className="w-full pl-12 pr-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-amber-500 outline-none font-bold text-base transition-all" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ตำแหน่งงาน</label>
                <div className="relative">
                  <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input name="position" defaultValue={editingStatusRecord?.position} placeholder="ระบุตำแหน่งที่ได้รับมอบหมาย" className="w-full pl-12 pr-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-amber-500 outline-none font-bold text-base transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">วันที่เริ่มฝึก (ไม่บังคับ)</label><input type="date" name="start_date" defaultValue={editingStatusRecord?.startDate} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-xs" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">วันที่สิ้นสุด (ไม่บังคับ)</label><input type="date" name="end_date" defaultValue={editingStatusRecord?.endDate} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-xs" /></div>
              </div>

              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">ประเภทการเข้าถึง</label><div className="grid grid-cols-2 gap-3">
                  {[
                    { id: InternshipType.INTERNSHIP, label: 'ฝึกงาน', icon: <Briefcase size={18} />, color: 'emerald' }, 
                    { id: InternshipType.COOP, label: 'สหกิจศึกษา', icon: <GraduationCap size={18} />, color: 'indigo' }
                  ].map((it) => (
                    <label key={it.id} className="relative cursor-pointer group"><input type="radio" name="internship_type" value={it.id} defaultChecked={editingStatusRecord?.internshipType === it.id || (!editingStatusRecord && it.id === InternshipType.INTERNSHIP)} className="peer hidden" /><div className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 text-center relative bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 peer-checked:border-${it.color}-500 peer-checked:bg-${it.color}-50/50 dark:peer-checked:bg-${it.color}-950/20`}><div className={`text-slate-300 peer-checked:text-${it.color}-600 mb-1`}>{it.icon}</div><span className={`text-[10px] font-black leading-tight text-slate-500 peer-checked:text-${it.color}-700`}>{it.label}</span></div></label>
                  ))}
              </div></div>

              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 tracking-wider">สถานะการสมัคร</label><div className="grid grid-cols-2 gap-3">
                  {[
                    { id: ApplicationStatus.PENDING, label: 'รอการตรวจสอบ', color: 'amber' }, 
                    { id: ApplicationStatus.PREPARING, label: 'กำลังจัดเตรียม', color: 'blue' }, 
                    { id: ApplicationStatus.ACCEPTED, label: 'ตอบรับแล้ว', color: 'emerald' }, 
                    { id: ApplicationStatus.REJECTED, label: 'ปฏิเสธ', color: 'rose' }
                  ].map((st) => (
                    <label key={st.id} className="relative cursor-pointer group"><input type="radio" name="status" value={st.id} defaultChecked={editingStatusRecord?.status === st.id || (!editingStatusRecord && st.id === ApplicationStatus.PENDING)} className="peer hidden" /><div className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 relative bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 peer-checked:border-${st.color}-500 peer-checked:bg-${st.color}-50/50 dark:peer-checked:bg-${st.color}-950/20`}><span className={`text-[9px] font-black uppercase text-slate-500 peer-checked:text-${st.color}-700`}>{st.label}</span></div></label>
                  ))}
              </div></div>

              {statusError && (
                <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex flex-col gap-3 reveal-anim">
                  <div className="flex gap-3 items-start">
                    <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-[11px] sm:text-xs font-black text-rose-700 dark:text-rose-300 leading-tight uppercase">
                      {statusError}
                    </p>
                  </div>
                  {isForceSaveVisible && (
                    <button 
                      type="button" 
                      onClick={() => handleSaveStatus(undefined, true)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] rounded-lg shadow-md transition-all animate-pulse"
                    >
                      ฉันแน่ใจ ต้องการบันทึกข้อมูลซ้ำ
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowAdminStatusModal(false); setStatusError(null); setIsForceSaveVisible(false); }} className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-[11px]">ยกเลิก</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-3.5 rounded-xl bg-[#630330] text-white font-black uppercase text-[11px] shadow-lg shadow-[#630330]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                  {isSyncing ? 'SAVING...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL - Compact */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim" onClick={() => setShowScheduleModal(false)}>
          <div className="w-full max-md bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowScheduleModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-2"><CalendarDays size={22} className="text-emerald-500" />กำหนดการ</h3>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ชื่อกิจกรรม</label><input name="event_th" defaultValue={editingSchedule?.event.th} required placeholder="หัวข้อกิจกรรม" className="w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-lg transition-all" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">เริ่มต้น</label><input type="date" name="start_th" defaultValue={editingSchedule?.rawStartDate} required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">สิ้นสุด</label><input type="date" name="end_th" defaultValue={editingSchedule?.rawEndDate} required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm" /></div>
              </div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-[11px]">ยกเลิก</button><button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-3.5 rounded-xl bg-emerald-600 text-white font-black uppercase text-[11px] disabled:opacity-50">{isTranslating ? 'SYNCING...' : 'บันทึก'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT FORM MODAL - Compact */}
      {showFormModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim" onClick={() => setShowFormModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowFormModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-2">
              <FileText size={22} className="text-indigo-500" />
              จัดการเอกสาร
            </h3>
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ชื่อเอกสาร</label><input name="title" defaultValue={editingForm?.title.th} required placeholder="ระบุชื่อเอกสาร" className="w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-base transition-all" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">หมวดหมู่</label><select name="category" defaultValue={editingForm?.category || FormCategory.APPLICATION} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-sm border-2 border-transparent focus:border-indigo-500 outline-none">
                  <option value={FormCategory.APPLICATION}>เอกสารสมัครงาน</option>
                  <option value={FormCategory.MONITORING}>เอกสารระหว่างฝึกงาน</option>
              </select></div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setUploadMethod('url')} className={`py-2 rounded-lg border font-bold text-[10px] transition-all ${uploadMethod === 'url' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>LINK URL</button>
                  <button type="button" onClick={() => setUploadMethod('file')} className={`py-2 rounded-lg border font-bold text-[10px] transition-all ${uploadMethod === 'file' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>UPLOAD PDF</button>
                </div>
                {uploadMethod === 'url' ? (
                  <input name="url" defaultValue={editingForm?.url} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-xs" />
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="group py-5 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer text-center hover:border-indigo-500 transition-all">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                    <Upload size={20} className="mx-auto text-slate-300 group-hover:text-indigo-500 mb-2" />
                    <p className="text-[9px] font-black uppercase text-slate-400 group-hover:text-indigo-600">{selectedFile ? selectedFile.name : 'เลือกไฟล์ PDF'}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowFormModal(false)} className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-[11px]">ยกเลิก</button><button type="submit" disabled={isTranslating || isSyncing || (uploadMethod === 'file' && !selectedFile)} className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-black uppercase text-[11px] shadow-lg shadow-indigo-600/20 disabled:opacity-50">บันทึก</button></div>
            </form>
          </div>
        </div>
      )}

      {/* INTERNSHIP SITE MODAL - Balanced */}
      {showSiteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim" onClick={() => setShowSiteModal(false)}>
          <div className="w-full max-lg bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 overflow-y-auto max-h-[85svh] relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowSiteModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-2"><Building2 size={22} className="text-rose-600" />หน่วยงาน</h3>
            <form onSubmit={handleSaveSite} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ชื่อหน่วยงาน</label><input name="name_th" defaultValue={editingSite?.name.th} required placeholder="..." className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-base transition-all" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">จังหวัด</label><input name="loc_th" defaultValue={editingSite?.location.th} required placeholder="..." className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-base transition-all" /></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">รายละเอียดงาน</label><textarea name="desc_th" defaultValue={editingSite?.description.th} required placeholder="..." className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-sm min-h-[70px]"></textarea></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">ตำแหน่ง</label><input name="pos_th" defaultValue={editingSite?.position.th} required placeholder="..." className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-rose-500 outline-none font-bold text-sm transition-all" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">สาขาวิชา</label><select name="major" defaultValue={editingSite?.major || Major.HALAL_FOOD} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white font-bold text-sm border-2 border-transparent focus:border-rose-500"><option value={Major.HALAL_FOOD}>HALAL FOOD</option><option value={Major.DIGITAL_TECH}>DIGITAL TECH</option></select></div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">สถานะ</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center justify-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer border-2 border-transparent has-[:checked]:border-emerald-500 transition-all"><input type="radio" name="status" value="active" defaultChecked={!editingSite || editingSite.status === 'active'} className="hidden" /><span className="text-[9px] font-black uppercase">เปิดรับ</span></label>
                  <label className="flex items-center justify-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer border-2 border-transparent has-[:checked]:border-amber-500 transition-all"><input type="radio" name="status" value="senior_visited" defaultChecked={editingSite?.status === 'senior_visited'} className="hidden" /><span className="text-[9px] font-black uppercase">รุ่นพี่เคยไป</span></label>
                  <label className="flex items-center justify-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer border-2 border-transparent has-[:checked]:border-slate-500 transition-all"><input type="radio" name="status" value="archived" defaultChecked={editingSite?.status === 'archived'} className="hidden" /><span className="text-[9px] font-black uppercase">คลัง</span></label>
                </div>
              </div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowSiteModal(false)} className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-[11px]">ยกเลิก</button><button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-3.5 rounded-xl bg-rose-600 text-white font-black uppercase text-[11px] shadow-lg shadow-rose-600/20 disabled:opacity-50">บันทึก</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPanel;
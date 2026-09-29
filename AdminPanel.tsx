
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
import { ShareLinkModal } from './components/ShareLinkModal';
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
  Info,
  BookOpen,
  Database,
  Network,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  GraduationCap as GraduationIcon,
  Layers,
  BarChart3,
  PieChart,
  TrendingUp,
  UserCheck,
  Share2,
  Table,
  LayoutGrid,
  Lock,
  Printer
} from 'lucide-react';
import SharedSummaryTable from './SharedSummaryTable';
import { formatDateBE } from './dateUtils';
import { exportToExcel, exportToWord, exportToPDF } from './exportUtils';

interface AdminPanelProps {
  sites: InternshipSite[];
  setSites: React.Dispatch<React.SetStateAction<InternshipSite[]>>;
  studentStatuses: StudentStatusRecord[];
  setStudentStatuses: React.Dispatch<React.SetStateAction<StudentStatusRecord[]>>;
  schedules: ScheduleEvent[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleEvent[]>>;
  forms: DocumentForm[];
  setForms: React.Dispatch<React.SetStateAction<DocumentForm[]>>;
  currentT: Translation;
  lang: Language;
  adminPasswords: string[];
  setAdminPasswords: React.Dispatch<React.SetStateAction<string[]>>;
  fetchFromSheets: () => Promise<void>;
  syncToSheets: (type: string, data: any[], action?: 'all' | 'add' | 'update' | 'delete', item?: any) => Promise<void>;
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
  adminPasswords,
  setAdminPasswords,
  fetchFromSheets,
  syncToSheets,
  isLoading,
  isSyncing,
}) => {
  const currentYearBE = useMemo(() => (new Date().getFullYear() + 543).toString(), []);
  const [adminActiveTab, setAdminActiveTab] = useState<'students' | 'sites' | 'schedule' | 'forms' | 'admins'>('students');
  
  // Local UI States
  const [adminStudentSearch, setAdminStudentSearch] = useState('');
  const [adminStudentStatusFilter, setAdminStudentStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [adminStudentMajorFilter, setAdminStudentMajorFilter] = useState<Major | 'all'>('all');
  const [adminStudentYearFilter, setAdminStudentYearFilter] = useState<string | 'all'>(currentYearBE);
  const [adminStudentTermFilter, setAdminStudentTermFilter] = useState<string | 'all'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(false);
  const [studentViewMode, setStudentViewMode] = useState<'table' | 'cards'>('table');

  // Calculate stats scoped to active Year, Term, and Major filters to guarantee exact count match
  const scopedStudentsForStats = useMemo(() => {
    let result = studentStatuses;
    if (adminStudentYearFilter !== 'all') {
      result = result.filter(s => String(s.academicYear || '').trim() === adminStudentYearFilter);
    }
    if (adminStudentTermFilter !== 'all') {
      result = result.filter(s => String(s.term || '').trim() === adminStudentTermFilter);
    }
    if (adminStudentMajorFilter !== 'all') {
      result = result.filter(s => s.major === adminStudentMajorFilter);
    }
    return result;
  }, [studentStatuses, adminStudentYearFilter, adminStudentTermFilter, adminStudentMajorFilter]);

  const studentStats = useMemo(() => {
    const total = scopedStudentsForStats.length;
    const accepted = scopedStudentsForStats.filter(s => s.status === ApplicationStatus.ACCEPTED).length;
    const preparing = scopedStudentsForStats.filter(s => s.status === ApplicationStatus.PREPARING).length;
    const pending = scopedStudentsForStats.filter(s => s.status === ApplicationStatus.PENDING || !s.status).length;
    const rejected = scopedStudentsForStats.filter(s => s.status === ApplicationStatus.REJECTED).length;
    return { total, accepted, preparing, pending, rejected };
  }, [scopedStudentsForStats]);

  // Modal local state for easy date picking & presets
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [modalInternshipType, setModalInternshipType] = useState<InternshipType>(InternshipType.INTERNSHIP);
  const [modalStatus, setModalStatus] = useState<ApplicationStatus>(ApplicationStatus.PENDING);
  
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
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [newAdminPass, setNewAdminPass] = useState('');
  
  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsFilter, setStatsFilter] = useState({
    major: 'all' as Major | 'all',
    term: 'all' as string | 'all',
    year: 'all' as string | 'all'
  });
  const [exportMode, setExportMode] = useState<'date' | 'period'>('date');
  const [reportMajor, setReportMajor] = useState<Major | 'all'>('all');
  const [reportRange, setReportRange] = useState({ start: '', end: '' });
  const [reportPeriod, setReportPeriod] = useState({ term: '', year: '' });
  
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'student' | 'site' | 'schedule' | 'form' | 'admin' } | null>(null);
  const [isSummaryConfigured, setIsSummaryConfigured] = useState(false);
  const [summaryFilter, setSummaryFilter] = useState({
    years: [] as string[],
    terms: [] as string[]
  });
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [termDropdownOpen, setTermDropdownOpen] = useState(false);

  const yearsOptions = useMemo(() => {
    const vals = Array.from(new Set(studentStatuses.map(s => String(s.academicYear || '').trim()).filter(Boolean)))
      .filter(y => /^\d+$/.test(y)); // Ensure only numeric values are treated as academic years (filters out glitches like HALAL_FOOD)
    return vals.sort((a, b) => b.localeCompare(a));
  }, [studentStatuses]);

  const termsOptions = useMemo(() => {
    const vals = Array.from(new Set(studentStatuses.map(s => String(s.term || '').trim()).filter(Boolean)))
      .filter(t => /^\d+$/.test(t) && t !== '3'); // Ensure only numeric values are treated as semesters, excluding term 3
    return vals.sort();
  }, [studentStatuses]);

  const summaryStudents = useMemo(() => {
    return studentStatuses.filter(s => {
      const studentYear = String(s.academicYear || '').trim();
      const studentTerm = String(s.term || '').trim();
      
      const matchesYear = summaryFilter.years.length === 0 || summaryFilter.years.includes(studentYear);
      const matchesTerm = summaryFilter.terms.length === 0 || summaryFilter.terms.includes(studentTerm);
      
      return matchesYear && matchesTerm;
    }).sort((a, b) => {
      if (a.status === ApplicationStatus.ACCEPTED && b.status !== ApplicationStatus.ACCEPTED) return -1;
      if (a.status !== ApplicationStatus.ACCEPTED && b.status === ApplicationStatus.ACCEPTED) return 1;
      return b.lastUpdated - a.lastUpdated;
    });
  }, [studentStatuses, summaryFilter]);

  const toggleSummaryYear = (year: string) => {
    setSummaryFilter(prev => ({
      ...prev,
      years: prev.years.includes(year) ? prev.years.filter(y => y !== year) : [...prev.years, year]
    }));
  };

  const toggleSummaryTerm = (term: string) => {
    setSummaryFilter(prev => ({
      ...prev,
      terms: prev.terms.includes(term) ? prev.terms.filter(t => t !== term) : [...prev.terms, term]
    }));
  };

  // Year range generation for filtering (from 2560 or minimum year in data, up to current + 10 or maximum year in data)
  const academicYears = useMemo(() => {
    const currentBE = new Date().getFullYear() + 543;
    
    // Find min and max years from student statuses
    const yearsInData = studentStatuses
      .map(s => String(s.academicYear || '').trim())
      .filter(y => /^\d+$/.test(y))
      .map(Number);
      
    const minYear = Math.min(2560, ...yearsInData, currentBE);
    const maxYear = Math.max(currentBE + 10, ...yearsInData); // Generates up to current + 10 or max in data, whichever is higher!
    
    const years = [];
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y.toString());
    }
    return years.reverse(); // Newest first
  }, [studentStatuses]);

  const getStatusSelectClasses = (status: string) => {
    switch (status) {
      case ApplicationStatus.PENDING:
        return 'border-amber-400/80 bg-amber-50/30 text-amber-800 dark:border-amber-600/60 dark:bg-amber-950/15 dark:text-amber-300 focus:ring-amber-500';
      case ApplicationStatus.PREPARING:
        return 'border-blue-400/80 bg-blue-50/30 text-blue-800 dark:border-blue-600/60 dark:bg-blue-950/15 dark:text-blue-300 focus:ring-blue-500';
      case ApplicationStatus.ACCEPTED:
        return 'border-emerald-400/80 bg-emerald-50/30 text-emerald-800 dark:border-emerald-600/60 dark:bg-emerald-950/15 dark:text-emerald-300 focus:ring-emerald-500';
      case ApplicationStatus.REJECTED:
        return 'border-rose-400/80 bg-rose-50/30 text-rose-800 dark:border-rose-600/60 dark:bg-rose-950/15 dark:text-rose-300 focus:ring-rose-500';
      default:
        return 'border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-[#630330]';
    }
  };

  const getMajorSelectClasses = (major: string) => {
    switch (major) {
      case Major.HALAL_FOOD:
        return 'border-amber-500/80 bg-amber-50/30 text-amber-800 dark:border-amber-600/60 dark:bg-amber-950/15 dark:text-amber-300 focus:ring-amber-500';
      case Major.DIGITAL_TECH:
        return 'border-blue-500/80 bg-blue-50/30 text-blue-800 dark:border-blue-600/60 dark:bg-blue-950/15 dark:text-blue-300 focus:ring-blue-500';
      case Major.INFO_TECH:
        return 'border-indigo-400/80 bg-indigo-50/30 text-indigo-800 dark:border-indigo-600/60 dark:bg-indigo-950/15 dark:text-indigo-300 focus:ring-indigo-500';
      case Major.DATA_SCIENCE:
        return 'border-emerald-500/80 bg-emerald-50/30 text-emerald-800 dark:border-emerald-600/60 dark:bg-emerald-950/15 dark:text-emerald-300 focus:ring-emerald-500';
      default:
        return 'border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-[#630330]';
    }
  };

  const handlePrevYear = () => {
    if (adminStudentYearFilter === 'all') {
      setAdminStudentYearFilter(currentYearBE);
      return;
    }
    const idx = academicYears.indexOf(adminStudentYearFilter);
    if (idx !== -1 && idx < academicYears.length - 1) {
      setAdminStudentYearFilter(academicYears[idx + 1]);
    }
  };

  const handleNextYear = () => {
    if (adminStudentYearFilter === 'all') {
      setAdminStudentYearFilter(currentYearBE);
      return;
    }
    const idx = academicYears.indexOf(adminStudentYearFilter);
    if (idx !== -1 && idx > 0) {
      setAdminStudentYearFilter(academicYears[idx - 1]);
    }
  };

  const getLocalized = (localized: LocalizedString) => {
    return localized.th || localized.en || '';
  };

  // Resilient date parsing to handle both YYYY-MM-DD and ISO strings
  const parseDateResilient = (dateStr?: string) => {
    if (!dateStr) return null;
    if (dateStr.includes('T')) return new Date(dateStr);
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m - 1, d);
  };

  const formatDateForDisplay = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = parseDateResilient(dateStr);
    if (!d || isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /*const formatDateBE = (dateStr?: string) => {
    if (!dateStr || dateStr === '-') return '-';
    const d = parseDateResilient(dateStr);
    if (!d || isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };*/

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = parseDateResilient(dateStr);
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      return items.reduce((acc, curr) => ({ ...acc, [curr.key]: { th: curr.value, en: curr.value, ar: curr.value, ms: curr.value } }), {});
    }
    try {
      const ai = new GoogleGenAI({ apiKey });
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
    result.sort((a, b) => b.lastUpdated - a.lastUpdated);
    if (adminStudentSearch) {
      const search = adminStudentSearch.toLowerCase();
      result = result.filter(s => 
        (s.name || "").toLowerCase().includes(search) || 
        (s.studentId || "").toString().toLowerCase().includes(search)
      );
    }
    if (adminStudentStatusFilter !== 'all') {
      if (adminStudentStatusFilter === ApplicationStatus.PENDING) {
        result = result.filter(s => s.status === ApplicationStatus.PENDING || !s.status);
      } else {
        result = result.filter(s => s.status === adminStudentStatusFilter);
      }
    }
    if (adminStudentMajorFilter !== 'all') {
      result = result.filter(s => s.major === adminStudentMajorFilter);
    }
    if (adminStudentYearFilter !== 'all') {
      result = result.filter(s => String(s.academicYear || '').trim() === adminStudentYearFilter);
    }
    if (adminStudentTermFilter !== 'all') {
      result = result.filter(s => String(s.term || '').trim() === adminStudentTermFilter);
    }
    return result;
  }, [studentStatuses, adminStudentSearch, adminStudentStatusFilter, adminStudentMajorFilter, adminStudentYearFilter, adminStudentTermFilter]);

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredAdminStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredAdminStudents.map(s => s.id));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: ApplicationStatus) => {
    if (selectedStudentIds.length === 0) return;
    
    const updatedStatuses = studentStatuses.map(s => {
      if (selectedStudentIds.includes(s.id)) {
        return { ...s, status: newStatus, lastUpdated: Date.now() };
      }
      return s;
    });
    
    setStudentStatuses(updatedStatuses);
    // Bulk update still uses 'all' for now as we don't have a bulk-update action in GAS yet,
    // but we can pass individual items if we wanted. For now, matching previous successful pattern.
    await syncToSheets('studentStatuses', updatedStatuses, 'all');
    setSelectedStudentIds([]);
    setShowBulkStatusModal(false);
  };

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
      id: editingSchedule?.id || `sch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event: results['event'] || { th: thEvent, en: thEvent, ar: thEvent, ms: thEvent },
      startDate: results['start'] || { th: rawStart, en: rawStart, ar: rawStart, ms: rawStart },
      endDate: results['end'] || { th: rawEnd, en: rawEnd, ar: rawEnd, ms: rawEnd },
      rawStartDate: rawStart,
      rawEndDate: rawEnd,
      status: 'upcoming',
      createdAt: editingSchedule?.createdAt || Date.now()
    };
    
    setSchedules(prev => {
      const updated = editingSchedule ? prev.map(s => s.id === editingSchedule.id ? newEvent : s) : [newEvent, ...prev];
      syncToSheets('schedules', updated, editingSchedule ? 'update' : 'add', newEvent);
      return updated;
    });
    
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
        url = fileData;
      } catch (err) { console.error("File read error:", err); }
      setIsTranslating(false);
    }
    setIsTranslating(true);
    const results = await performBatchTranslation([{ key: 'title', value: thTitle }]);
    setIsTranslating(false);
    const newForm: DocumentForm = {
      id: editingForm?.id || `frm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: results['title'] || { th: thTitle, en: thTitle, ar: thTitle, ms: thTitle },
      category,
      url: url.startsWith('http') || url.startsWith('data:') ? url : (url === "#" ? "#" : `https://${url}`)
    };
    const syncPayload = fileData 
      ? { ...newForm, url: `PENDING_UPLOAD:${selectedFile?.name}`, _fileData: fileData, _fileName: selectedFile?.name }
      : newForm;
      
    setForms(prev => {
      const updated = editingForm ? prev.map(f => f.id === editingForm.id ? newForm : f) : [newForm, ...prev];
      if (fileData) { 
        syncToSheets('uploadForm', [syncPayload], 'add', syncPayload); 
      } else { 
        syncToSheets('forms', updated, editingForm ? 'update' : 'add', newForm); 
      }
      return updated;
    });
    
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
    const thDesc = formData.get('desc_th') as string || "";
    const thPos = formData.get('pos_th') as string;
    setIsTranslating(true);
    const results = await performBatchTranslation([
      { key: 'name', value: thName }, { key: 'loc', value: thLoc },
      { key: 'desc', value: thDesc }, { key: 'pos', value: thPos }
    ]);
    setIsTranslating(false);
    const newSite: InternshipSite = {
      id: editingSite?.id || `site-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: results['name'] || { th: thName, en: thName, ar: thName, ms: thName },
      location: results['loc'] || { th: thLoc, en: thLoc, ar: thLoc, ms: thLoc },
      description: results['desc'] || { th: thDesc, en: thDesc, ar: thDesc, ms: thDesc },
      position: results['pos'] || { th: thPos, en: thPos, ar: thPos, ms: thPos },
      status: formData.get('status') as any,
      major: formData.get('major') as Major, 
      contactLink: (formData.get('contact_link') as string) || "",
      email: (formData.get('email') as string) || "",
      phone: (formData.get('phone') as string) || "",
      createdAt: editingSite?.createdAt || Date.now()
    };
    
    setSites(prev => {
      const updated = editingSite ? prev.map(s => s.id === editingSite.id ? newSite : s) : [newSite, ...prev];
      syncToSheets('sites', updated, editingSite ? 'update' : 'add', newSite);
      return updated;
    });
    
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
        const existingId = (record.studentId || "").toString().trim().replace(/\s+/g, '');
        const existingName = String(record.name || "").trim().replace(/\s+/g, ' ').toLowerCase();
        if (existingId === normStudentId) { duplicateType = "รหัสประจำตัวนักศึกษา"; return true; }
        if (existingName === normName) { duplicateType = "ชื่อ-นามสกุล"; return true; }
        return false;
      });
      if (isDuplicate) {
        setStatusError(`🚨 ตรวจพบข้อมูลซ้ำ: ${duplicateType} "${duplicateType === 'รหัสประจำตัวนักศึกษา' ? rawStudentId : rawName}" มีอยู่แล้วในระบบ คุณแน่ใจหรือไม่ที่จะบันทึกซ้ำ?`);
        setIsForceSaveVisible(true);
        return;
      }
    }
    const newRecord: StudentStatusRecord = {
      id: editingStatusRecord?.id || `st-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studentId: rawStudentId.trim(),
      name: rawName.trim(),
      location: rawLocation.trim() || "",
      position: rawPosition.trim() || "",
      term: rawTerm.trim() || "",
      academicYear: rawYear.trim() || "",
      supervisor: formData.get('supervisor') as string || "",
      status: (formData.get('status') as ApplicationStatus) || modalStatus,
      major: formData.get('major') as Major,
      internshipType: (formData.get('internship_type') as InternshipType) || modalInternshipType,
      startDate: (formData.get('start_date') as string) || modalStartDate || "",
      endDate: (formData.get('end_date') as string) || modalEndDate || "",
      lastUpdated: Date.now()
    };
    
    setStudentStatuses(prev => {
      const updated = editingStatusRecord ? prev.map(s => s.id === editingStatusRecord.id ? newRecord : s) : [newRecord, ...prev];
      try {
        localStorage.setItem('wise_student_statuses', JSON.stringify(updated));
      } catch (err) { console.warn(err); }
      syncToSheets('studentStatuses', updated, editingStatusRecord ? 'update' : 'add', newRecord);
      return updated;
    });
    
    setShowAdminStatusModal(false);
    setEditingStatusRecord(null);
    setStatusError(null);
    setIsForceSaveVisible(false);
  };

  const handleSaveAdminPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newAdminPass.trim()) return;
    
    const updatedAdmins = [...adminPasswords, newAdminPass.trim()];
    setAdminPasswords(updatedAdmins);
    await syncToSheets('admins', updatedAdmins.map(p => ({ password: p })), 'add', { password: newAdminPass.trim() });
    
    setShowAdminPasswordModal(false);
    setNewAdminPass('');
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    
    switch (type) {
      case 'student': 
        setStudentStatuses(prev => {
          const updated = prev.filter(s => s.id !== id);
          syncToSheets('studentStatuses', updated, 'delete', { id });
          return updated;
        });
        break;
      case 'site': 
        setSites(prev => {
          const updated = prev.filter(s => s.id !== id);
          syncToSheets('sites', updated, 'delete', { id });
          return updated;
        });
        break;
      case 'schedule': 
        setSchedules(prev => {
          const updated = prev.filter(s => s.id !== id);
          syncToSheets('schedules', updated, 'delete', { id });
          return updated;
        });
        break;
      case 'form': 
        setForms(prev => {
          const updated = prev.filter(f => f.id !== id);
          syncToSheets('forms', updated, 'delete', { id });
          return updated;
        });
        break;
      case 'admin':
        const passwordToDelete = id; // For admins, the ID being passed is the password itself
        const updatedAdmins = adminPasswords.filter(p => p !== passwordToDelete);
        setAdminPasswords(updatedAdmins);
        syncToSheets('admins', updatedAdmins.map(p => ({ password: p })), 'delete', { password: passwordToDelete });
        break;
    }
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const getFilteredReportStudents = () => {
    let filtered = [...studentStatuses];
    
    // 1. Filter by Major First
    if (reportMajor !== 'all') {
      filtered = filtered.filter(s => s.major === reportMajor);
    }

    // 2. Filter by Mode
    if (exportMode === 'date') {
      if (reportRange.start) filtered = filtered.filter(s => s.startDate && s.startDate >= reportRange.start);
      if (reportRange.end) filtered = filtered.filter(s => s.endDate && s.endDate <= reportRange.end);
    } else {
      const targetTerm = reportPeriod.term.trim();
      const targetYear = reportPeriod.year.trim();
      
      if (targetTerm) {
        filtered = filtered.filter(s => String(s.term || '').trim() === targetTerm);
      }
      if (targetYear) {
        filtered = filtered.filter(s => String(s.academicYear || '').trim() === targetYear);
      }
    }

    return filtered;
  };

  const handleExportExcel = () => {
    const filtered = getFilteredReportStudents();
    if (filtered.length === 0) {
      alert("ไม่พบข้อมูลตามเงื่อนไขที่ระบุ กรุณาตรวจสอบข้อมูลหรือตัวเลือกการกรองอีกครั้ง");
      return;
    }
    exportToExcel(filtered, 'รายงานรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา');
    setShowReportModal(false);
  };

  const handleExportWord = () => {
    const filtered = getFilteredReportStudents();
    if (filtered.length === 0) {
      alert("ไม่พบข้อมูลตามเงื่อนไขที่ระบุ กรุณาตรวจสอบข้อมูลหรือตัวเลือกการกรองอีกครั้ง");
      return;
    }
    exportToWord(filtered, 'รายงานรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา');
    setShowReportModal(false);
  };

  const handleExportPDF = () => {
    const filtered = getFilteredReportStudents();
    if (filtered.length === 0) {
      alert("ไม่พบข้อมูลตามเงื่อนไขที่ระบุ กรุณาตรวจสอบข้อมูลหรือตัวเลือกการกรองอีกครั้ง");
      return;
    }
    exportToPDF(filtered, 'รายงานรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา');
    setShowReportModal(false);
  };

  const handleDownloadReport = () => {
    const filtered = getFilteredReportStudents();
    if (filtered.length === 0) { 
      alert("ไม่พบข้อมูลตามเงื่อนไขที่ระบุ กรุณาตรวจสอบข้อมูลหรือตัวเลือกการกรองอีกครั้ง"); 
      return; 
    }
    
    const headers = ["ID", "Student Name", "Major", "Type", "Location", "Position", "Term", "Year", "Start Date", "End Date", "Status", "Supervisor"];
    const rows = filtered.map(s => [
      `"${s.studentId}"`, `"${s.name}"`, `"${getMajorLabel(s.major)}"`, `"${s.internshipType === InternshipType.INTERNSHIP ? 'Internship' : 'Co-op'}"`,
      `"${s.location || '-'}"`, `"${s.position || '-'}"`, `"${s.term || '-'}"`, `"${s.academicYear || '-'}"`, `"${formatDateBE(s.startDate)}"`, `"${formatDateBE(s.endDate)}"`, `"${getStatusLabel(s.status)}"`, `"${s.supervisor || '-'}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Internship_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setShowReportModal(false);
  };

  const getMajorLabel = (m: Major) => {
    switch(m) {
      case Major.HALAL_FOOD: return 'R&D';
      case Major.DIGITAL_TECH: return 'TDS';
      case Major.INFO_TECH: return 'IT';
      case Major.DATA_SCIENCE: return 'DSA';
      default: return '-';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') { alert('กรุณาเลือกไฟล์ PDF เท่านั้น'); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
      setSelectedFile(file);
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING: return 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20';
      case ApplicationStatus.PREPARING: return 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-600/20';
      case ApplicationStatus.ACCEPTED: return 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-600/20';
      case ApplicationStatus.REJECTED: return 'bg-rose-600 text-white border-rose-700 shadow-sm shadow-rose-600/20';
      default: return 'bg-slate-500 text-white border-slate-600 shadow-sm shadow-slate-500/20';
    }
  };

  const getStatusLabel = (status: ApplicationStatus | 'all') => {
    if (status === 'all') return 'ทั้งหมด';
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
    { id: 'admins', label: 'จัดการรหัสแอดมิน', icon: <ShieldCheck size={20} />, color: 'slate' },
  ];

  // Helper class for consistent input styling
  const inputClass = "w-full px-6 py-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:text-white border-2 border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:bg-white outline-none font-bold text-lg transition-all shadow-sm";
  const labelClass = "text-base font-black uppercase text-black dark:text-white ml-1 tracking-widest block mb-2";

  const handleAddData = () => {
    if (adminActiveTab === 'students') { 
      setEditingStatusRecord(null); 
      setModalStartDate('');
      setModalEndDate('');
      setModalInternshipType(InternshipType.INTERNSHIP);
      setModalStatus(ApplicationStatus.PENDING);
      setStatusError(null); 
      setIsForceSaveVisible(false); 
      setShowAdminStatusModal(true); 
    }
    else if (adminActiveTab === 'sites') { setEditingSite(null); setShowSiteModal(true); }
    else if (adminActiveTab === 'schedule') { setEditingSchedule(null); setShowScheduleModal(true); }
    else if (adminActiveTab === 'admins') {
      setNewAdminPass('');
      setShowAdminPasswordModal(true);
    }
    else { setEditingForm(null); setSelectedFile(null); setUploadMethod('url'); setShowFormModal(true); }
  };

  const handleEditStudent = (record: StudentStatusRecord) => {
    setEditingStatusRecord(record);
    setModalStartDate(formatDateForInput(record.startDate) || '');
    setModalEndDate(formatDateForInput(record.endDate) || '');
    setModalInternshipType(record.internshipType || InternshipType.INTERNSHIP);
    setModalStatus(record.status || ApplicationStatus.PENDING);
    setStatusError(null);
    setIsForceSaveVisible(false);
    setShowAdminStatusModal(true);
  };

  const applyPresetTerm1 = () => {
    const curYear = new Date().getFullYear();
    setModalStartDate(`${curYear}-06-01`);
    setModalEndDate(`${curYear}-10-31`);
  };

  const applyPresetTerm2 = () => {
    const curYear = new Date().getFullYear();
    setModalStartDate(`${curYear}-11-01`);
    setModalEndDate(`${curYear + 1}-03-31`);
  };

  const applyPresetDuration = (months: number) => {
    const base = modalStartDate ? new Date(modalStartDate) : new Date();
    if (isNaN(base.getTime())) return;
    const startStr = base.toISOString().split('T')[0];
    const end = new Date(base);
    end.setMonth(end.getMonth() + months);
    setModalStartDate(startStr);
    setModalEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <>
      <aside className="w-full md:w-44 lg:w-48 flex-shrink-0 flex flex-col h-fit md:h-full overflow-x-auto md:overflow-y-auto hide-scrollbar z-[60]">
         <div className="flex flex-row md:flex-col gap-1 p-1 md:p-0 bg-[#e4d4bc]/80 dark:bg-slate-950/80 backdrop-blur-md md:bg-transparent rounded-2xl h-full">
            <div className="flex flex-row md:flex-col gap-1">
              {adminMenu.map(item => (
                <button
                  key={item.id}
                  onClick={() => setAdminActiveTab(item.id as any)}
                  className={`
                    flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold uppercase text-[10px] min-[400px]:text-xs transition-all whitespace-nowrap md:w-full
                    ${adminActiveTab === item.id 
                      ? `bg-[#630330] text-white shadow-md shadow-[#630330]/20` 
                      : 'bg-white/90 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800'
                    }
                  `}
                >
                  <span className={`shrink-0 ${adminActiveTab === item.id ? 'text-[#D4AF37]' : ''}`}>{React.cloneElement(item.icon as React.ReactElement<any>, { size: 16 })}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
            
            <div className="hidden md:block mt-2 p-3 rounded-xl bg-gradient-to-br from-[#2A0114] to-[#630330] text-white shadow-md border border-white/5">
              <p className="text-[8px] font-black uppercase tracking-widest text-[#D4AF37] mb-0.5">WISE Portal</p>
              <h4 className="font-bold text-[9px] leading-tight opacity-90">ระบบจัดการหลังบ้าน</h4>
              <button onClick={fetchFromSheets} disabled={isLoading} className={`mt-2 flex items-center gap-1.5 text-[8px] font-black uppercase text-[#D4AF37] hover:text-white transition-all ${isLoading ? 'opacity-50' : ''}`}>
                <RefreshCw size={9} className={isLoading ? 'animate-spin' : ''} /> {isLoading ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
              </button>
            </div>

            {/* Bulk Action Area (Sidebar Bottom) */}
            {adminActiveTab === 'students' && selectedStudentIds.length > 0 && (
              <div className="hidden md:flex flex-col mt-auto pt-3 pb-1 animate-in slide-in-from-bottom-5 duration-300">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-400/50 flex flex-col gap-2.5 shadow-lg shadow-indigo-500/10">
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">เลือก</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{selectedStudentIds.length}</span>
                      <span className="text-[10px] font-bold text-slate-400">คน</span>
                    </div>
                    <button 
                      onClick={() => setSelectedStudentIds([])}
                      className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center shadow-sm"
                      title="ยกเลิกการเลือก"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowBulkStatusModal(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Layers size={14} /> แก้ไขกลุ่ม
                  </button>
                </div>
              </div>
            )}
         </div>
      </aside>

      <main className="flex-grow reveal-anim relative min-h-0 flex flex-col overflow-hidden">
        <div className="bg-white/95 dark:bg-slate-900 rounded-3xl sm:rounded-[2.25rem] border border-slate-200/50 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full">
          <header className="flex-shrink-0 z-[50] px-4 sm:px-8 py-3 sm:py-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
             <div className="flex items-center gap-3">
                <div className={`p-2 sm:p-3 rounded-2xl bg-${adminActiveTab === 'students' ? 'amber' : adminActiveTab === 'sites' ? 'rose' : adminActiveTab === 'schedule' ? 'emerald' : 'indigo'}-50 dark:bg-slate-800 text-${adminActiveTab === 'students' ? 'amber' : adminActiveTab === 'sites' ? 'rose' : adminActiveTab === 'schedule' ? 'emerald' : 'indigo'}-600 shadow-inner`}>
                  {React.cloneElement(adminMenu.find(m => m.id === adminActiveTab)?.icon as React.ReactElement<any>, { size: 20 })}
                </div>
                <div>
                  <h2 className="text-base sm:text-2xl font-black uppercase text-slate-900 dark:text-white leading-none tracking-tight">{adminMenu.find(m => m.id === adminActiveTab)?.label}</h2>
                  <p className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Management Suite</p>
                </div>
             </div>
             <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-2.5">
                {adminActiveTab === 'students' && (
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <button 
                      onClick={() => setShowStatsModal(true)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black uppercase text-[11px] flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 transition-all shadow-sm"
                      title="ดูสถิติสรุปยอดนักศึกษา"
                    >
                      <BarChart3 size={15} /> สถิติ
                    </button>
                    <button 
                      onClick={() => setShowReportModal(true)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-black uppercase text-[11px] flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-all shadow-sm"
                      title="ส่งออกรายงานเป็น PDF, Excel, Word หรือ CSV"
                    >
                      <Download size={15} /> ส่งออกรายงาน
                    </button>
                    <button 
                      onClick={() => setIsShareModalOpen(true)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-black uppercase text-[11px] flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 transition-all shadow-sm"
                      title="แชร์รายชื่อให้อาจารย์เพื่อระบุอาจารย์นิเทศ"
                    >
                      <Share2 size={15} /> แชร์รายชื่อ
                    </button>
                    <button 
                      onClick={() => setShowSummaryModal(true)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-black uppercase text-[11px] flex items-center justify-center gap-1.5 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-100 transition-all shadow-sm"
                      title="ดูสรุปภาพรวมรายชื่อทั้งหมด"
                    >
                      <ClipboardList size={15} /> สรุปภาพรวม
                    </button>
                  </div>
                )}
                <div className="relative w-full sm:w-60 md:w-72">
                   <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#630330] dark:group-focus-within:text-amber-400 transition-colors pointer-events-none" />
                   <input 
                     type="text" 
                     placeholder={adminActiveTab === 'students' ? "ค้นหารหัส, ชื่อ, สถานที่..." : "ค้นหาสถานที่, ตำแหน่ง..."} 
                     value={adminActiveTab === 'students' ? adminStudentSearch : adminSiteSearch}
                     onChange={(e) => adminActiveTab === 'students' ? setAdminStudentSearch(e.target.value) : setAdminSiteSearch(e.target.value)}
                     className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] transition-all shadow-sm"
                   />
                   {(adminActiveTab === 'students' ? adminStudentSearch : adminSiteSearch) && (
                     <button
                       type="button"
                       onClick={() => adminActiveTab === 'students' ? setAdminStudentSearch('') : setAdminSiteSearch('')}
                       className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                       title="ล้างคำค้นหา"
                     >
                       <X size={13} />
                     </button>
                   )}
                </div>
                <button 
                  onClick={handleAddData}
                  className="px-4 py-2 rounded-xl bg-[#630330] hover:bg-[#7a0b3d] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#630330]/20 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
                >
                  <Plus size={16} /> เพิ่มข้อมูล
                </button>
             </div>
          </header>

          <div className="flex-grow overflow-y-auto relative custom-scrollbar">
             {/* Subtle Loading Overlay */}
             {isLoading && (
               <div className="absolute inset-0 z-[100] bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none animate-in fade-in duration-500">
                  <div className="flex flex-col items-center gap-4">
                     <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-[#D4AF37]/10 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-4 border-2 border-[#D4AF37]/20 border-b-transparent rounded-full animate-spin-reverse"></div>
                     </div>
                     <div className="flex flex-col items-center">
                        <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] animate-pulse">Synchronizing</p>
                        <div className="flex gap-1 mt-1">
                           <div className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce"></div>
                           <div className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                           <div className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                     </div>
                  </div>
               </div>
             )}
             <div className="sticky top-0 left-0 right-0 h-1 bg-gradient-to-b from-white dark:from-slate-900 to-transparent z-[40] pointer-events-none opacity-80" />
             <div className="px-6 sm:px-8 pb-12">
              {adminActiveTab === 'students' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* 1. Minimalist Interactive Stats Strip & View Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setAdminStudentStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminStudentStatusFilter === 'all'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200/60 dark:border-slate-700'
                        }`}
                      >
                        <Users size={13} /> ทั้งหมด <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/20 font-mono font-bold">{studentStats.total}</span>
                      </button>
                      <button
                        onClick={() => setAdminStudentStatusFilter(ApplicationStatus.ACCEPTED)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminStudentStatusFilter === ApplicationStatus.ACCEPTED
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200/60 dark:border-emerald-800/40'
                        }`}
                      >
                        <Check size={13} /> ตอบรับแล้ว <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-emerald-200/60 dark:bg-emerald-800/40 font-mono font-bold">{studentStats.accepted}</span>
                      </button>
                      <button
                        onClick={() => setAdminStudentStatusFilter(ApplicationStatus.PREPARING)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminStudentStatusFilter === ApplicationStatus.PREPARING
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200/60 dark:border-blue-800/40'
                        }`}
                      >
                        <Clock size={13} /> กำลังจัดเตรียม <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-blue-200/60 dark:bg-blue-800/40 font-mono font-bold">{studentStats.preparing}</span>
                      </button>
                      <button
                        onClick={() => setAdminStudentStatusFilter(ApplicationStatus.PENDING)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminStudentStatusFilter === ApplicationStatus.PENDING
                            ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/60 dark:border-amber-800/40'
                        }`}
                      >
                        <Timer size={13} /> รอตรวจสอบ <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-amber-200/60 dark:bg-amber-800/40 font-mono font-bold">{studentStats.pending}</span>
                      </button>
                      <button
                        onClick={() => setAdminStudentStatusFilter(ApplicationStatus.REJECTED)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminStudentStatusFilter === ApplicationStatus.REJECTED
                            ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200/60 dark:border-rose-800/40'
                        }`}
                      >
                        <X size={13} /> ปฏิเสธ <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-rose-200/60 dark:bg-rose-800/40 font-mono font-bold">{studentStats.rejected}</span>
                      </button>
                    </div>

                    {/* View Switcher: Table vs Cards */}
                    <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                      <button
                        type="button"
                        onClick={() => setStudentViewMode('table')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          studentViewMode === 'table'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                        title="มุมมองตาราง (กระชับ ดูง่าย มีระเบียบ)"
                      >
                        <Table size={14} /> <span className="text-[11px]">ตาราง</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentViewMode('cards')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          studentViewMode === 'cards'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                        title="มุมมองการ์ด"
                      >
                        <LayoutGrid size={14} /> <span className="text-[11px]">การ์ด</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Streamlined Filter Bar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-sm flex flex-wrap items-center gap-2.5 relative z-20">
                     <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                       <div className="p-1 bg-[#2A0114] dark:bg-[#630330] rounded-lg text-white">
                         <Filter size={14} />
                       </div>
                       <span className="font-black text-xs text-slate-700 dark:text-slate-300">
                         ตัวกรอง:
                       </span>
                     </div>

                     <div className="flex-grow grid grid-cols-2 lg:grid-cols-4 gap-2 w-full sm:w-auto">
                         {/* Status Filter */}
                         <div className="relative">
                           <select
                             value={adminStudentStatusFilter}
                             onChange={(e) => setAdminStudentStatusFilter(e.target.value as any)}
                             className={`w-full h-[36px] pl-2.5 pr-7 border rounded-xl font-bold outline-none cursor-pointer appearance-none text-xs transition-all shadow-sm ${getStatusSelectClasses(adminStudentStatusFilter)}`}
                           >
                             <option value="all">สถานะ: ทั้งหมด</option>
                             <option value={ApplicationStatus.PENDING}>รอตรวจสอบ</option>
                             <option value={ApplicationStatus.PREPARING}>กำลังจัดเตรียม</option>
                             <option value={ApplicationStatus.ACCEPTED}>ตอบรับแล้ว</option>
                             <option value={ApplicationStatus.REJECTED}>ปฏิเสธ</option>
                           </select>
                           <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                         </div>

                         {/* Major Filter */}
                         <div className="relative">
                           <select
                             value={adminStudentMajorFilter}
                             onChange={(e) => setAdminStudentMajorFilter(e.target.value as any)}
                             className={`w-full h-[36px] pl-2.5 pr-7 border rounded-xl font-bold outline-none cursor-pointer appearance-none text-xs transition-all shadow-sm ${getMajorSelectClasses(adminStudentMajorFilter)}`}
                           >
                             <option value="all">สาขาวิชา: ทั้งหมด</option>
                             <option value={Major.HALAL_FOOD}>R&D (อาหารฮาลาล)</option>
                             <option value={Major.DIGITAL_TECH}>TDS (ดิจิทัล)</option>
                             <option value={Major.INFO_TECH}>IT (เทคโนโลยีฯ)</option>
                             <option value={Major.DATA_SCIENCE}>DSA (วิทยาการข้อมูล)</option>
                           </select>
                           <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                         </div>

                         {/* Year Filter */}
                         <div className="relative flex items-center border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl h-[36px] px-1 shadow-sm">
                           <button
                             type="button"
                             onClick={handlePrevYear}
                             disabled={adminStudentYearFilter !== 'all' && academicYears.indexOf(adminStudentYearFilter) === academicYears.length - 1}
                             className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                             title="ปีก่อนหน้า"
                           >
                             <ChevronLeft size={14} />
                           </button>
                           <div className="relative flex-grow flex items-center justify-center h-full px-1 text-center">
                             <span className="font-bold text-xs text-slate-700 dark:text-slate-200 select-none pointer-events-none">
                               {adminStudentYearFilter === 'all' ? 'ปี: ทั้งหมด' : `ปี ${adminStudentYearFilter}`}
                             </span>
                             <select
                               value={adminStudentYearFilter}
                               onChange={(e) => setAdminStudentYearFilter(e.target.value)}
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                             >
                               <option value="all">ปี: ทั้งหมด</option>
                               {academicYears.map(year => (
                                 <option key={year} value={year}>{year === currentYearBE ? `${year} (ปัจจุบัน)` : year}</option>
                               ))}
                             </select>
                           </div>
                           <button
                             type="button"
                             onClick={handleNextYear}
                             disabled={adminStudentYearFilter !== 'all' && academicYears.indexOf(adminStudentYearFilter) === 0}
                             className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                             title="ปีถัดไป"
                           >
                             <ChevronRight size={14} />
                           </button>
                         </div>

                         {/* Term Filter */}
                         <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-[36px] p-0.5 gap-0.5 w-full shadow-sm">
                           {[
                             { value: 'all', label: 'ทุกเทอม' },
                             { value: '1', label: 'เทอม 1' },
                             { value: '2', label: 'เทอม 2' },
                           ].map((opt) => (
                             <button
                               key={opt.value}
                               type="button"
                               onClick={() => setAdminStudentTermFilter(opt.value)}
                               className={`flex-grow h-full px-1 rounded-lg font-black text-xs transition-all cursor-pointer flex items-center justify-center ${
                                 adminStudentTermFilter === opt.value 
                                   ? 'bg-white dark:bg-slate-700 text-[#630330] dark:text-amber-400 shadow-sm' 
                                   : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                               }`}
                             >
                               {opt.label}
                             </button>
                           ))}
                         </div>
                     </div>

                     {/* Reset button */}
                     {(adminStudentStatusFilter !== 'all' || adminStudentMajorFilter !== 'all' || adminStudentYearFilter !== currentYearBE || adminStudentTermFilter !== 'all') && (
                       <button
                         onClick={() => {
                           setAdminStudentStatusFilter('all');
                           setAdminStudentMajorFilter('all');
                           setAdminStudentYearFilter(currentYearBE);
                           setAdminStudentTermFilter('all');
                         }}
                         className="h-[34px] px-2.5 rounded-xl text-[10px] font-black uppercase bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/60 transition-all flex items-center gap-1 shadow-sm shrink-0"
                         title="ล้างตัวกรองทั้งหมด"
                       >
                         <X size={13} />
                         <span>ล้าง</span>
                       </button>
                     )}
                  </div>

                  {/* 3. Toolbar: Selection, Count, and Quick Export Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={toggleSelectAllStudents}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {selectedStudentIds.length === filteredAdminStudents.length && filteredAdminStudents.length > 0 ? <ShieldX size={13} /> : <ShieldCheck size={13} />}
                        {selectedStudentIds.length === filteredAdminStudents.length && filteredAdminStudents.length > 0 ? 'ยกเลิกเลือก' : 'เลือกทั้งหมด'}
                      </button>

                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ml-1">
                        พบ <span className="font-black text-slate-900 dark:text-white font-mono">{filteredAdminStudents.length}</span> คน
                        {selectedStudentIds.length > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-[11px]">
                            เลือกแล้ว {selectedStudentIds.length} คน
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Quick Export format buttons right above the table */}
                    <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-0.5 shadow-sm">
                      <button
                        onClick={() => exportToExcel(filteredAdminStudents, 'รายชื่อนักศึกษา')}
                        className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-black transition-all"
                        title="ส่งออกหน้านี้เป็น Excel (.xls)"
                      >
                        <FileSpreadsheet size={13} /> Excel
                      </button>
                      <button
                        onClick={() => exportToWord(filteredAdminStudents, 'รายชื่อนักศึกษา')}
                        className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-black transition-all"
                        title="ส่งออกหน้านี้เป็น Word (.doc)"
                      >
                        <FileText size={13} /> Word
                      </button>
                      <button
                        onClick={() => exportToPDF(filteredAdminStudents, 'รายชื่อนักศึกษา')}
                        className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-black transition-all"
                        title="พิมพ์หรือบันทึกหน้านี้เป็น PDF"
                      >
                        <Printer size={13} /> PDF
                      </button>
                    </div>
                  </div>

                  {/* 4. MAIN DATA VIEW: HIGH-DENSITY TABLE OR CARDS */}
                  {filteredAdminStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center p-6">
                      <Users size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
                      <h4 className="text-base font-black text-slate-700 dark:text-slate-300 uppercase">ไม่พบข้อมูลนักศึกษา</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">ไม่พบรายชื่อนักศึกษาตามเงื่อนไขตัวกรองที่คุณกำหนด ลองปรับเปลี่ยนตัวกรองหรือคำค้นหา</p>
                      <button
                        onClick={() => {
                          setAdminStudentStatusFilter('all');
                          setAdminStudentMajorFilter('all');
                          setAdminStudentYearFilter('all');
                          setAdminStudentTermFilter('all');
                          setAdminStudentSearch('');
                        }}
                        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        แสดงนักศึกษาทั้งหมด
                      </button>
                    </div>
                  ) : studentViewMode === 'table' ? (
                    /* Minimalist High-Density Table View */
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
                          <tr>
                            <th className="px-3 py-2.5 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.length === filteredAdminStudents.length && filteredAdminStudents.length > 0}
                                onChange={toggleSelectAllStudents}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </th>
                            <th className="px-3 py-2.5 w-24">รหัส</th>
                            <th className="px-3 py-2.5 min-w-[150px]">ชื่อ-นามสกุล</th>
                            <th className="px-3 py-2.5 w-24">สาขาวิชา</th>
                            <th className="px-3 py-2.5 w-20">ประเภท</th>
                            <th className="px-3 py-2.5 min-w-[180px]">สถานที่ฝึกงาน / ตำแหน่ง</th>
                            <th className="px-3 py-2.5 min-w-[160px]">ระยะเวลาฝึก (เริ่ม-สิ้นสุด)</th>
                            <th className="px-3 py-2.5 w-20 text-center">เทอม/ปี</th>
                            <th className="px-3 py-2.5 w-28">สถานะ</th>
                            <th className="px-3 py-2.5 min-w-[160px]">อาจารย์นิเทศ</th>
                            <th className="px-3 py-2.5 w-20 text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {filteredAdminStudents.map((record) => {
                            const isSelected = selectedStudentIds.includes(record.id);
                            return (
                              <tr
                                key={record.id}
                                className={`hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition-colors ${
                                  isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''
                                }`}
                              >
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleStudentSelection(record.id)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2 font-mono font-bold text-slate-600 dark:text-slate-400">
                                  {record.studentId}
                                </td>
                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                                  {record.name}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase border whitespace-nowrap ${
                                    record.major === Major.HALAL_FOOD ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    record.major === Major.DIGITAL_TECH ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                    record.major === Major.INFO_TECH ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                    'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  }`}>
                                    {getMajorLabel(record.major)}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    record.internshipType === InternshipType.INTERNSHIP
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                                  }`}>
                                    {record.internshipType === InternshipType.INTERNSHIP ? 'ฝึกงาน' : 'สหกิจ'}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]" title={record.location}>
                                      {record.location || '-'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 truncate max-w-[220px]" title={record.position}>
                                      {record.position || '-'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                  {record.startDate && record.endDate ? (
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                      <Calendar size={12} className="text-indigo-500 shrink-0" />
                                      <span>{formatDateBE(record.startDate)} - {formatDateBE(record.endDate)}</span>
                                    </div>
                                  ) : record.startDate ? (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                                      <Calendar size={12} className="text-slate-400 shrink-0" />
                                      <span>{formatDateBE(record.startDate)} - ไม่ระบุ</span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">ยังไม่ระบุ</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                  {record.term || '-'}/{record.academicYear || '-'}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase border whitespace-nowrap ${getStatusColor(record.status)}`}>
                                    {getStatusLabel(record.status)}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {record.supervisor ? (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs font-bold truncate max-w-[180px]">
                                      <Lock size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <span className="truncate">{record.supervisor}</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleEditStudent(record)}
                                      className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold underline"
                                    >
                                      + ระบุอาจารย์
                                    </button>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditStudent(record)}
                                      className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                                      title="แก้ไขข้อมูล"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setItemToDelete({ id: record.id, type: 'student' }); setShowDeleteModal(true); }}
                                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                      title="ลบข้อมูล"
                                    >
                                      <Trash size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Responsive Card Grid View (Alternative) */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {filteredAdminStudents.map(record => (
                        <div key={record.id} className={`p-4 rounded-2xl border ${selectedStudentIds.includes(record.id) ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-900/20 ring-1 ring-indigo-500/20' : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850'} flex flex-col gap-3 group hover:border-indigo-200 dark:hover:border-slate-700 hover:shadow-md transition-all relative`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight break-words">{record.name}</h4>
                              <p className="text-[11px] font-bold text-slate-400 tracking-wider flex items-center gap-1 mt-0.5"><Fingerprint size={12} /> ID: {record.studentId}</p>
                            </div>
                            <button 
                              type="button"
                              onClick={() => toggleStudentSelection(record.id)}
                              className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${selectedStudentIds.includes(record.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-300 hover:border-indigo-400'}`}
                            >
                              <Check size={14} strokeWidth={selectedStudentIds.includes(record.id) ? 3 : 1.5} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                             <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-slate-400">สถานะ:</span>
                               <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase border mt-0.5 w-fit ${getStatusColor(record.status)}`}>{getStatusLabel(record.status)}</span>
                             </div>
                             <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-slate-400">สาขา:</span>
                               <span className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{getMajorLabel(record.major)}</span>
                             </div>
                             <div className="flex flex-col col-span-2">
                               <span className="text-[10px] font-bold text-slate-400">สถานที่:</span>
                               <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{record.location || '-'} {record.position ? `(${record.position})` : ''}</span>
                             </div>
                             <div className="flex items-center gap-1.5 col-span-2 text-[11px] text-slate-600 dark:text-slate-300">
                               <Calendar size={12} className="text-indigo-500 shrink-0" />
                               <span>{record.startDate && record.endDate ? `${formatDateBE(record.startDate)} - ${formatDateBE(record.endDate)}` : record.startDate ? `${formatDateBE(record.startDate)} - ไม่ระบุ` : 'ยังไม่ระบุระยะเวลา'}</span>
                             </div>
                             {record.supervisor && (
                               <div className="flex items-center gap-1 col-span-2 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                                 <Lock size={12} className="text-emerald-600" /> อ.นิเทศ: {record.supervisor}
                                </div>
                             )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono">เทอม {record.term || '-'}/{record.academicYear || '-'}</span>
                            <div className="flex gap-1">
                              <button onClick={() => handleEditStudent(record)} className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg"><Pencil size={14} /></button>
                              <button onClick={() => { setItemToDelete({ id: record.id, type: 'student' }); setShowDeleteModal(true); }} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg"><Trash size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {adminActiveTab === 'sites' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex flex-wrap items-center gap-2 mb-2 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700 relative z-10">
                    <button onClick={() => setAdminSiteMajorFilter('all')} className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === 'all' ? 'bg-[#630330] text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>ทุกสาขา ({sites.length})</button>
                    <button onClick={() => setAdminSiteMajorFilter(Major.HALAL_FOOD)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === Major.HALAL_FOOD ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'}`}><Salad size={14} /> {currentT.halalMajor}</button>
                    <button onClick={() => setAdminSiteMajorFilter(Major.DIGITAL_TECH)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === Major.DIGITAL_TECH ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-950/20'}`}><Cpu size={14} /> {currentT.digitalMajor}</button>
                    <button onClick={() => setAdminSiteMajorFilter(Major.INFO_TECH)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === Major.INFO_TECH ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'}`}><Network size={14} /> {currentT.infoTechMajor}</button>
                    <button onClick={() => setAdminSiteMajorFilter(Major.DATA_SCIENCE)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${adminSiteMajorFilter === Major.DATA_SCIENCE ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'}`}><Database size={14} /> {currentT.dataScienceMajor}</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredAdminSites.map(site => (
                      <div key={site.id} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between group hover:border-rose-200 hover:shadow-xl transition-all shadow-sm">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-white ${
                            site.major === Major.HALAL_FOOD ? 'bg-amber-500' : site.major === Major.DIGITAL_TECH ? 'bg-blue-600' : site.major === Major.INFO_TECH ? 'bg-indigo-600' : 'bg-emerald-600'
                          } shadow-lg`}>
                            {site.major === Major.HALAL_FOOD ? <Salad size={24} /> : site.major === Major.DIGITAL_TECH ? <Cpu size={24} /> : site.major === Major.INFO_TECH ? <Network size={24} /> : <Database size={24} />}
                          </div>
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
              {adminActiveTab === 'admins' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-700 text-white rounded-2xl shadow-lg">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-lg leading-none uppercase">แอดแอดมินที่เข้าระบบได้</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Access Control List</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-slate-500 uppercase">ทั้งหมด {adminPasswords.length} รหัสผ่าน</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {adminPasswords.map((pass, idx) => (
                      <div key={idx} className="p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between group hover:border-slate-300 hover:shadow-xl transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                            <Fingerprint size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Password</p>
                            <h5 className="font-black text-slate-900 dark:text-white font-mono tracking-wider">••••••••</h5>
                          </div>
                        </div>
                        <button 
                          onClick={() => { setItemToDelete({ id: pass, type: 'admin' }); setShowDeleteModal(true); }} 
                          className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => { setNewAdminPass(''); setShowAdminPasswordModal(true); }}
                      className="p-5 rounded-[1.75rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-center gap-3 group hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 font-black uppercase text-xs"
                    >
                      <Plus size={20} className="group-hover:scale-110 transition-transform" /> เพิ่มรหัสใหม่
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Bulk Action Bar (Mobile Only) */}
              {adminActiveTab === 'students' && selectedStudentIds.length > 0 && (
                <div className="md:hidden fixed bottom-6 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10 duration-500">
                  <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-indigo-500/30 p-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-4 ring-8 ring-indigo-500/5">
                    <div className="flex items-center gap-3 pl-2">
                       <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{selectedStudentIds.length}</span>
                       <span className="text-xs font-black text-slate-400 uppercase">คน</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowBulkStatusModal(true)}
                        className="px-10 py-5 bg-indigo-600 text-white text-sm font-black uppercase rounded-2xl shadow-2xl shadow-indigo-500/40 transition-all active:scale-90 flex items-center gap-3 tracking-wider"
                      >
                        <Layers size={24} strokeWidth={3} /> แก้ไขสถานะกลุ่ม
                      </button>
                      <button onClick={() => setSelectedStudentIds([])} className="p-3 text-slate-400 hover:text-rose-500 transition-colors"><X size={28} /></button>
                    </div>
                  </div>
                </div>
              )}
             </div>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* STATS MODAL */}
      {showStatsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md reveal-anim" onClick={() => setShowStatsModal(false)}>
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 shadow-3xl border border-slate-100 dark:border-slate-800 overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={(e) => e.stopPropagation()}>
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-[1.25rem] shadow-inner">
                      <BarChart3 size={32} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">สถิติสรุปยอด</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase mt-1.5 tracking-widest">Internship & Co-op Statistics</p>
                   </div>
                </div>
                <button onClick={() => setShowStatsModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
             </div>

             {/* Filters */}
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สาขาวิชา</label>
                   <select 
                     value={statsFilter.major} 
                     onChange={(e) => setStatsFilter(prev => ({ ...prev, major: e.target.value as any }))}
                     className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                   >
                     <option value="all">ทั้งหมด</option>
                     <option value={Major.HALAL_FOOD}>R&D</option>
                     <option value={Major.DIGITAL_TECH}>TDS</option>
                     <option value={Major.INFO_TECH}>IT</option>
                     <option value={Major.DATA_SCIENCE}>DSA</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เทอม</label>
                   <select 
                     value={statsFilter.term} 
                     onChange={(e) => setStatsFilter(prev => ({ ...prev, term: e.target.value }))}
                     className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                   >
                     <option value="all">ทั้งหมด</option>
                     <option value="1">1</option>
                     <option value="2">2</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ปีการศึกษา</label>
                   <select 
                     value={statsFilter.year} 
                     onChange={(e) => setStatsFilter(prev => ({ ...prev, year: e.target.value }))}
                     className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                   >
                     <option value="all">ทั้งหมด</option>
                     {academicYears.map(year => (
                       <option key={year} value={year}>{year}</option>
                     ))}
                   </select>
                </div>
             </div>

             {/* Stats Grid */}
             {(() => {
                const filtered = studentStatuses.filter(s => {
                  const majorMatch = statsFilter.major === 'all' || s.major === statsFilter.major;
                  const termMatch = statsFilter.term === 'all' || String(s.term || '').trim() === statsFilter.term;
                  const yearMatch = statsFilter.year === 'all' || String(s.academicYear || '').trim() === statsFilter.year;
                  return majorMatch && termMatch && yearMatch;
                });

                const total = filtered.length;
                const byStatus = filtered.reduce((acc, s) => {
                  acc[s.status] = (acc[s.status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const byType = filtered.reduce((acc, s) => {
                  acc[s.internshipType] = (acc[s.internshipType] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const locations = filtered.reduce((acc, s) => {
                  if (s.location) {
                    acc[s.location] = (acc[s.location] || 0) + 1;
                  }
                  return acc;
                }, {} as Record<string, number>);

                const topLocations = Object.entries(locations)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5);

                return (
                  <div className="space-y-8">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">นักศึกษาทั้งหมด</p>
                          <h4 className="text-4xl font-black text-slate-900 dark:text-white">{total} <span className="text-base font-bold text-slate-400">คน</span></h4>
                       </div>
                       <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/20">
                          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">ตอบรับแล้ว</p>
                          <h4 className="text-4xl font-black text-emerald-600">{byStatus[ApplicationStatus.ACCEPTED] || 0} <span className="text-base font-bold text-emerald-400">คน</span></h4>
                       </div>
                       <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-[2rem] border border-amber-100 dark:border-amber-900/20">
                          <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">รอตรวจสอบ</p>
                          <h4 className="text-4xl font-black text-amber-600">{byStatus[ApplicationStatus.PENDING] || 0} <span className="text-base font-bold text-amber-400">คน</span></h4>
                       </div>
                       <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-[2rem] border border-blue-100 dark:border-blue-900/20">
                          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">กำลังจัดเตรียม</p>
                          <h4 className="text-4xl font-black text-blue-600">{byStatus[ApplicationStatus.PREPARING] || 0} <span className="text-base font-bold text-blue-400">คน</span></h4>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Top Locations */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                             <MapPin size={18} className="text-rose-500" />
                             <h5 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">สถานที่ยอดนิยม (Top 5)</h5>
                          </div>
                          <div className="space-y-3">
                             {topLocations.length > 0 ? topLocations.map(([loc, count], idx) => (
                               <div key={loc} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                  <div className="flex items-center gap-3 min-w-0">
                                     <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-400">{idx + 1}</div>
                                     <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{loc}</span>
                                  </div>
                                  <span className="text-sm font-black text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-3 py-1 rounded-lg">{count} คน</span>
                               </div>
                             )) : (
                               <div className="py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest italic">ไม่มีข้อมูลสถานที่</div>
                             )}
                          </div>
                       </div>

                       {/* Breakdown by Type */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                             <PieChart size={18} className="text-indigo-500" />
                             <h5 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">สัดส่วนรูปแบบการฝึก</h5>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                             <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-600"><Briefcase size={24} /></div>
                                   <div>
                                      <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">ฝึกงาน (Internship)</p>
                                      <h6 className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{byType[InternshipType.INTERNSHIP] || 0} คน</h6>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-3xl font-black text-indigo-600">{total > 0 ? Math.round(((byType[InternshipType.INTERNSHIP] || 0) / total) * 100) : 0}%</p>
                                </div>
                             </div>
                             <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-emerald-600"><GraduationCap size={24} /></div>
                                   <div>
                                      <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">สหกิจศึกษา (Co-op)</p>
                                      <h6 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{byType[InternshipType.COOP] || 0} คน</h6>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-2xl font-black text-emerald-600">{total > 0 ? Math.round(((byType[InternshipType.COOP] || 0) / total) * 100) : 0}%</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                );
             })()}
          </div>
        </div>
      )}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md reveal-anim" onClick={() => setShowReportModal(false)}>
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 shadow-3xl border border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-[1.25rem] shadow-inner">
                      <FileSpreadsheet size={32} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">Export Summary</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase mt-1.5 tracking-widest">Select Export Filters</p>
                   </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
             </div>

             <div className="space-y-6">
               {/* Major Selection */}
               <div className="space-y-2">
                 <label className={labelClass}>กรองตามสาขาวิชา</label>
                 <div className="relative">
                   <select 
                     value={reportMajor} 
                     onChange={(e) => setReportMajor(e.target.value as any)} 
                     className={`${inputClass} appearance-none cursor-pointer`}
                   >
                     <option value="all">ทุกสาขาวิชา (All Majors)</option>
                     <option value={Major.HALAL_FOOD}>R&D</option>
                     <option value={Major.DIGITAL_TECH}>TDS</option>
                     <option value={Major.INFO_TECH}>IT</option>
                     <option value={Major.DATA_SCIENCE}>DSA</option>
                   </select>
                   <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={24} />
                 </div>
               </div>

               {/* Filter Mode Toggle */}
               <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                 <button onClick={() => setExportMode('date')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black uppercase text-xs transition-all ${exportMode === 'date' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}><CalendarRange size={16} /> กรองตามวันที่</button>
                 <button onClick={() => setExportMode('period')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black uppercase text-xs transition-all ${exportMode === 'period' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}><GraduationIcon size={16} /> กรองตามเทอม/ปี</button>
               </div>

               <div className="min-h-[120px]">
                  {exportMode === 'date' ? (
                    <div className="grid grid-cols-2 gap-6 reveal-anim">
                       <div className="space-y-2">
                          <label className={labelClass}>วันที่เริ่มต้น</label>
                          <input type="date" value={reportRange.start} onChange={(e) => setReportRange(prev => ({ ...prev, start: e.target.value }))} className={inputClass} />
                       </div>
                       <div className="space-y-2">
                          <label className={labelClass}>วันที่สิ้นสุด</label>
                          <input type="date" value={reportRange.end} onChange={(e) => setReportRange(prev => ({ ...prev, end: e.target.value }))} className={inputClass} />
                       </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6 reveal-anim">
                       <div className="space-y-2">
                          <label className={labelClass}>เทอม (Semester)</label>
                          <select value={reportPeriod.term} onChange={(e) => setReportPeriod(prev => ({ ...prev, term: e.target.value }))} className={inputClass}>
                            <option value="">ทั้งหมด</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className={labelClass}>ปีการศึกษา (BE)</label>
                          <select value={reportPeriod.year} onChange={(e) => setReportPeriod(prev => ({ ...prev, year: e.target.value }))} className={inputClass}>
                            <option value="">ทั้งหมด</option>
                            {academicYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                       </div>
                    </div>
                  )}
               </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex gap-3 items-center">
                   <Info size={20} className="text-slate-400 shrink-0" />
                   <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                     เลือกรูปแบบไฟล์ที่ต้องการส่งออก ระบบจะจัดรูปแบบตาราง หัวกระดาษ และข้อมูลนักศึกษาตามเงื่อนไขที่เลือกให้อัตโนมัติ
                   </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={handleExportExcel} 
                    className="py-4 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet size={22} />
                    <span>ส่งออกเป็น Excel (.xls)</span>
                  </button>

                  <button 
                    onClick={handleExportWord} 
                    className="py-4 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <FileText size={22} />
                    <span>ส่งออกเป็น Word (.doc)</span>
                  </button>

                  <button 
                    onClick={handleExportPDF} 
                    className="py-4 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs shadow-lg shadow-rose-600/20 hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <Printer size={22} />
                    <span>พิมพ์ / บันทึก PDF</span>
                  </button>
                </div>

                <div className="text-center pt-1">
                  <button 
                    onClick={handleDownloadReport} 
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                  >
                    ดาวน์โหลดเป็นไฟล์ .CSV ดิบ (Raw CSV)
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md reveal-anim" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center relative" onClick={(e) => e.stopPropagation()}>
             <button onClick={() => setShowDeleteModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               <X size={24} className="text-slate-400" />
             </button>
             <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <AlertTriangle size={40} />
             </div>
             <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-3 tracking-tight">ยืนยันการลบข้อมูล?</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-8 leading-relaxed px-4">การดำเนินการนี้จะลบข้อมูลออกจากระบบอย่างถาวรและไม่สามารถย้อนกลับได้</p>
             <div className="flex gap-4 w-full">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-xs">ยกเลิก</button>
                <button onClick={handleConfirmDelete} className="flex-1 py-4 rounded-xl bg-rose-600 text-white font-black uppercase text-xs shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all">ยืนยันลบข้อมูล</button>
             </div>
          </div>
        </div>
      )}

      {/* STUDENT STATUS MODAL - MINIMALIST HIGH USABILITY */}
      {showAdminStatusModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md reveal-anim touch-auto" onClick={() => { setShowAdminStatusModal(false); setStatusError(null); setIsForceSaveVisible(false); }}>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-y-auto max-h-[92svh] relative custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button"
              onClick={() => { setShowAdminStatusModal(false); setStatusError(null); setIsForceSaveVisible(false); }} 
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">
                  {editingStatusRecord ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มข้อมูลนักศึกษาใหม่'}
                </h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  {editingStatusRecord ? `รหัส: ${editingStatusRecord.studentId}` : 'กรอกรายละเอียดเพื่อบันทึกสถานะการฝึกงานหรือสหกิจศึกษา'}
                </p>
              </div>
            </div>

            <form ref={studentStatusFormRef} onSubmit={(e) => handleSaveStatus(e)} className="space-y-5">
              {/* Section 1: ข้อมูลนักศึกษา */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">1. ข้อมูลนักศึกษา</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">รหัสนักศึกษา *</label>
                    <input 
                      name="student_id" 
                      defaultValue={editingStatusRecord?.studentId} 
                      required 
                      placeholder="เช่น 406559001" 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">ชื่อ-นามสกุล *</label>
                    <input 
                      name="student_name" 
                      defaultValue={editingStatusRecord?.name} 
                      required 
                      placeholder="เช่น นายฮาซัน ดือราแม" 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] transition-all" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">สาขาวิชาเอก</label>
                    <div className="relative">
                      <select 
                        name="major" 
                        defaultValue={editingStatusRecord?.major || Major.HALAL_FOOD}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] transition-all appearance-none cursor-pointer"
                      >
                        <option value={Major.HALAL_FOOD}>R&D (อาหารฮาลาล)</option>
                        <option value={Major.DIGITAL_TECH}>TDS (เทคโนโลยีดิจิทัล)</option>
                        <option value={Major.INFO_TECH}>IT (เทคโนโลยีสารสนเทศ)</option>
                        <option value={Major.DATA_SCIENCE}>DSA (วิทยาการข้อมูล)</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">รูปแบบการฝึก</label>
                    <div className="grid grid-cols-2 gap-2 h-[42px]">
                      <button
                        type="button"
                        onClick={() => setModalInternshipType(InternshipType.INTERNSHIP)}
                        className={`h-full rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          modalInternshipType === InternshipType.INTERNSHIP
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Briefcase size={14} /> ฝึกงาน
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalInternshipType(InternshipType.COOP)}
                        className={`h-full rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          modalInternshipType === InternshipType.COOP
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <GraduationCap size={14} /> สหกิจ
                      </button>
                    </div>
                    <input type="hidden" name="internship_type" value={modalInternshipType} />
                  </div>
                </div>
              </div>

              {/* Section 2: สถานที่และอาจารย์นิเทศ */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">2. สถานที่ฝึกงานและอาจารย์นิเทศ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">สถานที่ฝึกงาน / หน่วยงาน</label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="location" 
                        defaultValue={editingStatusRecord?.location} 
                        placeholder="ชื่อบริษัท หรือ องค์กร" 
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">ตำแหน่งงาน</label>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="position" 
                        defaultValue={editingStatusRecord?.position} 
                        placeholder="เช่น Web Developer, QA" 
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] transition-all" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">อาจารย์นิเทศ (Supervisor)</label>
                  <div className="relative">
                    <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      name="supervisor" 
                      defaultValue={editingStatusRecord?.supervisor} 
                      placeholder="ระบุชื่ออาจารย์นิเทศประจำตัวนักศึกษา (ถ้ามี)" 
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: ระยะเวลาและภาคการศึกษา (Easy Date Picker) */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">3. ภาคการศึกษาและระยะเวลาฝึก</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">ปุ่มลัดเลือกช่วงเวลาได้เร็ว</span>
                </div>

                {/* Term & Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">ภาคเรียน (Semester)</label>
                    <select 
                      name="term" 
                      defaultValue={editingStatusRecord?.term || '1'} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] cursor-pointer"
                    >
                      <option value="1">ภาคเรียนที่ 1</option>
                      <option value="2">ภาคเรียนที่ 2</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">ปีการศึกษา</label>
                    <select 
                      name="academic_year" 
                      defaultValue={editingStatusRecord?.academicYear || currentYearBE} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] cursor-pointer"
                    >
                      {academicYears.map(year => (
                        <option key={year} value={year}>ปี {year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">กำหนดเร็ว:</span>
                  <button
                    type="button"
                    onClick={applyPresetTerm1}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer"
                  >
                    🗓️ เทอม 1 (มิ.ย.-ต.ค.)
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetTerm2}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer"
                  >
                    🗓️ เทอม 2 (พ.ย.-มี.ค.)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(2)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer"
                  >
                    +2 เดือน (ฝึกงาน)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(4)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-all cursor-pointer"
                  >
                    +4 เดือน (สหกิจ)
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">วันที่เริ่มฝึก</label>
                    <input 
                      type="date" 
                      name="start_date" 
                      value={modalStartDate}
                      onChange={(e) => setModalStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">วันที่สิ้นสุด</label>
                    <input 
                      type="date" 
                      name="end_date" 
                      value={modalEndDate}
                      onChange={(e) => setModalEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#630330]/20 focus:border-[#630330] transition-all" 
                    />
                  </div>
                </div>

                {/* Thai Date Preview */}
                {modalStartDate && modalEndDate ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <Calendar size={14} className="text-emerald-600 shrink-0" />
                    <span>ระยะเวลา: {formatDateBE(modalStartDate)} ถึง {formatDateBE(modalEndDate)}</span>
                  </div>
                ) : modalStartDate ? (
                  <div className="text-[11px] text-slate-500 font-medium">
                    เริ่ม: {formatDateBE(modalStartDate)} (ยังไม่ระบุวันสิ้นสุด)
                  </div>
                ) : null}
              </div>

              {/* Section 4: สถานะปัจจุบัน */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">4. สถานะปัจจุบัน</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: ApplicationStatus.ACCEPTED, label: 'ตอบรับแล้ว', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm' },
                    { id: ApplicationStatus.PREPARING, label: 'กำลังจัดเตรียม', activeClass: 'bg-blue-600 text-white border-blue-600 shadow-sm' },
                    { id: ApplicationStatus.PENDING, label: 'รอตรวจสอบ', activeClass: 'bg-amber-600 text-white border-amber-600 shadow-sm' },
                    { id: ApplicationStatus.REJECTED, label: 'ปฏิเสธ', activeClass: 'bg-rose-600 text-white border-rose-600 shadow-sm' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setModalStatus(st.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        modalStatus === st.id
                          ? st.activeClass
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="status" value={modalStatus} />
              </div>

              {statusError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-2">
                  <div className="flex gap-2.5 items-start">
                    <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{statusError}</p>
                  </div>
                  {isForceSaveVisible && (
                    <button 
                      type="button" 
                      onClick={() => handleSaveStatus(undefined, true)} 
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition-all"
                    >
                      ยืนยันบันทึกข้อมูลซ้ำ
                    </button>
                  )}
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => { setShowAdminStatusModal(false); setStatusError(null); setIsForceSaveVisible(false); }} 
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={isSyncing} 
                  className="flex-1 py-3 rounded-xl bg-[#630330] hover:bg-[#7a0b3d] text-white font-bold text-xs shadow-md shadow-[#630330]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSyncing ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim" onClick={() => setShowScheduleModal(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowScheduleModal(false)} className="absolute top-8 right-8 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={24} className="text-slate-400" /></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-10 uppercase flex items-center gap-4"><CalendarDays size={32} className="text-emerald-500" />จัดการกำหนดการ</h3>
            <form onSubmit={handleSaveSchedule} className="space-y-6">
              <div className="space-y-2">
                <label className={labelClass}>ชื่อกิจกรรม / หัวข้อ</label>
                <input name="event_th" defaultValue={editingSchedule?.event.th} required placeholder="ระบุชื่อกิจกรรม" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelClass}>วันที่เริ่มต้น</label>
                  <input type="date" name="start_th" defaultValue={formatDateForInput(editingSchedule?.rawStartDate)} required className={`${inputClass} border-emerald-100 focus:border-emerald-500`} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>วันที่สิ้นสุด</label>
                  <input type="date" name="end_th" defaultValue={formatDateForInput(editingSchedule?.rawEndDate)} required className={`${inputClass} border-rose-100 focus:border-rose-500`} />
                </div>
              </div>
              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-xs">ยกเลิก</button>
                <button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-5 rounded-2xl bg-emerald-600 text-white font-black uppercase text-sm shadow-xl shadow-emerald-600/20 disabled:opacity-50">{isTranslating ? 'SYNCING...' : 'บันทึกข้อมูล'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim" onClick={() => setShowFormModal(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowFormModal(false)} className="absolute top-8 right-8 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={24} className="text-slate-400" /></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-10 uppercase flex items-center gap-4"><FileText size={32} className="text-indigo-500" />จัดการเอกสาร</h3>
            <form onSubmit={handleSaveForm} className="space-y-6">
              <div className="space-y-2">
                <label className={labelClass}>ชื่อเรียกเอกสาร</label>
                <input name="title" defaultValue={editingForm?.title.th} required placeholder="ระบุชื่อเอกสาร (เช่น แบบฟอร์ม วบง. 01)" className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>หมวดหมู่เอกสาร</label>
                <select name="category" defaultValue={editingForm?.category || FormCategory.APPLICATION} className={`${inputClass} cursor-pointer`}>
                  <option value={FormCategory.APPLICATION}>เอกสารสมัครงาน (Application)</option>
                  <option value={FormCategory.MONITORING}>เอกสารระหว่างฝึกงาน (Monitoring)</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className={labelClass}>แหล่งที่มาไฟล์</label>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setUploadMethod('url')} className={`py-4 rounded-xl border-2 font-black text-xs transition-all ${uploadMethod === 'url' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>URL LINK</button>
                  <button type="button" onClick={() => setUploadMethod('file')} className={`py-4 rounded-xl border-2 font-black text-xs transition-all ${uploadMethod === 'file' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>UPLOAD PDF</button>
                </div>
                {uploadMethod === 'url' ? (
                  <input name="url" defaultValue={editingForm?.url} placeholder="https://..." className={inputClass} />
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="group py-10 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer text-center hover:border-indigo-500 transition-all">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                    <Upload size={32} className="mx-auto text-slate-300 group-hover:text-indigo-500 mb-3" />
                    <p className="text-sm font-black uppercase text-black dark:text-white group-hover:text-indigo-600 tracking-wider leading-none">{selectedFile ? selectedFile.name : 'คลิกเพื่อเลือกไฟล์ PDF'}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-xs">ยกเลิก</button>
                <button type="submit" disabled={isTranslating || isSyncing || (uploadMethod === 'file' && !selectedFile)} className="flex-1 py-5 rounded-2xl bg-indigo-600 text-white font-black uppercase text-sm shadow-xl shadow-indigo-600/20 disabled:opacity-50">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUMMARY MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md reveal-anim" onClick={() => setShowSummaryModal(false)}>
          <div className="w-full max-w-[98vw] lg:max-w-7xl bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-6 shadow-3xl flex flex-col max-h-[95svh] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400"><ClipboardList size={28} /></div>
                <div>
                  <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white leading-none">สรุปภาพรวมการฝึกงาน</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Student Internship Summary View (Global)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSummaryConfigured && (
                  <button 
                    onClick={() => setIsSummaryConfigured(false)}
                    className="px-4 py-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                  >
                    เปลี่ยนตัวกรอง
                  </button>
                )}
                <button onClick={() => setShowSummaryModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
              </div>
            </header>

            <div className="flex-1 min-h-0 flex flex-col relative">
               {isSummaryConfigured ? (
                 <div className="flex flex-col flex-1 min-h-0 px-2 overflow-hidden">
                   <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <div className="flex flex-wrap gap-2">
                        {summaryFilter.years.length > 0 ? summaryFilter.years.map(y => (
                          <span key={y} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black">ปีการศึกษา {y}</span>
                        )) : <span className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 rounded-lg text-[10px] font-black">ทุกปีการศึกษา</span>}
                        
                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        
                        {summaryFilter.terms.length > 0 ? summaryFilter.terms.map(t => (
                          <span key={t} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black">ภาคเรียน {t}</span>
                        )) : <span className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 rounded-lg text-[10px] font-black">ทุกภาคเรียน</span>}
                     </div>

                     <button 
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('view', 'summary');
                          if (summaryFilter.years.length > 0) params.set('years', summaryFilter.years.join(','));
                          if (summaryFilter.terms.length > 0) params.set('terms', summaryFilter.terms.join(','));
                          
                          setIsShareModalOpen(true);
                        }}
                        className="flex items-center gap-3 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                      >
                        <Share2 size={16} /> แชร์ลิงก์สรุปนี้
                      </button>
                   </div>
                   
                   <div className="flex-1 min-h-0 flex flex-col">
                     <SharedSummaryTable 
                       students={summaryStudents} 
                       formatDateBE={formatDateBE}
                       onSupervisorChange={(id: string, name: string) => {
                         const updated = studentStatuses.map(s => s.id === id ? { ...s, supervisor: name, lastUpdated: Date.now() } : s);
                         setStudentStatuses(updated);
                         syncToSheets('studentStatuses', updated);
                       }}
                     />
                   </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-white dark:bg-slate-900/40 rounded-[2rem] reveal-anim overflow-y-auto">
                    <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">เลือกข้อมูลสรุป</h3>
                    <p className="text-slate-400 font-bold mb-8 max-w-md mx-auto leading-relaxed">กำหนดขอบเขตข้อมูล ปีการศึกษา และภาคเรียน ที่คุณต้องการแชร์หรือเข้าชม</p>
 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl mb-10 px-4">
                       {/* Year Selection Dropdown */}
                       <div className="space-y-1 text-left">
                          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-1 tracking-wider">
                             <Calendar size={12} className="text-indigo-500" /> ปีการศึกษาที่ต้องการแชร์
                          </label>
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setYearDropdownOpen(!yearDropdownOpen);
                                setTermDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-slate-800 border-2 rounded-2xl text-sm font-bold transition-all shadow-sm ${
                                yearDropdownOpen ? 'border-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-900/10' : 'border-slate-200 dark:border-slate-700'
                              } ${summaryFilter.years.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}
                            >
                              <span className="truncate">
                                {summaryFilter.years.length === 0 ? 'ทุกปีการศึกษา (ทั้งหมด)' : `เลือกแล้ว ${summaryFilter.years.length} ปี (${summaryFilter.years.join(', ')})`}
                              </span>
                              <ChevronDown size={20} className={`text-slate-400 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {yearDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[250] animate-in fade-in zoom-in-95 duration-200">
                                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 p-1">
                                  <button 
                                    onClick={() => {
                                      setSummaryFilter(p => ({ ...p, years: [] }));
                                      setYearDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                                      summaryFilter.years.length === 0 ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${summaryFilter.years.length === 0 ? 'border-white bg-white' : 'border-slate-300'}`}>
                                      {summaryFilter.years.length === 0 && <div className="w-2 h-2 rounded-sm bg-indigo-600"></div>}
                                    </div>
                                    ทุกปีการศึกษา
                                  </button>
                                  {yearsOptions.map(y => (
                                   <button 
                                     key={y}
                                     onClick={() => toggleSummaryYear(y)}
                                     className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                                       summaryFilter.years.includes(y) ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500'
                                     }`}
                                   >
                                     <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${summaryFilter.years.includes(y) ? 'border-white bg-white' : 'border-slate-300'}`}>
                                       {summaryFilter.years.includes(y) && <div className="w-2 h-2 rounded-sm bg-indigo-600"></div>}
                                     </div>
                                     ปี {y}
                                   </button>
                                 ))}
                                </div>
                              </div>
                            )}
                          </div>
                       </div>
 
                       {/* Term Selection Dropdown */}
                       <div className="space-y-1 text-left">
                          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-1 tracking-wider">
                             <BookOpen size={12} className="text-emerald-500" /> ภาคเรียนที่ต้องการแชร์
                          </label>
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setTermDropdownOpen(!termDropdownOpen);
                                setYearDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-slate-800 border-2 rounded-2xl text-sm font-bold transition-all shadow-sm ${
                                termDropdownOpen ? 'border-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/10' : 'border-slate-200 dark:border-slate-700'
                              } ${summaryFilter.terms.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}
                            >
                              <span className="truncate">
                                {summaryFilter.terms.length === 0 ? 'ทุกภาคเรียน (ทั้งหมด)' : `เลือกแล้ว ${summaryFilter.terms.length} เทอม (${summaryFilter.terms.join(', ')})`}
                              </span>
                              <ChevronDown size={20} className={`text-slate-400 transition-transform ${termDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {termDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[250] animate-in fade-in zoom-in-95 duration-200">
                                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 p-1">
                                  <button 
                                    onClick={() => {
                                      setSummaryFilter(p => ({ ...p, terms: [] }));
                                      setTermDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                                      summaryFilter.terms.length === 0 ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${summaryFilter.terms.length === 0 ? 'border-white bg-white' : 'border-slate-300'}`}>
                                      {summaryFilter.terms.length === 0 && <div className="w-2 h-2 rounded-sm bg-emerald-600"></div>}
                                    </div>
                                    ทุกภาคเรียน
                                  </button>
                                  {termsOptions.map(t => (
                                   <button 
                                     key={t}
                                     onClick={() => toggleSummaryTerm(t)}
                                     className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                                       summaryFilter.terms.includes(t) ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500'
                                     }`}
                                   >
                                     <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${summaryFilter.terms.includes(t) ? 'border-white bg-white' : 'border-slate-300'}`}>
                                       {summaryFilter.terms.includes(t) && <div className="w-2 h-2 rounded-sm bg-emerald-600"></div>}
                                     </div>
                                     ภาคเรียน {t}
                                   </button>
                                 ))}
                                </div>
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
 
                    <button 
                      onClick={() => setIsSummaryConfigured(true)}
                      className="w-full max-w-sm py-5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-[2rem] font-black uppercase shadow-3xl hover:scale-105 active:scale-95 transition-all text-base flex items-center justify-center gap-3 group"
                    >
                      ประมวลผลข้อมูลสรุป <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
               )}
            </div>
            
            <footer className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                แสดงข้อมูลนักศึกษาทั้งหมด {summaryStudents.length} คน (ตามเงื่อนไขตัวกรอง)
              </p>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-sm shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-700"
              >
                เสร็จสิ้น
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* INTERNSHIP SITE MODAL */}
      {/* Floating Action Button for Mobile */}
      <button 
        onClick={handleAddData}
        className={`sm:hidden fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full bg-${adminMenu.find(m => m.id === adminActiveTab)?.color}-600 text-white shadow-2xl flex items-center justify-center active:scale-90 transition-all border-4 border-white dark:border-slate-900`}
      >
        <Plus size={28} strokeWidth={3} />
      </button>

      {showSiteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim" onClick={() => setShowSiteModal(false)}>
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 overflow-y-auto max-h-[90svh] relative custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowSiteModal(false)} className="absolute top-8 right-8 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={24} className="text-slate-400" /></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-10 uppercase flex items-center gap-4"><Building2 size={32} className="text-rose-600" />จัดการข้อมูลสถานประกอบการ</h3>
            <form onSubmit={handleSaveSite} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className={labelClass}>ชื่อหน่วยงาน / บริษัท (ภาษาไทย)</label>
                  <input name="name_th" defaultValue={editingSite?.name.th} required placeholder="ระบุชื่อบริษัท" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>จังหวัดที่ตั้ง</label>
                  <input name="loc_th" defaultValue={editingSite?.location.th} required placeholder="ระบุจังหวัด" className={inputClass} />
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>รายละเอียดงานเบื้องต้น</label>
                <textarea name="desc_th" defaultValue={editingSite?.description.th} placeholder="ระบุลักษณะงานพอสังเขป..." className={`${inputClass} min-h-[120px] shadow-inner`}></textarea>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className={labelClass}>ตำแหน่งที่เปิดรับ</label>
                  <input name="pos_th" defaultValue={editingSite?.position.th} required placeholder="เช่น Full Stack Developer, QC Officer" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>กลุ่มสาขาวิชา</label>
                  <div className="relative">
                    <select 
                      name="major" 
                      defaultValue={editingSite?.major || Major.HALAL_FOOD} 
                      className={`${inputClass} appearance-none cursor-pointer`}
                    >
                      <option value={Major.HALAL_FOOD}>R&D</option>
                      <option value={Major.DIGITAL_TECH}>TDS</option>
                      <option value={Major.INFO_TECH}>IT</option>
                      <option value={Major.DATA_SCIENCE}>DSA</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={24} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2"><label className={labelClass}>เว็บไซต์ (URL)</label><input name="contact_link" defaultValue={editingSite?.contactLink} placeholder="https://..." className={`${inputClass} text-sm`} /></div>
                <div className="space-y-2"><label className={labelClass}>อีเมลติดต่อ</label><input type="email" name="email" defaultValue={editingSite?.email} placeholder="hr@company.com" className={`${inputClass} text-sm`} /></div>
                <div className="space-y-2"><label className={labelClass}>เบอร์โทรศัพท์</label><input name="phone" defaultValue={editingSite?.phone} placeholder="08X-XXX-XXXX" className={`${inputClass} text-sm`} /></div>
              </div>
              <div className="space-y-4 pt-2">
                <label className={labelClass}>สถานะการแสดงผล</label>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center justify-center py-5 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer border-2 border-slate-200 dark:border-slate-700 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/30 transition-all shadow-sm"><input type="radio" name="status" value="active" defaultChecked={!editingSite || editingSite.status === 'active'} className="hidden" /><span className="text-xs font-black uppercase tracking-wider">เปิดรับสมัคร</span></label>
                  <label className="flex items-center justify-center py-5 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer border-2 border-slate-200 dark:border-slate-700 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/30 transition-all shadow-sm"><input type="radio" name="status" value="senior_visited" defaultChecked={editingSite?.status === 'senior_visited'} className="hidden" /><span className="text-xs font-black uppercase tracking-wider">รุ่นพี่เคยฝึกแล้ว</span></label>
                  <label className="flex items-center justify-center py-5 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer border-2 border-slate-200 dark:border-slate-700 has-[:checked]:border-slate-500 has-[:checked]:bg-slate-100/30 transition-all shadow-sm"><input type="radio" name="status" value="archived" defaultChecked={editingSite?.status === 'archived'} className="hidden" /><span className="text-xs font-black uppercase tracking-wider">คลังข้อมูล</span></label>
                </div>
              </div>
              <div className="flex gap-4 pt-10 border-t border-slate-50 dark:border-slate-800">
                <button type="button" onClick={() => setShowSiteModal(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-xs">ยกเลิก</button>
                <button type="submit" disabled={isTranslating || isSyncing} className="flex-1 py-5 rounded-2xl bg-rose-600 text-white font-black uppercase text-sm shadow-xl shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* BULK STATUS UPDATE MODAL */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim" onClick={() => setShowBulkStatusModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowBulkStatusModal(false)} className="absolute top-8 right-8 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={24} className="text-slate-400" /></button>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 uppercase flex items-center gap-4"><Layers size={28} className="text-indigo-500" />แก้ไขสถานะกลุ่ม</h3>
            <p className="text-sm font-bold text-slate-500 mb-6">เลือกสถานะใหม่สำหรับนักศึกษาที่เลือกทั้งหมด ({selectedStudentIds.length} คน)</p>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: ApplicationStatus.PENDING, label: 'รอตรวจสอบ', color: 'amber', desc: 'สถานะเริ่มต้นเมื่อนักศึกษาส่งข้อมูล' },
                { id: ApplicationStatus.PREPARING, label: 'กำลังจัดเตรียม', color: 'blue', desc: 'อยู่ระหว่างดำเนินการจัดทำเอกสาร' },
                { id: ApplicationStatus.ACCEPTED, label: 'ตอบรับแล้ว', color: 'emerald', desc: 'สถานประกอบการตอบรับเข้าฝึกงาน' },
                { id: ApplicationStatus.REJECTED, label: 'ปฏิเสธ', color: 'rose', desc: 'ไม่ผ่านการพิจารณาหรือยกเลิก' }
              ].map(st => (
                <button 
                  key={st.id} 
                  onClick={() => handleBulkStatusUpdate(st.id)}
                  className="w-full p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all text-left flex items-center gap-4 group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-${st.color}-500 flex items-center justify-center text-white shadow-lg shadow-${st.color}-500/20 group-hover:scale-110 transition-transform`}>
                    <Check size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{st.label}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{st.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-8">
              <button 
                onClick={() => setShowBulkStatusModal(false)} 
                className="w-full py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-xs hover:bg-slate-50 transition-all"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ADMIN PASSWORD MODAL */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm reveal-anim" onClick={() => setShowAdminPasswordModal(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAdminPasswordModal(false)} className="absolute top-8 right-8 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={24} className="text-slate-400" /></button>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-700 rounded-3xl mb-4 shadow-inner">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">เพิ่มรหัสผ่านแอดมิน</h3>
              <p className="text-xs font-bold text-slate-400 uppercase mt-2 tracking-widest">Add New Admin Password</p>
            </div>
            <form onSubmit={handleSaveAdminPassword} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className={labelClass}>รหัสผ่านใหม่ (New Password)</label>
                <div className="relative">
                   <Fingerprint size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                   <input 
                     type="text" 
                     value={newAdminPass}
                     onChange={(e) => setNewAdminPass(e.target.value)}
                     required 
                     placeholder="ระบุรหัสผ่านแอดมิน" 
                     className={`${inputClass} pl-14 font-mono`} 
                   />
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex gap-3 items-start">
                 <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase leading-relaxed tracking-tight">
                   รหัสนี้จะสามารถใช้เข้าสู่ระบบแอดมินได้ทันที โปรดใช้ความระมัดระวังในการมอบรหัสนี้ให้ผู้อื่น
                 </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAdminPasswordModal(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-xs">ยกเลิก</button>
                <button type="submit" disabled={!newAdminPass.trim() || isSyncing} className="flex-1 py-5 rounded-2xl bg-slate-900 text-white font-black uppercase text-sm shadow-xl shadow-slate-900/20 disabled:opacity-50">ยืนยันเพิ่มรหัส</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <ShareLinkModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        years={summaryFilter.years} 
        terms={summaryFilter.terms} 
        availableYears={yearsOptions}
        availableTerms={['1', '2']}
      />
    </>
  );
};

export default AdminPanel;

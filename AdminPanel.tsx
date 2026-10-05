
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  InternshipType,
  SiteSettings
} from './types';
import { translateTexts, localizeDate, sameInAll, isUntranslated, Localized4 } from "./translate";
import { localize } from './localize';
import { ShareLinkModal } from './components/ShareLinkModal';
import {
  Plus,
  Languages,
  Pencil,
  Search,
  Trash2,
  RefreshCw,
  Building2,
  X,
  FileText,
  CalendarDays,
  Download,
  ClipboardList,
  ShieldCheck,
  Check,
  Users,
  AlertTriangle,
  Upload,
  Link as LinkIcon,
  Briefcase,
  GraduationCap,
  Calendar,
  KeyRound,
  MapPin,
  FileSpreadsheet,
  Info,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  BarChart3,
  UserCheck,
  Share2,
  Table,
  LayoutGrid,
  Lock,
  Printer,
  ExternalLink,
  Copy,
  Globe,
  Mail,
  Phone,
  FileDown,
  SlidersHorizontal,
  CircleDot,
  LayoutDashboard,
  Settings2,
  ImagePlus,
  Image as ImageIcon
} from 'lucide-react';
import SharedSummaryTable, { SupervisorSaveFn } from './SharedSummaryTable';
import Dashboard, { DashboardFilters } from './components/Dashboard';
import { DateRangePicker, RangePreset, addMonths, normalizeISO, toISO } from './components/admin/DatePicker';
import { processImage } from './imageUtils';
import ChecklistEditor from './components/admin/ChecklistEditor';
import { LockMap, FieldLock, getEditorName, setEditorName } from './liveSync';
import { formatDateBE } from './dateUtils';
import { exportToExcel, exportToWord, exportToPDF } from './exportUtils';
import {
  inputCls,
  textareaCls,
  selectCls,
  btn,
  iconBtn,
  card,
  STATUS_META,
  STATUS_ORDER,
  statusMeta,
  MAJOR_META,
  MAJOR_LIST,
  majorMeta,
  StatusBadge,
  MajorBadge,
  Field,
  Segmented,
  Modal,
  EmptyState,
  ToastStack,
  ToastItem,
  ToastKind,
  TYPE_META,
  TYPE_LIST,
  TypeBadge,
  TypeIcon,
  typeMeta,
  StudentIdCopy,
} from './components/admin/ui';

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
  siteSettings: SiteSettings;
  onSaveSiteSettings: (s: SiteSettings) => Promise<void>;
  backendLive: boolean | null;
  liveLocks: LockMap;
  setLiveActive: (active: boolean) => void;
  onSupervisorChange: SupervisorSaveFn;
}

type AdminTab = 'overview' | 'students' | 'sites' | 'schedule' | 'forms' | 'admins' | 'settings';
type DeleteTarget = { id: string, type: 'student' | 'site' | 'schedule' | 'form' | 'admin', label?: string };

const SelectChevron = () => (
  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
);

const formatShortBE = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};

const AdminPanel: React.FC<AdminPanelProps> = ({
  sites,
  setSites,
  studentStatuses,
  setStudentStatuses,
  schedules,
  setSchedules,
  forms,
  setForms,
  adminPasswords,
  setAdminPasswords,
  fetchFromSheets,
  syncToSheets,
  isLoading,
  isSyncing,
  lastSync,
  siteSettings,
  onSaveSiteSettings,
  backendLive,
  liveLocks,
  setLiveActive,
  onSupervisorChange,
}) => {
  const currentYearBE = useMemo(() => (new Date().getFullYear() + 543).toString(), []);
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('overview');

  // Local UI States
  const [adminStudentSearch, setAdminStudentSearch] = useState('');
  const [adminStudentStatusFilter, setAdminStudentStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [adminStudentMajorFilter, setAdminStudentMajorFilter] = useState<Major | 'all'>('all');
  const [adminStudentYearFilter, setAdminStudentYearFilter] = useState<string | 'all'>(currentYearBE);
  const [adminStudentTermFilter, setAdminStudentTermFilter] = useState<string | 'all'>('all');
  const [adminStudentTypeFilter, setAdminStudentTypeFilter] = useState<InternshipType | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [studentViewMode, setStudentViewMode] = useState<'table' | 'cards'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'
  );
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

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

  const isType = (s: StudentStatusRecord, t: InternshipType) => (s.internshipType === InternshipType.COOP ? InternshipType.COOP : InternshipType.INTERNSHIP) === t;
  // Internship / co-op cards use the same year/term/major scope, before the type filter
  const typeStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return TYPE_LIST.map(t => {
      const list = scopedStudentsForStats.filter(s => isType(s, t));
      return {
        type: t,
        total: list.length,
        accepted: list.filter(s => s.status === ApplicationStatus.ACCEPTED).length,
        active: list.filter(s => s.status === ApplicationStatus.ACCEPTED && s.startDate && s.startDate <= today && (!s.endDate || s.endDate >= today)).length,
      };
    });
  }, [scopedStudentsForStats]);
  const scopedByType = useMemo(
    () => (adminStudentTypeFilter === 'all' ? scopedStudentsForStats : scopedStudentsForStats.filter(s => isType(s, adminStudentTypeFilter))),
    [scopedStudentsForStats, adminStudentTypeFilter]
  );

  const studentStats = useMemo(() => {
    const total = scopedByType.length;
    const accepted = scopedByType.filter(s => s.status === ApplicationStatus.ACCEPTED).length;
    const preparing = scopedByType.filter(s => s.status === ApplicationStatus.PREPARING).length;
    const pending = scopedByType.filter(s => s.status === ApplicationStatus.PENDING || !s.status).length;
    const rejected = scopedByType.filter(s => s.status === ApplicationStatus.REJECTED).length;
    return { total, accepted, preparing, pending, rejected };
  }, [scopedByType]);

  const copyStudentId = async (id: string) => {
    const text = String(id || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } finally { ta.remove(); }
    }
    setCopiedId(text);
    notify(`คัดลอกรหัส ${text} แล้ว`);
    setTimeout(() => setCopiedId(c => (c === text ? null : c)), 1500);
  };

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
  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null);
  const [summaryFilter, setSummaryFilter] = useState({
    years: [] as string[],
    terms: [] as string[]
  });

  // Dashboard filters (default: current academic year when it has data)
  const [dashFilters, setDashFilters] = useState<DashboardFilters>(() => ({
    years: studentStatuses.some(s => String(s.academicYear || '').trim() === currentYearBE) ? [currentYearBE] : [],
    terms: [],
    majors: [],
  }));
  const [shareKind, setShareKind] = useState<'summary' | 'dashboard'>('summary');
  const openShare = (kind: 'summary' | 'dashboard') => { setShareKind(kind); setIsShareModalOpen(true); };

  // Schedule form dates (controlled for the date-range picker)
  const [schedStart, setSchedStart] = useState('');
  const [schedEnd, setSchedEnd] = useState('');
  const openSchedule = (item: ScheduleEvent | null) => {
    setEditingSchedule(item);
    setSchedStart(normalizeISO(item?.rawStartDate));
    setSchedEnd(normalizeISO(item?.rawEndDate));
    setShowScheduleModal(true);
  };

  // Site settings form
  const [draftSettings, setDraftSettings] = useState<SiteSettings>(siteSettings);
  const [settingsBusy, setSettingsBusy] = useState<'logo' | 'favicon' | 'heroEmblem' | 'save' | null>(null);
  useEffect(() => { setDraftSettings(siteSettings); }, [siteSettings]);
  const settingsDirty = JSON.stringify(draftSettings) !== JSON.stringify(siteSettings);

  const pickImage = async (kind: 'logo' | 'favicon' | 'heroEmblem', file?: File | null) => {
    if (!file) return;
    setSettingsBusy(kind);
    try {
      const size = kind === 'logo' ? { maxW: 480, maxH: 128 } : kind === 'heroEmblem' ? { maxW: 320, maxH: 320, square: true } : { maxW: 64, maxH: 64, square: true };
      const dataUrl = await processImage(file, size);
      setDraftSettings(prev => ({ ...prev, [kind]: dataUrl }));
    } catch (err: any) {
      notify(err?.message || 'อัปโหลดรูปไม่สำเร็จ', 'error');
    } finally {
      setSettingsBusy(null);
    }
  };

  /* ---------- Bulk-translate existing records that were saved Thai-only ---------- */
  const [bulkTr, setBulkTr] = useState<{ done: number; total: number } | null>(null);
  const asLoc = (v: any) => ({ th: localize(v, Language.TH), en: localize(v, Language.EN), ar: localize(v, Language.AR), ms: localize(v, Language.MS) });
  const untranslated = useMemo(() => {
    const jobs: { key: string; th: string }[] = [];
    const push = (key: string, v: any) => { const o = asLoc(v); if (o.th.trim() && isUntranslated(o)) jobs.push({ key, th: o.th }); };
    schedules.forEach(s => push(`schedules|${s.id}|event`, s.event));
    forms.forEach(f => push(`forms|${f.id}|title`, f.title));
    // Company names are proper nouns and stay as typed
    sites.forEach(s => { push(`sites|${s.id}|location`, s.location); push(`sites|${s.id}|position`, s.position); push(`sites|${s.id}|description`, s.description); });
    return jobs;
  }, [schedules, forms, sites]);

  const translateExisting = async () => {
    const jobs = untranslated;
    if (!jobs.length) return;
    setBulkTr({ done: 0, total: jobs.length });
    const results: Record<string, Localized4> = {};
    for (let i = 0; i < jobs.length; i += 12) {
      const chunk = jobs.slice(i, i + 12);
      const res = await translateTexts(Object.fromEntries(chunk.map(j => [j.key, j.th])));
      if (!res) {
        setBulkTr(null);
        notify('ยังแปลภาษาอัตโนมัติไม่ได้ กรุณาอัปเดต code.gs แล้ว Deploy ใหม่', 'error');
        return;
      }
      Object.assign(results, res);
      setBulkTr({ done: Math.min(i + 12, jobs.length), total: jobs.length });
    }
    const apply = <T extends { id: string }>(type: string, list: T[]) => list.map(item => {
      let changed: any = item;
      Object.keys(results).forEach(k => {
        const [t, id, field] = k.split('|');
        if (t === type && id === String(item.id)) changed = { ...changed, [field]: results[k] };
      });
      // Schedule dates: Buddhist Era for Thai, Gregorian for the rest
      if (type === 'schedules') {
        const s: any = changed;
        if (s.rawStartDate && isUntranslated(asLoc(s.startDate))) changed = { ...changed, startDate: localizeDate(s.rawStartDate) };
        if (s.rawEndDate && isUntranslated(asLoc(s.endDate))) changed = { ...changed, endDate: localizeDate(s.rawEndDate) };
      }
      return changed as T;
    });
    const nextSchedules = apply('schedules', schedules);
    const nextForms = apply('forms', forms);
    const nextSites = apply('sites', sites);
    setSchedules(nextSchedules); setForms(nextForms); setSites(nextSites);
    await Promise.all([
      syncToSheets('schedules', nextSchedules, 'all'),
      syncToSheets('forms', nextForms, 'all'),
      syncToSheets('sites', nextSites, 'all'),
    ]);
    setBulkTr(null);
    notify(`แปลแล้ว ${jobs.length} รายการ`);
  };

  const saveSettings = async () => {
    setSettingsBusy('save');
    try {
      let next = draftSettings;
      // Fill in EN / AR / MS for checklist steps the admin wrote or changed in Thai
      if (next.checklist?.length) {
        const texts: Record<string, string> = {};
        next.checklist.forEach(s => (['title', 'hint'] as const).forEach(f => {
          const v = s[f];
          if (v.th?.trim() && (!v.en || !v.ar || !v.ms)) texts[`${s.id}|${f}`] = v.th;
        }));
        if (Object.keys(texts).length) {
          const res = await translateTexts(texts);
          if (res) {
            next = { ...next, checklist: next.checklist.map(s => {
              const fill = (f: 'title' | 'hint') => {
                const r = res[`${s.id}|${f}`];
                return r ? { th: s[f].th, en: s[f].en || r.en, ar: s[f].ar || r.ar, ms: s[f].ms || r.ms } : s[f];
              };
              return { ...s, title: fill('title'), hint: fill('hint') };
            }) };
            setDraftSettings(next);
          } else {
            notify('ยังแปลเช็กลิสต์อัตโนมัติไม่ได้ กรุณาอัปเดต code.gs แล้ว Deploy ใหม่', 'error');
          }
        }
      }
      await onSaveSiteSettings(next);
      notify('บันทึกการตั้งค่าแล้ว');
    } finally {
      setSettingsBusy(null);
    }
  };

  // Live supervisor sync runs only while the summary table is open
  useEffect(() => {
    if (showSummaryModal && !getEditorName()) setEditorName('แอดมิน');
    setLiveActive(showSummaryModal);
    return () => setLiveActive(false);
  }, [showSummaryModal, setLiveActive]);

  const onLockDenied = (lock: FieldLock) =>
    notify(lock.name ? `${lock.name} กำลังกรอกช่องนี้อยู่` : 'มีผู้กำลังกรอกช่องนี้อยู่', 'error');

  const studentPresets = useMemo<RangePreset[]>(() => {
    const y = new Date().getFullYear();
    return [
      { label: 'เทอม 1 (มิ.ย.–ต.ค.)', get: () => [`${y}-06-01`, `${y}-10-31`] },
      { label: 'เทอม 2 (พ.ย.–มี.ค.)', get: () => [`${y}-11-01`, `${y + 1}-03-31`] },
      { label: 'ฝึกงาน 2 เดือน', get: (s) => { const a = s || toISO(new Date()); return [a, addMonths(a, 2)]; } },
      { label: 'สหกิจ 4 เดือน', get: (s) => { const a = s || toISO(new Date()); return [a, addMonths(a, 4)]; } },
    ];
  }, []);

  const reportPresets = useMemo<RangePreset[]>(() => {
    const y = new Date().getFullYear();
    return [
      { label: `ปีนี้ (${y + 543})`, get: () => [`${y}-01-01`, `${y}-12-31`] },
      { label: `ปีการศึกษา ${y + 543}`, get: () => [`${y}-05-01`, `${y + 1}-04-30`] },
      { label: 'เทอม 1', get: () => [`${y}-06-01`, `${y}-10-31`] },
      { label: 'เทอม 2', get: () => [`${y}-11-01`, `${y + 1}-03-31`] },
    ];
  }, []);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Clear selection when switching tab
  useEffect(() => { setSelectedStudentIds([]); setExportMenuOpen(false); }, [adminActiveTab]);

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

    const yearsInData = studentStatuses
      .map(s => String(s.academicYear || '').trim())
      .filter(y => /^\d+$/.test(y))
      .map(Number);

    const minYear = Math.min(2560, ...yearsInData, currentBE);
    const maxYear = Math.max(currentBE + 10, ...yearsInData);

    const years = [];
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y.toString());
    }
    return years.reverse(); // Newest first
  }, [studentStatuses]);

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
    if (!localized) return '';
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

  // Text goes to the Apps Script backend (Google LanguageApp); dates are formatted locally
  const performBatchTranslation = async (items: { key: string, value: string, isDate?: boolean }[]): Promise<Record<string, Localized4>> => {
    const out: Record<string, Localized4> = {};
    const texts: Record<string, string> = {};
    items.forEach(i => {
      if (i.isDate) out[i.key] = localizeDate(i.value);
      else if (String(i.value || '').trim()) texts[i.key] = i.value;
      else out[i.key] = sameInAll(i.value || '');
    });
    if (!Object.keys(texts).length) return out;
    const res = await translateTexts(texts);
    if (!res) notify('ยังแปลภาษาอัตโนมัติไม่ได้ กรุณาอัปเดต code.gs แล้ว Deploy ใหม่ (บันทึกเป็นภาษาไทยไว้ก่อน)', 'error');
    Object.keys(texts).forEach(k => { out[k] = res?.[k] || sameInAll(texts[k]); });
    return out;
  };
  const filteredAdminStudents = useMemo(() => {
    let result = [...studentStatuses];
    result.sort((a, b) => b.lastUpdated - a.lastUpdated);
    if (adminStudentSearch) {
      const search = adminStudentSearch.toLowerCase().trim();
      result = result.filter(s =>
        (s.name || "").toLowerCase().includes(search) ||
        (s.studentId || "").toString().toLowerCase().includes(search) ||
        (s.location || "").toLowerCase().includes(search) ||
        (s.position || "").toLowerCase().includes(search) ||
        (s.supervisor || "").toLowerCase().includes(search)
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
    if (adminStudentTypeFilter !== 'all') {
      result = result.filter(s => isType(s, adminStudentTypeFilter));
    }
    return result;
  }, [studentStatuses, adminStudentSearch, adminStudentStatusFilter, adminStudentMajorFilter, adminStudentYearFilter, adminStudentTermFilter, adminStudentTypeFilter]);

  const selectedStudents = useMemo(
    () => studentStatuses.filter(s => selectedStudentIds.includes(s.id)),
    [studentStatuses, selectedStudentIds]
  );

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const allVisibleSelected = filteredAdminStudents.length > 0 && filteredAdminStudents.every(s => selectedStudentIds.includes(s.id));

  const toggleSelectAllStudents = () => {
    if (allVisibleSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredAdminStudents.map(s => s.id));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: ApplicationStatus) => {
    if (selectedStudentIds.length === 0) return;
    const count = selectedStudentIds.length;

    const updatedStatuses = studentStatuses.map(s => {
      if (selectedStudentIds.includes(s.id)) {
        return { ...s, status: newStatus, lastUpdated: Date.now() };
      }
      return s;
    });

    setStudentStatuses(updatedStatuses);
    setSelectedStudentIds([]);
    setShowBulkStatusModal(false);
    notify(`อัปเดตสถานะ ${count} คน เป็น "${STATUS_META[newStatus].label}"`);
    // Bulk update still uses 'all' as GAS has no bulk-update action yet.
    await syncToSheets('studentStatuses', updatedStatuses, 'all');
  };

  const handleQuickStatusChange = (record: StudentStatusRecord, newStatus: ApplicationStatus) => {
    if (record.status === newStatus) return;
    const updatedRecord = { ...record, status: newStatus, lastUpdated: Date.now() };
    const updated = studentStatuses.map(s => s.id === record.id ? updatedRecord : s);
    setStudentStatuses(updated);
    syncToSheets('studentStatuses', updated, 'update', updatedRecord);
    notify(`${record.name} → ${STATUS_META[newStatus].label}`);
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

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => (a.rawStartDate || '').localeCompare(b.rawStartDate || '')),
    [schedules]
  );

  const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const thEvent = formData.get('event_th') as string;
    const rawStart = formData.get('start_th') as string;
    const rawEnd = formData.get('end_th') as string;
    if (!rawStart || !rawEnd) {
      notify('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุด', 'error');
      return;
    }
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

    const updated = editingSchedule ? schedules.map(s => s.id === editingSchedule.id ? newEvent : s) : [newEvent, ...schedules];
    setSchedules(updated);
    syncToSheets('schedules', updated, editingSchedule ? 'update' : 'add', newEvent);
    notify(editingSchedule ? 'แก้ไขกำหนดการแล้ว' : 'เพิ่มกำหนดการแล้ว');

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

    const updated = editingForm ? forms.map(f => f.id === editingForm.id ? newForm : f) : [newForm, ...forms];
    setForms(updated);
    if (fileData) {
      syncToSheets('uploadForm', [syncPayload], 'add', syncPayload);
    } else {
      syncToSheets('forms', updated, editingForm ? 'update' : 'add', newForm);
    }
    notify(editingForm ? 'แก้ไขเอกสารแล้ว' : 'เพิ่มเอกสารแล้ว');

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
      { key: 'loc', value: thLoc },
      { key: 'desc', value: thDesc }, { key: 'pos', value: thPos }
    ]);
    setIsTranslating(false);
    const newSite: InternshipSite = {
      id: editingSite?.id || `site-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: sameInAll(thName), // company names are proper nouns: never translated
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

    const updated = editingSite ? sites.map(s => s.id === editingSite.id ? newSite : s) : [newSite, ...sites];
    setSites(updated);
    syncToSheets('sites', updated, editingSite ? 'update' : 'add', newSite);
    notify(editingSite ? 'แก้ไขสถานประกอบการแล้ว' : 'เพิ่มสถานประกอบการแล้ว');

    setShowSiteModal(false);
    setEditingSite(null);
  };

  const closeStatusModal = useCallback(() => {
    setShowAdminStatusModal(false);
    setStatusError(null);
    setIsForceSaveVisible(false);
  }, []);

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
        setStatusError(`ตรวจพบข้อมูลซ้ำ: ${duplicateType} "${duplicateType === 'รหัสประจำตัวนักศึกษา' ? rawStudentId : rawName}" มีอยู่แล้วในระบบ ต้องการบันทึกซ้ำหรือไม่?`);
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

    const updated = editingStatusRecord ? studentStatuses.map(s => s.id === editingStatusRecord.id ? newRecord : s) : [newRecord, ...studentStatuses];
    setStudentStatuses(updated);
    try {
      localStorage.setItem('wise_student_statuses', JSON.stringify(updated));
    } catch (err) { console.warn(err); }
    syncToSheets('studentStatuses', updated, editingStatusRecord ? 'update' : 'add', newRecord);
    notify(editingStatusRecord ? `บันทึกข้อมูล ${newRecord.name} แล้ว` : `เพิ่ม ${newRecord.name} แล้ว`);

    setEditingStatusRecord(null);
    closeStatusModal();
  };

  const handleSaveAdminPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newAdminPass.trim()) return;

    const updatedAdmins = [...adminPasswords, newAdminPass.trim()];
    setAdminPasswords(updatedAdmins);
    setShowAdminPasswordModal(false);
    notify('เพิ่มรหัสผ่านแอดมินแล้ว');
    await syncToSheets('admins', updatedAdmins.map(p => ({ password: p })), 'add', { password: newAdminPass.trim() });
    setNewAdminPass('');
  };

  const askDelete = (target: DeleteTarget) => {
    setItemToDelete(target);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;

    switch (type) {
      case 'student': {
        const updated = studentStatuses.filter(s => s.id !== id);
        setStudentStatuses(updated);
        setSelectedStudentIds(prev => prev.filter(i => i !== id));
        syncToSheets('studentStatuses', updated, 'delete', { id });
        break;
      }
      case 'site': {
        const updated = sites.filter(s => s.id !== id);
        setSites(updated);
        syncToSheets('sites', updated, 'delete', { id });
        break;
      }
      case 'schedule': {
        const updated = schedules.filter(s => s.id !== id);
        setSchedules(updated);
        syncToSheets('schedules', updated, 'delete', { id });
        break;
      }
      case 'form': {
        const updated = forms.filter(f => f.id !== id);
        setForms(updated);
        syncToSheets('forms', updated, 'delete', { id });
        break;
      }
      case 'admin': {
        const passwordToDelete = id; // For admins, the ID being passed is the password itself
        const updatedAdmins = adminPasswords.filter(p => p !== passwordToDelete);
        setAdminPasswords(updatedAdmins);
        syncToSheets('admins', updatedAdmins.map(p => ({ password: p })), 'delete', { password: passwordToDelete });
        break;
      }
    }
    notify('ลบข้อมูลแล้ว');
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const getFilteredReportStudents = () => {
    let filtered = [...studentStatuses];

    if (reportMajor !== 'all') {
      filtered = filtered.filter(s => s.major === reportMajor);
    }

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

  const runReportExport = (kind: 'excel' | 'word' | 'pdf') => {
    const filtered = getFilteredReportStudents();
    if (filtered.length === 0) {
      notify('ไม่พบข้อมูลตามเงื่อนไขที่เลือก', 'error');
      return;
    }
    const title = 'รายงานรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา';
    if (kind === 'excel') exportToExcel(filtered, title);
    if (kind === 'word') exportToWord(filtered, title);
    if (kind === 'pdf') exportToPDF(filtered, title);
    setShowReportModal(false);
  };

  const getMajorLabel = (m: Major) => majorMeta(m).short;
  const getStatusLabel = (status: ApplicationStatus) => statusMeta(status).label;

  const handleDownloadReport = () => {
    const filtered = getFilteredReportStudents();
    if (filtered.length === 0) {
      notify('ไม่พบข้อมูลตามเงื่อนไขที่เลือก', 'error');
      return;
    }

    const headers = ["ID", "Student Name", "Major", "Type", "Location", "Position", "Term", "Year", "Start Date", "End Date", "Status", "Supervisor"];
    const rows = filtered.map(s => [
      `"${s.studentId}"`, `"${s.name}"`, `"${getMajorLabel(s.major)}"`, `"${s.internshipType === InternshipType.INTERNSHIP ? 'Internship' : 'Co-op'}"`,
      `"${s.location || '-'}"`, `"${s.position || '-'}"`, `"${s.term || '-'}"`, `"${s.academicYear || '-'}"`, `"${formatDateBE(s.startDate)}"`, `"${formatDateBE(s.endDate)}"`, `"${getStatusLabel(s.status)}"`, `"${s.supervisor || '-'}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Internship_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setShowReportModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        notify('กรุณาเลือกไฟล์ PDF เท่านั้น', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const copyText = async (text: string, msg = 'คัดลอกลิงก์แล้ว') => {
    try {
      await navigator.clipboard.writeText(text);
      notify(msg);
    } catch {
      notify('คัดลอกไม่สำเร็จ', 'error');
    }
  };

  const adminMenu: { id: AdminTab, label: string, desc: string, icon: React.ReactNode, count: number }[] = [
    { id: 'overview', label: 'ภาพรวม', desc: 'แดชบอร์ดสรุปสถานะการฝึกงานและสิ่งที่ต้องติดตาม', icon: <LayoutDashboard size={18} />, count: -1 },
    { id: 'students', label: 'ติดตามสถานะ', desc: 'จัดการข้อมูลและสถานะการฝึกงานของนักศึกษา', icon: <Users size={18} />, count: studentStatuses.length },
    { id: 'sites', label: 'สถานประกอบการ', desc: 'รายชื่อหน่วยงานที่เปิดรับนักศึกษาฝึกงาน', icon: <Building2 size={18} />, count: sites.length },
    { id: 'schedule', label: 'กำหนดการ', desc: 'วันสำคัญและกำหนดส่งที่นักศึกษาจะเห็นในหน้าหลัก', icon: <CalendarDays size={18} />, count: schedules.length },
    { id: 'forms', label: 'เอกสาร', desc: 'แบบฟอร์มสำหรับดาวน์โหลดในศูนย์เอกสาร', icon: <FileText size={18} />, count: forms.length },
    { id: 'admins', label: 'สิทธิ์แอดมิน', desc: 'รหัสผ่านที่ใช้เข้าสู่ระบบหลังบ้าน', icon: <ShieldCheck size={18} />, count: adminPasswords.length },
    { id: 'settings', label: 'ตั้งค่าเว็บไซต์', desc: 'โลโก้ ไอคอนแท็บ ตรากลางซุ้ม เช็กลิสต์นักศึกษา และชื่อเว็บไซต์', icon: <Settings2 size={18} />, count: -1 },
  ];
  const activeMenu = adminMenu.find(m => m.id === adminActiveTab)!;

  const addLabel: Record<AdminTab, string> = {
    overview: 'เพิ่มนักศึกษา',
    settings: '',
    students: 'เพิ่มนักศึกษา',
    sites: 'เพิ่มสถานประกอบการ',
    schedule: 'เพิ่มกำหนดการ',
    forms: 'เพิ่มเอกสาร',
    admins: 'เพิ่มรหัสผ่าน',
  };

  const handleAddStudent = () => {
    setEditingStatusRecord(null);
    setModalStartDate('');
    setModalEndDate('');
    setModalInternshipType(InternshipType.INTERNSHIP);
    setModalStatus(ApplicationStatus.PENDING);
    setStatusError(null);
    setIsForceSaveVisible(false);
    setShowAdminStatusModal(true);
  };

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
    else if (adminActiveTab === 'schedule') { openSchedule(null); }
    else if (adminActiveTab === 'overview') { handleAddStudent(); }
    else if (adminActiveTab === 'settings') { /* no-op */ }
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

  const resetStudentFilters = (toAll = false) => {
    setAdminStudentStatusFilter('all');
    setAdminStudentMajorFilter('all');
    setAdminStudentYearFilter(toAll ? 'all' : currentYearBE);
    setAdminStudentTermFilter('all');
    setAdminStudentTypeFilter('all');
    if (toAll) setAdminStudentSearch('');
  };

  const hasActiveStudentFilters =
    adminStudentStatusFilter !== 'all' || adminStudentMajorFilter !== 'all' || adminStudentYearFilter !== currentYearBE || adminStudentTermFilter !== 'all' || adminStudentTypeFilter !== 'all' || adminStudentSearch !== '';

  // Stats modal data
  const statsData = useMemo(() => {
    const filtered = studentStatuses.filter(s => {
      const majorMatch = statsFilter.major === 'all' || s.major === statsFilter.major;
      const termMatch = statsFilter.term === 'all' || String(s.term || '').trim() === statsFilter.term;
      const yearMatch = statsFilter.year === 'all' || String(s.academicYear || '').trim() === statsFilter.year;
      return majorMatch && termMatch && yearMatch;
    });
    const total = filtered.length;
    const byStatus = filtered.reduce((acc, s) => {
      const key = s.status || ApplicationStatus.PENDING;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byType = filtered.reduce((acc, s) => {
      acc[s.internshipType] = (acc[s.internshipType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byMajor = filtered.reduce((acc, s) => {
      acc[s.major] = (acc[s.major] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const locations = filtered.reduce((acc, s) => {
      if (s.location) acc[s.location] = (acc[s.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topLocations = Object.entries(locations).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total, byStatus, byType, byMajor, topLocations };
  }, [studentStatuses, statsFilter]);

  const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const formatRange = (start?: string, end?: string) => {
    if (start && end) return `${formatShortBE(start)} – ${formatShortBE(end)}`;
    if (start) return `${formatShortBE(start)} – ไม่ระบุ`;
    return '';
  };

  const scheduleState = (item: ScheduleEvent): 'upcoming' | 'ongoing' | 'past' => {
    const today = new Date().toISOString().split('T')[0];
    if (item.rawEndDate && item.rawEndDate < today) return 'past';
    if (item.rawStartDate && item.rawStartDate <= today) return 'ongoing';
    return 'upcoming';
  };

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const deleteLabel = (() => {
    if (!itemToDelete) return '';
    if (itemToDelete.label) return itemToDelete.label;
    return itemToDelete.type === 'admin' ? 'รหัสผ่านแอดมินนี้' : 'รายการนี้';
  })();

  /* ---------------------------------------------------------------- */
  /* RENDER                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* SIDEBAR (desktop) */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="px-3 pt-2 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">เมนูจัดการ</p>
          {adminMenu.map(item => {
            const active = adminActiveTab === item.id;
            return (
              <React.Fragment key={item.id}>
              {item.id === 'settings' && <div className="my-2 mx-3 h-px bg-slate-200/80 dark:bg-slate-800" />}
              <button
                onClick={() => setAdminActiveTab(item.id)}
                className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm transition ${
                  active
                    ? 'bg-[#630330]/[0.07] text-[#630330] dark:bg-amber-400/10 dark:text-amber-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <span className={active ? '' : 'text-slate-400'}>{item.icon}</span>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.count >= 0 && <span className={`text-[11px] tabular-nums px-1.5 rounded-md ${active ? 'bg-[#630330]/10 dark:bg-amber-400/15' : 'text-slate-400'}`}>{item.count}</span>}
              </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isLoading || isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="font-medium">{isLoading ? 'กำลังโหลด…' : isSyncing ? 'กำลังบันทึก…' : 'เชื่อมต่อ Google Sheets'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">ซิงค์ล่าสุด {lastSyncLabel}</p>
            <button onClick={fetchFromSheets} disabled={isLoading} className={`${btn('secondary', 'sm')} w-full mt-2.5`}>
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
        {/* Mobile tabs */}
        <div className="md:hidden sticky top-0 z-30 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex gap-1 px-3 py-2 overflow-x-auto hide-scrollbar">
            {adminMenu.map(item => (
              <button
                key={item.id}
                onClick={() => setAdminActiveTab(item.id)}
                className={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition ${
                  adminActiveTab === item.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 14 })}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-28 space-y-5">
          {/* Page header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{activeMenu.label}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{activeMenu.desc}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {adminActiveTab === 'students' && (
                <>
                  <button onClick={() => setShowStatsModal(true)} className={btn('secondary')}>
                    <BarChart3 size={16} /> <span className="hidden sm:inline">สถิติ</span>
                  </button>
                  <button onClick={() => setShowSummaryModal(true)} className={btn('secondary')}>
                    <ClipboardList size={16} /> <span className="hidden sm:inline">สรุปภาพรวม</span>
                  </button>
                  <button onClick={() => openShare('summary')} className={btn('secondary')}>
                    <Share2 size={16} /> <span className="hidden sm:inline">แชร์ลิงก์</span>
                  </button>
                  <div className="relative">
                    <button onClick={() => setExportMenuOpen(o => !o)} className={btn('secondary')}>
                      <Download size={16} /> <span className="hidden sm:inline">ส่งออก</span> <ChevronDown size={14} className={`transition ${exportMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {exportMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-64 z-50 p-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10 wise-pop-in">
                          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold text-slate-400">ส่งออกรายการที่แสดง ({filteredAdminStudents.length} คน)</p>
                          {[
                            { k: 'excel', icon: <FileSpreadsheet size={15} className="text-emerald-600" />, label: 'Excel (.xls)', fn: () => exportToExcel(filteredAdminStudents, 'รายชื่อนักศึกษา') },
                            { k: 'word', icon: <FileText size={15} className="text-blue-600" />, label: 'Word (.doc)', fn: () => exportToWord(filteredAdminStudents, 'รายชื่อนักศึกษา') },
                            { k: 'pdf', icon: <Printer size={15} className="text-rose-600" />, label: 'พิมพ์ / PDF', fn: () => exportToPDF(filteredAdminStudents, 'รายชื่อนักศึกษา') },
                          ].map(o => (
                            <button
                              key={o.k}
                              disabled={filteredAdminStudents.length === 0}
                              onClick={() => { o.fn(); setExportMenuOpen(false); }}
                              className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                            >
                              {o.icon} {o.label}
                            </button>
                          ))}
                          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                          <button
                            onClick={() => { setShowReportModal(true); setExportMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <SlidersHorizontal size={15} className="text-slate-500" /> รายงานแบบกำหนดเงื่อนไข…
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
              {adminActiveTab === 'overview' && (
                <>
                  <button onClick={fetchFromSheets} disabled={isLoading} className={btn('secondary')}>
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">รีเฟรช</span>
                  </button>
                  <button onClick={() => openShare('dashboard')} className={btn('secondary')}>
                    <Share2 size={16} /> <span className="hidden sm:inline">แชร์แดชบอร์ด</span>
                  </button>
                </>
              )}
              {adminActiveTab === 'settings' ? (
                <button onClick={saveSettings} disabled={!settingsDirty || settingsBusy !== null || backendLive === false} className={btn('primary')}>
                  <Check size={16} /> {settingsBusy === 'save' ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
                </button>
              ) : (
                <button onClick={handleAddData} className={`${btn('primary')} hidden sm:inline-flex`}>
                  <Plus size={16} /> {addLabel[adminActiveTab]}
                </button>
              )}
            </div>
          </div>

          {/* ======================= OVERVIEW ======================= */}
          {adminActiveTab === 'overview' && (
            <div className="wise-fade-in">
              <Dashboard
                students={studentStatuses}
                schedules={schedules}
                mode="admin"
                filters={dashFilters}
                onFiltersChange={setDashFilters}
                onOpenStudent={handleEditStudent}
              />
            </div>
          )}

          {/* ======================= SETTINGS ======================= */}
          {adminActiveTab === 'settings' && (
            <div className="space-y-4 wise-fade-in max-w-4xl">
              {backendLive === false && (
                <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p>ระบบหลังบ้าน (Google Apps Script) ยังเป็นเวอร์ชันเก่า จึงยังบันทึกการตั้งค่าไม่ได้ กรุณาอัปเดตโค้ดใน <b>code.gs</b> แล้ว Deploy ใหม่ก่อน</p>
                </div>
              )}

              {/* Logo */}
              <section className={`${card} p-5`}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-64 shrink-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">โลโก้เว็บไซต์</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">แสดงที่แถบด้านบนของทุกหน้า และหน้าแรก แนะนำไฟล์ PNG หรือ SVG พื้นหลังโปร่งใส แนวนอน</p>
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Live preview of the top bar */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="h-14 px-4 flex items-center justify-between bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-2.5">
                          {draftSettings.logo
                            ? <img src={draftSettings.logo} alt="ตัวอย่างโลโก้" className="h-8 max-w-[160px] object-contain" />
                            : <><span className="w-8 h-8 rounded-lg bg-[#630330] text-[#D4AF37] flex items-center justify-center text-sm font-extrabold">W</span><span className="font-bold">WISE</span></>}
                        </div>
                        <div className="flex gap-2"><span className="w-12 h-2 rounded bg-slate-100 dark:bg-slate-800" /><span className="w-8 h-2 rounded bg-slate-100 dark:bg-slate-800" /></div>
                      </div>
                      <div className="h-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`${btn('secondary', 'sm')} cursor-pointer`}>
                        <ImagePlus size={14} /> {settingsBusy === 'logo' ? 'กำลังประมวลผล…' : draftSettings.logo ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { pickImage('logo', e.target.files?.[0]); e.currentTarget.value = ''; }} />
                      </label>
                      {draftSettings.logo && (
                        <button onClick={() => setDraftSettings(p => ({ ...p, logo: '' }))} className={btn('ghost', 'sm')}><Trash2 size={14} /> ใช้โลโก้เริ่มต้น</button>
                      )}
                      <span className="text-[11px] text-slate-400">ระบบจะย่อขนาดให้อัตโนมัติ (สูงไม่เกิน 128px)</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Favicon */}
              <section className={`${card} p-5`}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-64 shrink-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">ไอคอนเบราว์เซอร์ (Favicon)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">ไอคอนเล็กบนแท็บเบราว์เซอร์และบุ๊กมาร์ก ควรเป็นรูปสี่เหลี่ยมจัตุรัส เรียบง่าย</p>
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Browser tab preview */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <div className="flex items-end gap-1 px-3 pt-2.5">
                        <div className="flex items-center gap-2 h-9 px-3 rounded-t-lg bg-white dark:bg-slate-900 max-w-[260px] min-w-0">
                          {draftSettings.favicon
                            ? <img src={draftSettings.favicon} alt="ตัวอย่างไอคอน" className="w-4 h-4 object-contain shrink-0" />
                            : <Globe size={14} className="text-slate-400 shrink-0" />}
                          <span className="text-xs text-slate-700 dark:text-slate-200 truncate">{draftSettings.siteTitle?.trim() || 'WISE - Work Integrated Science Education Unit'}</span>
                          <X size={12} className="text-slate-400 shrink-0" />
                        </div>
                        <div className="h-7 px-3 flex items-center text-xs text-slate-400">+</div>
                      </div>
                      <div className="h-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-3 flex items-center">
                        <span className="h-4 w-full max-w-xs rounded bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`${btn('secondary', 'sm')} cursor-pointer`}>
                        <ImageIcon size={14} /> {settingsBusy === 'favicon' ? 'กำลังประมวลผล…' : draftSettings.favicon ? 'เปลี่ยนไอคอน' : 'อัปโหลดไอคอน'}
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { pickImage('favicon', e.target.files?.[0]); e.currentTarget.value = ''; }} />
                      </label>
                      {draftSettings.favicon && (
                        <button onClick={() => setDraftSettings(p => ({ ...p, favicon: '' }))} className={btn('ghost', 'sm')}><Trash2 size={14} /> ลบไอคอน</button>
                      )}
                      <span className="text-[11px] text-slate-400">ย่อเป็น 64×64px อัตโนมัติ</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Landing arch emblem */}
              <section className={`${card} p-5`}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-64 shrink-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">ตราสัญลักษณ์กลางซุ้ม (หน้าแรก)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">รูปในวงกลมสีขาวกลางซุ้มสีมารูนบนหน้าแรก ควรเป็นตราหรือโลโก้ทรงกลม/จัตุรัส ถ้าเว้นว่างจะใช้ไอคอนเบราว์เซอร์หรือโลโก้เว็บแทน</p>
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Mini preview of the landing arch */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-gradient-to-br from-[#fdfaf4] to-[#f1e5d3] h-44 flex items-end justify-center gap-6 px-6">
                      <div className="relative w-36 h-40 rounded-t-full rounded-b-lg bg-[#630330] overflow-hidden shadow-[0_20px_40px_-20px_rgba(99,3,48,0.6)]">
                        <div className="absolute inset-x-2.5 top-2.5 bottom-0 rounded-t-full border border-[#e8cf7a]/50" />
                        <div className="absolute left-1/2 top-[22%] -translate-x-1/2 w-[46%] aspect-square rounded-full bg-white p-1.5 shadow-lg flex items-center justify-center">
                          {(draftSettings.heroEmblem || draftSettings.favicon || draftSettings.logo)
                            ? <img src={draftSettings.heroEmblem || draftSettings.favicon || draftSettings.logo} alt="ตัวอย่างตรากลางซุ้ม" className="w-full h-full object-contain rounded-full" />
                            : <span className="text-[11px] font-extrabold text-[#630330]">WISE</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`${btn('secondary', 'sm')} cursor-pointer`}>
                        <ImagePlus size={14} /> {settingsBusy === 'heroEmblem' ? 'กำลังประมวลผล…' : draftSettings.heroEmblem ? 'เปลี่ยนตรา' : 'อัปโหลดตรา'}
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { pickImage('heroEmblem', e.target.files?.[0]); e.currentTarget.value = ''; }} />
                      </label>
                      {draftSettings.heroEmblem && (
                        <button onClick={() => setDraftSettings(p => ({ ...p, heroEmblem: '' }))} className={btn('ghost', 'sm')}><Trash2 size={14} /> ลบตรา</button>
                      )}
                      <span className="text-[11px] text-slate-400">ย่อเป็น 320×320px อัตโนมัติ</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Auto-translation */}
              <section className={`${card} p-5`}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-64 shrink-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">แปลภาษาอัตโนมัติ</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">กรอกข้อมูลเป็นภาษาไทย ระบบจะแปลเป็นอังกฤษ อาหรับ และมลายูให้เมื่อบันทึก (ยกเว้นชื่อสถานประกอบการ)</p>
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {['กำหนดการ', 'ชื่อเอกสาร', 'จังหวัด / ตำแหน่ง / รายละเอียดสถานประกอบการ', 'เช็กลิสต์นักศึกษา'].map(x => (
                        <span key={x} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><Check size={12} />{x}</span>
                      ))}
                      <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">ชื่อสถานประกอบการ: คงตามที่พิมพ์</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-sm">
                        {untranslated.length
                          ? <><b className="text-slate-900 dark:text-white">{untranslated.length}</b> <span className="text-slate-500 dark:text-slate-400">ข้อความเดิมที่ยังเป็นภาษาไทยทุกภาษา</span></>
                          : <span className="text-emerald-600 dark:text-emerald-400">ข้อมูลเดิมแปลครบแล้ว</span>}
                        {bulkTr && <span className="block text-xs text-slate-500 mt-0.5">กำลังแปล {bulkTr.done}/{bulkTr.total}…</span>}
                      </div>
                      <button onClick={translateExisting} disabled={!untranslated.length || !!bulkTr || backendLive === false} className={`${btn('primary', 'sm')} disabled:opacity-50`}>
                        {bulkTr ? <RefreshCw size={14} className="animate-spin" /> : <Languages size={14} />} แปลข้อมูลเดิมทั้งหมด
                      </button>
                    </div>
                    {bulkTr && (
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-[#630330] dark:bg-amber-400 transition-all" style={{ width: `${(bulkTr.done / bulkTr.total) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Student checklist */}
              <section className={`${card} p-5`}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-64 shrink-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">เช็กลิสต์ของนักศึกษา</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">รายการ "สิ่งที่ต้องทำ" ในหน้านักศึกษา เพิ่ม แก้ไข สลับลำดับ หรือลบขั้นตอนได้ และเลือกปุ่มลัดไปยังเอกสารหรือสถานประกอบการ</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <ChecklistEditor value={draftSettings.checklist} onChange={(next) => setDraftSettings(p => ({ ...p, checklist: next }))} />
                  </div>
                </div>
              </section>

              {/* Title */}
              <section className={`${card} p-5`}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-64 shrink-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">ชื่อบนแท็บเบราว์เซอร์</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">ข้อความที่แสดงบนแท็บและผลการค้นหา เว้นว่างเพื่อใช้ค่าเริ่มต้น</p>
                  </div>
                  <div className="flex-1">
                    <input
                      value={draftSettings.siteTitle || ''}
                      onChange={(e) => setDraftSettings(p => ({ ...p, siteTitle: e.target.value }))}
                      placeholder="WISE - Work Integrated Science Education Unit"
                      maxLength={80}
                      className={inputCls}
                    />
                  </div>
                </div>
              </section>

              {settingsDirty && (
                <div className="sticky bottom-4 flex items-center justify-between gap-3 p-3 pl-4 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl wise-pop-in">
                  <span className="text-sm">มีการเปลี่ยนแปลงที่ยังไม่บันทึก</span>
                  <div className="flex gap-2">
                    <button onClick={() => setDraftSettings(siteSettings)} className="h-9 px-3 rounded-lg text-sm hover:bg-white/10 dark:hover:bg-slate-900/10">ยกเลิก</button>
                    <button onClick={saveSettings} disabled={settingsBusy !== null || backendLive === false} className="h-9 px-4 rounded-lg text-sm font-semibold bg-white text-slate-900 dark:bg-slate-900 dark:text-white disabled:opacity-50">
                      {settingsBusy === 'save' ? 'กำลังบันทึก…' : 'บันทึก'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= STUDENTS ======================= */}
          {adminActiveTab === 'students' && (
            <div className="space-y-4 wise-fade-in">
              {/* Internship vs co-op: click to filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {typeStats.map(ts => {
                  const m = TYPE_META[ts.type];
                  const active = adminStudentTypeFilter === ts.type;
                  const all = typeStats.reduce((n, x) => n + x.total, 0);
                  return (
                    <button
                      key={ts.type}
                      onClick={() => setAdminStudentTypeFilter(active ? 'all' : ts.type)}
                      aria-pressed={active}
                      className={`${card} relative overflow-hidden text-left p-4 flex items-center gap-4 transition hover:border-slate-300 dark:hover:border-slate-700 ${active ? 'ring-2 ring-offset-0 border-transparent ' + (ts.type === InternshipType.COOP ? 'ring-fuchsia-500' : 'ring-sky-500') : ''}`}
                    >
                      <span className={`absolute inset-y-0 left-0 w-1.5 ${m.bar}`} />
                      <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${m.soft} ${m.text}`}><TypeIcon type={ts.type} size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-semibold ${m.text}`}>{m.label}</span>
                        <span className="block text-2xl font-bold tabular-nums text-slate-900 dark:text-white leading-tight">{ts.total}<span className="ml-1 text-xs font-medium text-slate-400">คน · {pct(ts.total, all)}%</span></span>
                        <span className="block mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">ตอบรับแล้ว {ts.accepted} · กำลังฝึก {ts.active}</span>
                      </span>
                      <span className={`hidden sm:inline text-[11px] font-medium ${active ? m.text : 'text-slate-400'}`}>{active ? 'กำลังกรอง' : 'คลิกเพื่อกรอง'}</span>
                    </button>
                  );
                })}
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <button
                  onClick={() => setAdminStudentStatusFilter('all')}
                  className={`${card} col-span-2 sm:col-span-1 text-left p-4 transition hover:border-slate-300 dark:hover:border-slate-700 ${adminStudentStatusFilter === 'all' ? 'ring-2 ring-slate-900 dark:ring-white border-transparent' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ทั้งหมด</span>
                    <Users size={15} className="text-slate-400" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{studentStats.total}</div>
                  <div className="mt-2.5 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    {STATUS_ORDER.map(st => {
                      const n = st === ApplicationStatus.ACCEPTED ? studentStats.accepted : st === ApplicationStatus.PREPARING ? studentStats.preparing : st === ApplicationStatus.PENDING ? studentStats.pending : studentStats.rejected;
                      return <div key={st} className={STATUS_META[st].bar} style={{ width: `${pct(n, studentStats.total)}%` }} />;
                    })}
                  </div>
                </button>
                {STATUS_ORDER.map(st => {
                  const n = st === ApplicationStatus.ACCEPTED ? studentStats.accepted : st === ApplicationStatus.PREPARING ? studentStats.preparing : st === ApplicationStatus.PENDING ? studentStats.pending : studentStats.rejected;
                  const m = STATUS_META[st];
                  const active = adminStudentStatusFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setAdminStudentStatusFilter(active ? 'all' : st)}
                      className={`${card} text-left p-4 transition hover:border-slate-300 dark:hover:border-slate-700 ${active ? 'ring-2 ring-slate-900 dark:ring-white border-transparent' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums">{pct(n, studentStats.total)}%</span>
                      </div>
                      <div className={`mt-2 text-2xl font-bold tabular-nums ${m.text}`}>{n}</div>
                      <div className="mt-2.5 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className={`h-full ${m.bar} transition-all`} style={{ width: `${pct(n, studentStats.total)}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Toolbar */}
              <div className={`${card} p-3 flex flex-col xl:flex-row xl:items-center gap-2.5`}>
                <div className="relative flex-1 min-w-0 xl:max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="ค้นหาชื่อ รหัส สถานที่ อาจารย์นิเทศ…"
                    value={adminStudentSearch}
                    onChange={(e) => setAdminStudentSearch(e.target.value)}
                    className={`${inputCls} pl-9 pr-14`}
                  />
                  {adminStudentSearch ? (
                    <button onClick={() => setAdminStudentSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="ล้างคำค้นหา">
                      <X size={14} />
                    </button>
                  ) : (
                    <kbd className="hidden sm:block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-400">/</kbd>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-[calc(50%-4px)] sm:w-44">
                    <select value={adminStudentMajorFilter} onChange={(e) => setAdminStudentMajorFilter(e.target.value as any)} className={`${selectCls} ${adminStudentMajorFilter !== 'all' ? 'border-slate-400 dark:border-slate-500' : ''}`}>
                      <option value="all">ทุกสาขาวิชา</option>
                      {MAJOR_LIST.map(m => <option key={m} value={m}>{MAJOR_META[m].short} · {MAJOR_META[m].full}</option>)}
                    </select>
                    <SelectChevron />
                  </div>

                  <div className="flex items-center h-10 w-[calc(50%-4px)] sm:w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <button type="button" onClick={handlePrevYear} disabled={adminStudentYearFilter !== 'all' && academicYears.indexOf(adminStudentYearFilter) === academicYears.length - 1} className="h-full px-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30" aria-label="ปีก่อนหน้า">
                      <ChevronLeft size={15} />
                    </button>
                    <div className="relative flex-1 h-full flex items-center justify-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 pointer-events-none whitespace-nowrap">
                        {adminStudentYearFilter === 'all' ? 'ทุกปี' : `ปี ${adminStudentYearFilter}`}
                      </span>
                      <select value={adminStudentYearFilter} onChange={(e) => setAdminStudentYearFilter(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="ปีการศึกษา">
                        <option value="all">ทุกปีการศึกษา</option>
                        {academicYears.map(year => (
                          <option key={year} value={year}>{year === currentYearBE ? `${year} (ปัจจุบัน)` : year}</option>
                        ))}
                      </select>
                    </div>
                    <button type="button" onClick={handleNextYear} disabled={adminStudentYearFilter !== 'all' && academicYears.indexOf(adminStudentYearFilter) === 0} className="h-full px-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30" aria-label="ปีถัดไป">
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  <Segmented
                    value={adminStudentTermFilter}
                    onChange={setAdminStudentTermFilter}
                    className="h-10 w-full sm:w-auto"
                    options={[
                      { value: 'all', label: 'ทุกเทอม' },
                      { value: '1', label: 'เทอม 1' },
                      { value: '2', label: 'เทอม 2' },
                    ]}
                  />

                  {hasActiveStudentFilters && (
                    <button onClick={() => resetStudentFilters()} className={btn('ghost', 'md')}>
                      <X size={14} /> ล้างตัวกรอง
                    </button>
                  )}
                </div>

                <div className="xl:ml-auto flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    แสดง <b className="text-slate-900 dark:text-white tabular-nums">{filteredAdminStudents.length}</b> คน
                  </span>
                  <Segmented
                    value={studentViewMode}
                    onChange={setStudentViewMode}
                    className="h-10"
                    options={[
                      { value: 'table', label: <><Table size={14} /><span className="sr-only sm:not-sr-only">ตาราง</span></> },
                      { value: 'cards', label: <><LayoutGrid size={14} /><span className="sr-only sm:not-sr-only">การ์ด</span></> },
                    ]}
                  />
                </div>
              </div>

              {/* Data */}
              {filteredAdminStudents.length === 0 ? (
                <div className={card}>
                  <EmptyState
                    icon={<Users size={22} />}
                    title={studentStatuses.length === 0 ? 'ยังไม่มีข้อมูลนักศึกษา' : 'ไม่พบนักศึกษาตามเงื่อนไข'}
                    desc={studentStatuses.length === 0 ? 'เริ่มต้นโดยเพิ่มข้อมูลนักศึกษาคนแรก' : 'ลองปรับตัวกรองหรือคำค้นหา'}
                    action={studentStatuses.length === 0
                      ? <button onClick={handleAddData} className={btn('primary')}><Plus size={16} /> เพิ่มนักศึกษา</button>
                      : <button onClick={() => resetStudentFilters(true)} className={btn('secondary')}>แสดงนักศึกษาทั้งหมด</button>}
                  />
                </div>
              ) : studentViewMode === 'table' ? (
                <div className={`${card} overflow-auto max-h-[70vh] custom-scrollbar`}>
                  <table className="w-full text-left text-sm min-w-[1000px]">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="pl-4 pr-2 py-3 w-10">
                          <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllStudents} className="wise-check" aria-label="เลือกทั้งหมด" />
                        </th>
                        <th className="px-3 py-3">นักศึกษา</th>
                        <th className="px-3 py-3">สาขา / ประเภท</th>
                        <th className="px-3 py-3">สถานที่ / ตำแหน่ง</th>
                        <th className="px-3 py-3">ระยะเวลา</th>
                        <th className="px-3 py-3 text-center">เทอม/ปี</th>
                        <th className="px-3 py-3">สถานะ</th>
                        <th className="px-3 py-3">อาจารย์นิเทศ</th>
                        <th className="px-3 py-3 w-20"><span className="sr-only">จัดการ</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAdminStudents.map((record) => {
                        const isSelected = selectedStudentIds.includes(record.id);
                        const m = statusMeta(record.status);
                        return (
                          <tr key={record.id} className={`group transition-colors ${isSelected ? 'bg-[#630330]/[0.04] dark:bg-amber-400/[0.06]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                            <td className="relative pl-4 pr-2 py-2.5">
                              <span className={`absolute inset-y-1 left-0 w-1 rounded-r ${typeMeta(record.internshipType).bar}`} title={typeMeta(record.internshipType).label} />
                              <input type="checkbox" checked={isSelected} onChange={() => toggleStudentSelection(record.id)} className="wise-check" aria-label={`เลือก ${record.name}`} />
                            </td>
                            <td className="px-3 py-2.5">
                              <button onClick={() => handleEditStudent(record)} className="block text-left group/name">
                                <div className="font-semibold text-slate-900 dark:text-white group-hover/name:text-[#630330] dark:group-hover/name:text-amber-300 transition whitespace-nowrap">{record.name}</div>
                              </button>
                              <StudentIdCopy id={record.studentId} copied={copiedId === String(record.studentId || '').trim()} onCopy={copyStudentId} />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col items-start gap-1">
                                <MajorBadge major={record.major} />
                                <TypeBadge type={record.internshipType} />
                              </div>
                            </td>
                            <td className="px-3 py-2.5 max-w-[240px]">
                              <div className="text-slate-800 dark:text-slate-200 truncate" title={record.location}>{record.location || <span className="text-slate-300 dark:text-slate-600">—</span>}</div>
                              {record.position && <div className="text-xs text-slate-400 truncate" title={record.position}>{record.position}</div>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                              {formatRange(record.startDate, record.endDate) || <span className="text-slate-300 dark:text-slate-600">ยังไม่ระบุ</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-500 text-center tabular-nums">{record.term || '-'}/{record.academicYear || '-'}</td>
                            <td className="px-3 py-2.5">
                              <div className="relative inline-flex">
                                <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none ${m.dot}`} />
                                <select
                                  value={record.status || ApplicationStatus.PENDING}
                                  onChange={(e) => handleQuickStatusChange(record, e.target.value as ApplicationStatus)}
                                  className={`appearance-none cursor-pointer pl-6 pr-6 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset outline-none focus:ring-2 ${m.pill}`}
                                  title="เปลี่ยนสถานะ"
                                >
                                  {STATUS_ORDER.map(st => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                              </div>
                            </td>
                            <td className="px-3 py-2.5 max-w-[180px]">
                              {record.supervisor ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 max-w-full">
                                  <Lock size={11} className="text-emerald-500 shrink-0" />
                                  <span className="truncate" title={record.supervisor}>{record.supervisor}</span>
                                </span>
                              ) : (
                                <button type="button" onClick={() => handleEditStudent(record)} className="text-xs text-slate-400 hover:text-[#630330] dark:hover:text-amber-300 font-medium">
                                  + ระบุอาจารย์
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition">
                                <button type="button" onClick={() => handleEditStudent(record)} className={iconBtn} title="แก้ไข"><Pencil size={15} /></button>
                                <button type="button" onClick={() => askDelete({ id: record.id, type: 'student', label: record.name })} className={`${iconBtn} hover:!text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-500/10`} title="ลบ"><Trash2 size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredAdminStudents.map(record => {
                    const isSelected = selectedStudentIds.includes(record.id);
                    return (
                      <div key={record.id} className={`${card} relative overflow-hidden p-4 flex flex-col gap-3 transition ${isSelected ? 'ring-2 ring-[#630330] dark:ring-amber-400 border-transparent' : 'hover:border-slate-300 dark:hover:border-slate-700'}`}>
                        <span className={`absolute inset-x-0 top-0 h-1 ${typeMeta(record.internshipType).bar}`} />
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleStudentSelection(record.id)} className="wise-check mt-1" aria-label={`เลือก ${record.name}`} />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white leading-snug break-words">{record.name}</h4>
                            <StudentIdCopy id={record.studentId} copied={copiedId === String(record.studentId || '').trim()} onCopy={copyStudentId} />
                          </div>
                          <StatusBadge status={record.status} />
                        </div>
                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex flex-wrap items-center gap-1.5"><MajorBadge major={record.major} /><TypeBadge type={record.internshipType} short /><span className="text-slate-400">เทอม {record.term || '-'}/{record.academicYear || '-'}</span></div>
                          <div className="flex items-center gap-2"><Building2 size={13} className="text-slate-400 shrink-0" /><span className="truncate">{record.location || '—'}{record.position ? ` · ${record.position}` : ''}</span></div>
                          <div className="flex items-center gap-2"><Calendar size={13} className="text-slate-400 shrink-0" /><span>{formatRange(record.startDate, record.endDate) || 'ยังไม่ระบุระยะเวลา'}</span></div>
                          <div className="flex items-center gap-2"><UserCheck size={13} className="text-slate-400 shrink-0" /><span className="truncate">{record.supervisor || <span className="text-slate-400">ยังไม่ระบุอาจารย์นิเทศ</span>}</span></div>
                        </div>
                        <div className="flex items-center gap-2 pt-3 mt-auto border-t border-slate-100 dark:border-slate-800">
                          <div className="relative flex-1">
                            <select value={record.status || ApplicationStatus.PENDING} onChange={(e) => handleQuickStatusChange(record, e.target.value as ApplicationStatus)} className={`${selectCls} h-8 text-xs`} aria-label="เปลี่ยนสถานะ">
                              {STATUS_ORDER.map(st => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
                            </select>
                            <SelectChevron />
                          </div>
                          <button onClick={() => handleEditStudent(record)} className={iconBtn} title="แก้ไข"><Pencil size={15} /></button>
                          <button onClick={() => askDelete({ id: record.id, type: 'student', label: record.name })} className={`${iconBtn} hover:!text-rose-600`} title="ลบ"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================= SITES ======================= */}
          {adminActiveTab === 'sites' && (
            <div className="space-y-4 wise-fade-in">
              <div className={`${card} p-3 flex flex-col lg:flex-row lg:items-center gap-2.5`}>
                <div className="relative flex-1 lg:max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input ref={searchInputRef} value={adminSiteSearch} onChange={(e) => setAdminSiteSearch(e.target.value)} placeholder="ค้นหาชื่อหน่วยงาน จังหวัด ตำแหน่ง…" className={`${inputCls} pl-9`} />
                </div>
                <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                  {(['all', ...MAJOR_LIST] as (Major | 'all')[]).map(m => {
                    const count = m === 'all' ? sites.length : sites.filter(s => s.major === m).length;
                    const active = adminSiteMajorFilter === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setAdminSiteMajorFilter(m)}
                        className={`shrink-0 h-9 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                        {m !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${MAJOR_META[m].dot}`} />}
                        {m === 'all' ? 'ทุกสาขา' : MAJOR_META[m].short}
                        <span className={`tabular-nums ${active ? 'opacity-70' : 'text-slate-400'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`${card} overflow-hidden`}>
                {filteredAdminSites.length === 0 ? (
                  <EmptyState icon={<Building2 size={22} />} title="ไม่พบสถานประกอบการ" desc={sites.length ? 'ลองเปลี่ยนคำค้นหาหรือสาขา' : 'เพิ่มสถานประกอบการแห่งแรก'} action={<button onClick={handleAddData} className={btn('primary')}><Plus size={16} /> เพิ่มสถานประกอบการ</button>} />
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAdminSites.map(site => (
                      <li key={site.id} className="group flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${majorMeta(site.major).pill}`}>
                          <Building2 size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-slate-900 dark:text-white truncate">{getLocalized(site.name)}</h4>
                            <MajorBadge major={site.major} />
                            {site.status === 'senior_visited' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 font-medium">รุ่นพี่เคยฝึก</span>}
                            {site.status === 'archived' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 font-medium">คลังข้อมูล</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="inline-flex items-center gap-1"><MapPin size={12} />{getLocalized(site.location) || '-'}</span>
                            {getLocalized(site.position) && <span className="inline-flex items-center gap-1"><Briefcase size={12} />{getLocalized(site.position)}</span>}
                          </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-1 text-slate-400">
                          {site.contactLink && <a href={site.contactLink} target="_blank" rel="noopener noreferrer" className={iconBtn} title={site.contactLink}><Globe size={15} /></a>}
                          {site.email && <button onClick={() => copyText(site.email!, 'คัดลอกอีเมลแล้ว')} className={iconBtn} title={site.email}><Mail size={15} /></button>}
                          {site.phone && <button onClick={() => copyText(site.phone!, 'คัดลอกเบอร์โทรแล้ว')} className={iconBtn} title={site.phone}><Phone size={15} /></button>}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => { setEditingSite(site); setShowSiteModal(true); }} className={iconBtn} title="แก้ไข"><Pencil size={15} /></button>
                          <button onClick={() => askDelete({ id: site.id, type: 'site', label: getLocalized(site.name) })} className={`${iconBtn} hover:!text-rose-600`} title="ลบ"><Trash2 size={15} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ======================= SCHEDULE ======================= */}
          {adminActiveTab === 'schedule' && (
            <div className={`${card} overflow-hidden wise-fade-in`}>
              {sortedSchedules.length === 0 ? (
                <EmptyState icon={<CalendarDays size={22} />} title="ยังไม่มีกำหนดการ" desc="เพิ่มวันสำคัญเพื่อแสดงในหน้าหลักของนักศึกษา" action={<button onClick={handleAddData} className={btn('primary')}><Plus size={16} /> เพิ่มกำหนดการ</button>} />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedSchedules.map(item => {
                    const state = scheduleState(item);
                    const d = item.rawStartDate ? new Date(item.rawStartDate) : null;
                    const validD = d && !isNaN(d.getTime());
                    return (
                      <li key={item.id} className={`group flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${state === 'past' ? 'opacity-60' : ''}`}>
                        <div className="w-12 shrink-0 text-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <div className="text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-500 py-0.5">{validD ? d!.toLocaleDateString('th-TH', { month: 'short' }) : '—'}</div>
                          <div className="text-lg font-bold text-slate-900 dark:text-white leading-7 tabular-nums">{validD ? d!.getDate() : '?'}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{getLocalized(item.event)}</h4>
                            {state === 'ongoing' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 font-medium inline-flex items-center gap-1"><CircleDot size={10} />กำลังดำเนินการ</span>}
                            {state === 'upcoming' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300 font-medium">กำลังจะมาถึง</span>}
                            {state === 'past' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 font-medium">ผ่านไปแล้ว</span>}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.rawStartDate ? formatDateBE(item.rawStartDate) : getLocalized(item.startDate)} – {item.rawEndDate ? formatDateBE(item.rawEndDate) : getLocalized(item.endDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => openSchedule(item)} className={iconBtn} title="แก้ไข"><Pencil size={15} /></button>
                          <button onClick={() => askDelete({ id: item.id, type: 'schedule', label: getLocalized(item.event) })} className={`${iconBtn} hover:!text-rose-600`} title="ลบ"><Trash2 size={15} /></button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* ======================= FORMS ======================= */}
          {adminActiveTab === 'forms' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 wise-fade-in">
              {[
                { cat: FormCategory.APPLICATION, title: 'เอกสารสมัครงาน', sub: 'Application' },
                { cat: FormCategory.MONITORING, title: 'เอกสารระหว่างฝึกงาน', sub: 'Monitoring' },
              ].map(group => {
                const list = forms.filter(f => f.category === group.cat);
                return (
                  <section key={group.cat} className={`${card} overflow-hidden`}>
                    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{group.title}</h3>
                        <p className="text-[11px] text-slate-400">{group.sub} · {list.length} ไฟล์</p>
                      </div>
                    </header>
                    {list.length === 0 ? (
                      <EmptyState icon={<FileText size={20} />} title="ยังไม่มีเอกสารในหมวดนี้" />
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {list.map(form => {
                          const isData = form.url?.startsWith('data:');
                          const isPending = form.url?.startsWith('PENDING');
                          const usable = form.url && form.url !== '#' && !isPending;
                          let host = '';
                          try { if (usable && !isData) host = new URL(form.url).hostname.replace('www.', ''); } catch { host = form.url; }
                          return (
                            <li key={form.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                              <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"><FileText size={17} /></div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{getLocalized(form.title)}</h4>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {isPending ? 'กำลังอัปโหลดไฟล์…' : isData ? 'ไฟล์ PDF ที่อัปโหลด' : usable ? host : 'ยังไม่มีลิงก์'}
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {usable && <a href={form.url} target="_blank" rel="noopener noreferrer" className={iconBtn} title="เปิดไฟล์"><ExternalLink size={15} /></a>}
                                {usable && !isData && <button onClick={() => copyText(form.url)} className={iconBtn} title="คัดลอกลิงก์"><Copy size={15} /></button>}
                                <button onClick={() => { setEditingForm(form); setUploadMethod('url'); setSelectedFile(null); setShowFormModal(true); }} className={iconBtn} title="แก้ไข"><Pencil size={15} /></button>
                                <button onClick={() => askDelete({ id: form.id, type: 'form', label: getLocalized(form.title) })} className={`${iconBtn} hover:!text-rose-600`} title="ลบ"><Trash2 size={15} /></button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* ======================= ADMINS ======================= */}
          {adminActiveTab === 'admins' && (
            <div className="space-y-4 wise-fade-in max-w-3xl">
              <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <p>ทุกรหัสในรายการนี้ใช้เข้าสู่ระบบหลังบ้านได้ทันที ควรให้เฉพาะผู้ที่ได้รับมอบหมาย และลบรหัสที่ไม่ได้ใช้แล้วออก</p>
              </div>
              <div className={`${card} overflow-hidden`}>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminPasswords.map((pass, idx) => (
                    <li key={idx} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"><KeyRound size={16} /></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">รหัสผ่านที่ {idx + 1}</p>
                        <p className="text-xs text-slate-400 font-mono tracking-widest">••••••••</p>
                      </div>
                      <button
                        onClick={() => askDelete({ id: pass, type: 'admin', label: `รหัสผ่านที่ ${idx + 1}` })}
                        disabled={adminPasswords.length <= 1}
                        className={`${iconBtn} hover:!text-rose-600 disabled:opacity-30 disabled:pointer-events-none`}
                        title={adminPasswords.length <= 1 ? 'ต้องมีรหัสผ่านอย่างน้อย 1 รหัส' : 'ลบ'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                  {adminPasswords.length === 0 && (
                    <li><EmptyState icon={<KeyRound size={20} />} title="ยังไม่มีรหัสผ่าน" /></li>
                  )}
                </ul>
                <button onClick={handleAddData} className="w-full flex items-center justify-center gap-2 h-11 text-sm font-medium text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <Plus size={16} /> เพิ่มรหัสผ่านใหม่
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating bulk action bar */}
      {adminActiveTab === 'students' && selectedStudentIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[120] w-[calc(100%-2rem)] sm:w-auto wise-pop-in">
          <div className="flex items-center gap-1 sm:gap-2 p-1.5 pl-4 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl">
            <span className="text-sm font-semibold whitespace-nowrap mr-1">เลือก {selectedStudentIds.length} คน</span>
            <div className="w-px h-5 bg-white/15 dark:bg-slate-900/15 mx-1" />
            <button onClick={() => setShowBulkStatusModal(true)} className="h-9 px-3 rounded-xl text-sm font-medium hover:bg-white/10 dark:hover:bg-slate-900/10 flex items-center gap-1.5">
              <Layers size={15} /> <span className="hidden sm:inline">เปลี่ยนสถานะ</span>
            </button>
            <button onClick={() => exportToExcel(selectedStudents, 'รายชื่อนักศึกษาที่เลือก')} className="h-9 px-3 rounded-xl text-sm font-medium hover:bg-white/10 dark:hover:bg-slate-900/10 flex items-center gap-1.5">
              <FileSpreadsheet size={15} /> <span className="hidden sm:inline">Excel</span>
            </button>
            <button onClick={() => exportToPDF(selectedStudents, 'รายชื่อนักศึกษาที่เลือก')} className="h-9 px-3 rounded-xl text-sm font-medium hover:bg-white/10 dark:hover:bg-slate-900/10 flex items-center gap-1.5">
              <Printer size={15} /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={() => setSelectedStudentIds([])} className="ml-auto h-9 w-9 rounded-xl hover:bg-white/10 dark:hover:bg-slate-900/10 flex items-center justify-center" aria-label="ยกเลิกการเลือก">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {adminActiveTab !== 'settings' && !(adminActiveTab === 'students' && selectedStudentIds.length > 0) && (
        <button onClick={handleAddData} className="sm:hidden fixed bottom-5 right-5 z-[100] w-14 h-14 rounded-2xl bg-[#630330] text-white shadow-xl shadow-[#630330]/30 flex items-center justify-center active:scale-95 transition" aria-label={addLabel[adminActiveTab]}>
          <Plus size={24} />
        </button>
      )}

      {/* ======================= MODALS ======================= */}

      {/* STATS */}
      <Modal open={showStatsModal} onClose={() => setShowStatsModal(false)} title="สถิติสรุปยอด" subtitle="ภาพรวมนักศึกษาฝึกงานและสหกิจศึกษา" icon={<BarChart3 size={18} />} size="xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="สาขาวิชา">
              <div className="relative">
                <select value={statsFilter.major} onChange={(e) => setStatsFilter(prev => ({ ...prev, major: e.target.value as any }))} className={selectCls}>
                  <option value="all">ทุกสาขา</option>
                  {MAJOR_LIST.map(m => <option key={m} value={m}>{MAJOR_META[m].short} · {MAJOR_META[m].full}</option>)}
                </select>
                <SelectChevron />
              </div>
            </Field>
            <Field label="ภาคเรียน">
              <Segmented value={statsFilter.term} onChange={(v) => setStatsFilter(prev => ({ ...prev, term: v }))} className="w-full h-10" options={[{ value: 'all', label: 'ทั้งหมด' }, { value: '1', label: 'เทอม 1' }, { value: '2', label: 'เทอม 2' }]} />
            </Field>
            <Field label="ปีการศึกษา">
              <div className="relative">
                <select value={statsFilter.year} onChange={(e) => setStatsFilter(prev => ({ ...prev, year: e.target.value }))} className={selectCls}>
                  <option value="all">ทุกปี</option>
                  {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                <SelectChevron />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500">ทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{statsData.total}</p>
            </div>
            {STATUS_ORDER.map(st => (
              <div key={st} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[st].dot}`} />{STATUS_META[st].label}</p>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${STATUS_META[st].text}`}>{statsData.byStatus[st] || 0}</p>
                <p className="text-[11px] text-slate-400">{pct(statsData.byStatus[st] || 0, statsData.total)}%</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section>
              <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">แยกตามสาขา</h5>
              <div className="space-y-2.5">
                {MAJOR_LIST.map(m => {
                  const n = statsData.byMajor[m] || 0;
                  return (
                    <div key={m}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-300">{MAJOR_META[m].short} · {MAJOR_META[m].full}</span><span className="tabular-nums text-slate-500">{n}</span></div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full ${MAJOR_META[m].dot}`} style={{ width: `${pct(n, statsData.total)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </section>
            <section>
              <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">รูปแบบการฝึก</h5>
              <div className="space-y-2.5">
                {[
                  { t: InternshipType.INTERNSHIP, label: 'ฝึกงาน', icon: <Briefcase size={14} />, color: 'bg-slate-700 dark:bg-slate-300' },
                  { t: InternshipType.COOP, label: 'สหกิจศึกษา', icon: <GraduationCap size={14} />, color: 'bg-[#630330] dark:bg-amber-400' },
                ].map(x => {
                  const n = statsData.byType[x.t] || 0;
                  return (
                    <div key={x.t}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">{x.icon}{x.label}</span><span className="tabular-nums text-slate-500">{n} · {pct(n, statsData.total)}%</span></div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full ${x.color}`} style={{ width: `${pct(n, statsData.total)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </section>
            <section>
              <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">สถานที่ยอดนิยม</h5>
              {statsData.topLocations.length > 0 ? (
                <ol className="space-y-1.5">
                  {statsData.topLocations.map(([loc, count], idx) => (
                    <li key={loc} className="flex items-center gap-2.5 text-sm">
                      <span className="w-5 text-xs text-slate-400 tabular-nums">{idx + 1}.</span>
                      <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{loc}</span>
                      <span className="text-xs tabular-nums text-slate-500">{count} คน</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-xs text-slate-400">ไม่มีข้อมูลสถานที่</p>}
            </section>
          </div>
        </div>
      </Modal>

      {/* REPORT */}
      {(() => {
        const reportCount = showReportModal ? getFilteredReportStudents().length : 0;
        return (
          <Modal
            open={showReportModal}
            onClose={() => setShowReportModal(false)}
            title="ส่งออกรายงาน"
            subtitle="เลือกเงื่อนไขแล้วเลือกรูปแบบไฟล์"
            icon={<FileDown size={18} />}
            size="md"
            footer={
              <>
                <button onClick={handleDownloadReport} className={`${btn('ghost', 'sm')} mr-auto`}>CSV ดิบ</button>
                <button onClick={() => runReportExport('excel')} className={btn('secondary', 'sm')}><FileSpreadsheet size={14} className="text-emerald-600" /> Excel</button>
                <button onClick={() => runReportExport('word')} className={btn('secondary', 'sm')}><FileText size={14} className="text-blue-600" /> Word</button>
                <button onClick={() => runReportExport('pdf')} className={btn('primary', 'sm')}><Printer size={14} /> PDF</button>
              </>
            }
          >
            <div className="space-y-4">
              <Field label="สาขาวิชา">
                <div className="relative">
                  <select value={reportMajor} onChange={(e) => setReportMajor(e.target.value as any)} className={selectCls}>
                    <option value="all">ทุกสาขาวิชา</option>
                    {MAJOR_LIST.map(m => <option key={m} value={m}>{MAJOR_META[m].short} · {MAJOR_META[m].full}</option>)}
                  </select>
                  <SelectChevron />
                </div>
              </Field>
              <Segmented
                value={exportMode}
                onChange={setExportMode}
                className="w-full h-10"
                options={[{ value: 'date', label: <><Calendar size={14} /> ตามช่วงวันที่</> }, { value: 'period', label: <><GraduationCap size={14} /> ตามเทอม/ปี</> }]}
              />
              {exportMode === 'date' ? (
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">ช่วงวันฝึก (เริ่มตั้งแต่ – สิ้นสุดไม่เกิน)</span>
                  <DateRangePicker
                    start={reportRange.start}
                    end={reportRange.end}
                    onChange={(s, e) => setReportRange({ start: s, end: e })}
                    presets={reportPresets}
                    placeholder="ทุกช่วงเวลา"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ภาคเรียน">
                    <div className="relative">
                      <select value={reportPeriod.term} onChange={(e) => setReportPeriod(prev => ({ ...prev, term: e.target.value }))} className={selectCls}>
                        <option value="">ทั้งหมด</option><option value="1">เทอม 1</option><option value="2">เทอม 2</option>
                      </select>
                      <SelectChevron />
                    </div>
                  </Field>
                  <Field label="ปีการศึกษา">
                    <div className="relative">
                      <select value={reportPeriod.year} onChange={(e) => setReportPeriod(prev => ({ ...prev, year: e.target.value }))} className={selectCls}>
                        <option value="">ทั้งหมด</option>
                        {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
                      </select>
                      <SelectChevron />
                    </div>
                  </Field>
                </div>
              )}
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${reportCount > 0 ? 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>
                <Info size={16} className="shrink-0" />
                {reportCount > 0 ? <span>พบ <b className="tabular-nums">{reportCount}</b> รายการตามเงื่อนไข</span> : <span>ไม่พบข้อมูลตามเงื่อนไขนี้</span>}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* DELETE CONFIRMATION */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="ยืนยันการลบ"
        icon={<AlertTriangle size={18} className="text-rose-600" />}
        size="sm"
        zIndex="z-[260]"
        footer={
          <>
            <button onClick={() => setShowDeleteModal(false)} className={btn('secondary')}>ยกเลิก</button>
            <button onClick={handleConfirmDelete} className={btn('danger')}><Trash2 size={15} /> ลบ</button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ต้องการลบ <b className="text-slate-900 dark:text-white">{deleteLabel}</b> ใช่หรือไม่? ข้อมูลจะถูกลบออกจากระบบและไม่สามารถกู้คืนได้
        </p>
      </Modal>

      {/* STUDENT FORM */}
      <Modal
        open={showAdminStatusModal}
        onClose={closeStatusModal}
        title={editingStatusRecord ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษา'}
        subtitle={editingStatusRecord ? `รหัส ${editingStatusRecord.studentId}` : 'กรอกข้อมูลการฝึกงานหรือสหกิจศึกษา'}
        icon={<Users size={18} />}
        size="lg"
        zIndex="z-[210]"
        footer={
          <>
            <button type="button" onClick={closeStatusModal} className={btn('secondary')}>ยกเลิก</button>
            <button type="submit" form="student-status-form" disabled={isSyncing} className={btn('primary')}>
              <Check size={16} /> {isSyncing ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
          </>
        }
      >
        <form id="student-status-form" key={editingStatusRecord?.id || 'new'} ref={studentStatusFormRef} onSubmit={(e) => handleSaveStatus(e)} className="space-y-6">
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ข้อมูลนักศึกษา</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="รหัสนักศึกษา" required>
                <input name="student_id" defaultValue={editingStatusRecord?.studentId} required placeholder="เช่น 406559001" className={`${inputCls} font-mono`} autoFocus={!editingStatusRecord} inputMode="numeric" />
              </Field>
              <Field label="ชื่อ-นามสกุล" required>
                <input name="student_name" defaultValue={editingStatusRecord?.name} required placeholder="เช่น นายฮาซัน ดือราแม" className={inputCls} />
              </Field>
              <Field label="สาขาวิชา">
                <div className="relative">
                  <select name="major" defaultValue={editingStatusRecord?.major || Major.HALAL_FOOD} className={selectCls}>
                    {MAJOR_LIST.map(m => <option key={m} value={m}>{MAJOR_META[m].short} · {MAJOR_META[m].full}</option>)}
                  </select>
                  <SelectChevron />
                </div>
              </Field>
              <Field label="รูปแบบการฝึก">
                <Segmented
                  value={modalInternshipType}
                  onChange={setModalInternshipType}
                  className="w-full h-10"
                  options={[
                    { value: InternshipType.INTERNSHIP, label: <><Briefcase size={14} /> ฝึกงาน</> },
                    { value: InternshipType.COOP, label: <><GraduationCap size={14} /> สหกิจศึกษา</> },
                  ]}
                />
                <input type="hidden" name="internship_type" value={modalInternshipType} />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">สถานที่ฝึกและอาจารย์นิเทศ</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="สถานที่ฝึก / หน่วยงาน">
                <input name="location" defaultValue={editingStatusRecord?.location} placeholder="ชื่อบริษัทหรือองค์กร" className={inputCls} list="wise-location-list" />
                <datalist id="wise-location-list">
                  {Array.from(new Set(studentStatuses.map(s => s.location).filter(Boolean))).slice(0, 50).map(l => <option key={l} value={l} />)}
                </datalist>
              </Field>
              <Field label="ตำแหน่งงาน">
                <input name="position" defaultValue={editingStatusRecord?.position} placeholder="เช่น Web Developer, QA" className={inputCls} />
              </Field>
              <Field label="อาจารย์นิเทศ" hint="เว้นว่างได้ อาจารย์สามารถระบุเองผ่านลิงก์ที่แชร์" className="sm:col-span-2">
                <input name="supervisor" defaultValue={editingStatusRecord?.supervisor} placeholder="ชื่ออาจารย์นิเทศ" className={inputCls} list="wise-supervisor-list" />
                <datalist id="wise-supervisor-list">
                  {Array.from(new Set(studentStatuses.map(s => s.supervisor).filter(Boolean))).slice(0, 50).map(l => <option key={l} value={l} />)}
                </datalist>
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ภาคการศึกษาและระยะเวลา</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ภาคเรียน">
                <div className="relative">
                  <select name="term" defaultValue={editingStatusRecord?.term || '1'} className={selectCls}>
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>
                  <SelectChevron />
                </div>
              </Field>
              <Field label="ปีการศึกษา">
                <div className="relative">
                  <select name="academic_year" defaultValue={editingStatusRecord?.academicYear || currentYearBE} className={selectCls}>
                    {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <SelectChevron />
                </div>
              </Field>
              <div className="col-span-2 space-y-1.5">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">ระยะเวลาฝึก (วันเริ่ม – วันสิ้นสุด)</span>
                <DateRangePicker
                  start={modalStartDate}
                  end={modalEndDate}
                  onChange={(s, e) => { setModalStartDate(s); setModalEndDate(e); }}
                  startName="start_date"
                  endName="end_date"
                  presets={studentPresets}
                  placeholder="แตะเพื่อเลือกวันเริ่มและวันสิ้นสุด"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1">กำหนดเร็ว</span>
              {[
                { label: 'เทอม 1 (มิ.ย.–ต.ค.)', fn: applyPresetTerm1 },
                { label: 'เทอม 2 (พ.ย.–มี.ค.)', fn: applyPresetTerm2 },
                { label: '+2 เดือน', fn: () => applyPresetDuration(2) },
                { label: '+4 เดือน', fn: () => applyPresetDuration(4) },
              ].map(p => (
                <button key={p.label} type="button" onClick={p.fn} className="h-7 px-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-slate-400 hover:text-slate-900 dark:hover:text-white transition">
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">สถานะ</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STATUS_ORDER.map(st => {
                const active = modalStatus === st;
                const m = STATUS_META[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setModalStatus(st)}
                    className={`h-10 rounded-lg text-sm font-medium border transition flex items-center justify-center gap-2 ${active ? `${m.pill} ring-1 ring-inset border-transparent` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${m.dot}`} /> {m.label}
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="status" value={modalStatus} />
          </section>

          {statusError && (
            <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 space-y-2.5">
              <div className="flex gap-2.5 items-start text-sm text-rose-700 dark:text-rose-300">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>{statusError}</p>
              </div>
              {isForceSaveVisible && (
                <button type="button" onClick={() => handleSaveStatus(undefined, true)} className={btn('danger', 'sm')}>
                  ยืนยันบันทึกซ้ำ
                </button>
              )}
            </div>
          )}
        </form>
      </Modal>

      {/* SCHEDULE FORM */}
      <Modal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={editingSchedule ? 'แก้ไขกำหนดการ' : 'เพิ่มกำหนดการ'}
        icon={<CalendarDays size={18} />}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setShowScheduleModal(false)} className={btn('secondary')}>ยกเลิก</button>
            <button type="submit" form="schedule-form" disabled={isTranslating || isSyncing} className={btn('primary')}>
              <Check size={16} /> {isTranslating ? 'กำลังแปลภาษา…' : 'บันทึก'}
            </button>
          </>
        }
      >
        <form id="schedule-form" key={editingSchedule?.id || 'new'} onSubmit={handleSaveSchedule} className="space-y-4">
          <Field label="ชื่อกิจกรรม / หัวข้อ" required>
            <input name="event_th" defaultValue={editingSchedule?.event.th} required placeholder="เช่น ยื่นเอกสารขอฝึกงาน" className={inputCls} autoFocus />
          </Field>
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">ช่วงวันที่<span className="text-rose-500 ml-0.5">*</span></span>
            <DateRangePicker
              start={schedStart}
              end={schedEnd}
              onChange={(s, e) => { setSchedStart(s); setSchedEnd(e); }}
              startName="start_th"
              endName="end_th"
              placeholder="แตะเพื่อเลือกวันเริ่มต้นและวันสิ้นสุด"
              presets={[
                { label: 'วันเดียว (วันนี้)', get: () => { const d = toISO(new Date()); return [d, d]; } },
                { label: '1 สัปดาห์', get: (s) => { const a = s || toISO(new Date()); const b = new Date(a); b.setDate(b.getDate() + 6); return [a, toISO(b)]; } },
                { label: '2 สัปดาห์', get: (s) => { const a = s || toISO(new Date()); const b = new Date(a); b.setDate(b.getDate() + 13); return [a, toISO(b)]; } },
                { label: '1 เดือน', get: (s) => { const a = s || toISO(new Date()); return [a, addMonths(a, 1)]; } },
              ]}
            />
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Info size={12} /> ระบบจะแปลหัวข้อเป็นภาษาอังกฤษ อาหรับ และมลายูให้อัตโนมัติ</p>
        </form>
      </Modal>

      {/* DOCUMENT FORM */}
      <Modal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingForm ? 'แก้ไขเอกสาร' : 'เพิ่มเอกสาร'}
        icon={<FileText size={18} />}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setShowFormModal(false)} className={btn('secondary')}>ยกเลิก</button>
            <button type="submit" form="doc-form" disabled={isTranslating || isSyncing || (uploadMethod === 'file' && !selectedFile)} className={btn('primary')}>
              <Check size={16} /> {isTranslating ? 'กำลังประมวลผล…' : 'บันทึก'}
            </button>
          </>
        }
      >
        <form id="doc-form" key={editingForm?.id || 'new'} onSubmit={handleSaveForm} className="space-y-4">
          <Field label="ชื่อเอกสาร" required>
            <input name="title" defaultValue={editingForm?.title.th} required placeholder="เช่น แบบฟอร์ม วบง. 01" className={inputCls} autoFocus />
          </Field>
          <Field label="หมวดหมู่">
            <div className="relative">
              <select name="category" defaultValue={editingForm?.category || FormCategory.APPLICATION} className={selectCls}>
                <option value={FormCategory.APPLICATION}>เอกสารสมัครงาน (Application)</option>
                <option value={FormCategory.MONITORING}>เอกสารระหว่างฝึกงาน (Monitoring)</option>
              </select>
              <SelectChevron />
            </div>
          </Field>
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">แหล่งที่มาไฟล์</span>
            <Segmented
              value={uploadMethod}
              onChange={setUploadMethod}
              className="w-full h-10"
              options={[{ value: 'url', label: <><LinkIcon size={14} /> ลิงก์ URL</> }, { value: 'file', label: <><Upload size={14} /> อัปโหลด PDF</> }]}
            />
            {uploadMethod === 'url' ? (
              <input name="url" defaultValue={editingForm?.url?.startsWith('data:') ? '' : editingForm?.url} placeholder="https://drive.google.com/…" className={inputCls} />
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center hover:border-slate-400 dark:hover:border-slate-500 transition">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                <Upload size={22} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedFile ? selectedFile.name : 'คลิกเพื่อเลือกไฟล์ PDF'}</p>
                {!selectedFile && <p className="text-[11px] text-slate-400 mt-0.5">รองรับเฉพาะไฟล์ .pdf</p>}
              </button>
            )}
          </div>
        </form>
      </Modal>

      {/* SUMMARY */}
      <Modal
        open={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title="สรุปภาพรวมการฝึกงาน"
        subtitle={`${summaryStudents.length} คน · ระบุอาจารย์นิเทศได้โดยตรงในตาราง`}
        icon={<ClipboardList size={18} />}
        size="full"
        footer={
          <>
            <div className="mr-auto hidden sm:flex items-center gap-1">
              <button onClick={() => exportToExcel(summaryStudents, 'สรุปรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา')} className={btn('ghost', 'sm')}><FileSpreadsheet size={14} /> Excel</button>
              <button onClick={() => exportToPDF(summaryStudents, 'สรุปรายชื่อนักศึกษาฝึกงานและสหกิจศึกษา')} className={btn('ghost', 'sm')}><Printer size={14} /> PDF</button>
            </div>
            <button onClick={() => openShare('summary')} className={btn('secondary')}><Share2 size={15} /> แชร์ลิงก์สรุปนี้</button>
            <button onClick={() => setShowSummaryModal(false)} className={btn('primary')}>เสร็จสิ้น</button>
          </>
        }
      >
        <div className="flex flex-col gap-4 h-[62vh]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 mr-1">ปีการศึกษา</span>
              <button onClick={() => setSummaryFilter(p => ({ ...p, years: [] }))} className={`h-7 px-3 rounded-full text-xs font-medium transition ${summaryFilter.years.length === 0 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>ทั้งหมด</button>
              {yearsOptions.map(y => (
                <button key={y} onClick={() => toggleSummaryYear(y)} className={`h-7 px-3 rounded-full text-xs font-medium transition ${summaryFilter.years.includes(y) ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>{y}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 mr-1">ภาคเรียน</span>
              <button onClick={() => setSummaryFilter(p => ({ ...p, terms: [] }))} className={`h-7 px-3 rounded-full text-xs font-medium transition ${summaryFilter.terms.length === 0 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>ทั้งหมด</button>
              {termsOptions.map(t => (
                <button key={t} onClick={() => toggleSummaryTerm(t)} className={`h-7 px-3 rounded-full text-xs font-medium transition ${summaryFilter.terms.includes(t) ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>เทอม {t}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <SharedSummaryTable
              students={summaryStudents}
              formatDateBE={formatDateBE}
              onSupervisorChange={onSupervisorChange}
              locks={liveLocks}
              live={backendLive === true}
              onLockDenied={onLockDenied}
            />
          </div>
        </div>
      </Modal>

      {/* SITE FORM */}
      <Modal
        open={showSiteModal}
        onClose={() => setShowSiteModal(false)}
        title={editingSite ? 'แก้ไขสถานประกอบการ' : 'เพิ่มสถานประกอบการ'}
        icon={<Building2 size={18} />}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowSiteModal(false)} className={btn('secondary')}>ยกเลิก</button>
            <button type="submit" form="site-form" disabled={isTranslating || isSyncing} className={btn('primary')}>
              <Check size={16} /> {isTranslating ? 'กำลังแปลภาษา…' : 'บันทึก'}
            </button>
          </>
        }
      >
        <form id="site-form" key={editingSite?.id || 'new'} onSubmit={handleSaveSite} className="space-y-6">
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ข้อมูลหน่วยงาน</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="ชื่อหน่วยงาน / บริษัท" required>
                <input name="name_th" defaultValue={editingSite?.name.th} required placeholder="ระบุชื่อบริษัท" className={inputCls} autoFocus />
              </Field>
              <Field label="จังหวัดที่ตั้ง" required>
                <input name="loc_th" defaultValue={editingSite?.location.th} required placeholder="เช่น ปัตตานี" className={inputCls} />
              </Field>
              <Field label="ตำแหน่งที่เปิดรับ" required>
                <input name="pos_th" defaultValue={editingSite?.position.th} required placeholder="เช่น Full Stack Developer" className={inputCls} />
              </Field>
              <Field label="สาขาวิชา">
                <div className="relative">
                  <select name="major" defaultValue={editingSite?.major || Major.HALAL_FOOD} className={selectCls}>
                    {MAJOR_LIST.map(m => <option key={m} value={m}>{MAJOR_META[m].short} · {MAJOR_META[m].full}</option>)}
                  </select>
                  <SelectChevron />
                </div>
              </Field>
              <Field label="รายละเอียดงานเบื้องต้น" className="sm:col-span-2">
                <textarea name="desc_th" defaultValue={editingSite?.description.th} placeholder="ลักษณะงานพอสังเขป…" className={textareaCls} />
              </Field>
            </div>
          </section>
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ช่องทางติดต่อ</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="เว็บไซต์"><input name="contact_link" defaultValue={editingSite?.contactLink} placeholder="https://…" className={inputCls} /></Field>
              <Field label="อีเมล"><input type="email" name="email" defaultValue={editingSite?.email} placeholder="hr@company.com" className={inputCls} /></Field>
              <Field label="เบอร์โทร"><input name="phone" defaultValue={editingSite?.phone} placeholder="08X-XXX-XXXX" className={inputCls} inputMode="tel" /></Field>
            </div>
          </section>
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">การแสดงผล</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'active', label: 'เปิดรับสมัคร', checked: !editingSite || editingSite.status === 'active' },
                { v: 'senior_visited', label: 'รุ่นพี่เคยฝึก', checked: editingSite?.status === 'senior_visited' },
                { v: 'archived', label: 'คลังข้อมูล', checked: editingSite?.status === 'archived' },
              ].map(o => (
                <label key={o.v} className="flex items-center justify-center h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer transition has-[:checked]:border-[#630330] has-[:checked]:bg-[#630330]/[0.05] has-[:checked]:text-[#630330] dark:has-[:checked]:border-amber-400 dark:has-[:checked]:bg-amber-400/10 dark:has-[:checked]:text-amber-300">
                  <input type="radio" name="status" value={o.v} defaultChecked={o.checked} className="sr-only" />
                  {o.label}
                </label>
              ))}
            </div>
          </section>
        </form>
      </Modal>

      {/* BULK STATUS */}
      <Modal open={showBulkStatusModal} onClose={() => setShowBulkStatusModal(false)} title="เปลี่ยนสถานะกลุ่ม" subtitle={`นักศึกษาที่เลือก ${selectedStudentIds.length} คน`} icon={<Layers size={18} />} size="sm">
        <div className="space-y-2">
          {STATUS_ORDER.map(st => {
            const m = STATUS_META[st];
            return (
              <button key={st} onClick={() => handleBulkStatusUpdate(st)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition">
                <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.label}</p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </button>
            );
          })}
        </div>
      </Modal>

      {/* ADMIN PASSWORD */}
      <Modal
        open={showAdminPasswordModal}
        onClose={() => setShowAdminPasswordModal(false)}
        title="เพิ่มรหัสผ่านแอดมิน"
        icon={<KeyRound size={18} />}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setShowAdminPasswordModal(false)} className={btn('secondary')}>ยกเลิก</button>
            <button type="submit" form="admin-pass-form" disabled={!newAdminPass.trim() || isSyncing} className={btn('primary')}><Check size={16} /> เพิ่มรหัส</button>
          </>
        }
      >
        <form id="admin-pass-form" onSubmit={handleSaveAdminPassword} className="space-y-3">
          <Field label="รหัสผ่านใหม่" hint="รหัสนี้ใช้เข้าสู่ระบบได้ทันทีหลังบันทึก">
            <input type="text" value={newAdminPass} onChange={(e) => setNewAdminPass(e.target.value)} required placeholder="ระบุรหัสผ่าน" className={`${inputCls} font-mono`} autoFocus autoComplete="off" />
          </Field>
        </form>
      </Modal>

      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        years={shareKind === 'dashboard' ? dashFilters.years : summaryFilter.years}
        terms={shareKind === 'dashboard' ? dashFilters.terms : summaryFilter.terms}
        availableYears={yearsOptions}
        availableTerms={['1', '2']}
        kind={shareKind}
      />
    </>
  );
};

export default AdminPanel;

import { LocalizedString } from './types';

/** What a checklist step's shortcut button points at in the student portal. */
export type StepLink = '' | 'sites' | 'app' | 'monitor' | 'deadline';

/** One step of the student checklist; editable by admins, stored in the Settings sheet as JSON. */
export interface ChecklistStep {
  id: string;
  group: 0 | 1 | 2; // 0 = before, 1 = during, 2 = after the placement
  title: Partial<LocalizedString>;
  hint: Partial<LocalizedString>;
  link: StepLink;
}

export const CHECKLIST_GROUPS_TH = ['ก่อนออกฝึก', 'ระหว่างฝึก', 'หลังฝึก'];

export const STEP_LINK_LABELS: Record<StepLink, string> = {
  '': 'ไม่มีปุ่มลัด',
  sites: 'ปุ่ม "ดูสถานที่"',
  app: 'ปุ่มเอกสารสมัครงาน',
  monitor: 'ปุ่มเอกสารระหว่างฝึก',
  deadline: 'แสดงวันกำหนดการถัดไป',
};

export const DEFAULT_CHECKLIST: ChecklistStep[] = [
  { id: 'pick', group: 0, link: 'sites',
    title: { th: 'เลือกสถานประกอบการ', en: 'Choose a placement', ar: 'اختر جهة التدريب', ms: 'Pilih tempat latihan' },
    hint: { th: 'ดูที่เปิดรับ หรือที่รุ่นพี่เคยไป', en: 'Browse open sites or where seniors went', ar: 'المتاحة أو التي ذهب إليها السابقون', ms: 'Lihat yang dibuka atau tempat senior pernah pergi' } },
  { id: 'advisor', group: 0, link: '',
    title: { th: 'ปรึกษาอาจารย์ที่ปรึกษา', en: 'Meet your advisor', ar: 'استشر المرشد الأكاديمي', ms: 'Jumpa penasihat' },
    hint: { th: 'ยืนยันสถานที่และช่วงเวลาฝึก', en: 'Confirm the site and dates', ar: 'تأكيد الجهة والمدة', ms: 'Sahkan tempat dan tarikh' } },
  { id: 'form', group: 0, link: 'app',
    title: { th: 'กรอกแบบฟอร์มสมัคร', en: 'Fill in the application', ar: 'املأ نموذج الطلب', ms: 'Isi borang permohonan' },
    hint: { th: 'ดาวน์โหลดเอกสารสมัครงาน', en: 'Download the application forms', ar: 'حمّل نماذج التقديم', ms: 'Muat turun borang permohonan' } },
  { id: 'submit', group: 0, link: 'deadline',
    title: { th: 'ยื่นเอกสารที่เจ้าหน้าที่ WISE', en: 'Submit documents to WISE', ar: 'سلّم الوثائق لوحدة WISE', ms: 'Hantar dokumen kepada WISE' },
    hint: { th: 'ตามกำหนดการ', en: 'By the deadline', ar: 'حسب الموعد', ms: 'Mengikut tarikh akhir' } },
  { id: 'reply', group: 0, link: '',
    title: { th: 'รอผลการตอบรับ', en: 'Wait for the reply', ar: 'انتظر الرد', ms: 'Tunggu jawapan' },
    hint: { th: 'ติดตามสถานะได้จากหน้าแรก', en: 'Track your status from the home page', ar: 'تابع حالتك من الصفحة الرئيسية', ms: 'Semak status dari halaman utama' } },
  { id: 'orient', group: 0, link: '',
    title: { th: 'เข้าร่วมปฐมนิเทศ', en: 'Attend orientation', ar: 'احضر اللقاء التعريفي', ms: 'Hadiri orientasi' },
    hint: { th: 'ก่อนออกฝึก', en: 'Before you start', ar: 'قبل بدء التدريب', ms: 'Sebelum bermula' } },
  { id: 'weekly', group: 1, link: 'monitor',
    title: { th: 'ส่งบันทึกการฝึกทุกสัปดาห์', en: 'Send weekly logs', ar: 'أرسل السجل الأسبوعي', ms: 'Hantar log mingguan' },
    hint: { th: 'ใช้เอกสารระหว่างฝึกงาน', en: 'Use the in-placement forms', ar: 'استخدم نماذج أثناء التدريب', ms: 'Guna borang semasa latihan' } },
  { id: 'visit', group: 1, link: '',
    title: { th: 'รับการนิเทศจากอาจารย์', en: 'Supervisor visit', ar: 'زيارة المشرف', ms: 'Lawatan penyelia' },
    hint: { th: 'อาจารย์นิเทศจะนัดหมายล่วงหน้า', en: 'Your supervisor will schedule it', ar: 'سيحدد المشرف الموعد', ms: 'Penyelia akan menetapkan tarikh' } },
  { id: 'report', group: 2, link: '',
    title: { th: 'ส่งรายงานและแบบประเมิน', en: 'Submit report and evaluation', ar: 'سلّم التقرير والتقييم', ms: 'Hantar laporan dan penilaian' },
    hint: { th: 'เมื่อฝึกครบตามกำหนด', en: 'When the placement ends', ar: 'عند انتهاء التدريب', ms: 'Apabila latihan tamat' } },
];

/** Reads the checklist stored in the Settings sheet; returns undefined when unset or invalid. */
export const parseChecklist = (raw: unknown): ChecklistStep[] | undefined => {
  try {
    const arr = typeof raw === 'string' ? (raw.trim() ? JSON.parse(raw) : null) : raw;
    if (!Array.isArray(arr)) return undefined;
    const steps = arr
      .filter(s => s && typeof s.id === 'string' && s.title)
      .map(s => ({
        id: String(s.id),
        group: ([0, 1, 2].includes(Number(s.group)) ? Number(s.group) : 0) as 0 | 1 | 2,
        title: typeof s.title === 'string' ? { th: s.title } : s.title,
        hint: typeof s.hint === 'string' ? { th: s.hint } : (s.hint || {}),
        link: (['', 'sites', 'app', 'monitor', 'deadline'].includes(s.link) ? s.link : '') as StepLink,
      }));
    return steps.length ? steps : undefined;
  } catch {
    return undefined;
  }
};

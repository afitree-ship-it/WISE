
export enum Language {
  TH = 'th',
  EN = 'en',
  AR = 'ar',
  MS = 'ms'
}

export enum UserRole {
  STUDENT = 'student',
  ADMIN = 'admin',
  GUEST = 'guest'
}

export enum Major {
  HALAL_FOOD = 'halal_food',
  DIGITAL_TECH = 'digital_tech'
}

export enum FormCategory {
  APPLICATION = 'application',
  MONITORING = 'monitoring'
}

export enum ApplicationStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

export interface StudentStatusRecord {
  id: string;
  studentId: string;
  name: string;
  status: ApplicationStatus;
  major: Major;
  lastUpdated: number;
  remarks?: string;
}

export interface LocalizedString {
  th: string;
  en: string;
  ar: string;
  ms: string;
}

export interface InternshipSite {
  id: string;
  name: LocalizedString;
  location: LocalizedString;
  description: LocalizedString;
  position: LocalizedString;
  status: 'active' | 'archived';
  major: Major;
  contactLink?: string;
  email?: string;
  phone?: string;
  createdAt?: number;
}

export interface DocumentForm {
  id: string;
  title: LocalizedString;
  category: FormCategory;
  url: string;
}

export interface ScheduleEvent {
  id: string;
  event: LocalizedString;
  startDate: LocalizedString;
  endDate: LocalizedString;
  status: 'upcoming' | 'past';
}

export interface Translation {
  title: string;
  subtitle: string;
  landingHeading: string;
  loginStudent: string;
  loginAdmin: string;
  studentIdPlaceholder: string;
  adminPasswordPlaceholder: string;
  loginButton: string;
  logout: string;
  internshipSites: string;
  forms: string;
  halalMajor: string;
  digitalMajor: string;
  allMajors: string;
  activeSites: string;
  pastSites: string;
  download: string;
  adminPanel: string;
  addSite: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  name: string;
  location: string;
  description: string;
  status: string;
  major: string;
  urlLabel: string;
  selectMajorTitle: string;
  selectMajorSubtitle: string;
  startNow: string;
  checkStatus: string;
  selectLanguagePrompt: string;
  schedule: string;
  appForms: string;
  monitoringForms: string;
  email: string;
  phone: string;
  visitWebsite: string;
  searchPlaceholder: string;
  statusPending: string;
  statusPreparing: string;
  statusAccepted: string;
  statusRejected: string;
  statusTitle: string;
  statusCheckPrompt: string;
  noStatusFound: string;
  lastUpdated: string;
  searchButton: string;
  studentLabel: string;
  currentStatusLabel: string;
  adminStudentSearchPlaceholder: string;
  startDateLabel: string;
  endDateLabel: string;
  docHubTitle: string;
  docHubButton: string;
  docHubContact: string;
}


export enum Language {
  TH = 'th',
  EN = 'en',
  AR = 'ar',
  ID = 'id',
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

export interface LocalizedString {
  th: string;
  en: string;
  ar: string;
  id: string;
  ms: string;
}

export interface InternshipSite {
  id: string;
  name: LocalizedString;
  location: LocalizedString;
  description: LocalizedString;
  status: 'active' | 'archived';
  major: Major;
  contactLink?: string;
  email?: string;
  phone?: string;
}

export interface DocumentForm {
  id: string;
  title: string;
  category: FormCategory;
  url: string;
}

export interface ScheduleEvent {
  id: string;
  event: LocalizedString;
  date: LocalizedString;
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
  selectLanguagePrompt: string;
  schedule: string;
  appForms: string;
  monitoringForms: string;
  email: string;
  phone: string;
  visitWebsite: string;
}

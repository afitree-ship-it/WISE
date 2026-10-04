import { SHEET_API_URL } from './config';
import { LocalizedString } from './types';

export type Localized4 = { th: string; en: string; ar: string; ms: string };

/**
 * Translates Thai texts into EN / AR / MS on the Apps Script backend (Google LanguageApp,
 * no API key in the browser). Returns null when the backend has no translate endpoint yet.
 */
let supportProbe: Promise<boolean> | null = null;
/** Read-only check, so an older Apps Script deployment never receives an unknown POST type. */
const backendCanTranslate = () => {
  if (!supportProbe) {
    supportProbe = fetch(`${SHEET_API_URL}${SHEET_API_URL.includes('?') ? '&' : '?'}type=translate&_=${Date.now()}`, { redirect: 'follow' })
      .then(r => r.json())
      .then(j => !!(j && j.translate === true))
      .catch(() => false);
    // Re-check later if the backend was not ready (e.g. admin redeploys during the session)
    supportProbe.then(ok => { if (!ok) setTimeout(() => { supportProbe = null; }, 60000); });
  }
  return supportProbe;
};

export const translateTexts = async (items: Record<string, string>, source: 'th' | 'en' = 'th'): Promise<Record<string, Localized4> | null> => {
  const keys = Object.keys(items).filter(k => String(items[k] || '').trim());
  if (!keys.length) return {};
  if (!(await backendCanTranslate())) return null;
  try {
    const res = await fetch(SHEET_API_URL, {
      method: 'POST',
      redirect: 'follow',
      // text/plain avoids a CORS preflight, which Apps Script does not answer
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'translate', source, items: Object.fromEntries(keys.map(k => [k, items[k]])) }),
    });
    const json = await res.json();
    return json && json.data && typeof json.data === 'object' ? json.data : null;
  } catch {
    return null;
  }
};

/** Formats an ISO date for each language: Buddhist Era for Thai, Gregorian for the rest. */
export const localizeDate = (iso: string): Localized4 => {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return { th: iso, en: iso, ar: iso, ms: iso };
  const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return {
    th: d.toLocaleDateString('th-TH', o),
    en: d.toLocaleDateString('en-GB', o),
    ar: d.toLocaleDateString('ar', o),
    ms: d.toLocaleDateString('ms-MY', o),
  };
};

/** Same text in every language (used for proper names such as company names). */
export const sameInAll = (text: string): Localized4 => ({ th: text, en: text, ar: text, ms: text });

/** True when a stored value was never really translated (all languages equal the Thai text). */
export const isUntranslated = (v: Partial<LocalizedString> | undefined) =>
  !!v && !!v.th && (!v.en || v.en === v.th) && (!v.ar || v.ar === v.th) && (!v.ms || v.ms === v.th);

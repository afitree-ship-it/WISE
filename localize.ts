import { Language, LocalizedString } from './types';

/**
 * Reads a localized value that may arrive from the sheet as an object, a JSON string,
 * an Apps Script map string like "{th=..., en=...}", or plain text.
 */
export const localize = (value: LocalizedString | string | null | undefined, lang: Language): string => {
  if (!value) return '';
  let obj: any = value;
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s.startsWith('{')) return s;
    try {
      obj = JSON.parse(s);
    } catch {
      const m = s.slice(1, -1).match(/(?:^|,\s*)(th|en|ar|ms)=([\s\S]*?)(?=,\s*(?:th|en|ar|ms)=|$)/g);
      if (!m) return s;
      obj = {};
      m.forEach(part => {
        const [, k, v] = part.match(/(th|en|ar|ms)=([\s\S]*)/) || [];
        if (k) obj[k] = v.trim();
      });
    }
  }
  if (typeof obj !== 'object') return String(obj);
  return obj[lang] || obj.en || obj.th || obj.ms || obj.ar || '';
};

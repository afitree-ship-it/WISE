import type React from 'react';
import { SHEET_API_URL } from './config';

/** Largest PDF the Apps Script backend accepts in one request (base64 adds ~33%). */
export const MAX_PDF_MB = 20;

let uploadProbe: Promise<boolean> | null = null;
/** Read-only check, so an older Apps Script deployment never receives an unknown POST type. */
export const backendCanUpload = () => {
  if (!uploadProbe) {
    uploadProbe = fetch(`${SHEET_API_URL}${SHEET_API_URL.includes('?') ? '&' : '?'}type=upload&_=${Date.now()}`, { redirect: 'follow' })
      .then(r => r.json())
      .then(j => !!(j && j.upload === true))
      .catch(() => false);
    uploadProbe.then(ok => { if (!ok) setTimeout(() => { uploadProbe = null; }, 60000); });
  }
  return uploadProbe;
};

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

/** Saves a PDF to the project's Google Drive folder and returns its public view link. */
export const uploadPdf = async (file: File): Promise<string> => {
  if (!(await backendCanUpload())) throw new Error('NO_BACKEND');
  const data = await readAsDataUrl(file);
  const res = await fetch(SHEET_API_URL, {
    method: 'POST',
    redirect: 'follow',
    // text/plain avoids a CORS preflight, which Apps Script does not answer
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ type: 'upload', fileName: file.name, data }),
  });
  const json = await res.json();
  if (!json || json.status !== 'success' || !json.url) throw new Error(json?.message || 'UPLOAD_FAILED');
  return json.url as string;
};

export const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

/** "WBG_01-application_form.pdf" -> "WBG 01 application form" */
export const titleFromFileName = (name: string) =>
  name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

/** True when a drag event carries files (not text or a link). */
export const dragHasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');

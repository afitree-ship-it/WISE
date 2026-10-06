// Google Apps Script Web App endpoint (see code.gs).
// Set VITE_SHEET_API_URL in .env.local for local work and in the Vercel project's
// Environment Variables for the live site, so the URL is not stored in the repository.
export const SHEET_API_URL: string = import.meta.env.VITE_SHEET_API_URL || '';

if (!SHEET_API_URL) console.error('VITE_SHEET_API_URL is not set: the site cannot reach its Apps Script backend');

export const withCacheBust = (url: string, extra = '') =>
  `${url}${url.includes('?') ? '&' : '?'}${extra ? extra + '&' : ''}cache_bust=${Date.now()}`;

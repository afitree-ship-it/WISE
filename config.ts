// Google Apps Script Web App endpoint (see code.gs).
// Set VITE_SHEET_API_URL in .env.local for local work and in the Vercel project's
// Environment Variables for the live site. Until it is set on Vercel, the current
// deployment URL is used so the live site keeps working (it is already in the git history).
const FALLBACK_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbycrXhJfdb5sp11tOGZZbM3Xx1DFqNwzyQ_VUVKeo2BJSMhO1GMxD73YXsKyDot_o3X/exec";
export const SHEET_API_URL: string = import.meta.env.VITE_SHEET_API_URL || FALLBACK_SHEET_API_URL;

export const withCacheBust = (url: string, extra = '') =>
  `${url}${url.includes('?') ? '&' : '?'}${extra ? extra + '&' : ''}cache_bust=${Date.now()}`;

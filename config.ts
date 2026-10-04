// Google Apps Script Web App endpoint (see code.gs)
export const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbycrXhJfdb5sp11tOGZZbM3Xx1DFqNwzyQ_VUVKeo2BJSMhO1GMxD73YXsKyDot_o3X/exec";

export const withCacheBust = (url: string, extra = '') =>
  `${url}${url.includes('?') ? '&' : '?'}${extra ? extra + '&' : ''}cache_bust=${Date.now()}`;

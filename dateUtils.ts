
export const parseDateResilient = (dateStr?: string) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDateBE = (dateStr?: string) => {
  if (!dateStr || dateStr === '-') return '-';
  const d = parseDateResilient(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};

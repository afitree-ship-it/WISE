import React, { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { Language } from '../../types';
import { StudentBundle } from '../../studentApi';
import ProfileTab from './ProfileTab';
import LogbookTab from './LogbookTab';
import TimeTab from './TimeTab';
import EvalTab from './EvalTab';
import { card, isTH, stOf, sortRecords, typeName } from './shared';

export type StudentTab = 'me' | 'log' | 'time' | 'eval';

interface Props {
  lang: Language;
  tab: StudentTab;
  token: string;
  bundle: StudentBundle;
  setBundle: (fn: (b: StudentBundle) => StudentBundle) => void;
  refresh: () => Promise<void>;
  onExpired: () => void;
  go: (t: StudentTab) => void;
}

/** The signed-in part of the portal. Placement tools work on one record: the latest accepted one by default. */
const StudentArea: React.FC<Props> = ({ lang, tab, token, bundle, setBundle, refresh, onExpired, go }) => {
  const S = stOf(lang);
  const sorted = useMemo(() => sortRecords(bundle.records), [bundle.records]);
  const usable = sorted.filter(r => r.status === 'accepted');
  const [rid, setRid] = useState<string>(usable[0]?.id || sorted[0]?.id || '');
  useEffect(() => { if (!sorted.some(r => r.id === rid)) setRid(usable[0]?.id || sorted[0]?.id || ''); }, [bundle.records]); // eslint-disable-line react-hooks/exhaustive-deps
  const record = sorted.find(r => r.id === rid) || null;

  if (!sorted.length) {
    return <div className={`${card} mt-4 px-5 py-12 text-center`}><p className="text-[16px] text-[#2a0a17] dark:text-white">{S.noPlacement}</p><p className="mt-1 text-[13px] font-light text-[#8d7480]">{S.noPlacementSub}</p></div>;
  }

  const switcher = sorted.length > 1 && tab !== 'me' && (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <span className="text-[12.5px] text-[#8d7480]">{S.placement}</span>
      {sorted.map(r => (
        <button key={r.id} onClick={() => setRid(r.id)} className={`h-8 px-3 rounded-full text-[12.5px] transition ${r.id === rid ? 'bg-[#630330] text-white' : 'border border-[#e6d9c4] dark:border-white/10 text-[#6e5560] dark:text-slate-300 hover:border-[#630330]'}`}>
          {r.term || '-'}/{r.academicYear || '-'} · {typeName(r.internshipType, lang)}
        </button>
      ))}
    </div>
  );

  const notAccepted = record && record.status !== 'accepted' && tab !== 'me' && (
    <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-[13px] text-amber-800 dark:text-amber-200">
      <Info size={16} className="shrink-0 mt-0.5" />
      {isTH(lang) ? 'รอบนี้ยังไม่ได้รับการตอบรับจากสถานประกอบการ ใช้งานได้ แต่ข้อมูลอาจต้องปรับเมื่อได้ที่ฝึกแล้ว' : 'This placement is not confirmed yet. You can still fill things in.'}
    </div>
  );

  return (
    <div className="pt-4">
      {tab === 'me' && <ProfileTab lang={lang} bundle={bundle} record={record} go={go} />}
      {tab !== 'me' && record && (
        <>
          {switcher}
          {notAccepted}
          {tab === 'log' && <LogbookTab key={record.id} lang={lang} token={token} bundle={bundle} record={record} onPatch={setBundle} onExpired={onExpired} />}
          {tab === 'time' && <TimeTab key={record.id} lang={lang} token={token} bundle={bundle} record={record} onRefresh={refresh} onExpired={onExpired} />}
          {tab === 'eval' && <EvalTab key={record.id} lang={lang} token={token} bundle={bundle} record={record} onPatch={setBundle} onExpired={onExpired} />}
        </>
      )}
    </div>
  );
};

export default StudentArea;

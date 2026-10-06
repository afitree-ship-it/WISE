import React from 'react';
import { EvalCategory, EvaluationResult, categoryScores, questionsOf, SCORE_LABELS } from '../../studentApi';

const LEVEL_CLS: Record<string, string> = {
  'ดีมาก': 'bg-emerald-500 text-white',
  'ดี': 'bg-sky-500 text-white',
  'ปานกลาง': 'bg-amber-400 text-[#2a0114]',
  'พอใช้': 'bg-orange-500 text-white',
  'ควรปรับปรุง': 'bg-rose-500 text-white',
};
export const levelCls = (l: string) => LEVEL_CLS[l] || 'bg-slate-400 text-white';

/** Scores of one mentor evaluation: overall, each ด้าน, each item, and the comment. */
const EvalResult: React.FC<{ criteria: EvalCategory[]; result: EvaluationResult; compact?: boolean }> = ({ criteria, result, compact }) => {
  const cats = categoryScores(criteria, result.scores);
  const qs = questionsOf(criteria);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-baseline gap-1.5">
          <span className="wl-latin text-[40px] font-extrabold leading-none tabular-nums text-[#630330] dark:text-[#e8cf7a]">{result.avg.toFixed(2)}</span>
          <span className="text-[13px] text-[#8d7480]">/ 5</span>
        </div>
        <div className="text-[13px] text-[#6e5560] dark:text-slate-300">
          <span className={`inline-flex items-center h-7 px-3 rounded-full text-[13px] font-medium ${levelCls(result.level)}`}>{result.level}</span>
          <span className="ml-2 tabular-nums">ร้อยละ {result.percent.toFixed(2)}</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {cats.map(c => (
          <div key={c.id}>
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="text-[#2a0a17] dark:text-slate-100">{c.title}</span>
              <span className="tabular-nums text-[#6e5560] dark:text-slate-300">{c.avg.toFixed(2)} <span className="text-[#b3a0a8]">· {c.percent.toFixed(0)}%</span></span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-[#f3ebdf] dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#630330] dark:bg-[#e8cf7a]" style={{ width: `${c.percent}%` }} /></div>
            {!compact && qs.filter(q => q.cat === c.id && q.id !== c.id).length > 0 && (
              <ul className="mt-1.5 ml-3 space-y-0.5">
                {qs.filter(q => q.cat === c.id && q.id !== c.id).map(q => (
                  <li key={q.id} className="flex justify-between gap-3 text-[12.5px] text-[#7d6470] dark:text-slate-400">
                    <span>{q.title}</span><span className="tabular-nums shrink-0">{result.scores[q.id]} · {SCORE_LABELS[result.scores[q.id]] || ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {result.comment && (
        <div className="rounded-2xl bg-[#faf6ef] dark:bg-white/[0.03] border border-[#efe4d2] dark:border-white/10 p-3.5">
          <p className="text-[12px] text-[#8d7480] mb-1">ข้อเสนอแนะ</p>
          <p className="text-[13.5px] text-[#2a0a17] dark:text-slate-200 whitespace-pre-wrap">{result.comment}</p>
        </div>
      )}
      <p className="text-[12px] text-[#8d7480]">ผู้ประเมิน: {result.evaluatorName}{result.evaluatorPosition ? ` (${result.evaluatorPosition})` : ''} · {new Date(result.submittedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
    </div>
  );
};

export default EvalResult;

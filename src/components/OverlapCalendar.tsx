'use client';
import { useMemo, useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isWithinInterval, isSameMonth,
} from 'date-fns';
import { cs } from 'date-fns/locale';
import type { DayStat } from '@/lib/types';

const DOW = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

interface Props {
  horizonStart: string;
  horizonEnd: string;
  stats: DayStat[];
  /** dny zvýrazněné jako součást nejlepšího okna (yyyy-MM-dd) */
  highlight?: Set<string>;
}

/** Vrátí tailwind třídy pro buňku podle podílu lidí, co můžou. */
function heatClasses(stat: DayStat | undefined): string {
  if (!stat || stat.total === 0) return 'bg-slate-50 text-slate-300';
  if (stat.blocked > 0 && stat.available === 0) return 'bg-rose-100 text-rose-400';
  const ratio = stat.available / stat.total;
  if (ratio >= 0.999) return 'bg-emerald-500 text-white';
  if (ratio >= 0.75) return 'bg-emerald-400 text-white';
  if (ratio >= 0.5) return 'bg-emerald-200 text-emerald-900';
  if (ratio >= 0.25) return 'bg-amber-200 text-amber-900';
  if (ratio > 0) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-400';
}

export default function OverlapCalendar({ horizonStart, horizonEnd, stats, highlight }: Props) {
  const statMap = useMemo(() => {
    const m: Record<string, DayStat> = {};
    for (const s of stats) m[s.day] = s;
    return m;
  }, [stats]);

  const [month, setMonth] = useState(() => new Date(horizonStart + 'T00:00:00Z'));

  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const startDay = getDay(start);
  const pad = startDay === 0 ? 6 : startDay - 1;

  const horizon = {
    start: new Date(horizonStart + 'T00:00:00Z'),
    end: new Date(horizonEnd + 'T00:00:00Z'),
  };

  const key = (d: Date) => format(d, 'yyyy-MM-dd');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonth(m => subMonths(m, 1))}
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          aria-label="Předchozí měsíc"
        >‹</button>
        <span className="font-semibold text-slate-800 capitalize select-none">
          {format(month, 'LLLL yyyy', { locale: cs })}
        </span>
        <button
          onClick={() => setMonth(m => addMonths(m, 1))}
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          aria-label="Další měsíc"
        >›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: pad }).map((_, i) => <div key={`p${i}`} />)}
        {days.map(day => {
          const k = key(day);
          const inHorizon = isWithinInterval(day, horizon) && isSameMonth(day, month);
          const stat = statMap[k];
          const isHi = highlight?.has(k);

          if (!inHorizon) {
            return (
              <div key={k} className="aspect-square rounded-lg flex items-center justify-center text-xs text-slate-200">
                {format(day, 'd')}
              </div>
            );
          }

          return (
            <div
              key={k}
              title={stat ? `${stat.available}/${stat.total} může${stat.ideal ? ` · ${stat.ideal}× ideální` : ''}${stat.blocked ? ` · ${stat.blocked}× nemůže` : ''}` : 'Zatím bez odpovědí'}
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${heatClasses(stat)} ${
                isHi ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
              }`}
            >
              <span className="text-xs sm:text-sm font-semibold leading-none">{format(day, 'd')}</span>
              {stat && stat.total > 0 && (
                <span className="text-[9px] sm:text-[10px] font-medium leading-none mt-0.5 opacity-90">
                  {stat.available}/{stat.total}
                </span>
              )}
              {stat && stat.ideal > 0 && (
                <span className="absolute top-0.5 right-0.5 text-[8px]">★</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-5 text-[11px] text-slate-500">
        <Legend className="bg-emerald-500" label="Všichni" />
        <Legend className="bg-emerald-300" label="Většina" />
        <Legend className="bg-amber-200" label="Pár lidí" />
        <Legend className="bg-rose-100" label="Nikdo / blokováno" />
        <span className="flex items-center gap-1">★ <span>= někomu ideální</span></span>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

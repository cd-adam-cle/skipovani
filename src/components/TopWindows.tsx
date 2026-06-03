'use client';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { OverlapWindow } from '@/lib/types';

interface Props {
  windows: OverlapWindow[];
  totalPeople: number;
  onHover?: (w: OverlapWindow | null) => void;
}

function fmt(d: string) {
  return format(new Date(d + 'T00:00:00Z'), 'd. M.', { locale: cs });
}

export default function TopWindows({ windows, totalPeople, onHover }: Props) {
  if (windows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
        <p className="text-2xl mb-1">🗓️</p>
        <p className="text-sm text-slate-400">Až lidi vyplní dostupnost, ukážeme nejlepší termíny.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {windows.map((w, i) => {
        const allCan = w.attendees === totalPeople && totalPeople > 0;
        return (
          <li
            key={`${w.start}-${w.length}`}
            onMouseEnter={() => onHover?.(w)}
            onMouseLeave={() => onHover?.(null)}
            className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${
              allCan
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-indigo-200'
            }`}
          >
            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 text-sm">
                {fmt(w.start)}{w.length > 1 ? ` – ${fmt(w.end)}` : ''}
                <span className="text-slate-400 font-normal"> · {w.length} {w.length === 1 ? 'den' : w.length < 5 ? 'dny' : 'dní'}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Může <strong className={allCan ? 'text-emerald-600' : 'text-slate-700'}>{w.attendees}/{totalPeople}</strong>
                {w.idealCount > 0 && <span> · {w.idealCount}× ideální ★</span>}
              </p>
            </div>
            {allCan && (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                Všichni
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

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
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
        <svg className="mx-auto h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-medium text-slate-500">Čekáme na první dostupnosti</p>
        <p className="text-xs text-slate-400 mt-1">Jakmile někdo vyplní kalendář, ukážeme nejlepší termíny.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {windows.map((w, i) => {
        const allCan = w.attendees === totalPeople && totalPeople > 0;
        const fullyAvailable = w.attendeeNames.filter(name => !w.ratherNoNames.includes(name));

        return (
          <li
            key={`${w.start}-${w.length}`}
            onMouseEnter={() => onHover?.(w)}
            onMouseLeave={() => onHover?.(null)}
            className={`group flex flex-col rounded-2xl border p-4 transition-all duration-300 ${
              allCan
                ? 'border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50/60 shadow-sm'
                : 'border-slate-100 bg-white hover:border-indigo-100 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-colors ${
                i === 0 
                  ? 'bg-indigo-600 text-white' 
                  : allCan 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
              }`}>
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <span>{fmt(w.start)}{w.length > 1 ? ` – ${fmt(w.end)}` : ''}</span>
                  <span className="text-slate-400 font-normal text-xs">
                    · {w.length} {w.length === 1 ? 'den' : w.length < 5 ? 'dny' : 'dní'}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center flex-wrap gap-1">
                  <span>Může</span>
                  <strong className={allCan ? 'text-emerald-700 font-bold' : 'text-slate-700 font-semibold'}>
                    {w.attendees} z {totalPeople}
                  </strong>
                  {w.idealCount > 0 && (
                    <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-0.5">
                      <svg className="w-2.5 h-2.5 fill-indigo-600" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {w.idealCount}× ideální
                    </span>
                  )}
                </p>
              </div>
              {allCan && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Všichni
                </span>
              )}
            </div>

            {/* Zobrazení konkrétních lidí a jejich stavů */}
            <div className="flex flex-wrap gap-1 mt-3 pt-2.5 border-t border-slate-100/60">
              {/* Lidé co plně můžou */}
              {fullyAvailable.map(name => (
                <span 
                  key={name} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/60"
                >
                  <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {name}
                </span>
              ))}

              {/* Lidé co můžou, ale mají to spíš ne */}
              {w.ratherNoNames.map(name => (
                <span 
                  key={name} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100/60"
                >
                  <svg className="w-2.5 h-2.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {name}
                </span>
              ))}

              {/* Lidé co nemůžou */}
              {w.absentNames.map(name => (
                <span 
                  key={name} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-50/80 text-rose-700 border border-rose-100/60"
                >
                  <svg className="w-2.5 h-2.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {name}
                </span>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

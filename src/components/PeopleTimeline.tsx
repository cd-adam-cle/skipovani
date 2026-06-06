'use client';
import { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { PersonRow, DayStat, AvailabilityWeight } from '@/lib/types';

interface Props {
  horizonStart: string;
  horizonEnd: string;
  rows: PersonRow[];
  stats: DayStat[];
  myId: string | null;
  /** dny zvýrazněné (hover na termínu) */
  highlight?: Set<string>;
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
}

/** Barva buňky podle stavu jednoho člověka v jednom dni. */
function cellColor(w: AvailabilityWeight | undefined): string {
  switch (w) {
    case 'ideal': return 'bg-emerald-500';
    case 'ok': return 'bg-emerald-300';
    case 'rather_no': return 'bg-amber-300';
    case 'no_go': return 'bg-rose-300';
    default: return 'bg-slate-100'; // nevyplněno
  }
}

/** Souhrnný "shoda" pruh – tmavší = víc lidí může + nadšení. */
function consensusColor(s: DayStat | undefined): string {
  if (!s || s.total === 0) return 'bg-slate-100';
  const answered = s.available + s.blocked; // kolik lidí se k dni vyjádřilo
  if (answered === 0) return 'bg-slate-100';
  if (s.blocked > 0 && s.available === 0) return 'bg-rose-300';
  // skóre 0..1: ideál plná váha, ok poloviční, spíš-ne čtvrtinová
  const score = (s.ideal + s.ok * 0.6 + s.rather * 0.25) / s.total;
  if (s.blocked === 0 && s.available === s.total && s.ideal === s.total) return 'bg-indigo-600';
  if (score >= 0.85) return 'bg-emerald-600';
  if (score >= 0.65) return 'bg-emerald-500';
  if (score >= 0.45) return 'bg-emerald-400';
  if (score >= 0.25) return 'bg-amber-400';
  if (score > 0) return 'bg-amber-300';
  return 'bg-rose-300';
}

export default function PeopleTimeline({ horizonStart, horizonEnd, rows, stats, myId, highlight }: Props) {
  const days = useMemo(() => eachDay(horizonStart, horizonEnd), [horizonStart, horizonEnd]);
  const statMap = useMemo(() => {
    const m: Record<string, DayStat> = {};
    for (const s of stats) m[s.day] = s;
    return m;
  }, [stats]);

  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // měsíční oddělovače
  const monthMarks = useMemo(() => {
    const marks: { index: number; label: string }[] = [];
    let lastMonth = '';
    days.forEach((d, i) => {
      const m = d.slice(0, 7);
      if (m !== lastMonth) {
        marks.push({ index: i, label: format(new Date(d + 'T00:00:00Z'), 'LLLL', { locale: cs }) });
        lastMonth = m;
      }
    });
    return marks;
  }, [days]);

  // sort: vyplnění nahoře, prázdní dolů, "ty" první
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.id === myId) return -1;
      if (b.id === myId) return 1;
      if (a.empty !== b.empty) return a.empty ? 1 : -1;
      return b.counts.filled - a.counts.filled;
    });
  }, [rows, myId]);

  const filledCount = rows.filter(r => !r.empty).length;

  // auto-scroll, aby byl vidět první vyplněný den
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstAnswered = days.findIndex(d => {
      const s = statMap[d];
      return s && (s.available > 0 || s.blocked > 0);
    });
    if (firstAnswered > 7) {
      const colW = el.scrollWidth / days.length;
      el.scrollLeft = Math.max(0, (firstAnswered - 3) * colW);
    }
  }, [days, statMap]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic py-8 text-center">Zatím nikdo nevyplnil kalendář.</p>
    );
  }

  const NAME_W = 96; // px sloupec se jmény

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-700">{filledCount}</strong> z {rows.length} vyplnilo ·
          <span className="text-slate-400"> každý řádek = jeden člověk, sloupec = den</span>
        </p>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="hidden sm:inline">posuň →</span>
        </div>
      </div>

      <div className="flex">
        {/* fixní sloupec se jmény */}
        <div className="shrink-0 pt-[26px]" style={{ width: NAME_W }}>
          {/* consensus label */}
          <div className="h-5 mb-1.5 flex items-center text-[10px] font-bold uppercase tracking-wide text-indigo-500">
            Shoda
          </div>
          {sorted.map(r => (
            <div
              key={r.id}
              className={`h-6 mb-0.5 flex items-center pr-2 text-xs truncate ${
                r.id === myId ? 'font-bold text-indigo-700' : r.empty ? 'text-slate-300' : 'text-slate-700 font-medium'
              }`}
              title={r.name}
            >
              {r.name}
              {r.id === myId && <span className="ml-1 text-[9px] text-indigo-400">(ty)</span>}
            </div>
          ))}
        </div>

        {/* scrollovatelná mřížka */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto pb-2">
          <div style={{ minWidth: days.length * 12 }}>
            {/* hlavička s měsíci */}
            <div className="relative h-[26px] mb-0">
              {monthMarks.map(mk => (
                <span
                  key={mk.index}
                  className="absolute top-0 text-[10px] font-semibold text-slate-400 capitalize whitespace-nowrap"
                  style={{ left: `${(mk.index / days.length) * 100}%` }}
                >
                  {mk.label}
                </span>
              ))}
            </div>

            {/* consensus pruh */}
            <div className="grid mb-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
              {days.map(d => {
                const s = statMap[d];
                const isHi = highlight?.has(d);
                return (
                  <div
                    key={d}
                    className={`h-5 ${consensusColor(s)} ${isHi ? 'ring-2 ring-indigo-500 ring-inset z-10 relative' : ''}`}
                    onMouseEnter={e => {
                      if (!s || s.total === 0) return;
                      const parts: string[] = [`<b>${format(new Date(d + 'T00:00:00Z'), 'EEEE d. M.', { locale: cs })}</b>`];
                      if (s.ideal) parts.push(`⭐ ideál: ${s.idealNames.join(', ')}`);
                      if (s.ok) parts.push(`✓ ok: ${s.okNames.join(', ')}`);
                      if (s.rather) parts.push(`~ spíš ne: ${s.ratherNames.join(', ')}`);
                      if (s.blocked) parts.push(`✕ nemůže: ${s.blockedNames.join(', ')}`);
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTip({ x: r.left + r.width / 2, y: r.bottom, html: parts.join('<br>') });
                    }}
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })}
            </div>

            {/* řádky lidí */}
            {sorted.map(r => (
              <div
                key={r.id}
                className="grid h-6 mb-0.5"
                style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}
              >
                {days.map(d => {
                  const w = r.byDay[d];
                  const isHi = highlight?.has(d);
                  return (
                    <div
                      key={d}
                      className={`${cellColor(w)} ${isHi ? 'ring-1 ring-indigo-400 ring-inset' : ''} ${
                        r.id === myId ? 'opacity-100' : ''
                      } first:rounded-l-sm last:rounded-r-sm`}
                      onMouseEnter={e => {
                        const label = format(new Date(d + 'T00:00:00Z'), 'EEEE d. M.', { locale: cs });
                        const state = w === 'ideal' ? '⭐ ideální' : w === 'ok' ? '✓ ok' : w === 'rather_no' ? '~ spíš ne' : w === 'no_go' ? '✕ nemůže' : '· nevyplněno';
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTip({ x: rect.left + rect.width / 2, y: rect.bottom, html: `<b>${r.name}</b><br>${label}<br>${state}` });
                      }}
                      onMouseLeave={() => setTip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* legenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 text-[11px] text-slate-500">
        <Legend className="bg-emerald-500" label="Ideální" />
        <Legend className="bg-emerald-300" label="Ok" />
        <Legend className="bg-amber-300" label="Spíš ne" />
        <Legend className="bg-rose-300" label="Nemůžu" />
        <Legend className="bg-slate-100" label="Nevyplněno" />
      </div>

      {tip && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] leading-snug shadow-xl max-w-[240px]"
          style={{ left: tip.x, top: tip.y }}
          dangerouslySetInnerHTML={{ __html: tip.html }}
        />
      )}
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

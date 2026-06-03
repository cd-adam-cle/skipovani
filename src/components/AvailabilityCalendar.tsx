'use client';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { AvailabilityWeight } from '@/lib/types';

const WEIGHTS: AvailabilityWeight[] = ['ideal', 'ok', 'rather_no', 'no_go'];
const WEIGHT_LABELS: Record<AvailabilityWeight, string> = {
  ideal: 'Ideální',
  ok: 'Ok',
  rather_no: 'Spíš ne',
  no_go: 'Nemůžu',
};
const WEIGHT_COLORS: Record<AvailabilityWeight, string> = {
  ideal: 'bg-emerald-400 text-white',
  ok: 'bg-slate-200 text-slate-700',
  rather_no: 'bg-amber-400 text-white',
  no_go: 'bg-red-500 text-white',
};
const WEIGHT_DOT: Record<AvailabilityWeight, string> = {
  ideal: 'bg-emerald-400',
  ok: 'bg-slate-300',
  rather_no: 'bg-amber-400',
  no_go: 'bg-red-500',
};

interface Props {
  horizonStart: string;
  horizonEnd: string;
  value: Record<string, AvailabilityWeight>;
  onChange: (day: string, weight: AvailabilityWeight) => void;
}

export default function AvailabilityCalendar({ horizonStart, horizonEnd, value, onChange }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date(horizonStart + 'T00:00:00Z'));
  const [dragging, setDragging] = useState<AvailabilityWeight | null>(null);

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });

  const horizonInterval = {
    start: new Date(horizonStart + 'T00:00:00Z'),
    end: new Date(horizonEnd + 'T00:00:00Z'),
  };

  const startDay = getDay(start); // 0=Sun
  const paddingDays = startDay === 0 ? 6 : startDay - 1; // Mon-first

  const formatKey = (d: Date) => format(d, 'yyyy-MM-dd');

  const cycleWeight = (key: string) => {
    const current = value[key] || 'ok';
    const idx = WEIGHTS.indexOf(current);
    const next = WEIGHTS[(idx + 1) % WEIGHTS.length];
    onChange(key, next);
  };

  const applyDrag = (key: string) => {
    if (dragging) onChange(key, dragging);
  };

  const DOW = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"
        >‹</button>
        <span className="font-semibold text-slate-700 capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: cs })}
        </span>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"
        >›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: paddingDays }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const key = formatKey(day);
          const inHorizon = isWithinInterval(day, horizonInterval);
          const w = value[key] || 'ok';
          return (
            <button
              key={key}
              disabled={!inHorizon}
              onMouseDown={() => {
                if (!inHorizon) return;
                const next = WEIGHTS[(WEIGHTS.indexOf(w) + 1) % WEIGHTS.length];
                setDragging(next);
                onChange(key, next);
              }}
              onMouseEnter={() => inHorizon && applyDrag(key)}
              onMouseUp={() => setDragging(null)}
              onTouchStart={() => {
                if (!inHorizon) return;
                cycleWeight(key);
              }}
              className={`aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${
                !inHorizon
                  ? 'text-slate-300 cursor-default'
                  : `${WEIGHT_COLORS[w]} cursor-pointer hover:opacity-90`
              }`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {WEIGHTS.map(w => (
          <div key={w} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`w-3 h-3 rounded-sm ${WEIGHT_DOT[w]}`} />
            {WEIGHT_LABELS[w]}
          </div>
        ))}
      </div>
    </div>
  );
}

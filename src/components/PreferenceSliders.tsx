'use client';
import type { PreferenceAxes } from '@/lib/types';

const AXES: { key: keyof PreferenceAxes; label: string; emoji: string }[] = [
  { key: 'chill', label: 'Chill & odpočinek', emoji: '😌' },
  { key: 'action', label: 'Akce & zábava', emoji: '🎉' },
  { key: 'sea', label: 'Moře', emoji: '🏖️' },
  { key: 'mountains', label: 'Hory', emoji: '⛰️' },
  { key: 'city', label: 'Město', emoji: '🏙️' },
  { key: 'nature', label: 'Příroda', emoji: '🌿' },
  { key: 'warm', label: 'Teplo', emoji: '☀️' },
  { key: 'snow', label: 'Sníh', emoji: '❄️' },
  { key: 'lazy', label: 'Lenošení', emoji: '🛋️' },
  { key: 'sport', label: 'Sport', emoji: '🏃' },
];

const TOTAL_POINTS = 10;

interface Props {
  value: PreferenceAxes;
  onChange: (axes: PreferenceAxes) => void;
}

export default function PreferenceSliders({ value, onChange }: Props) {
  const used = Object.values(value).reduce((a, b) => a + b, 0);
  const remaining = TOTAL_POINTS - used;

  const set = (key: keyof PreferenceAxes, v: number) => {
    const newAxes = { ...value, [key]: v };
    const newUsed = Object.values(newAxes).reduce((a, b) => a + b, 0);
    if (newUsed > TOTAL_POINTS) return;
    onChange(newAxes);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-700">Rozdelete {TOTAL_POINTS} bodů</span>
        <span className={`text-sm font-semibold ${remaining < 0 ? 'text-red-500' : remaining === 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
          Zbývá: {remaining}
        </span>
      </div>

      <div className="space-y-3">
        {AXES.map(({ key, label, emoji }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-6 text-center">{emoji}</span>
            <span className="text-sm text-slate-700 w-36 shrink-0">{label}</span>
            <input
              type="range"
              min={0}
              max={TOTAL_POINTS}
              value={value[key]}
              onChange={e => set(key, parseInt(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="w-5 text-right text-sm font-semibold text-slate-700">{value[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

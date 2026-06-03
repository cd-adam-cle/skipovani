'use client';

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

export default function DaysSlider({ value, min = 1, max = 10, onChange }: Props) {
  const label = value === 1 ? 'den' : value < 5 ? 'dny' : 'dní';
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm text-slate-600">Tak akorát by mi sedělo</span>
        <span className="text-2xl font-bold text-indigo-600 tabular-nums">{value} <span className="text-base font-medium text-slate-400">{label}</span></span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full accent-indigo-500 h-2"
        style={{
          background: `linear-gradient(to right, rgb(99 102 241) ${pct}%, rgb(226 232 240) ${pct}%)`,
          borderRadius: 9999,
        }}
      />
      <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
        <span>{min}</span>
        <span>{max}+</span>
      </div>
    </div>
  );
}

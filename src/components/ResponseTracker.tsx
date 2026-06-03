import type { Participant } from '@/lib/types';

interface Props {
  participants: Participant[];
}

export default function ResponseTracker({ participants }: Props) {
  const submitted = participants.filter(p => p.has_submitted);
  const pending = participants.filter(p => !p.has_submitted);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Účastníci</h3>
        <span className="text-sm text-slate-500">{submitted.length}/{participants.length} odpovědělo</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {participants.map(p => (
          <div
            key={p.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              p.has_submitted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <span>{p.has_submitted ? '✓' : '○'}</span>
            <span>{p.name}</span>
          </div>
        ))}
      </div>
      {pending.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          Čekáme na: {pending.map(p => p.name).join(', ')}
        </p>
      )}
    </div>
  );
}

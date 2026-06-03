import type { Proposal, Participant } from '@/lib/types';
import { addDays, format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface Props {
  proposal: Proposal;
  participants: Participant[];
  rank: number;
  onVote?: (key: string, val: 'up' | 'down') => void;
  myVote?: 'up' | 'down' | null;
  showVoting?: boolean;
}

function formatWindow(start: string, length: number) {
  const s = new Date(start + 'T00:00:00Z');
  const e = addDays(s, length);
  return `${format(s, 'd. M.', { locale: cs })} – ${format(e, 'd. M. yyyy', { locale: cs })}`;
}

function seasonLabel(tags: string[]) {
  if (tags.includes('all')) return '';
  if (tags.includes('winter')) return '❄️ Zima';
  if (tags.includes('summer')) return '☀️ Léto';
  if (tags.includes('spring')) return '🌸 Jaro';
  if (tags.includes('fall')) return '🍂 Podzim';
  return '';
}

export default function ProposalCard({ proposal, participants, rank, onVote, myVote, showVoting }: Props) {
  const { option, window: w, attendees, fairness } = proposal;
  const total = participants.length;
  const blocked = Object.values(w.perPerson).filter(v => v === 'BLOCKED').length;
  const avgFairness = participants.length > 0
    ? Math.round(Object.values(fairness).reduce((a, b) => a + b, 0) / participants.length)
    : 0;

  const rankColors = ['bg-amber-400', 'bg-slate-300', 'bg-orange-300', 'bg-slate-200', 'bg-slate-200'];
  const season = seasonLabel(option.season_tags);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full ${rankColors[rank] || 'bg-slate-200'} flex items-center justify-center text-xs font-bold text-white`}>
              {rank + 1}
            </span>
            <h3 className="font-semibold text-slate-800 text-base">{option.name}</h3>
          </div>
          {season && <span className="text-xs text-slate-500 whitespace-nowrap">{season}</span>}
        </div>

        <div className="flex flex-wrap gap-2 text-sm mb-4">
          <span className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            📅 {formatWindow(w.start, w.length)} ({w.length} nocí)
          </span>
          <span className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
            attendees === total ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            👥 {attendees} z {total} může
          </span>
          {option.est_cost > 0 && (
            <span className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
              💰 ~{option.est_cost.toLocaleString('cs-CZ')} Kč/os.
            </span>
          )}
        </div>

        {blocked > 0 && (
          <p className="text-xs text-amber-600 mb-3">
            ⚠️ {blocked} {blocked === 1 ? 'člověk nemůže' : 'lidé nemůžou'}
          </p>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 rounded-full transition-all"
              style={{ width: `${avgFairness}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">férovost {avgFairness}%</span>
        </div>
      </div>

      {showVoting && onVote && (
        <div className="border-t border-slate-100 px-5 py-3 flex gap-3">
          <button
            onClick={() => onVote(proposal.proposalKey, 'up')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              myVote === 'up'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
            }`}
          >
            👍 Ano
          </button>
          <button
            onClick={() => onVote(proposal.proposalKey, 'down')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              myVote === 'down'
                ? 'bg-red-500 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200'
            }`}
          >
            👎 Ne
          </button>
        </div>
      )}
    </div>
  );
}

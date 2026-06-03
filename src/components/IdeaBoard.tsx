'use client';
import { useMemo, useState } from 'react';
import type { Idea, IdeaVote, VoteValue } from '@/lib/types';

interface Props {
  ideas: Idea[];
  votes: IdeaVote[];
  myParticipantId: string | null;
  onVote: (ideaId: string, value: VoteValue) => void;
  onAdd: (title: string, emoji: string) => void;
}

const EMOJI_CHOICES = ['📍', '🏡', '🏖️', '⛰️', '🚐', '🏙️', '🎿', '🌴', '🍻', '🔥'];

export default function IdeaBoard({ ideas, votes, myParticipantId, onVote, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📍');
  const [open, setOpen] = useState(false);

  const tally = useMemo(() => {
    const m: Record<string, { up: number; down: number; mine: VoteValue | null }> = {};
    for (const i of ideas) m[i.id] = { up: 0, down: 0, mine: null };
    for (const v of votes) {
      if (!m[v.idea_id]) continue;
      if (v.value === 'up') m[v.idea_id].up++;
      else m[v.idea_id].down++;
      if (v.participant_id === myParticipantId) m[v.idea_id].mine = v.value;
    }
    return m;
  }, [ideas, votes, myParticipantId]);

  const sorted = useMemo(() => {
    return [...ideas].sort((a, b) => {
      const sa = (tally[a.id]?.up ?? 0) - (tally[a.id]?.down ?? 0);
      const sb = (tally[b.id]?.up ?? 0) - (tally[b.id]?.down ?? 0);
      return sb - sa;
    });
  }, [ideas, tally]);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onAdd(t, emoji);
    setTitle('');
    setEmoji('📍');
    setOpen(false);
  };

  return (
    <div>
      <div className="space-y-2.5">
        {sorted.map(idea => {
          const t = tally[idea.id] || { up: 0, down: 0, mine: null };
          const score = t.up - t.down;
          return (
            <div
              key={idea.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors"
            >
              <span className="text-2xl shrink-0">{idea.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 text-sm truncate">{idea.title}</p>
                {(t.up > 0 || t.down > 0) && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    skóre <strong className={score > 0 ? 'text-emerald-600' : score < 0 ? 'text-rose-500' : 'text-slate-500'}>{score > 0 ? `+${score}` : score}</strong>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <VoteBtn
                  active={t.mine === 'up'}
                  count={t.up}
                  disabled={!myParticipantId}
                  onClick={() => onVote(idea.id, 'up')}
                  variant="up"
                />
                <VoteBtn
                  active={t.mine === 'down'}
                  count={t.down}
                  disabled={!myParticipantId}
                  onClick={() => onVote(idea.id, 'down')}
                  variant="down"
                />
              </div>
            </div>
          );
        })}
      </div>

      {open ? (
        <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3">
          <div className="flex flex-wrap gap-1 mb-2">
            {EMOJI_CHOICES.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors ${
                  emoji === e ? 'bg-indigo-600' : 'bg-white hover:bg-slate-100'
                }`}
              >{e}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Např. Slovinsko, festival, kemp…"
              className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            <button
              onClick={submit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 rounded-xl transition-colors"
            >Přidat</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          disabled={!myParticipantId}
          className="mt-3 w-full border border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl py-3 text-sm font-medium transition-colors"
        >
          + Přidat vlastní nápad
        </button>
      )}
      {!myParticipantId && (
        <p className="mt-2 text-xs text-center text-slate-400">Připoj se k výletu, abys mohl/a hlasovat a přidávat nápady.</p>
      )}
    </div>
  );
}

function VoteBtn({ active, count, disabled, onClick, variant }: {
  active: boolean; count: number; disabled?: boolean; onClick: () => void; variant: 'up' | 'down';
}) {
  const base = 'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const cls = active
    ? variant === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
    : 'text-slate-400 hover:bg-slate-100';
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${cls}`}>
      <span>{variant === 'up' ? '👍' : '👎'}</span>
      {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
    </button>
  );
}

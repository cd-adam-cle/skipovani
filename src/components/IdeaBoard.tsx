'use client';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { Idea, IdeaVote, IdeaNote, IdeaRename, VoteValue } from '@/lib/types';

interface Props {
  ideas: Idea[];
  votes: IdeaVote[];
  notes: IdeaNote[];
  renames: IdeaRename[];
  myParticipantId: string | null;
  onVote: (ideaId: string, value: VoteValue) => void;
  onAdd: (title: string, emoji: string) => void;
  onRename: (ideaId: string, newTitle: string) => void;
  onAddNote: (ideaId: string, body: string) => void;
  onSetDuration: (ideaId: string, days: number) => void;
}

export default function IdeaBoard({
  ideas, votes, notes, renames, myParticipantId, onVote, onAdd, onRename, onAddNote, onSetDuration,
}: Props) {
  const [title, setTitle] = useState('');
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
    onAdd(t, '📍'); // default emoji for compatibility with DB schema
    setTitle('');
    setOpen(false);
  };

  return (
    <div>
      <div className="space-y-3">
        {sorted.map(idea => (
          <IdeaRow
            key={idea.id}
            idea={idea}
            tally={tally[idea.id] || { up: 0, down: 0, mine: null }}
            notes={notes.filter(n => n.idea_id === idea.id)}
            renames={renames.filter(r => r.idea_id === idea.id)}
            canInteract={!!myParticipantId}
            onVote={onVote}
            onRename={onRename}
            onAddNote={onAddNote}
            onSetDuration={onSetDuration}
          />
        ))}
      </div>

      {open ? (
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Např. Slovinsko, kempování na Lipně, výšlap v Tatrách…"
              className="flex-1 min-w-0 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={submit}
                className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
              >Přidat</button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >Zrušit</button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          disabled={!myParticipantId}
          className="mt-4 w-full border border-dashed border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:hover:border-slate-200 disabled:cursor-not-allowed rounded-2xl py-3 text-sm font-semibold transition-all"
        >
          + Přidat vlastní nápad
        </button>
      )}
      {!myParticipantId && (
        <p className="mt-2.5 text-[11px] text-center text-slate-400">Zadej nahoře své jméno, abys mohl/a hlasovat, přejmenovávat a přidávat poznámky.</p>
      )}
    </div>
  );
}

function fmtDate(d: string) {
  return format(new Date(d), 'd. M. HH:mm', { locale: cs });
}

interface RowProps {
  idea: Idea;
  tally: { up: number; down: number; mine: VoteValue | null };
  notes: IdeaNote[];
  renames: IdeaRename[];
  canInteract: boolean;
  onVote: (ideaId: string, value: VoteValue) => void;
  onRename: (ideaId: string, newTitle: string) => void;
  onAddNote: (ideaId: string, body: string) => void;
  onSetDuration: (ideaId: string, days: number) => void;
}

function IdeaRow({ idea, tally, notes, renames, canInteract, onVote, onRename, onAddNote, onSetDuration }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea.title);
  const [showNotes, setShowNotes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [editingDur, setEditingDur] = useState(false);
  const [durDraft, setDurDraft] = useState(String(idea.duration_days));

  const commitDur = () => {
    setEditingDur(false);
    const n = parseInt(durDraft, 10);
    if (!isNaN(n) && n >= 1 && n <= 60 && n !== idea.duration_days) onSetDuration(idea.id, n);
    else setDurDraft(String(idea.duration_days));
  };
  const dayLabel = (n: number) => (n === 1 ? 'den' : n < 5 ? 'dny' : 'dní');

  const score = tally.up - tally.down;

  const commitRename = () => {
    const t = draft.trim();
    setEditing(false);
    if (t && t !== idea.title) onRename(idea.id, t);
    else setDraft(idea.title);
  };

  const submitNote = () => {
    const b = noteDraft.trim();
    if (!b) return;
    onAddNote(idea.id, b);
    setNoteDraft('');
  };

  const sortedRenames = [...renames].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white hover:border-indigo-100/70 hover:shadow-sm transition-all duration-300">
      <div className="flex items-center gap-3 p-4">
        {/* Unified premium location pin icon instead of raw emoji */}
        <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setDraft(idea.title); setEditing(false); }
              }}
              className="w-full border border-indigo-300 rounded-lg px-2.5 py-1 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          ) : (
            <button
              onClick={() => canInteract && (setDraft(idea.title), setEditing(true))}
              disabled={!canInteract}
              title={canInteract ? 'Klikni a přepiš název' : undefined}
              className="font-semibold text-slate-800 text-sm truncate text-left max-w-full hover:text-indigo-600 disabled:hover:text-slate-800 disabled:cursor-default transition-colors"
            >
              {idea.title}
            </button>
          )}

          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            {editingDur ? (
              <span className="inline-flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  min={1}
                  max={60}
                  value={durDraft}
                  onChange={e => setDurDraft(e.target.value)}
                  onBlur={commitDur}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitDur();
                    if (e.key === 'Escape') { setDurDraft(String(idea.duration_days)); setEditingDur(false); }
                  }}
                  className="w-12 border border-indigo-300 rounded-md px-1.5 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-slate-400">{dayLabel(parseInt(durDraft) || idea.duration_days)}</span>
              </span>
            ) : (
              <button
                onClick={() => canInteract && (setDurDraft(String(idea.duration_days)), setEditingDur(true))}
                disabled={!canInteract}
                title={canInteract ? 'Klikni a uprav délku' : undefined}
                className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-indigo-600 disabled:hover:text-slate-500 disabled:cursor-default transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                ~{idea.duration_days} {dayLabel(idea.duration_days)}
              </button>
            )}
            {(tally.up > 0 || tally.down > 0) && (
              <span className="font-medium">
                skóre <strong className={score > 0 ? 'text-emerald-600' : score < 0 ? 'text-rose-500' : 'text-slate-500'}>
                  {score > 0 ? `+${score}` : score}
                </strong>
              </span>
            )}
            {sortedRenames.length > 0 && (
              <span
                className="relative inline-flex items-center cursor-help"
                onMouseEnter={() => setShowHistory(true)}
                onMouseLeave={() => setShowHistory(false)}
              >
                <span className="text-slate-400 hover:text-indigo-600 inline-flex items-center gap-0.5 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{sortedRenames.length}×</span>
                </span>
                {showHistory && (
                  <span className="absolute left-0 bottom-full mb-2 z-10 w-64 max-w-[70vw] rounded-xl bg-slate-850 text-white text-[11px] leading-relaxed p-3 shadow-xl border border-slate-700/50 backdrop-blur-sm bg-slate-900/95">
                    <span className="block font-bold mb-1.5 text-slate-300 border-b border-slate-700/50 pb-1">Historie názvu</span>
                    {sortedRenames.map(r => (
                      <span key={r.id} className="block mt-1">
                        <strong className="text-slate-200">{r.author_name}</strong>: {'„'}{r.old_title}{'" → „'}{r.new_title}{'"'} <span className="text-slate-400 block text-[10px]">{fmtDate(r.created_at)}</span>
                      </span>
                    ))}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <VoteBtn active={tally.mine === 'up'} count={tally.up} disabled={!canInteract} onClick={() => onVote(idea.id, 'up')} variant="up" />
          <VoteBtn active={tally.mine === 'down'} count={tally.down} disabled={!canInteract} onClick={() => onVote(idea.id, 'down')} variant="down" />
        </div>
      </div>

      {/* Toggle poznámek */}
      <button
        onClick={() => setShowNotes(s => !s)}
        className="w-full text-left px-4 pb-3 -mt-2 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>
          {notes.length > 0 ? `${notes.length} ${notes.length === 1 ? 'poznámka' : notes.length < 5 ? 'poznámky' : 'poznámek'}` : 'Přidat poznámku'}
        </span>
        <svg className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${showNotes ? 'rotate-180 text-indigo-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showNotes && (
        <div className="border-t border-slate-100/80 px-4 py-4 space-y-3 bg-slate-50/50 rounded-b-2xl">
          {notes.length === 0 && <p className="text-xs text-slate-400 italic">Zatím žádné poznámky. Napiš první…</p>}
          {[...notes].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(n => (
            <div key={n.id} className="text-sm bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-xs">{n.author_name}</span>
                <span className="text-[10px] text-slate-400">{fmtDate(n.created_at)}</span>
              </div>
              <p className="text-slate-600 whitespace-pre-wrap break-words text-xs leading-relaxed">{n.body}</p>
            </div>
          ))}

          {canInteract && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitNote()}
                placeholder="Napiš poznámku k tomuto místu…"
                className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
              <button
                onClick={submitNote}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >Přidat</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VoteBtn({ active, count, disabled, onClick, variant }: {
  active: boolean; count: number; disabled?: boolean; onClick: () => void; variant: 'up' | 'down';
}) {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed border';
  const cls = active
    ? variant === 'up' 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60 shadow-sm shadow-emerald-50' 
      : 'bg-rose-50 text-rose-700 border-rose-100/60 shadow-sm shadow-rose-50'
    : 'text-slate-400 bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:text-slate-600';
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${cls}`}>
      <span>
        {variant === 'up' ? (
          <svg className={`w-3.5 h-3.5 ${active ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
          </svg>
        ) : (
          <svg className={`w-3.5 h-3.5 ${active ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" />
          </svg>
        )}
      </span>
      {count > 0 && <span className="text-[10px] tabular-nums font-bold">{count}</span>}
    </button>
  );
}

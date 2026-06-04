'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { HORIZON_START, HORIZON_END } from '@/lib/config';
import { computeDayStats, computeOverlapWindows } from '@/lib/engine';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import OverlapCalendar from '@/components/OverlapCalendar';
import TopWindows from '@/components/TopWindows';
import IdeaBoard from '@/components/IdeaBoard';
import DaysSlider from '@/components/DaysSlider';
import LiveBadge from '@/components/LiveBadge';
import type { Participant, Availability, Idea, IdeaVote, VoteValue, AvailabilityWeight, OverlapWindow } from '@/lib/types';

const LS_KEY = 'trip_me_id';

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
}

export default function Home() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [votes, setVotes] = useState<IdeaVote[]>([]);
  const [loading, setLoading] = useState(true);

  const [myId, setMyId] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null)
  );
  const [myName, setMyName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [myAvail, setMyAvail] = useState<Record<string, AvailabilityWeight>>({});
  const [myDays, setMyDays] = useState(3);

  const [tab, setTab] = useState<'me' | 'overlap'>(() =>
    typeof window !== 'undefined' && localStorage.getItem(LS_KEY) ? 'me' : 'overlap'
  );
  const [hoverWindow, setHoverWindow] = useState<OverlapWindow | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- načtení dat ----
  const loadAll = useCallback(async () => {
    const [{ data: parts }, { data: avail }, { data: ideaData }, { data: voteData }] = await Promise.all([
      supabase.from('participant').select('*').order('created_at'),
      supabase.from('availability').select('*'),
      supabase.from('idea').select('*'),
      supabase.from('idea_vote').select('*'),
    ]);
    setParticipants((parts || []) as Participant[]);
    setAvailability((avail || []) as Availability[]);
    setIdeas((ideaData || []) as Idea[]);
    setVotes((voteData || []) as IdeaVote[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    loadAll();
    const channel = supabase
      .channel('trip-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participant' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'idea' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_vote' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  // ---- napln "moje" stav když známe myId + data ----
  useEffect(() => {
    if (!myId) return;
    const me = participants.find(p => p.id === myId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local editable state from DB
    if (me) { setMyName(me.name); setMyDays(me.ideal_days || 3); }
    const mine: Record<string, AvailabilityWeight> = {};
    for (const a of availability) if (a.participant_id === myId) mine[a.day] = a.weight;
    setMyAvail(mine);
  }, [myId, participants, availability]);

  // ---- agregace ----
  const stats = useMemo(
    () => computeDayStats(HORIZON_START, HORIZON_END, participants, availability),
    [participants, availability]
  );
  const windows = useMemo(
    () => computeOverlapWindows(HORIZON_START, HORIZON_END, participants, availability),
    [participants, availability]
  );
  const submittedCount = useMemo(() => {
    const ids = new Set(availability.map(a => a.participant_id));
    return participants.filter(p => ids.has(p.id)).length;
  }, [participants, availability]);
  const highlight = useMemo(
    () => hoverWindow ? new Set(eachDay(hoverWindow.start, hoverWindow.end)) : undefined,
    [hoverWindow]
  );

  // ---- vstup jména → vytvoř participanta ----
  const handleStart = async () => {
    const n = nameInput.trim();
    if (!n) return;
    const { data } = await supabase.from('participant').insert({ name: n }).select().single();
    if (data) {
      localStorage.setItem(LS_KEY, data.id);
      setMyId(data.id);
      setMyName(n);
      setTab('me');
      setParticipants(p => [...p, data as Participant]);
    }
  };

  // ---- autosave dostupnosti (debounced) ----
  const persistAvail = useCallback(async (next: Record<string, AvailabilityWeight>) => {
    if (!myId) return;
    const rows = Object.entries(next).map(([day, weight]) => ({ participant_id: myId, day, weight }));
    if (rows.length) await supabase.from('availability').upsert(rows, { onConflict: 'participant_id,day' });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }, [myId]);

  const changeDay = (day: string, weight: AvailabilityWeight) => {
    setMyAvail(prev => {
      const next = { ...prev, [day]: weight };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistAvail(next), 500);
      // optimistic update do globálního availability
      setAvailability(av => {
        const without = av.filter(a => !(a.participant_id === myId && a.day === day));
        return [...without, { id: `tmp-${day}`, participant_id: myId!, day, weight }];
      });
      return next;
    });
  };

  const changeDays = async (v: number) => {
    setMyDays(v);
    if (myId) {
      await supabase.from('participant').update({ ideal_days: v }).eq('id', myId);
      setParticipants(ps => ps.map(p => p.id === myId ? { ...p, ideal_days: v } : p));
    }
  };

  // ---- nápady ----
  const handleVote = async (ideaId: string, value: VoteValue) => {
    if (!myId) return;
    const existing = votes.find(v => v.idea_id === ideaId && v.participant_id === myId);
    if (existing && existing.value === value) {
      setVotes(vs => vs.filter(v => !(v.idea_id === ideaId && v.participant_id === myId)));
      await supabase.from('idea_vote').delete().eq('idea_id', ideaId).eq('participant_id', myId);
    } else {
      setVotes(vs => [...vs.filter(v => !(v.idea_id === ideaId && v.participant_id === myId)), { idea_id: ideaId, participant_id: myId, value }]);
      await supabase.from('idea_vote').upsert({ idea_id: ideaId, participant_id: myId, value }, { onConflict: 'idea_id,participant_id' });
    }
  };

  const handleAddIdea = async (title: string, emoji: string) => {
    if (!myId) return;
    const { data } = await supabase.from('idea').insert({ title, emoji, created_by: myId }).select().single();
    if (data) setIdeas(i => [...i, data as Idea]);
  };

  const avgDays = useMemo(() => {
    const ids = new Set(availability.map(a => a.participant_id));
    const active = participants.filter(p => ids.has(p.id));
    if (!active.length) return null;
    return Math.round((active.reduce((a, p) => a + (p.ideal_days || 0), 0) / active.length) * 10) / 10;
  }, [participants, availability]);

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><div className="text-slate-400">Načítám…</div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>🗺️</span> Kdy a kam vyrazíme?
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Vyznač, kdy máš čas (červen–září). {submittedCount > 0 && <>{submittedCount} {submittedCount === 1 ? 'člověk' : submittedCount < 5 ? 'lidi' : 'lidí'} už vyplnilo</>}
              {avgDays !== null && <> · ⌀ {avgDays} dní</>}
            </p>
          </div>
          <LiveBadge />
        </div>

        {/* Onboarding jména */}
        {!myId && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 mb-6">
            <p className="font-semibold text-slate-800 mb-1">Začni svým jménem</p>
            <p className="text-sm text-slate-500 mb-3">Ať ostatní vidí, kdo kdy může. Uloží se ti do prohlížeče — kdykoli se vrátíš a upravíš.</p>
            <div className="flex gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                placeholder="Tvoje jméno"
                className="flex-1 min-w-0 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={handleStart}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 rounded-xl transition-colors"
              >Začít →</button>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Kalendář */}
          <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="inline-flex bg-slate-100 rounded-xl p-1 text-sm">
                <button
                  onClick={() => setTab('overlap')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${tab === 'overlap' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                >🔥 Překryvy</button>
                <button
                  onClick={() => myId && setTab('me')}
                  disabled={!myId}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${tab === 'me' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                >📅 Můj čas</button>
              </div>
              {tab === 'me' && (
                <span className={`text-xs transition-opacity ${savedFlash ? 'opacity-100 text-emerald-600' : 'opacity-0'}`}>✓ uloženo</span>
              )}
            </div>

            {tab === 'me' && myId ? (
              <>
                <p className="text-xs text-slate-400 mb-4">Klikni nebo táhni po dnech. Cykluje: ideální → ok → spíš ne → nemůžu. Ukládá se automaticky.</p>
                <AvailabilityCalendar
                  horizonStart={HORIZON_START}
                  horizonEnd={HORIZON_END}
                  value={myAvail}
                  onChange={changeDay}
                />
              </>
            ) : (
              <OverlapCalendar
                horizonStart={HORIZON_START}
                horizonEnd={HORIZON_END}
                stats={stats}
                highlight={highlight}
              />
            )}
          </section>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-5">
            {myId && (
              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="font-semibold text-slate-800 mb-1">⏱️ Kolik dní ti sedí?</h2>
                <p className="text-xs text-slate-400 mb-4">Ahoj {myName} 👋</p>
                <DaysSlider value={myDays} onChange={changeDays} />
              </section>
            )}

            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-4">🏆 Nejlepší termíny</h2>
              <TopWindows windows={windows} totalPeople={submittedCount} onHover={setHoverWindow} />
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-3">👥 Parta</h2>
              <div className="flex flex-wrap gap-2">
                {participants.length === 0 && <p className="text-sm text-slate-400">Zatím nikdo. Buď první!</p>}
                {participants.map(p => {
                  const filled = availability.some(a => a.participant_id === p.id);
                  return (
                    <span
                      key={p.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        filled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      } ${p.id === myId ? 'ring-2 ring-indigo-300' : ''}`}
                    >
                      <span>{filled ? '✓' : '○'}</span>
                      {p.name}{p.id === myId ? ' (ty)' : ''}
                    </span>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Nápady */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">💡 Kam to bude?</h2>
            <span className="text-xs text-slate-400">{ideas.length} nápadů</span>
          </div>
          <IdeaBoard
            ideas={ideas}
            votes={votes}
            myParticipantId={myId}
            onVote={handleVote}
            onAdd={handleAddIdea}
          />
        </section>
      </div>
    </main>
  );
}

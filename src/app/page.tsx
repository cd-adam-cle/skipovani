'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { HORIZON_START, HORIZON_END } from '@/lib/config';
import { computeDayStats, computeOverlapWindows, computePersonRows } from '@/lib/engine';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import OverlapCalendar from '@/components/OverlapCalendar';
import PeopleTimeline from '@/components/PeopleTimeline';
import TopWindows from '@/components/TopWindows';
import IdeaBoard from '@/components/IdeaBoard';
import DaysSlider from '@/components/DaysSlider';
import LiveBadge from '@/components/LiveBadge';
import type { Participant, Availability, Idea, IdeaVote, IdeaNote, IdeaRename, VoteValue, AvailabilityWeight, OverlapWindow, RatherNoMode } from '@/lib/types';

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
  const [notes, setNotes] = useState<IdeaNote[]>([]);
  const [renames, setRenames] = useState<IdeaRename[]>([]);
  const [loading, setLoading] = useState(true);

  const [myId, setMyId] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null)
  );
  const [myName, setMyName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [myAvail, setMyAvail] = useState<Record<string, AvailabilityWeight>>({});
  const [myDays, setMyDays] = useState(3);

  const [tab, setTab] = useState<'me' | 'overlap' | 'people'>(() =>
    typeof window !== 'undefined' && localStorage.getItem(LS_KEY) ? 'me' : 'overlap'
  );
  const [hoverWindow, setHoverWindow] = useState<OverlapWindow | null>(null);
  const [minAttendees, setMinAttendees] = useState(0);
  const [ratherNo, setRatherNo] = useState<RatherNoMode>('counts');
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- načtení dat ----
  const loadAll = useCallback(async () => {
    const [{ data: parts }, { data: avail }, { data: ideaData }, { data: voteData }, { data: noteData }, { data: renameData }] = await Promise.all([
      supabase.from('participant').select('*').order('created_at'),
      supabase.from('availability').select('*'),
      supabase.from('idea').select('*'),
      supabase.from('idea_vote').select('*'),
      supabase.from('idea_note').select('*'),
      supabase.from('idea_rename').select('*'),
    ]);
    setParticipants((parts || []) as Participant[]);
    setAvailability((avail || []) as Availability[]);
    setIdeas((ideaData || []) as Idea[]);
    setVotes((voteData || []) as IdeaVote[]);
    setNotes((noteData || []) as IdeaNote[]);
    setRenames((renameData || []) as IdeaRename[]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_note' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_rename' }, loadAll)
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
    () => computeOverlapWindows(HORIZON_START, HORIZON_END, participants, availability, { minAttendees, ratherNo }),
    [participants, availability, minAttendees, ratherNo]
  );
  const personRows = useMemo(
    () => computePersonRows(participants, availability),
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

  // ---- vstup jména → převezmi existující záznam nebo vytvoř nový ----
  const handleStart = async () => {
    const n = nameInput.trim();
    if (!n) return;

    // Stejné jméno (case-insensitive) → přihlas se jako existující, žádný duplikát
    const { data: existing } = await supabase
      .from('participant')
      .select('*')
      .ilike('name', n)
      .order('created_at')
      .limit(1)
      .maybeSingle();

    if (existing) {
      localStorage.setItem(LS_KEY, existing.id);
      setMyId(existing.id);
      setMyName(existing.name);
      setMyDays(existing.ideal_days || 3);
      setTab('me');
      setParticipants(p => p.some(x => x.id === existing.id) ? p : [...p, existing as Participant]);
      return;
    }

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

  // ---- vzít zpět: vymazat jen moje vyplněné dny ----
  const clearMyCalendar = async () => {
    if (!myId) return;
    if (!confirm('Vymazat všechny tvé vyplněné dny v kalendáři? Jméno, slider i hlasy zůstanou.')) return;
    setMyAvail({});
    setAvailability(av => av.filter(a => a.participant_id !== myId));
    await supabase.from('availability').delete().eq('participant_id', myId);
  };

  // ---- odebrat mě úplně (kompletní reset, vyčistí session) ----
  const removeMe = async () => {
    if (!myId) return;
    if (!confirm('Odebrat tě úplně? Smaže to tvou dostupnost, slider i hlasy a vyřadí tě z party. Tuto akci nelze vrátit.')) return;
    const id = myId;
    localStorage.removeItem(LS_KEY);
    setMyId(null);
    setMyName('');
    setMyAvail({});
    setMyDays(3);
    setTab('overlap');
    setParticipants(ps => ps.filter(p => p.id !== id));
    setAvailability(av => av.filter(a => a.participant_id !== id));
    setVotes(vs => vs.filter(v => v.participant_id !== id));
    await supabase.from('participant').delete().eq('id', id); // cascade smaže availability/votes/notes
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

  const handleRename = async (ideaId: string, newTitle: string) => {
    if (!myId) return;
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea || idea.title === newTitle) return;
    const oldTitle = idea.title;
    setIdeas(is => is.map(i => i.id === ideaId ? { ...i, title: newTitle } : i));
    await supabase.from('idea').update({ title: newTitle }).eq('id', ideaId);
    const { data } = await supabase.from('idea_rename').insert({
      idea_id: ideaId, participant_id: myId, author_name: myName,
      old_title: oldTitle, new_title: newTitle,
    }).select().single();
    if (data) setRenames(r => [...r, data as IdeaRename]);
  };

  const handleAddNote = async (ideaId: string, body: string) => {
    if (!myId) return;
    const { data } = await supabase.from('idea_note').insert({
      idea_id: ideaId, participant_id: myId, author_name: myName, body,
    }).select().single();
    if (data) setNotes(n => [...n, data as IdeaNote]);
  };

  const handleSetDuration = async (ideaId: string, days: number) => {
    if (!myId) return;
    setIdeas(is => is.map(i => i.id === ideaId ? { ...i, duration_days: days } : i));
    await supabase.from('idea').update({ duration_days: days }).eq('id', ideaId);
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
    <main className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-50 to-indigo-50/20 pb-20">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
              <svg className="w-8 h-8 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>Kdy a kam vyrazíme?</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2 flex items-center gap-1.5 flex-wrap">
              <span>Vyznač, kdy máš čas (červen–září).</span>
              {submittedCount > 0 && (
                <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {submittedCount} {submittedCount === 1 ? 'člověk' : submittedCount < 5 ? 'lidi' : 'lidí'} vyplnil/o
                </span>
              )}
              {avgDays !== null && (
                <span className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  průměr {avgDays} dní
                </span>
              )}
            </p>
          </div>
          {myId ? (
            <div className="flex items-center gap-2">
              <button
                onClick={clearMyCalendar}
                title="Smaže jen tvé vyplněné dny v kalendáři"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:border-amber-300 hover:text-amber-600 px-3 py-2 rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a4 4 0 110 8H8m-5-8l4-4m-4 4l4 4" />
                </svg>
                Vymazat kalendář
              </button>
              <button
                onClick={removeMe}
                title="Odebere tě úplně z party (dostupnost, slider i hlasy)"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 px-3 py-2 rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Odebrat mě
              </button>
            </div>
          ) : (
            <LiveBadge />
          )}
        </div>

        {/* Onboarding jména */}
        {!myId && (
          <div className="bg-white rounded-2xl border border-indigo-100/80 shadow-md shadow-indigo-100/10 p-6 mb-8 max-w-2xl">
            <h3 className="font-bold text-slate-800 text-base mb-1">Začni zadáním svého jména</h3>
            <p className="text-sm text-slate-500 mb-4">Ať ostatní v partě vidí tvou dostupnost. Uloží se ti do prohlížeče a můžeš ji kdykoliv změnit.</p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                placeholder="Tvoje jméno"
                className="flex-1 min-w-0 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50/50 hover:bg-slate-50/20 focus:bg-white transition-all text-sm font-medium"
              />
              <button
                onClick={handleStart}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.98] text-sm"
              >
                Pokračovat
              </button>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Kalendář */}
          <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5 gap-2">
                <div className="inline-flex bg-slate-100 rounded-xl p-1 text-sm font-medium">
                  <button
                    onClick={() => setTab('overlap')}
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-lg transition-all ${
                      tab === 'overlap' 
                        ? 'bg-white shadow-sm text-slate-800 font-bold' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-1.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                    </svg>
                    <span>Překryvy</span>
                  </button>
                  <button
                    onClick={() => setTab('people')}
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-lg transition-all ${
                      tab === 'people'
                        ? 'bg-white shadow-sm text-slate-800 font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-1.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                    </svg>
                    <span>Kdo jak</span>
                  </button>
                  <button
                    onClick={() => myId && setTab('me')}
                    disabled={!myId}
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-lg transition-all disabled:opacity-40 ${
                      tab === 'me' 
                        ? 'bg-white shadow-sm text-slate-800 font-bold' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-1.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Můj čas</span>
                  </button>
                </div>
                {tab === 'me' && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-600 transition-opacity ${savedFlash ? 'opacity-100' : 'opacity-0'}`}>
                    Uloženo
                  </span>
                )}
              </div>

              {tab === 'me' && myId ? (
                <>
                  <p className="text-xs text-slate-400 mb-5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    Klikáním nebo tažením myší označ dny. Opakovaným kliknutím změníš stav:
                    <strong className="text-emerald-600 font-semibold ml-1">Ideální</strong> →
                    <strong className="text-slate-600 font-semibold ml-1">Ok</strong> →
                    <strong className="text-amber-600 font-semibold ml-1">Spíš ne</strong> →
                    <strong className="text-rose-600 font-semibold ml-1">Nemůžu</strong>.
                  </p>
                  <AvailabilityCalendar
                    horizonStart={HORIZON_START}
                    horizonEnd={HORIZON_END}
                    value={myAvail}
                    onChange={changeDay}
                  />
                </>
              ) : tab === 'people' ? (
                <PeopleTimeline
                  horizonStart={HORIZON_START}
                  horizonEnd={HORIZON_END}
                  rows={personRows}
                  stats={stats}
                  myId={myId}
                  highlight={highlight}
                />
              ) : (
                <OverlapCalendar
                  horizonStart={HORIZON_START}
                  horizonEnd={HORIZON_END}
                  stats={stats}
                  highlight={highlight}
                />
              )}
            </div>
          </section>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {myId && (
              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="font-bold text-slate-800 text-sm">Kolik dní ti sedí?</h2>
                </div>
                <p className="text-xs text-slate-400 mb-5">Přihlášen jako: <strong className="text-indigo-600 font-bold">{myName}</strong></p>
                <DaysSlider value={myDays} onChange={changeDays} />
              </section>
            )}

            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <h2 className="font-bold text-slate-800 text-sm">Nejlepší termíny</h2>
              </div>
              <TopWindows
                windows={windows}
                totalPeople={submittedCount}
                onHover={setHoverWindow}
                minAttendees={minAttendees}
                ratherNo={ratherNo}
                onMinAttendees={setMinAttendees}
                onRatherNo={setRatherNo}
              />
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h2 className="font-bold text-slate-800 text-sm">Parta</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.length === 0 && <p className="text-xs text-slate-400 italic">Zatím nikdo. Buď první!</p>}
                {participants.map(p => {
                  const filled = availability.some(a => a.participant_id === p.id);
                  return (
                    <span
                      key={p.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        filled 
                          ? 'bg-emerald-50/60 text-emerald-700 border-emerald-100' 
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                      } ${p.id === myId ? 'ring-2 ring-indigo-500/20 border-indigo-200' : ''}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${filled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>{p.name}</span>
                      {p.id === myId && <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1 py-0.5 rounded font-normal">ty</span>}
                    </span>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Nápady */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 mt-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="font-bold text-slate-800 text-sm">Kam to bude?</h2>
            </div>
            <span className="inline-flex items-center bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {ideas.length} nápadů
            </span>
          </div>
          <IdeaBoard
            ideas={ideas}
            votes={votes}
            notes={notes}
            renames={renames}
            myParticipantId={myId}
            onVote={handleVote}
            onAdd={handleAddIdea}
            onRename={handleRename}
            onAddNote={handleAddNote}
            onSetDuration={handleSetDuration}
          />
        </section>
      </div>
    </main>
  );
}

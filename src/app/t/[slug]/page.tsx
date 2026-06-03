'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { computeDayStats, computeOverlapWindows } from '@/lib/engine';
import OverlapCalendar from '@/components/OverlapCalendar';
import TopWindows from '@/components/TopWindows';
import IdeaBoard from '@/components/IdeaBoard';
import LiveBadge from '@/components/LiveBadge';
import type { Trip, Participant, Availability, Idea, IdeaVote, VoteValue, OverlapWindow } from '@/lib/types';

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
}

export default function TripDashboard() {
  const { slug } = useParams<{ slug: string }>();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [votes, setVotes] = useState<IdeaVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [hoverWindow, setHoverWindow] = useState<OverlapWindow | null>(null);

  const loadAll = useCallback(async () => {
    const { data: tripData } = await supabase.from('trip').select('*').eq('share_slug', slug).single();
    if (!tripData) { setLoading(false); return; }
    setTrip(tripData);

    const [{ data: parts }, { data: avail }, { data: ideaData }, { data: voteData }] = await Promise.all([
      supabase.from('participant').select('*').eq('trip_id', tripData.id).order('created_at'),
      supabase.from('availability').select('*'),
      supabase.from('idea').select('*').eq('trip_id', tripData.id),
      supabase.from('idea_vote').select('*'),
    ]);

    const pList = (parts || []) as Participant[];
    const pIds = new Set(pList.map(p => p.id));
    setParticipants(pList);
    setAvailability(((avail || []) as Availability[]).filter(a => pIds.has(a.participant_id)));
    setIdeas((ideaData || []) as Idea[]);
    setVotes(((voteData || []) as IdeaVote[]).filter(v => pIds.has(v.participant_id)));
    setLoading(false);

    setMyParticipantId(localStorage.getItem(`trip_participant_${slug}`));
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    loadAll();
    const channel = supabase
      .channel(`trip-${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participant' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'idea' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_vote' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAll, slug]);

  const stats = useMemo(
    () => trip ? computeDayStats(trip.horizon_start, trip.horizon_end, participants, availability) : [],
    [trip, participants, availability]
  );
  const windows = useMemo(
    () => trip ? computeOverlapWindows(trip.horizon_start, trip.horizon_end, participants, availability) : [],
    [trip, participants, availability]
  );

  const submittedCount = useMemo(() => {
    const ids = new Set(availability.map(a => a.participant_id));
    return participants.filter(p => ids.has(p.id)).length;
  }, [participants, availability]);

  const avgDays = useMemo(() => {
    if (participants.length === 0) return null;
    const sum = participants.reduce((a, p) => a + (p.ideal_days || 0), 0);
    return Math.round((sum / participants.length) * 10) / 10;
  }, [participants]);

  const highlight = useMemo(() => {
    if (!hoverWindow) return undefined;
    return new Set(eachDay(hoverWindow.start, hoverWindow.end));
  }, [hoverWindow]);

  const copyShareLink = () => {
    const url = `${window.location.origin}/t/${slug}/join`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMessage('Zkopírováno!');
      setTimeout(() => setShareMessage(''), 2000);
    });
  };

  const handleVote = async (ideaId: string, value: VoteValue) => {
    if (!myParticipantId) return;
    const existing = votes.find(v => v.idea_id === ideaId && v.participant_id === myParticipantId);
    if (existing && existing.value === value) {
      // toggle off
      setVotes(vs => vs.filter(v => !(v.idea_id === ideaId && v.participant_id === myParticipantId)));
      await supabase.from('idea_vote').delete().eq('idea_id', ideaId).eq('participant_id', myParticipantId);
    } else {
      setVotes(vs => [
        ...vs.filter(v => !(v.idea_id === ideaId && v.participant_id === myParticipantId)),
        { idea_id: ideaId, participant_id: myParticipantId, value },
      ]);
      await supabase.from('idea_vote').upsert(
        { idea_id: ideaId, participant_id: myParticipantId, value },
        { onConflict: 'idea_id,participant_id' }
      );
    }
  };

  const handleAddIdea = async (title: string, emoji: string) => {
    if (!trip || !myParticipantId) return;
    const { data } = await supabase
      .from('idea')
      .insert({ trip_id: trip.id, title, emoji, created_by: myParticipantId })
      .select()
      .single();
    if (data) setIdeas(i => [...i, data as Idea]);
  };

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><div className="text-slate-400">Načítám…</div></main>;
  }
  if (!trip) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-rose-500">Výlet nenalezen.</p></main>;
  }

  const hasJoined = !!myParticipantId && participants.some(p => p.id === myParticipantId);

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{trip.name}</h1>
            <p className="text-slate-500 text-sm mt-1">
              Organizátor: {trip.organizer_name} · {submittedCount}/{participants.length} vyplnilo dostupnost
              {avgDays !== null && <> · ⌀ {avgDays} dní</>}
            </p>
          </div>
          <LiveBadge />
        </div>

        {/* Share / Join bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={copyShareLink}
            className="flex-1 flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 hover:bg-indigo-100 transition-colors text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-indigo-800">🔗 Sdílet s partou</p>
              <p className="text-xs text-indigo-500 font-mono truncate">/t/{slug}/join</p>
            </div>
            <span className="shrink-0 bg-indigo-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
              {shareMessage || 'Kopírovat'}
            </span>
          </button>

          {hasJoined ? (
            <a
              href={`/t/${slug}/me`}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium px-5 py-3 rounded-2xl hover:border-slate-300 transition-colors"
            >
              ✏️ Upravit mou dostupnost
            </a>
          ) : (
            <a
              href={`/t/${slug}/join`}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl transition-colors"
            >
              Vyplnit moji dostupnost →
            </a>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Calendar */}
          <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Kalendář překryvů</h2>
            <OverlapCalendar
              horizonStart={trip.horizon_start}
              horizonEnd={trip.horizon_end}
              stats={stats}
              highlight={highlight}
            />
          </section>

          {/* Sidebar: top windows + participants */}
          <div className="lg:col-span-2 space-y-5">
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-4">🏆 Nejlepší termíny</h2>
              <TopWindows windows={windows} totalPeople={submittedCount} onHover={setHoverWindow} />
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-3">👥 Parta</h2>
              <div className="flex flex-wrap gap-2">
                {participants.length === 0 && <p className="text-sm text-slate-400">Zatím nikdo. Sdílej odkaz!</p>}
                {participants.map(p => {
                  const filled = availability.some(a => a.participant_id === p.id);
                  return (
                    <span
                      key={p.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        filled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span>{filled ? '✓' : '○'}</span>
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Ideas */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">💡 Kam to bude?</h2>
            <span className="text-xs text-slate-400">{ideas.length} nápadů</span>
          </div>
          <IdeaBoard
            ideas={ideas}
            votes={votes}
            myParticipantId={hasJoined ? myParticipantId : null}
            onVote={handleVote}
            onAdd={handleAddIdea}
          />
        </section>
      </div>
    </main>
  );
}

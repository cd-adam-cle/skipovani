'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { computeProposals } from '@/lib/engine';
import ResponseTracker from '@/components/ResponseTracker';
import ProposalCard from '@/components/ProposalCard';
import LiveBadge from '@/components/LiveBadge';
import type { Trip, Participant, Availability, Preference, TripOption, Veto, Proposal } from '@/lib/types';

export default function TripDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState('');

  const loadAll = useCallback(async () => {
    const { data: tripData } = await supabase.from('trip').select('*').eq('share_slug', slug).single();
    if (!tripData) return;
    setTrip(tripData);

    const [{ data: parts }, { data: avail }, { data: prefs }, { data: opts }, { data: vetos }] = await Promise.all([
      supabase.from('participant').select('*').eq('trip_id', tripData.id).order('created_at'),
      supabase.from('availability').select('*'),
      supabase.from('preference').select('*'),
      supabase.from('option').select('*').eq('trip_id', tripData.id),
      supabase.from('veto').select('*'),
    ]);

    const pList = (parts || []) as Participant[];
    const aList = (avail || []) as Availability[];
    const pfList = (prefs || []) as Preference[];
    const oList = (opts || []) as TripOption[];
    const vList = (vetos || []) as Veto[];

    setParticipants(pList);
    setLoading(false);

    if (pList.length > 0 && oList.length > 0) {
      setProposals(computeProposals(tripData, pList, aList, pfList, oList, vList));
    }

    const pid = localStorage.getItem(`trip_participant_${slug}`);
    setMyParticipantId(pid);
    if (pid) {
      const me = pList.find(p => p.id === pid);
      if (me && me.name === tripData.organizer_name) setIsOrganizer(true);
    }
  }, [slug]);

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel(`trip-${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participant' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'preference' }, loadAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAll, slug]);

  const copyShareLink = () => {
    const url = `${window.location.origin}/t/${slug}/join`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMessage('Zkopírováno!');
      setTimeout(() => setShareMessage(''), 2000);
    });
  };

  const setStatus = async (status: string) => {
    if (!trip) return;
    await supabase.from('trip').update({ status }).eq('id', trip.id);
    setTrip(t => t ? { ...t, status: status as Trip['status'] } : t);
  };

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><div className="text-slate-400">Načítám...</div></main>;
  }
  if (!trip) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-red-500">Výlet nenalezen.</p></main>;
  }

  const hasJoined = !!myParticipantId && participants.some(p => p.id === myParticipantId);

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{trip.name}</h1>
            <LiveBadge />
          </div>
          <p className="text-slate-500 text-sm">
            Organizátor: {trip.organizer_name} ·{' '}
            {trip.status === 'collecting' ? 'Sbíráme odpovědi' : trip.status === 'shortlist' ? 'Hlasujeme' : 'Rozhodnuto'}
          </p>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-indigo-800">Sdílet odkaz</p>
            <p className="text-xs text-indigo-500 font-mono truncate">/t/{slug}/join</p>
          </div>
          <button
            onClick={copyShareLink}
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            {shareMessage || 'Kopírovat'}
          </button>
        </div>

        {!hasJoined && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-800">Ještě jsi nevyplnil(a) svou dostupnost.</p>
            <a
              href={`/t/${slug}/join`}
              className="bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors whitespace-nowrap"
            >
              Připojit se
            </a>
          </div>
        )}

        {hasJoined && (
          <div className="mb-5">
            <a
              href={`/t/${slug}/me`}
              className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              ✏️ Upravit mé odpovědi
            </a>
          </div>
        )}

        <div className="mb-5">
          <ResponseTracker participants={participants} />
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Top návrhy</h2>
            <span className="text-xs text-slate-400">{proposals.length} variant</span>
          </div>

          {proposals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <p className="text-2xl mb-2">🤔</p>
              <p className="text-sm text-slate-400">Zatím není dost dat. Počkej, až někdo vyplní dostupnost.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((p, i) => (
                <ProposalCard
                  key={p.proposalKey}
                  proposal={p}
                  participants={participants}
                  rank={i}
                  showVoting={trip.status === 'shortlist'}
                />
              ))}
            </div>
          )}
        </div>

        {isOrganizer && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Akce organizátora</h3>
            <div className="flex flex-wrap gap-2">
              {trip.status === 'collecting' && (
                <button
                  onClick={() => setStatus('shortlist')}
                  className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Přejít na hlasování →
                </button>
              )}
              {trip.status === 'shortlist' && (
                <>
                  <button
                    onClick={() => router.push(`/t/${slug}/decide`)}
                    className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    Otevřít hlasování →
                  </button>
                  <button
                    onClick={() => setStatus('decided')}
                    className="bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors"
                  >
                    Potvrdit rozhodnutí
                  </button>
                </>
              )}
              {trip.status === 'decided' && (
                <a
                  href={`/t/${slug}/result`}
                  className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Zobrazit výsledek →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

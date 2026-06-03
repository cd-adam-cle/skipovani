'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { computeProposals } from '@/lib/engine';
import ProposalCard from '@/components/ProposalCard';
import type { Trip, Participant, Availability, Preference, TripOption, Veto, Proposal, FinalVote } from '@/lib/types';
import { addDays, format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function ResultPage() {
  const { slug } = useParams<{ slug: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winner, setWinner] = useState<Proposal | null>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: tripData } = await supabase.from('trip').select('*').eq('share_slug', slug).single();
    if (!tripData) return;
    setTrip(tripData);

    const [{ data: parts }, { data: avail }, { data: prefs }, { data: opts }, { data: vetos }, { data: votes }] = await Promise.all([
      supabase.from('participant').select('*').eq('trip_id', tripData.id),
      supabase.from('availability').select('*'),
      supabase.from('preference').select('*'),
      supabase.from('option').select('*').eq('trip_id', tripData.id),
      supabase.from('veto').select('*'),
      supabase.from('final_vote').select('*'),
    ]);

    const pList = (parts || []) as Participant[];
    setParticipants(pList);

    const props = computeProposals(
      tripData, pList,
      (avail || []) as Availability[],
      (prefs || []) as Preference[],
      (opts || []) as TripOption[],
      (vetos || []) as Veto[]
    );
    const voteList: FinalVote[] = (votes || []) as FinalVote[];

    let best: Proposal | null = null;
    let bestScore = -Infinity;
    for (const p of props) {
      const upCount = voteList.filter(v => v.proposal_key === p.proposalKey && v.value === 'up').length;
      const downCount = voteList.filter(v => v.proposal_key === p.proposalKey && v.value === 'down').length;
      const s = upCount - downCount * 2 + p.score;
      if (s > bestScore) { bestScore = s; best = p; }
    }
    if (!best && props.length > 0) best = props[0];
    setWinner(best);
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const share = () => {
    if (!trip || !winner) return;
    const start = new Date(winner.window.start + 'T00:00:00Z');
    const end = addDays(start, winner.window.length);
    const text = [
      `🗺️ ${trip.name}`,
      `✅ ${winner.option.name}`,
      `📅 ${format(start, 'd. M.', { locale: cs })} – ${format(end, 'd. M. yyyy', { locale: cs })}`,
      `👥 ${winner.attendees} z ${participants.length} může`,
      `💰 ~${winner.option.est_cost.toLocaleString('cs-CZ')} Kč/os.`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setShareMessage('Zkopírováno!');
      setTimeout(() => setShareMessage(''), 2000);
    });
  };

  if (loading) return <main className="min-h-screen flex items-center justify-center"><div className="text-slate-400">Načítám...</div></main>;
  if (!trip) return <main className="min-h-screen flex items-center justify-center"><p className="text-red-500">Nenalezeno.</p></main>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-indigo-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Rozhodnuto!</h1>
          <p className="text-slate-500">{trip.name}</p>
        </div>

        {winner ? (
          <>
            <ProposalCard
              proposal={winner}
              participants={participants}
              rank={0}
              showVoting={false}
            />

            <div className="mt-6 text-center">
              <button
                onClick={share}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-2xl transition-colors"
              >
                {shareMessage || '📋 Sdílet shrnutí'}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400">Žádný vítěz nenalezen.</div>
        )}

        <div className="mt-8 text-center">
          <a href={`/t/${slug}`} className="text-indigo-500 text-sm hover:underline">← Zpět na dashboard</a>
        </div>
      </div>
    </main>
  );
}

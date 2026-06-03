'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { computeProposals } from '@/lib/engine';
import ProposalCard from '@/components/ProposalCard';
import type { Trip, Participant, Availability, Preference, TripOption, Veto, Proposal, FinalVote } from '@/lib/types';

export default function DecidePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, 'up' | 'down'>>({});
  const [allVotes, setAllVotes] = useState<FinalVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPid, setMyPid] = useState<string | null>(null);

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
    setAllVotes((votes || []) as FinalVote[]);

    const props = computeProposals(
      tripData, pList,
      (avail || []) as Availability[],
      (prefs || []) as Preference[],
      (opts || []) as TripOption[],
      (vetos || []) as Veto[]
    );
    setProposals(props);

    const pid = localStorage.getItem(`trip_participant_${slug}`);
    setMyPid(pid);
    if (pid) {
      const mv: Record<string, 'up' | 'down'> = {};
      for (const v of (votes || []) as FinalVote[]) {
        if (v.participant_id === pid) mv[v.proposal_key] = v.value;
      }
      setMyVotes(mv);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const castVote = async (key: string, val: 'up' | 'down') => {
    if (!myPid) { router.push(`/t/${slug}/join`); return; }
    await supabase.from('final_vote').upsert(
      { participant_id: myPid, proposal_key: key, value: val },
      { onConflict: 'participant_id,proposal_key' }
    );
    setMyVotes(v => ({ ...v, [key]: val }));
    setAllVotes(prev => {
      const filtered = prev.filter(v => !(v.participant_id === myPid && v.proposal_key === key));
      return [...filtered, { participant_id: myPid, proposal_key: key, value: val }];
    });
  };

  const getVoteSummary = (key: string) => {
    const v = allVotes.filter(v => v.proposal_key === key);
    return { up: v.filter(v => v.value === 'up').length, down: v.filter(v => v.value === 'down').length };
  };

  if (loading) return <main className="min-h-screen flex items-center justify-center"><div className="text-slate-400">Načítám...</div></main>;
  if (!trip) return <main className="min-h-screen flex items-center justify-center"><p className="text-red-500">Nenalezeno.</p></main>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <a href={`/t/${slug}`} className="text-indigo-500 text-sm mb-6 inline-block hover:underline">← Dashboard</a>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Hlasování</h1>
        <p className="text-slate-500 text-sm mb-8">Palec nahoru nebo dolů na každý návrh.</p>

        {proposals.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400">Zatím žádné návrhy.</div>
        ) : (
          <div className="space-y-4">
            {proposals.map((p, i) => {
              const summary = getVoteSummary(p.proposalKey);
              return (
                <div key={p.proposalKey}>
                  <ProposalCard
                    proposal={p}
                    participants={participants}
                    rank={i}
                    showVoting
                    onVote={castVote}
                    myVote={myVotes[p.proposalKey] || null}
                  />
                  <div className="mt-1 px-2 flex gap-4 text-xs text-slate-500">
                    <span>👍 {summary.up} hlasů</span>
                    <span>👎 {summary.down} hlasů</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

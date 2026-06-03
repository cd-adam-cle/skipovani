'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import PreferenceSliders from '@/components/PreferenceSliders';
import type { Trip, AvailabilityWeight, PreferenceAxes } from '@/lib/types';

const EMPTY_AXES: PreferenceAxes = {
  chill: 0, action: 0, sea: 0, mountains: 0, city: 0,
  nature: 0, warm: 0, snow: 0, lazy: 0, sport: 0,
};

export default function MePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, AvailabilityWeight>>({});
  const [axes, setAxes] = useState<PreferenceAxes>(EMPTY_AXES);
  const [budgetMax, setBudgetMax] = useState('');
  const [flyOk, setFlyOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pid = localStorage.getItem(`trip_participant_${slug}`);
    if (!pid) { router.push(`/t/${slug}/join`); return; }
    setParticipantId(pid);

    (async () => {
      const { data: tripData } = await supabase.from('trip').select('*').eq('share_slug', slug).single();
      setTrip(tripData);

      const { data: avail } = await supabase.from('availability').select('*').eq('participant_id', pid);
      const map: Record<string, AvailabilityWeight> = {};
      for (const a of avail || []) map[a.day] = a.weight;
      setAvailability(map);

      const { data: pref } = await supabase.from('preference').select('*').eq('participant_id', pid).single();
      if (pref) {
        setAxes(pref.axes || EMPTY_AXES);
        setBudgetMax(String(pref.budget_max || ''));
        setFlyOk(pref.fly_ok ?? true);
      }

      setLoading(false);
    })();
  }, [slug, router]);

  const handleSave = async () => {
    if (!participantId || !trip) return;
    setSaving(true);
    setError('');
    try {
      const rows = Object.entries(availability).map(([day, weight]) => ({
        participant_id: participantId,
        day,
        weight,
      }));
      if (rows.length > 0) {
        await supabase.from('availability').upsert(rows, { onConflict: 'participant_id,day' });
      }

      await supabase.from('preference').upsert({
        participant_id: participantId,
        axes,
        budget_max: parseInt(budgetMax) || 0,
        fly_ok: flyOk,
      });

      await supabase.from('participant').update({ has_submitted: true }).eq('id', participantId);

      router.push(`/t/${slug}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Chyba při ukládání: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Načítám...</div>
      </main>
    );
  }

  if (!trip) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-red-500">Výlet nenalezen.</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-lg mx-auto px-4 py-8">
        <a href={`/t/${slug}`} className="text-indigo-500 text-sm mb-6 inline-block hover:underline">← Zpět na dashboard</a>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Tvoje odpovědi</h1>
        <p className="text-slate-500 text-sm mb-8">Výlet: <strong>{trip.name}</strong></p>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-slate-800 mb-2">📅 Dostupnost</h2>
          <p className="text-xs text-slate-400 mb-4">Klikni nebo táhni na dny. Cykluje 4 stavy: ideální → ok → spíš ne → nemůžu.</p>
          <AvailabilityCalendar
            horizonStart={trip.horizon_start}
            horizonEnd={trip.horizon_end}
            value={availability}
            onChange={(day, weight) => setAvailability(a => ({ ...a, [day]: weight }))}
          />
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-slate-800 mb-4">🎯 Preference</h2>
          <PreferenceSliders value={axes} onChange={setAxes} />
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-slate-800 mb-4">💰 Rozpočet</h2>
          <label className="block text-sm text-slate-600 mb-1">Max. cena na osobu (Kč)</label>
          <input
            type="number"
            placeholder="15000"
            value={budgetMax}
            onChange={e => setBudgetMax(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={flyOk}
              onChange={e => setFlyOk(e.target.checked)}
              className="accent-indigo-500 w-4 h-4"
            />
            <span className="text-sm text-slate-700">Letadlo je OK</span>
          </label>
        </section>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-indigo-100"
        >
          {saving ? 'Ukládám...' : '✓ Uložit odpovědi'}
        </button>
      </div>
    </main>
  );
}

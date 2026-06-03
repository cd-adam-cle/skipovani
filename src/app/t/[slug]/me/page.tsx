'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import DaysSlider from '@/components/DaysSlider';
import type { Trip, AvailabilityWeight } from '@/lib/types';

export default function MePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, AvailabilityWeight>>({});
  const [idealDays, setIdealDays] = useState(3);
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

      const { data: me } = await supabase.from('participant').select('*').eq('id', pid).single();
      if (me?.ideal_days) setIdealDays(me.ideal_days);

      const { data: avail } = await supabase.from('availability').select('*').eq('participant_id', pid);
      const map: Record<string, AvailabilityWeight> = {};
      for (const a of avail || []) map[a.day] = a.weight;
      setAvailability(map);

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

      await supabase.from('participant').update({ ideal_days: idealDays }).eq('id', participantId);

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
        <div className="text-slate-400">Načítám…</div>
      </main>
    );
  }

  if (!trip) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-rose-500">Výlet nenalezen.</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <div className="max-w-lg mx-auto px-4 py-8">
        <a href={`/t/${slug}`} className="text-indigo-500 text-sm mb-6 inline-block hover:underline">← Zpět na přehled</a>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Tvoje dostupnost</h1>
        <p className="text-slate-500 text-sm mb-8">Výlet: <strong>{trip.name}</strong></p>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-slate-800 mb-1">📅 Kdy můžeš?</h2>
          <p className="text-xs text-slate-400 mb-4">Klikni nebo táhni po dnech. Cykluje: ideální → ok → spíš ne → nemůžu.</p>
          <AvailabilityCalendar
            horizonStart={trip.horizon_start}
            horizonEnd={trip.horizon_end}
            value={availability}
            onChange={(day, weight) => setAvailability(a => ({ ...a, [day]: weight }))}
          />
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-slate-800 mb-4">⏱️ Jak dlouho?</h2>
          <DaysSlider value={idealDays} onChange={setIdealDays} />
        </section>

        {error && <p className="text-rose-500 text-sm mb-4">{error}</p>}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-slate-100 p-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-indigo-100"
          >
            {saving ? 'Ukládám…' : '✓ Uložit a zpět na přehled'}
          </button>
        </div>
      </div>
    </main>
  );
}

'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function JoinPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Zadej své jméno.'); return; }
    setLoading(true);
    setError('');

    try {
      const { data: trip } = await supabase.from('trip').select('id').eq('share_slug', slug).single();
      if (!trip) throw new Error('Výlet nenalezen.');

      const { data: participant, error: pErr } = await supabase
        .from('participant')
        .insert({ trip_id: trip.id, name: name.trim() })
        .select()
        .single();
      if (pErr) throw pErr;

      localStorage.setItem(`trip_participant_${slug}`, participant.id);
      router.push(`/t/${slug}/me`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Připojit se k výletu</h1>
          <p className="text-slate-500 text-sm mb-6">Zadej své jméno, aby ostatní věděli, kdo odpověděl.</p>

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              placeholder="Tvoje jméno"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Přidávám...' : 'Vstoupit'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

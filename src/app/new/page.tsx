'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CATALOG_OPTIONS } from '@/lib/catalog';

function generateSlug() {
  return Math.random().toString(36).slice(2, 8);
}

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    organizer_name: '',
    horizon_start: '',
    horizon_end: '',
    length_min: '3',
    length_max: '5',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const lmin = parseInt(form.length_min);
    const lmax = parseInt(form.length_max);

    if (!form.name || !form.organizer_name || !form.horizon_start || !form.horizon_end) {
      setError('Vyplňte všechna povinná pole.');
      return;
    }
    if (new Date(form.horizon_end) <= new Date(form.horizon_start)) {
      setError('Konec horizontu musí být po začátku.');
      return;
    }
    const horizonDays = (new Date(form.horizon_end).getTime() - new Date(form.horizon_start).getTime()) / 86400000;
    if (horizonDays < lmin) {
      setError(`Horizont (${Math.round(horizonDays)} dní) je kratší než minimální délka výletu (${lmin} nocí).`);
      return;
    }

    setLoading(true);
    try {
      const slug = generateSlug();
      const { data: trip, error: tripErr } = await supabase
        .from('trip')
        .insert({
          name: form.name,
          organizer_name: form.organizer_name,
          horizon_start: form.horizon_start,
          horizon_end: form.horizon_end,
          length_min: lmin,
          length_max: lmax,
          share_slug: slug,
          status: 'collecting',
        })
        .select()
        .single();

      if (tripErr) throw tripErr;

      const catalogRows = CATALOG_OPTIONS.map(opt => ({
        trip_id: trip.id,
        name: opt.name,
        tags: opt.tags,
        est_cost: opt.est_cost,
        season_tags: opt.season_tags,
        created_by: null,
      }));
      await supabase.from('option').insert(catalogRows);

      router.push(`/t/${slug}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Chyba při vytváření: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <a href="/" className="text-indigo-500 text-sm mb-6 inline-block hover:underline">← Zpět</a>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Nový výlet</h1>
        <p className="text-slate-500 mb-8">Vyplňte základní info a sdílejte odkaz s partou.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Název výletu *</label>
            <input
              type="text"
              placeholder="Letní výlet 2025"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tvoje jméno (organizátor) *</label>
            <input
              type="text"
              placeholder="Tvoje jméno"
              value={form.organizer_name}
              onChange={e => set('organizer_name', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Horizont od *</label>
              <input
                type="date"
                value={form.horizon_start}
                onChange={e => set('horizon_start', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Horizont do *</label>
              <input
                type="date"
                value={form.horizon_end}
                onChange={e => set('horizon_end', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min. nocí</label>
              <input
                type="number"
                min={1} max={30}
                value={form.length_min}
                onChange={e => set('length_min', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max. nocí</label>
              <input
                type="number"
                min={1} max={30}
                value={form.length_max}
                onChange={e => set('length_max', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Vytváření...' : 'Vytvořit výlet'}
          </button>
        </form>
      </div>
    </main>
  );
}

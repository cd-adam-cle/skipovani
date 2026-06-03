import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="mb-6 inline-block text-6xl">🗺️</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          Kam jedeme?
        </h1>
        <p className="text-lg text-slate-500 mb-10 max-w-md mx-auto">
          Konec nekonečných debat v chatu. Každý vyznačí, kdy má čas — appka ukáže termíny, co se nejvíc překrývají.
        </p>

        <Link
          href="/new"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5"
        >
          Vytvořit výlet
        </Link>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            { icon: '📅', title: 'Vyplňte kalendář', desc: 'Každý přetáhnutím označí, kdy může a kolik dní by mu sedělo.' },
            { icon: '🔥', title: 'Najděte překryv', desc: 'Heatmapa hned ukáže dny, kdy může nejvíc lidí z party.' },
            { icon: '💡', title: 'Vyberte destinaci', desc: 'Chata, Chorvatsko, roadtrip… Přidávejte nápady a hlasujte.' },
          ].map(item => (
            <div key={item.icon} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

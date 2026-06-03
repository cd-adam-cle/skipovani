'use client';
import { useEffect, useState } from 'react';

export default function LiveBadge() {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
      <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 transition-opacity ${pulse ? 'opacity-100' : 'opacity-40'}`} />
      živě
    </span>
  );
}

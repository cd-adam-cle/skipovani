import type { Availability, Participant, AvailabilityWeight, DayStat, OverlapWindow } from './types';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  return Math.round((e.getTime() - s.getTime()) / 86400000);
}

/**
 * Spočítá pro každý den v horizontu, kolik lidí může / je ideální / nemůže.
 */
export function computeDayStats(
  horizonStart: string,
  horizonEnd: string,
  participants: Participant[],
  availability: Availability[]
): DayStat[] {
  // participant -> day -> weight
  const lookup: Record<string, Record<string, AvailabilityWeight>> = {};
  const nameById: Record<string, string> = {};
  const submitted = new Set<string>();
  for (const p of participants) nameById[p.id] = p.name;
  for (const a of availability) {
    if (!lookup[a.participant_id]) lookup[a.participant_id] = {};
    lookup[a.participant_id][a.day] = a.weight;
    submitted.add(a.participant_id);
  }

  const total = participants.filter(p => submitted.has(p.id)).length;
  const length = daysBetween(horizonStart, horizonEnd) + 1;
  const stats: DayStat[] = [];

  for (let i = 0; i < length; i++) {
    const day = addDays(horizonStart, i);
    let available = 0, ideal = 0, blocked = 0, rather = 0;
    const names: string[] = [];

    for (const p of participants) {
      if (!submitted.has(p.id)) continue;
      const w = lookup[p.id]?.[day];
      if (!w) continue; // nevyplnil tento den → neutrální, nepočítáme
      if (w === 'no_go') blocked++;
      else {
        available++;
        names.push(nameById[p.id] ?? '?');
        if (w === 'ideal') ideal++;
        if (w === 'rather_no') rather++;
      }
    }

    stats.push({ day, available, ideal, blocked, rather, total, names });
  }

  return stats;
}

/**
 * Najde nejlepší souvislá okna překryvu. Pro každý možný start a délku
 * (1..maxLen) spočítá, kolik lidí může všechny dny v okně. Vrátí top okna,
 * deduplikovaná tak, aby se nepřekrývala stejnou špičkou.
 */
export function computeOverlapWindows(
  horizonStart: string,
  horizonEnd: string,
  participants: Participant[],
  availability: Availability[],
  maxLen = 7,
  topN = 4
): OverlapWindow[] {
  const lookup: Record<string, Record<string, AvailabilityWeight>> = {};
  const submitted = new Set<string>();
  for (const a of availability) {
    if (!lookup[a.participant_id]) lookup[a.participant_id] = {};
    lookup[a.participant_id][a.day] = a.weight;
    submitted.add(a.participant_id);
  }
  const people = participants.filter(p => submitted.has(p.id));
  if (people.length === 0) return [];

  const horizonLen = daysBetween(horizonStart, horizonEnd) + 1;
  const windows: OverlapWindow[] = [];

  for (let L = 1; L <= Math.min(maxLen, horizonLen); L++) {
    for (let off = 0; off + L <= horizonLen; off++) {
      const start = addDays(horizonStart, off);
      const end = addDays(horizonStart, off + L - 1);
      let attendees = 0;
      let idealCount = 0;

      for (const p of people) {
        let ok = true;
        let hasIdeal = false;
        for (let d = 0; d < L; d++) {
          const w = lookup[p.id]?.[addDays(start, d)];
          if (w === 'no_go') { ok = false; break; }
          if (w === 'ideal') hasIdeal = true;
        }
        if (ok) {
          attendees++;
          if (hasIdeal) idealCount++;
        }
      }

      windows.push({ start, end, length: L, attendees, idealCount });
    }
  }

  // skóre: nejvíc lidí > delší okno > víc ideálních
  windows.sort((a, b) =>
    b.attendees - a.attendees ||
    b.length - a.length ||
    b.idealCount - a.idealCount
  );

  // dedupe: nevracej okna, která jsou plně obsažená v lépe hodnoceném okně
  const picked: OverlapWindow[] = [];
  for (const w of windows) {
    if (w.attendees === 0) continue;
    const contained = picked.some(
      p => p.start <= w.start && p.end >= w.end
    );
    if (!contained) picked.push(w);
    if (picked.length >= topN) break;
  }
  return picked;
}

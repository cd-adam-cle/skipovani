import type { Availability, Participant, AvailabilityWeight, DayStat, OverlapWindow, OverlapOptions, PersonRow } from './types';

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
    let available = 0, ideal = 0, ok = 0, blocked = 0, rather = 0, unknown = 0;
    const names: string[] = [];
    const idealNames: string[] = [];
    const okNames: string[] = [];
    const ratherNames: string[] = [];
    const blockedNames: string[] = [];

    for (const p of participants) {
      if (!submitted.has(p.id)) continue;
      const name = nameById[p.id] ?? '?';
      const w = lookup[p.id]?.[day];
      if (!w) { unknown++; continue; } // nevyplnil tento den → neutrální
      if (w === 'no_go') { blocked++; blockedNames.push(name); continue; }
      available++;
      names.push(name);
      if (w === 'ideal') { ideal++; idealNames.push(name); }
      else if (w === 'ok') { ok++; okNames.push(name); }
      else if (w === 'rather_no') { rather++; ratherNames.push(name); }
    }

    stats.push({
      day, available, ideal, ok, blocked, rather, unknown, total, names,
      idealNames, okNames, ratherNames, blockedNames,
    });
  }

  return stats;
}

/**
 * Sestaví řádek pro každého účastníka napříč celým horizontem.
 * Pro pruhový přehled "kdo jak vyplnil".
 */
export function computePersonRows(
  participants: Participant[],
  availability: Availability[]
): PersonRow[] {
  const byPerson: Record<string, Record<string, AvailabilityWeight>> = {};
  for (const a of availability) {
    if (!byPerson[a.participant_id]) byPerson[a.participant_id] = {};
    byPerson[a.participant_id][a.day] = a.weight;
  }

  return participants.map(p => {
    const byDay = byPerson[p.id] ?? {};
    const counts = { ideal: 0, ok: 0, rather: 0, no: 0, filled: 0 };
    for (const w of Object.values(byDay)) {
      counts.filled++;
      if (w === 'ideal') counts.ideal++;
      else if (w === 'ok') counts.ok++;
      else if (w === 'rather_no') counts.rather++;
      else if (w === 'no_go') counts.no++;
    }
    return {
      id: p.id,
      name: p.name,
      idealDays: p.ideal_days || 0,
      byDay,
      counts,
      empty: counts.filled === 0,
    };
  });
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
  opts: OverlapOptions = {}
): OverlapWindow[] {
  const { minAttendees = 0, ratherNo = 'counts', maxLen = 10, topN = 12 } = opts;

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
      let cleanCount = 0;
      const attendeeNames: string[] = [];
      const absentNames: string[] = [];
      const ratherNoNames: string[] = [];
      const blockerNames: string[] = [];

      for (const p of people) {
        let can = true;
        let hasIdeal = false;
        let hasRatherNo = false;
        let blocked = false;
        for (let d = 0; d < L; d++) {
          const w = lookup[p.id]?.[addDays(start, d)];
          if (w === 'no_go') { can = false; blocked = true; break; }
          // "spíš ne": v režimu excludes ho bereme jako překážku
          if (w === 'rather_no') {
            hasRatherNo = true;
            if (ratherNo === 'excludes') { can = false; break; }
          }
          if (w === 'ideal') hasIdeal = true;
        }
        if (can) {
          attendees++;
          attendeeNames.push(p.name);
          if (hasIdeal) idealCount++;
          if (hasRatherNo) ratherNoNames.push(p.name);
          else cleanCount++;
        } else {
          absentNames.push(p.name);
          if (blocked) blockerNames.push(p.name);
        }
      }

      windows.push({
        start, end, length: L,
        attendees, idealCount, cleanCount,
        attendeeNames, absentNames, ratherNoNames, blockerNames,
      });
    }
  }

  // skóre: nejvíc lidí > víc "čistých" (bez spíš-ne) > víc ideálních > delší
  windows.sort((a, b) =>
    b.attendees - a.attendees ||
    b.cleanCount - a.cleanCount ||
    b.idealCount - a.idealCount ||
    b.length - a.length
  );

  // dedupe: nevracej okna plně obsažená v lépe hodnoceném okně se stejnou účastí
  const picked: OverlapWindow[] = [];
  for (const w of windows) {
    if (w.attendees === 0) continue;
    if (minAttendees > 0 && w.attendees < minAttendees) continue;
    const contained = picked.some(
      p => p.start <= w.start && p.end >= w.end && p.attendees >= w.attendees
    );
    if (!contained) picked.push(w);
    if (picked.length >= topN) break;
  }
  return picked;
}

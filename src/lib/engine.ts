import type { Trip, Participant, Availability, Preference, TripOption, Veto, DateWindow, Proposal, AvailabilityWeight, PreferenceAxes } from './types';

const WEIGHT_VALUES: Record<Exclude<AvailabilityWeight, 'no_go'>, number> = {
  ideal: 3,
  ok: 1,
  rather_no: -2,
};

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

function checkSeasonMatch(window: DateWindow, seasonTags: string[]): number {
  if (!seasonTags.length || seasonTags.includes('all')) return 1;
  const month = new Date(window.start + 'T00:00:00Z').getUTCMonth() + 1;
  if (seasonTags.includes('winter') && (month >= 12 || month <= 2)) return 1;
  if (seasonTags.includes('summer') && month >= 6 && month <= 8) return 1;
  if (seasonTags.includes('spring') && month >= 3 && month <= 5) return 1;
  if (seasonTags.includes('fall') && month >= 9 && month <= 11) return 1;
  return 0.4;
}

function dotProduct(a: Partial<PreferenceAxes>, b: Partial<PreferenceAxes>): number {
  let sum = 0;
  for (const key of Object.keys(a) as (keyof PreferenceAxes)[]) {
    sum += (a[key] ?? 0) * (b[key] ?? 0);
  }
  return sum;
}

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map(v => (v - min) / (max - min));
}

export function computeProposals(
  trip: Trip,
  participants: Participant[],
  availability: Availability[],
  preferences: Preference[],
  options: TripOption[],
  vetoes: Veto[]
): Proposal[] {
  if (participants.length === 0 || options.length === 0) return [];

  const availLookup: Record<string, Record<string, AvailabilityWeight>> = {};
  for (const av of availability) {
    if (!availLookup[av.participant_id]) availLookup[av.participant_id] = {};
    availLookup[av.participant_id][av.day] = av.weight;
  }

  const prefLookup: Record<string, Preference> = {};
  for (const pref of preferences) prefLookup[pref.participant_id] = pref;

  const vetoedOptionIds = new Set(
    vetoes.filter(v => v.target_type === 'option').map(v => v.target_ref)
  );

  const budgets = participants
    .map(p => prefLookup[p.id]?.budget_max)
    .filter((b): b is number => b !== undefined && b > 0);
  const groupBudgetCeiling = budgets.length > 0 ? Math.min(...budgets) : Infinity;

  const validOptions = options.filter(opt => {
    if (vetoedOptionIds.has(opt.id)) return false;
    if (isFinite(groupBudgetCeiling) && opt.est_cost > groupBudgetCeiling) return false;
    return true;
  });

  // If budget filters everything, show cheapest anyway with a flag
  const effectiveOptions = validOptions.length > 0 ? validOptions : options
    .filter(opt => !vetoedOptionIds.has(opt.id))
    .sort((a, b) => a.est_cost - b.est_cost)
    .slice(0, 3);

  const horizonLength = daysBetween(trip.horizon_start, trip.horizon_end);
  const allWindows: DateWindow[] = [];

  for (let L = trip.length_min; L <= trip.length_max; L++) {
    for (let startOffset = 0; startOffset + L <= horizonLength; startOffset++) {
      const start = addDays(trip.horizon_start, startOffset);
      const days: string[] = [];
      for (let d = 0; d < L; d++) days.push(addDays(start, d));

      const perPerson: Record<string, number | 'BLOCKED'> = {};
      let attendees = 0;
      let dateScore = 0;

      for (const p of participants) {
        const pAvail = availLookup[p.id] || {};
        let blocked = false;
        const dayWeights: number[] = [];

        for (const day of days) {
          const w = (pAvail[day] || 'ok') as AvailabilityWeight;
          if (w === 'no_go') { blocked = true; break; }
          dayWeights.push(WEIGHT_VALUES[w]);
        }

        if (blocked) {
          perPerson[p.id] = 'BLOCKED';
        } else {
          const minW = dayWeights.length > 0 ? Math.min(...dayWeights) : 1;
          perPerson[p.id] = minW;
          attendees++;
          dateScore += minW;
        }
      }

      allWindows.push({ start, length: L, attendees, dateScore, perPerson });
    }
  }

  allWindows.sort((a, b) =>
    b.attendees !== a.attendees ? b.attendees - a.attendees : b.dateScore - a.dateScore
  );

  const topWindows = allWindows.slice(0, 15);
  const windowsToUse = topWindows.length > 0 ? topWindows : allWindows.slice(0, 1);

  const scoredOptions = effectiveOptions.map(opt => {
    let typeScore = 0;
    for (const p of participants) {
      const pref = prefLookup[p.id];
      if (pref) typeScore += dotProduct(opt.tags, pref.axes);
    }
    return { ...opt, typeScore };
  });

  const rawProposals = scoredOptions.flatMap(opt =>
    windowsToUse.map(window => ({
      option: opt,
      window,
      attendees: window.attendees,
      seasonMatch: checkSeasonMatch(window, opt.season_tags),
      budgetFit: isFinite(groupBudgetCeiling)
        ? Math.max(0, Math.min(1, (groupBudgetCeiling - opt.est_cost) / Math.max(groupBudgetCeiling, 1)))
        : 1,
      rawAttendees: window.attendees,
      rawTypeScore: opt.typeScore,
      rawDateScore: window.dateScore,
    }))
  );

  if (rawProposals.length === 0) return [];

  const normAtt = normalize(rawProposals.map(p => p.rawAttendees));
  const normType = normalize(rawProposals.map(p => p.rawTypeScore));
  const normDate = normalize(rawProposals.map(p => p.rawDateScore));

  const scored = rawProposals.map((p, i) => {
    const blocked = Object.values(p.window.perPerson).filter(v => v === 'BLOCKED').length;
    const score =
      0.45 * normAtt[i] +
      0.25 * normType[i] +
      0.15 * normDate[i] +
      0.10 * p.seasonMatch +
      0.05 * p.budgetFit -
      0.5 * (blocked / Math.max(participants.length, 1));

    const fairness: Record<string, number> = {};
    for (const participant of participants) {
      const pref = prefLookup[participant.id];
      if (!pref) { fairness[participant.id] = 50; continue; }
      const prefFit = Math.max(0, Math.min(1, dotProduct(p.option.tags, pref.axes)));
      const avail = p.window.perPerson[participant.id];
      const availFit = avail === 'BLOCKED' ? 0 : Math.max(0, ((avail as number) + 2) / 5);
      fairness[participant.id] = Math.round((prefFit * 0.6 + availFit * 0.4) * 100);
    }

    return {
      option: p.option,
      window: p.window,
      score,
      attendees: p.attendees,
      seasonMatch: p.seasonMatch,
      budgetFit: p.budgetFit,
      proposalKey: `${p.option.id}|${p.window.start}|${p.window.length}`,
      fairness,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const result: Proposal[] = [];
  for (const p of scored) {
    if (result.length >= 5) break;
    if (!seen.has(p.option.id)) { seen.add(p.option.id); result.push(p); }
  }
  if (result.length < 5) {
    for (const p of scored) {
      if (result.length >= 5) break;
      if (!result.find(r => r.proposalKey === p.proposalKey)) result.push(p);
    }
  }

  return result;
}

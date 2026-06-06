export type AvailabilityWeight = 'ideal' | 'ok' | 'rather_no' | 'no_go';
export type VoteValue = 'up' | 'down';

export interface Participant {
  id: string;
  name: string;
  ideal_days: number;
  created_at: string;
}

export interface Availability {
  id: string;
  participant_id: string;
  day: string;
  weight: AvailabilityWeight;
}

export interface Idea {
  id: string;
  title: string;
  emoji: string;
  duration_days: number;
  created_by: string | null;
  created_at: string;
}

export interface IdeaVote {
  idea_id: string;
  participant_id: string;
  value: VoteValue;
}

export interface IdeaNote {
  id: string;
  idea_id: string;
  participant_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
}

export interface IdeaRename {
  id: string;
  idea_id: string;
  participant_id: string | null;
  author_name: string;
  old_title: string;
  new_title: string;
  created_at: string;
}

/** Agregovaný stav jednoho dne napříč všemi účastníky. */
export interface DayStat {
  day: string;
  /** počet lidí, kteří ten den můžou (ideal | ok | rather_no, ne no_go) */
  available: number;
  /** počet lidí, pro které je den ideální */
  ideal: number;
  /** počet lidí, kteří den označili "ok" (může, bez nadšení) */
  ok: number;
  /** počet lidí, kteří ten den nemůžou (no_go) */
  blocked: number;
  /** počet lidí, kteří den označili "spíš ne" */
  rather: number;
  /** počet lidí, co tento den vůbec nevyplnili (neutrální) */
  unknown: number;
  /** celkový počet účastníků, co vyplnili aspoň něco */
  total: number;
  /** jména lidí, co ten den můžou (ideal|ok|rather_no) */
  names: string[];
  /** jména po stavech – pro detailní tooltip / přehled */
  idealNames: string[];
  okNames: string[];
  ratherNames: string[];
  blockedNames: string[];
}

/** Řádek jednoho člověka napříč celým horizontem – pro pruhový přehled. */
export interface PersonRow {
  id: string;
  name: string;
  idealDays: number;
  /** den -> stav (jen vyplněné dny; chybějící = neutrální) */
  byDay: Record<string, AvailabilityWeight>;
  /** kolik dní vyplnil v jednotlivých kategoriích */
  counts: { ideal: number; ok: number; rather: number; no: number; filled: number };
  /** true pokud člověk ještě nevyplnil vůbec nic */
  empty: boolean;
}

/** Jak se má v překryvech zacházet se stavem "spíš ne". */
export type RatherNoMode = 'counts' | 'excludes';

/** Nastavení hledání překryvových oken. */
export interface OverlapOptions {
  /** minimální počet lidí, co musí v okně být (0 = bez limitu, jen seřadit) */
  minAttendees?: number;
  /** "spíš ne" se počítá jako že může (counts) nebo vyřazuje (excludes) */
  ratherNo?: RatherNoMode;
  maxLen?: number;
  topN?: number;
}

/** Souvislé okno dní s nejvyšším překryvem. */
export interface OverlapWindow {
  start: string;
  end: string;
  length: number;
  /** počet lidí, co můžou všechny dny v okně (dle nastavení) */
  attendees: number;
  /** kolik z nich má v okně aspoň jeden "ideální" den */
  idealCount: number;
  /** kolik účastníků by okno bralo jako čistě ideál/ok (žádný 'spíš ne') */
  cleanCount: number;
  /** jména lidí, co můžou */
  attendeeNames: string[];
  /** jména lidí, co nemůžou */
  absentNames: string[];
  /** jména lidí, co to mají jako 'spíš ne' na aspoň jeden den */
  ratherNoNames: string[];
  /** kdo okno blokuje (má no_go) – = absentNames při ratherNo:counts */
  blockerNames: string[];
}

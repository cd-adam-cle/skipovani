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
  created_by: string | null;
  created_at: string;
}

export interface IdeaVote {
  idea_id: string;
  participant_id: string;
  value: VoteValue;
}

/** Agregovaný stav jednoho dne napříč všemi účastníky. */
export interface DayStat {
  day: string;
  /** počet lidí, kteří ten den můžou (ideal | ok | rather_no, ne no_go) */
  available: number;
  /** počet lidí, pro které je den ideální */
  ideal: number;
  /** počet lidí, kteří ten den nemůžou (no_go) */
  blocked: number;
  /** počet lidí, kteří den označili "spíš ne" */
  rather: number;
  /** celkový počet účastníků, co vyplnili dostupnost */
  total: number;
  /** jména lidí, co ten den můžou */
  names: string[];
}

/** Souvislé okno dní s nejvyšším překryvem. */
export interface OverlapWindow {
  start: string;
  end: string;
  length: number;
  /** počet lidí, co můžou všechny dny v okně */
  attendees: number;
  /** kolik z nich má v okně aspoň jeden "ideální" den */
  idealCount: number;
}

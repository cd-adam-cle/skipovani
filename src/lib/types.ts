export type TripStatus = 'collecting' | 'shortlist' | 'decided';
export type AvailabilityWeight = 'ideal' | 'ok' | 'rather_no' | 'no_go';
export type VoteValue = 'up' | 'down';

export interface Trip {
  id: string;
  name: string;
  organizer_name: string;
  horizon_start: string;
  horizon_end: string;
  length_min: number;
  length_max: number;
  share_slug: string;
  status: TripStatus;
  created_at: string;
}

export interface Participant {
  id: string;
  trip_id: string;
  name: string;
  has_submitted: boolean;
  veto_budget: number;
}

export interface Availability {
  id: string;
  participant_id: string;
  day: string;
  weight: AvailabilityWeight;
}

export interface PreferenceAxes {
  chill: number;
  action: number;
  sea: number;
  mountains: number;
  city: number;
  nature: number;
  warm: number;
  snow: number;
  lazy: number;
  sport: number;
}

export interface Preference {
  participant_id: string;
  axes: PreferenceAxes;
  budget_max: number;
  max_travel_h?: number;
  fly_ok: boolean;
}

export interface TripOption {
  id: string;
  trip_id: string | null;
  name: string;
  tags: Partial<PreferenceAxes>;
  est_cost: number;
  season_tags: string[];
  created_by: string | null;
}

export interface Veto {
  id: string;
  participant_id: string;
  target_type: 'option' | 'date_window';
  target_ref: string;
}

export interface FinalVote {
  participant_id: string;
  proposal_key: string;
  value: VoteValue;
}

export interface DateWindow {
  start: string;
  length: number;
  attendees: number;
  dateScore: number;
  perPerson: Record<string, number | 'BLOCKED'>;
}

export interface Proposal {
  option: TripOption;
  window: DateWindow;
  score: number;
  attendees: number;
  seasonMatch: number;
  budgetFit: number;
  proposalKey: string;
  fairness: Record<string, number>;
}

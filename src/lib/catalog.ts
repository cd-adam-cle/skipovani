import type { TripOption } from './types';

export const CATALOG_OPTIONS: Omit<TripOption, 'id' | 'trip_id' | 'created_by'>[] = [
  {
    name: 'Chata na horách',
    tags: { mountains: 1, nature: 0.8, chill: 0.7, snow: 0.6, lazy: 0.5 },
    est_cost: 3500,
    season_tags: ['winter', 'spring', 'fall'],
  },
  {
    name: 'Pláž u moře',
    tags: { sea: 1, warm: 1, chill: 0.8, lazy: 0.7, sport: 0.3 },
    est_cost: 12000,
    season_tags: ['summer'],
  },
  {
    name: 'Výlet do města',
    tags: { city: 1, action: 0.8, chill: 0.4, nature: 0.1 },
    est_cost: 4000,
    season_tags: ['all'],
  },
  {
    name: 'Kemping v přírodě',
    tags: { nature: 1, sport: 0.7, action: 0.6, chill: 0.5, lazy: 0.3 },
    est_cost: 1500,
    season_tags: ['summer', 'spring'],
  },
  {
    name: 'Skiareál – lyže',
    tags: { mountains: 1, snow: 1, sport: 0.9, action: 0.8, lazy: 0.2 },
    est_cost: 8000,
    season_tags: ['winter'],
  },
  {
    name: 'Wellness & relax',
    tags: { chill: 1, lazy: 1, warm: 0.6, mountains: 0.3 },
    est_cost: 6000,
    season_tags: ['all'],
  },
  {
    name: 'Horská turistika',
    tags: { mountains: 1, nature: 1, sport: 0.8, action: 0.7, lazy: 0.1 },
    est_cost: 2500,
    season_tags: ['summer', 'spring', 'fall'],
  },
  {
    name: 'Eurovíkend (letadlem)',
    tags: { city: 1, action: 0.9, chill: 0.5, warm: 0.4 },
    est_cost: 9000,
    season_tags: ['all'],
  },
];

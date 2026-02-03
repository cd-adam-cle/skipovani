export type Subject = {
    id: string;
    name: string;
    weeklyHours: number;
    missedInitial: number; // Hours missed in the "2 days off"
};

export const ABSENCE_LIMIT_PERCENT = 0.30;
// Jan 26, 2026
export const START_DATE = new Date('2026-01-26');
// March 31, 2026
export const END_DATE = new Date('2026-03-31');

// 1 week spring break (5 days)
export const WEEKS_OFF = 1;

export const HOLIDAYS = [
    '2026-01-30',
    '2026-02-16',
    '2026-02-17',
    '2026-02-18',
    '2026-02-19',
    '2026-02-20'
];

// Missed lessons from the specific 2 days mentioned:
// 2cj 1nj ,2aj,1zsv  seminar z mat 2h ,mat 1fyz1 ,semnar vyberovy1 
export const SUBJECTS: Subject[] = [
    { id: 'mat', name: 'Matematika', weeklyHours: 6, missedInitial: 1 },
    { id: 'aj', name: 'Angličtina', weeklyHours: 4, missedInitial: 2 },
    { id: 'cj', name: 'Čeština', weeklyHours: 4, missedInitial: 2 },
    { id: 'fyz', name: 'Fyzika', weeklyHours: 3, missedInitial: 1 },
    { id: 'nj', name: 'Němčina', weeklyHours: 3, missedInitial: 2 },
    { id: 'zsv', name: 'ZSV', weeklyHours: 1, missedInitial: 1 },
    { id: 'ivt', name: 'IVT', weeklyHours: 1, missedInitial: 0 },
    { id: 'tv', name: 'Tělocvik', weeklyHours: 2, missedInitial: 2 },
    { id: 'sem_mat', name: 'Seminář Matematika', weeklyHours: 2, missedInitial: 2 },
    { id: 'sem_cj', name: 'Seminář Čeština', weeklyHours: 2, missedInitial: 0 },
    { id: 'vyb_sem_1', name: 'Výběrový Seminář 1', weeklyHours: 2, missedInitial: 1 },
    { id: 'vyb_sem_2', name: 'Výběrový Seminář 2', weeklyHours: 2, missedInitial: 0 },
];

export const DEFAULT_SCHEDULE: Record<number, string[]> = {
    // Mon: 3:Mat, 4:Mat, 5:Cj, 6:Cj
    1: ['mat', 'mat', 'cj', 'cj'],
    // Tue: 3:Ivt, 4:Aj, 5:Mat, 6:Nj, 7:Fy, 9:Tv, 10:Tv
    2: ['ivt', 'aj', 'mat', 'nj', 'fyz', 'tv', 'tv'],
    // Wed: 1:SCj, 2:SCj, 3:Fy, 4:Mat, 5:Mat, 6:Nj, 7:Aj
    3: ['sem_cj', 'sem_cj', 'fyz', 'mat', 'mat', 'nj', 'aj'],
    // Thu: 2:Nj, 3:ZSV, 4:Cj, 5:Aj, 6:Cj, 8:SzM, 9:SzM
    4: ['nj', 'zsv', 'cj', 'aj', 'cj', 'sem_mat', 'sem_mat'],
    // Fri: 3:Aj, 4:Fy, 5:Mat (Prg/PAES marked/crossed out, so excluded)
    5: ['aj', 'fyz', 'mat']
};

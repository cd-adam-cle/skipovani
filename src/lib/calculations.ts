import { END_DATE, START_DATE, WEEKS_OFF, Subject, ABSENCE_LIMIT_PERCENT } from './config';

export function calculateAbsenceData(subject: Subject, userSkips: number, schoolCanceled: number = 0) {
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    // Calculate total weeks between start and end
    const totalWeeks = Math.ceil((END_DATE.getTime() - START_DATE.getTime()) / oneWeek);

    // Total scheduled hours (excluding the known week off)
    const scheduledWeeks = Math.max(0, totalWeeks - WEEKS_OFF);

    // Total teaching hours = Scheduled - Specific Cancelled Days - School Cancellations
    const effectiveTotalHours = (scheduledWeeks * subject.weeklyHours) - subject.missedInitial - schoolCanceled;

    // Max Allowed Absence (30%)
    const maxAbsence = Math.floor(Math.max(0, effectiveTotalHours) * ABSENCE_LIMIT_PERCENT);

    // Status
    const remaining = maxAbsence - userSkips;
    const isSafe = remaining >= 0;

    // Usage of the limit (0-100% of the allowed 30%)
    const usagePercentage = maxAbsence > 0 ? (userSkips / maxAbsence) * 100 : (userSkips > 0 ? 100 : 0);

    // Actual absence percentage (0-30% usually)
    const absencePercentage = effectiveTotalHours > 0 ? (userSkips / effectiveTotalHours) * 100 : 0;

    return {
        effectiveTotalHours,
        maxAbsence,
        remaining,
        isSafe,
        percentage: usagePercentage, // Keep 'percentage' for backward compatibility with color logic if needed, or update consumers
        absencePercentage
    };
}

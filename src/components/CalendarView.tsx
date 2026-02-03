"use client";

import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isSameMonth, isBefore, isAfter } from 'date-fns';
import { SUBJECTS, START_DATE, END_DATE, HOLIDAYS } from '@/lib/config';

interface CalendarProps {
    schedule: Record<number, string[]>;
    exceptions: string[]; // ISO date strings '2026-05-01'
    skips: string[]; // ISO date strings for user skips
    onToggleException: (date: Date) => void;
    onToggleSkip: (date: Date) => void;
}

export default function CalendarView({ schedule, exceptions, skips, onToggleException, onToggleSkip }: CalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDay = getDay(monthStart);
    const paddingBefore = (startDay + 6) % 7;
    const placeholders = Array(paddingBefore).fill(null);

    const getDayContent = (date: Date) => {
        const dayOfWeek = getDay(date);
        if (dayOfWeek === 0 || dayOfWeek === 6) return null;

        const subjects = schedule[dayOfWeek] || [];
        if (subjects.length === 0) return null;

        const isException = exceptions.some(e => isSameDay(new Date(e), date));
        const isSkipped = skips.some(e => isSameDay(new Date(e), date));

        return { subjects, isException, isSkipped };
    };

    return (
        <div className="glass-panel" style={{ padding: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn" style={{ padding: '0.5rem 1rem' }}>←</button>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{format(currentDate, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn" style={{ padding: '0.5rem 1rem' }}>→</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} style={{ fontSize: '0.8rem', color: '#888', padding: '0.5rem 0' }}>{d}</div>
                ))}

                {placeholders.map((_, i) => <div key={`ph-${i}`} />)}

                {daysInMonth.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const data = getDayContent(date);
                    const isWeekend = getDay(date) === 0 || getDay(date) === 6;

                    // Check if date is outside the term
                    const isOutsideTerm = isBefore(date, START_DATE) || isAfter(date, END_DATE);

                    // Check if holiday
                    const isHoliday = HOLIDAYS.includes(dateStr);
                    const isDimmed = isWeekend || isOutsideTerm || isHoliday;

                    let bg = isWeekend ? 'transparent' : 'rgba(255,255,255,0.05)';
                    let border = 'transparent';
                    let label = null;

                    if (isHoliday) {
                        bg = 'rgba(59, 130, 246, 0.2)'; // Blue
                        border = 'rgba(59, 130, 246, 0.5)';
                        label = <div style={{ fontSize: '0.6rem', color: '#93c5fd', marginTop: '2px' }}>BREAK</div>;
                    } else if (data?.isException) {
                        bg = 'rgba(239, 68, 68, 0.2)'; // Red
                        border = 'var(--danger)';
                        label = <div style={{ fontSize: '0.6rem', color: '#fca5a5', marginTop: '2px' }}>OFF</div>;
                    } else if (data?.isSkipped) {
                        bg = 'rgba(234, 179, 8, 0.2)'; // Yellow
                        border = 'var(--warning)';
                        label = <div style={{ fontSize: '0.6rem', color: '#fde047', marginTop: '2px' }}>SKIP</div>;
                    }

                    return (
                        <div
                            key={date.toString()}
                            onClick={() => {
                                if (!isDimmed && data) setSelectedDate(date);
                            }}
                            style={{
                                aspectRatio: '1/1',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                background: bg,
                                borderRadius: '8px',
                                border: `1px solid ${border}`,
                                cursor: isDimmed ? 'default' : 'pointer',
                                opacity: isWeekend || isOutsideTerm ? 0.2 : 1, // Holidays are full opacity but distinct
                                position: 'relative'
                            }}
                        >
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{format(date, 'd')}</span>

                            {data && !data.isException && !data.isSkipped && data.subjects.length > 0 && (
                                <div style={{ display: 'flex', gap: '2px', marginTop: '2px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' }}>
                                    {data.subjects.slice(0, 4).map((_, i) => (
                                        <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />
                                    ))}
                                    {data.subjects.length > 4 && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#888' }} />}
                                </div>
                            )}
                            {label}
                        </div>
                    );
                })}
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
                Tap a day to choose action.
            </p>

            {/* Bottom Sheet Action Menu */}
            {selectedDate && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#1a1a1a',
                    borderTop: '1px solid #333',
                    padding: '2rem',
                    zIndex: 100,
                    boxShadow: '0 -10px 50px rgba(0,0,0,0.5)',
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.2rem' }}>{format(selectedDate, 'EEEE, MMM d')}</h3>
                        <button onClick={() => setSelectedDate(null)} className="btn" style={{ background: '#333', padding: '0.5rem 1rem' }}>Close</button>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <button
                            onClick={() => {
                                onToggleException(selectedDate);
                                setSelectedDate(null);
                            }}
                            className="btn"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', color: '#fca5a5', padding: '1rem' }}
                        >
                            🏫 School Canceled (Red)
                        </button>

                        <button
                            onClick={() => {
                                onToggleSkip(selectedDate);
                                setSelectedDate(null);
                            }}
                            className="btn"
                            style={{ background: 'rgba(234, 179, 8, 0.2)', border: '1px solid var(--warning)', color: '#fde047', padding: '1rem' }}
                        >
                            🏃 I'm Skipping (Yellow)
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

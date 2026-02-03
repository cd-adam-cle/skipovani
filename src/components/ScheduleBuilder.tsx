"use client";

import React from 'react';
import { Subject, SUBJECTS } from '@/lib/config';

interface ScheduleBuilderProps {
    schedule: Record<number, string[]>; // 1 (Mon) -> [subId, subId]
    onChange: (newSchedule: Record<number, string[]>) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function ScheduleBuilder({ schedule, onChange }: ScheduleBuilderProps) {

    const addSubjectToDay = (dayIndex: number, subjectId: string) => {
        const current = schedule[dayIndex + 1] || [];
        const newSchedule = {
            ...schedule,
            [dayIndex + 1]: [...current, subjectId]
        };
        onChange(newSchedule);
    };

    const removeSubjectFromDay = (dayIndex: number, idxToRemove: number) => {
        const current = schedule[dayIndex + 1] || [];
        const newDay = current.filter((_, i) => i !== idxToRemove);
        const newSchedule = {
            ...schedule,
            [dayIndex + 1]: newDay
        };
        onChange(newSchedule);
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Weekly Schedule</span>
                <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 400 }}>
                    Define your typical week to enable calendar predictions.
                </span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {DAYS.map((dayName, index) => {
                    const dayIndex = index; // 0-4
                    const daySubjects = schedule[dayIndex + 1] || [];

                    return (
                        <div key={dayName} style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            padding: '1rem',
                            border: '1px solid var(--card-border)'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#ddd' }}>{dayName}</h3>

                            <div style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {daySubjects.map((subId, i) => {
                                    const sub = SUBJECTS.find(s => s.id === subId);
                                    if (!sub) return null;
                                    return (
                                        <div key={`${subId}-${i}`} style={{
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            border: '1px solid rgba(59, 130, 246, 0.4)',
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span>{sub.name}</span>
                                            <button
                                                onClick={() => removeSubjectFromDay(dayIndex, i)}
                                                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })}

                                {daySubjects.length === 0 && (
                                    <div style={{ fontSize: '0.8rem', color: '#555', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>
                                        No classes
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <select
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: '#222', color: '#fff', border: '1px solid #444' }}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            addSubjectToDay(dayIndex, e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                >
                                    <option value="">+ Add Subject</option>
                                    {SUBJECTS.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.weeklyHours}h)</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

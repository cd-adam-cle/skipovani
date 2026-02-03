"use client";

import React from 'react';
import { Subject, ABSENCE_LIMIT_PERCENT } from '@/lib/config';
import { calculateAbsenceData } from '@/lib/calculations';

interface SubjectCardProps {
    subject: Subject;
    userSkips: number;
    schoolCanceled?: number;
    onAdd: () => void;
    onRemove: () => void;
    onAddCanceled: () => void;
    onRemoveCanceled: () => void;
    isSimulating?: boolean;
}

export default function SubjectCard({ subject, userSkips, schoolCanceled = 0, onAdd, onRemove, onAddCanceled, onRemoveCanceled, isSimulating }: SubjectCardProps) {
    const { maxAbsence, remaining, percentage, isSafe, absencePercentage } = calculateAbsenceData(subject, userSkips, schoolCanceled);

    // Color logic
    let colorVar = 'var(--success)';
    if (percentage > 50) colorVar = 'var(--warning)';
    if (percentage > 85) colorVar = 'var(--danger)';
    if (percentage >= 100) colorVar = '#991b1b'; // Dark red

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{subject.name}</h3>
                <div style={{
                    background: isSafe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isSafe ? '#6ee7b7' : '#fca5a5',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '99px',
                    fontSize: '0.875rem',
                    fontWeight: 600
                }}>
                    {remaining}h left
                </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#888', marginBottom: '0.5rem' }}>
                    <span>Skipped: {userSkips}h</span>
                    <span style={{ color: '#fff', fontWeight: 500 }}>{absencePercentage.toFixed(2)}% / {(ABSENCE_LIMIT_PERCENT * 100).toFixed(0)}%</span>
                    <span>Max: {maxAbsence}h</span>
                </div>

                {/* Progress Bar Container */}
                <div style={{
                    height: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative',
                    marginBottom: '1rem'
                }}>
                    {/* Progress Fill */}
                    <div style={{
                        width: `${Math.min(percentage, 100)}%`,
                        background: colorVar,
                        height: '100%',
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s',
                        boxShadow: `0 0 10px ${colorVar}`
                    }} />
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* User Skips */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: '#aaa' }}>My Absence:</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={onRemove}
                            disabled={userSkips <= 0}
                            className="btn"
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--card-border)',
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.9rem',
                                opacity: userSkips <= 0 ? 0.3 : 1
                            }}
                        >
                            -1
                        </button>
                        <button
                            onClick={onAdd}
                            className="btn"
                            style={{
                                background: remaining <= 0 ? 'var(--danger)' : 'var(--primary)',
                                opacity: isSimulating ? 0.8 : 1,
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.9rem',
                            }}
                        >
                            +1
                        </button>
                    </div>
                </div>

                {/* School Cancellations */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#fc7f03' }}>Canceled by School: <b>{schoolCanceled}h</b></span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={onRemoveCanceled}
                            disabled={schoolCanceled <= 0}
                            className="btn"
                            style={{
                                background: 'rgba(252, 127, 3, 0.1)',
                                border: '1px solid rgba(252, 127, 3, 0.3)',
                                color: '#fc7f03',
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.8rem',
                                opacity: schoolCanceled <= 0 ? 0.3 : 1
                            }}
                        >
                            -1
                        </button>
                        <button
                            onClick={onAddCanceled}
                            className="btn"
                            style={{
                                background: 'rgba(252, 127, 3, 0.2)',
                                border: '1px solid rgba(252, 127, 3, 0.5)',
                                color: '#fc7f03',
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.8rem',
                            }}
                        >
                            +1
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import React, { useState } from 'react';
import { SUBJECTS, Subject } from '@/lib/config';
import { calculateAbsenceData } from '@/lib/calculations';

interface PredictionOverlayProps {
    currentSkips: Record<string, number>;
    onClose: () => void;
}

export default function PredictionOverlay({ currentSkips, onClose }: PredictionOverlayProps) {
    const [selectedSubjects, setSelectedSubjects] = useState<Record<string, number>>({});

    const toggleSubject = (id: string) => {
        setSelectedSubjects(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + 1
        }));
    };

    const removeSubject = (id: string) => {
        setSelectedSubjects(prev => {
            const newCounts = { ...prev };
            if (newCounts[id] > 0) newCounts[id]--;
            return newCounts;
        });
    };

    const getAnalysis = () => {
        const risks: string[] = [];
        let safe = true;

        Object.entries(selectedSubjects).forEach(([id, addedHours]) => {
            if (addedHours === 0) return;
            const subject = SUBJECTS.find(s => s.id === id);
            if (!subject) return;

            const totalProjected = (currentSkips[id] || 0) + addedHours;
            const { maxAbsence } = calculateAbsenceData(subject, 0); // Need max

            if (totalProjected > maxAbsence) {
                safe = false;
                risks.push(`${subject.name} (exceeds by ${totalProjected - maxAbsence}h)`);
            }
        });

        return { safe, risks };
    };

    const { safe, risks } = getAnalysis();
    const hasSelection = Object.values(selectedSubjects).some(v => v > 0);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginBottom: '1rem' }}>Day/Lesson Predictor</h2>
                <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>
                    Add lessons you plan to skip. We'll check if it's safe.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                    {SUBJECTS.map(sub => {
                        const count = selectedSubjects[sub.id] || 0;
                        return (
                            <button
                                key={sub.id}
                                onClick={() => toggleSubject(sub.id)}
                                className="btn"
                                style={{
                                    background: count > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    border: count > 0 ? 'none' : '1px solid var(--card-border)',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.85rem'
                                }}
                            >
                                {sub.name} {count > 0 && `(${count}h)`}
                            </button>
                        );
                    })}
                </div>

                {hasSelection && (
                    <div style={{
                        background: safe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${safe ? 'var(--success)' : 'var(--danger)'}`,
                        padding: '1rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem'
                    }}>
                        <h3 style={{ color: safe ? 'var(--success)' : 'var(--danger)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                            {safe ? '✅ Safe to Skip' : '⚠️ Limits Exceeded'}
                        </h3>
                        {!safe && (
                            <ul style={{ listStyle: 'none', color: '#fca5a5' }}>
                                {risks.map((risk, i) => <li key={i}>• {risk}</li>)}
                            </ul>
                        )}
                        {safe && <p style={{ color: '#6ee7b7' }}>You will remain within the 30% limit for all subjects.</p>}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    {hasSelection && (
                        <button
                            onClick={() => setSelectedSubjects({})}
                            className="btn"
                            style={{ background: 'transparent', border: '1px solid #444' }}
                        >
                            Clear
                        </button>
                    )}
                    <button onClick={onClose} className="btn" style={{ background: '#333' }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
